# Roadmap — Conexión del frontend con el backend real

Estado de la migración de **mocks → endpoints reales** del backend Express
(`../backend`, `http://localhost:4000`, Swagger en `/api/docs`).

Todas las llamadas deben pasar por la instancia axios única `lib/api/client.ts`
(adjunta `Bearer` del `authStore` y maneja el `401`). El patrón de referencia
—ya implementado— es `lib/api/products.ts`: **axios + validación Zod en runtime +
query-key factory listo para TanStack Query**. Replicar ese patrón en cada
migración.

## Leyenda

- ✅ **Conectado** — ya consume el endpoint real.
- 🔴 **Pendiente** — el frontend sigue con mock / stub.
- ⚪ **Diferido** — depende de una fase externa (Stripe / UI aún no construida).

## Mapa de endpoints ↔ consumidor en el frontend

| Endpoint backend | Consumidor en el frontend | Estado | Acción |
|---|---|---|---|
| `POST /api/auth/login` | `components/auth/LoginForm.tsx` → `login()` de `lib/api/auth.ts` | ✅ | — |
| `POST /api/auth/forgot-password` | `components/auth/ForgotPasswordForm.tsx` → `forgotPassword()` (`useMutation`) | ✅ | — |
| `GET /api/auth/me` | `components/auth/AdminGuard.tsx` → `getMe()` (valida token + rehidrata `user`) | ✅ | — |
| `GET /api/products` | `lib/api/products.ts` → `getProducts()` | ✅ | — |
| `GET /api/products/:id` | `lib/api/products.ts` → `getProductById()` | ✅ | — |
| `POST /api/orders` | `components/checkout/UserDetails.tsx` → `createOrder()` de `lib/api/orders.ts` (`useMutation`); `completeOrder()` congela la respuesta `201` | ✅ | — |
| `GET /api/admin/products` | `components/admin/ProductSection.tsx` → `getAdminProducts()` de `lib/api/adminProducts.ts` (`useQuery`) | ✅ | — |
| `POST /api/admin/products` | `components/admin/ProductForm.tsx` → `createProduct()` (`useMutation` + invalidación) | ✅ | — |
| `PUT /api/admin/products/:id` | `components/admin/ProductForm.tsx` → `updateProduct()` (`useMutation`) | ✅ | — |
| `DELETE /api/admin/products/:id` | `ProductCategoryView.tsx` / `ProductForm.tsx` → `deleteProduct()` (`useMutation`; soft/hard lo decide el backend) | ✅ | — |
| `GET /api/admin/dashboard` | `components/admin/DataSection.tsx` → `getAdminDashboard()` de `lib/api/dashboard.ts` (`useQuery`) | ✅ | — |
| `GET /api/admin/reports/monthly` | `components/admin/ReportesSection.tsx` → `getMonthlyReport()` de `lib/api/reports.ts` (`useQuery`); pasa `reports` a `SalesReport` | ✅ | — |
| `GET /api/admin/reports/replenishment` | `components/admin/reportes/ReplenishmentReport.tsx` → `getReplenishmentReport()` (`useQuery`) | ✅ | — |
| `GET /api/admin/brand` | `components/providers/BrandProvider.tsx` → `getBrandSettings()` de `lib/api/brand.ts` (`useQuery`); `useBrand()` alimenta `Hero`/`Footer`/`NavHeader`/`Cart`. `BRAND` = fallback SSR | ✅ | — |
| `PUT /api/admin/brand` | `components/admin/MarcaSection.tsx` → `updateBrandSettings()` (`useMutation`, autosave con debounce) | ✅ | — |
| `GET /api/admin/users` | `components/admin/ConfigSection.tsx` → `getAdminUsers()` de `lib/api/adminUsers.ts` (`useQuery`) | ✅ | — |
| `POST /api/admin/users` | `components/admin/ConfigSection.tsx` → `createAdminUser()` (`useMutation` + invalidación) | ✅ | — |
| `DELETE /api/admin/users/:id` | `components/admin/ConfigSection.tsx` → `deleteAdminUser()` (`useMutation`, confirmación inline) | ✅ | — |
| `PUT /api/admin/account` | `components/admin/ConfigSection.tsx` → `updateOwnAccount()` de `lib/api/account.ts` (`useMutation`) | ✅ | — |
| `GET /api/admin/orders` | *(sin UI todavía)* | ⚪ | Construir vista de pedidos del admin y conectar |
| `POST /api/orders` → `clientSecret` | `components/checkout/usePlaceOrder.ts` confirma el pago con Stripe.js (`confirmCardPayment` + `pm_card_visa`) usando el `clientSecret` que devuelve `createOrder()`; `PaymentSection.tsx` es el panel de tarjeta de prueba | ✅ | Fase 8 (Stripe, **test/sandbox**) |
| `POST /api/webhooks/stripe` | *(lo invoca Stripe, no el front)* — el pago se confirma en el cliente; el webhook marca la orden `paid` | ✅ | Fase 8: backend activo (firma verificada); no requiere código de front |

## Fases (orden sugerido)

### Fase 1 — Autenticación ✅ *(desbloquea todo el admin)*
- ✅ `POST /api/auth/login` — `LoginForm` usa `login()` de `lib/api/auth.ts` (sin mock).
- ✅ `POST /api/auth/forgot-password` — `ForgotPasswordForm` con `useMutation` → `forgotPassword()`.
- ✅ `GET /api/auth/me` — `AdminGuard` valida el token real (`getMe()`) y rehidrata `user`;
  render bloqueante con `staleTime` de 5 min.
- **Salida:** sesión real de admin; el interceptor `401` cierra sesión y redirige.
- Contratos y validación Zod centralizados en `lib/api/auth.ts` (patrón `getProducts.ts`).

### Fase 2 — Checkout público ✅ *(ruta de ingresos)*
- ✅ `POST /api/orders` — `UserDetails` usa `useMutation({ mutationFn: createOrder })`
  (`lib/api/orders.ts`). `buildOrderPayload()` envía `{ items: [{ productId, size, quantity }],
  customer }` **sin montos** (el backend recalcula totales y descuenta stock por talla
  atómicamente). `409` (sin stock / no disponible) muestra el mensaje del backend inline
  —incluye el ítem en conflicto—, `400` mapea a un mensaje de datos; ambos dejan al
  usuario en el formulario.
- El pedido se congela **solo con el `201`**: `completeOrder(customer, order)` guarda
  `orderId` + los totales autoritativos del servidor en el snapshot que alimenta `Success`
  (muestra "Pedido #<id>"). El `clientSecret` es `null` hasta Stripe (Fase 8).
- Contrato validado con Zod en `lib/api/orders.ts` (patrón `getProducts.ts` / `auth.ts`):
  `OrderResponseSchema` refleja la orden pública (items **sin `unitCost`**).

### Fase 3 — Admin: catálogo y dashboard ✅
- ✅ `GET /api/admin/products` + CRUD (`POST`/`PUT`/`DELETE`) — contratos centralizados en
  `lib/api/adminProducts.ts` (patrón `getProducts.ts`): `AdminProductSchema` (incluye `unitCost`),
  `adminProductKeys`, `getAdminProducts()`/`createProduct()`/`updateProduct()`/`deleteProduct()`.
  `ProductSection` lista con `useQuery`; `ProductForm` crea/edita con `useMutation` + invalidación;
  `ProductCategoryView` y `ProductForm` borran con confirmación inline (soft/hard lo decide el backend).
- ✅ `GET /api/admin/dashboard` — `DataSection` con `useQuery` → `getAdminDashboard()`
  (`lib/api/dashboard.ts`, `DashboardSchema` valida la forma de `data/types.ts`).
- **Tallas/stock**: el form captura tallas como CSV donde la repetición = unidades
  (`"25,26,26"` → talla 26 con 2). "Existencias" es un total derivado de solo lectura; el
  backend agrupa en filas `ProductSize` y recalcula stock. `ProductForm` ahora captura los campos
  que el backend exige: `unitCost` + dimensiones de empaque + `code`.
- Los imports de mocks se retiraron de `ProductSection`/`DataSection`. **`db/mockProducts.ts` y
  `db/mockData.ts` siguen vivos** porque la sección Reportes (Fase 4) aún depende de ellos; se
  limpian al cerrar la Fase 4.
- **Imagen (pendiente)**: no hay endpoint de subida en el contrato; el form envía `imageSrc` como
  string (las previews `blob:` locales no persisten). Upload real con Cloudinary = trabajo futuro.

### Fase 4 — Admin: reportes ✅
- ✅ `GET /api/admin/reports/monthly` + `GET /api/admin/reports/replenishment` — contratos
  centralizados en `lib/api/reports.ts` (patrón `getProducts.ts`): `MonthlyReportSchema` /
  `ReplenishmentRowSchema` (Zod, reflejan `components/admin/data/types.ts`), `reportKeys`,
  `getMonthlyReport()` / `getReplenishmentReport()`. Ambos endpoints devuelven un array plano
  ya derivado/ordenado por el backend.
- ✅ `ReportesSection` es dueño de la query mensual (selector de mes + mes por defecto + nota
  parcial) y pasa `reports` a `SalesReport` (lookup + `trendVsPrev`) y a `ReplenishmentReport`
  (banner de historial). `ReplenishmentReport` tiene su propia query (lazy al abrir la pestaña).
- ✅ Forecast/reposición ahora se calculan **en el backend** (`backend/src/services/`); el
  frontend solo pinta filas. Se eliminaron `db/mockData.ts`, `db/mockProducts.ts` y `lib/forecast.ts`
  (**el frontend ya no tiene mocks**).

### Fase 5 — Marca (identidad de tienda) ✅
- ✅ `GET /api/admin/brand` (público) — contrato centralizado en `lib/api/brand.ts`
  (patrón `getProducts.ts`): `BrandSettingsSchema` (Zod), `brandKeys`, `getBrandSettings()`.
  `BrandProvider` (root layout) hidrata con `useQuery` y expone `useBrand()`; `Hero`/`Footer`/
  `NavHeader`/`Cart` consumen la marca resuelta. `BRAND` (`lib/domain/brand.ts`) queda como fallback SSR.
- ✅ `PUT /api/admin/brand` — `MarcaSection` usa `useMutation({ mutationFn: updateBrandSettings })`
  con autosave (debounce 700ms) + invalidación de `brandKeys.all`. `updateBrandSettings` usa
  `safeParse` (un 2xx ya persistió).
- **Mapeo:** `BrandSettings` es un **subconjunto** de `BRAND`. `resolveBrand(settings)` mergea
  backend ← `BRAND`: mapea `tagline` (string `\n`) → `taglineLines[]` y conserva
  `namePrimary`/`nameAccent`/`email`/`instagram` (que el backend no modela).
- **Pendientes documentados:** el **logo** es preview local (`blob:`), no se persiste — subida
  real (Cloudinary) = trabajo futuro (igual que las imágenes de producto en Fase 3). La
  **metadata** (título del navegador) sigue estática en `BRAND.name` para no volver dinámico el
  render de todas las rutas.

### Fase 6 — Admin: usuarios y cuenta ✅
- ✅ `GET`/`POST`/`DELETE /api/admin/users` — contrato centralizado en
  `lib/api/adminUsers.ts` (patrón `getProducts.ts`): `AdminUserSchema` (Zod),
  `adminUserKeys`, `getAdminUsers()`/`createAdminUser()`/`deleteAdminUser()`.
  `ConfigSection` lista con `useQuery`, da de alta con `useMutation` + invalidación
  (contraseña temporal manual con reglas de complejidad validadas en cliente vía
  `schemas/users.ts`) y da de baja con confirmación inline.
- ✅ `PUT /api/admin/account` — `lib/api/account.ts` (`updateOwnAccount()`).
  `ConfigSection` la tarjeta "Mi cuenta" es un único form (`react-hook-form` +
  `updateAccountSchema`) que exige la contraseña actual para cualquier cambio;
  tras cambiar el correo rehidrata el `user` (`authStore.setUser` + invalida
  `authKeys.me`).
- **Errores mapeados:** `401` contraseña actual incorrecta, `409` correo en uso,
  `400` validación; baja bloqueada por el backend (propia cuenta / único
  propietario) se muestra inline con el mensaje del servidor.
- **Gating:** la gestión de usuarios se muestra a todos los admins autenticados
  (refleja el backend, que solo exige `requireAuth`). El backend igual protege
  borrar la propia cuenta y al único propietario.

### Fase 7 — Admin: pedidos *(UI nueva)*
- `GET /api/admin/orders` (paginado, incluye `unitCost`) — construir la vista y conectarla.

### Fase 8 — Pagos con Stripe ✅ *(modo prueba / sandbox)*

> **Conectado.** Backend y frontend activos en **modo test/sandbox** (`pk_test_…` /
> `sk_test_…` / `whsec_…`) — **no** hay dinero real. El frontend confirma el pago con
> Stripe.js hardcodeando la **tarjeta de prueba** (`pm_card_visa` = `4242 4242 4242 4242`),
> ya que todo corre en sandbox. Al pasar a producción se sustituye por captura real con
> Stripe Elements (`<PaymentElement>`).
>
> **Implementación (frontend):**
> - Dep `@stripe/stripe-js` + env `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`, misma
>   cuenta que el backend). `lib/stripe/client.ts` = singleton `loadStripe` a nivel de módulo.
> - `components/checkout/usePlaceOrder.ts` orquesta el flujo de dos fases: `createOrder()`
>   (obtiene `clientSecret`) → `stripe.confirmCardPayment(clientSecret, { payment_method:
>   "pm_card_visa" })`. Cachea la orden creada para no duplicarla en un reintento; solo tras
>   `succeeded` llama `completeOrder()`. El estado `paid` lo concilia el webhook (asíncrono).
> - `components/checkout/PaymentSection.tsx` pasó de inputs placeholder a un panel de tarjeta
>   de prueba de solo lectura (sello "Modo de prueba · Sandbox").
>
> Lo que describe abajo es el contrato de referencia del backend (no tocar).

**Lo que el backend ya hace (referencia — no tocar):**
- `POST /api/orders` crea la orden (`status: "pending"`, `paymentStatus: "processing"`),
  crea un **PaymentIntent real de Stripe** y **devuelve el `clientSecret`** en la respuesta
  `201`: `{ order, clientSecret }`. Ver `../backend/src/services/payment.service.ts`
  (`createPaymentIntentForOrder`) y `../backend/src/controllers/order.controller.ts`.
- `POST /api/webhooks/stripe` (firma verificada, `../backend/src/routes/webhook.routes.ts`)
  es la **fuente de verdad del pago**: al confirmar el cliente, Stripe emite
  `payment_intent.succeeded` → la orden pasa a `paid`; `payment_failed` la deja `pending`
  (permite reintento) y `canceled` hace restock + `cancelled`. El front **no** llama a este
  endpoint (lo invoca Stripe).
- Un **barrido** (`pendingOrderSweeper.ts`) recicla órdenes `pending` abandonadas tras
  `PENDING_ORDER_TTL_MINUTES` (30) y libera su stock — así un checkout abandonado no
  bloquea inventario para siempre.

**Trabajo del frontend (esta fase):**
1. **Deps + env:** instalar `@stripe/stripe-js` + `@stripe/react-stripe-js` y definir
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` de la misma cuenta que la
   `STRIPE_SECRET_KEY` del backend — si no son de la misma cuenta, el `clientSecret` no
   resuelve). `loadStripe(pk)` se crea **una vez** a nivel de módulo, no por render.
2. **Capturar el `clientSecret`:** el contrato ya existe —
   `CreateOrderResponseSchema` en `lib/api/orders.ts` tiene `clientSecret: string | null`.
   `completeOrder()` debe guardarlo (hoy queda en `null`) para pasarlo a `<Elements>`.
3. **Reemplazar `PaymentSection`** (hoy inputs decorativos, `components/checkout/PaymentSection.tsx`)
   por `<Elements stripe={stripePromise} options={{ clientSecret }}>` envolviendo un
   `<PaymentElement />`. Aislar el bloque como está permite el swap sin tocar `UserDetails`.
4. **Confirmar el pago:** en el submit del pago, `stripe.confirmPayment({ elements,
   confirmParams: { return_url: <página de éxito> } })`. El pago lo confirma el **cliente**;
   el backend se entera por el webhook. El orden del flujo es: `createOrder()` (obtiene
   `clientSecret`) → montar Elements → `confirmPayment` → Stripe redirige al `return_url`.
5. **Página de éxito:** tras la redirección, leer el estado real del pago. La orden nace
   `pending`; se vuelve `paid` solo cuando llega el webhook (asíncrono). Mostrar "pago en
   proceso" y confirmar contra el estado de la orden (cuando exista `GET /api/orders/:id`
   público, o vía `stripe.retrievePaymentIntent(clientSecret)` con el `redirect_status` de
   la URL) en lugar de asumir `paid` de inmediato.

**Probar en local (test):** correr el backend con `pnpm dev` **y** el túnel de webhooks
`stripe listen --forward-to localhost:4000/api/webhooks/stripe` (ver `../backend/README.md`
§ "Probar Stripe en local"). Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha
futura y CVC. Sin el `stripe listen` corriendo, el pago se cobra en Stripe pero la orden
**nunca pasa a `paid`** (el webhook no llega) hasta que el barrido la reconcilie.

**Pendientes fuera de alcance de test:** llaves **live** (`pk_live_…`/`sk_live_…`) y el
endpoint de webhook de producción en el dashboard de Stripe — se hacen al pasar a real, no
ahora.

## Notas de implementación

- **Base URL:** `NEXT_PUBLIC_API_URL` debe apuntar al backend (`http://localhost:4000`);
  sin definir cae a `/api`. No commitear secretos.
- **Contratos:** el backend expone las mismas formas que los tipos del front
  (`components/admin/data/types.ts`, `ProductSchema` en `lib/api/products.ts`). Validar
  cada respuesta con Zod, igual que en `getProducts.ts`.
- **Datos sensibles:** `unitCost` y márgenes solo llegan por rutas `/api/admin/*`
  autenticadas — nunca en el catálogo público.
- **Envíos (Skydropx):** `POST /api/shipping/rates` está documentado en `BACKEND.md`
  §5.4 y `CLAUDE.md`, pero **aún no está montado** en el backend. Se aborda cuando el
  volumen lo justifique (hoy: tarifa plana en `lib/domain/cart.ts`).
