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
| `POST /api/auth/forgot-password` | `components/auth/ForgotPasswordForm.tsx` → `forgotPassword()` (`useMutation`) | ✅ | Backend ahora envía un **código de 5 dígitos** por correo (antes era solo el stub); el front sigue igual (siempre `{ ok: true }`) |
| `POST /api/auth/verify-reset-code` | `components/auth/ResetCodeForm.tsx` → `verifyResetCode()` de `lib/api/auth.ts` (`useMutation`, `CodeInput` OTP) | ✅ | Fase 10 |
| `POST /api/auth/reset-password` | `components/auth/NewPasswordForm.tsx` → `resetPassword()` (`useMutation` → redirect `/login`) | ✅ | Fase 10 |
| `GET /api/auth/me` | `components/auth/AdminGuard.tsx` → `getMe()` (valida token + rehidrata `user`) | ✅ | — |
| `GET /api/products` | `lib/api/products.ts` → `getProducts()` | ✅ | — |
| `GET /api/products/:id` | `lib/api/products.ts` → `getProductById()` | ✅ | — |
| `POST /api/orders` | `components/checkout/UserDetails.tsx` → `createOrder()` de `lib/api/orders.ts` (`useMutation`); `completeOrder()` congela la respuesta `201` | ✅ | — |
| `GET /api/admin/products` | `components/admin/ProductSection.tsx` → `getAdminProducts()` de `lib/api/adminProducts.ts` (`useQuery`) | ✅ | — |
| `POST /api/admin/products` | `components/admin/ProductForm.tsx` → `createProduct()` (`useMutation` + invalidación) | ✅ | — |
| `PUT /api/admin/products/:id` | `components/admin/ProductForm.tsx` → `updateProduct()` (`useMutation`) | ✅ | — |
| `DELETE /api/admin/products/:id` | `ProductCategoryView.tsx` / `ProductForm.tsx` → `deleteProduct()` (`useMutation`; soft/hard lo decide el backend) | ✅ | — |
| `POST /api/admin/products/:id/images` | `ProductForm.tsx` → `addProductImages()` de `lib/api/adminProducts.ts` (galería de hasta 3, subida al guardar) | ✅ | — |
| `DELETE /api/admin/products/:id/images` | `ProductForm.tsx` → `deleteProductImage()` (quitar una imagen por `publicId` al guardar) | ✅ | — |
| `POST /api/admin/brand/logo` | `MarcaSection.tsx` *(no se va a cablear por ahora)* — subida real del logo a Cloudinary | ⚪ | Sin trabajo previsto — decisión del dueño, ver Fase 5 |
| `DELETE /api/admin/brand/logo` | `MarcaSection.tsx` *(no se va a cablear por ahora)* — quitar el logo | ⚪ | Sin trabajo previsto |
| `GET /api/admin/dashboard` | `components/admin/DataSection.tsx` → `getAdminDashboard()` de `lib/api/dashboard.ts` (`useQuery`) | ✅ | — |
| `GET /api/admin/reports/monthly` | `components/admin/ReportesSection.tsx` → `getMonthlyReport()` de `lib/api/reports.ts` (`useQuery`); pasa `reports` a `SalesReport` | ✅ | — |
| `GET /api/admin/reports/replenishment` | `components/admin/reportes/ReplenishmentReport.tsx` → `getReplenishmentReport()` (`useQuery`) | ✅ | — |
| `GET /api/admin/brand` | `components/providers/BrandProvider.tsx` → `getBrandSettings()` de `lib/api/brand.ts` (`useQuery`); `useBrand()` alimenta `Hero`/`Footer`/`NavHeader`/`Cart`. `BRAND` = fallback SSR | ✅ | — |
| `PUT /api/admin/brand` | `components/admin/MarcaSection.tsx` → `updateBrandSettings()` (`useMutation`, autosave con debounce) | ✅ | — |
| `GET /api/admin/users` | `components/admin/ConfigSection.tsx` → `getAdminUsers()` de `lib/api/adminUsers.ts` (`useQuery`) | ✅ | — |
| `POST /api/admin/users` | `components/admin/ConfigSection.tsx` → `createAdminUser()` (`useMutation` + invalidación) | ✅ | — |
| `DELETE /api/admin/users/:id` | `components/admin/ConfigSection.tsx` → `deleteAdminUser()` (`useMutation`, confirmación inline) | ✅ | — |
| `PUT /api/admin/account` | `components/admin/ConfigSection.tsx` → `updateOwnAccount()` de `lib/api/account.ts` (`useMutation`) | ✅ | — |
| `GET /api/admin/orders` | `components/admin/sections/OrdersSection.tsx` → `getAdminOrders()` de `lib/api/adminOrders.ts` (`useQuery` paginado + filtro de fecha) | ✅ | Vista base (**Fase 7**) + guía/rastreo Skydropx (**Fase 11**) |
| `POST /api/admin/orders/:id/cancel` | `components/admin/orders/OrderDetailModal.tsx` → `cancelAdminOrder()` de `lib/api/adminOrders.ts` (`useMutation`, botón "Cancelar / reembolsar pedido") | ✅ | Fase 12 |
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
- ✅ **Imágenes (YA cableado)**: Cloudinary está cableado en el backend con **endpoints dedicados**
  (el POST/PUT del producto siguen siendo JSON y **ya no** usan `imageSrc`; el front dejó de mandarlo).
  El front las consume así: `AdminProductSchema`/`ProductSchema` traen `images[]`; `ProductForm`
  gestiona la galería (preview + quitar por imagen) y al guardar corre `addProductImages()` /
  `deleteProductImage()` (`lib/api/adminProducts.ts`); `ProductInfo` la muestra en `ImageCarousel`
  (`components/ui/`). Cada producto admite **de 1 a 3 imágenes**:
  - `POST /api/admin/products/:id/images` — **multipart/form-data**, campo `images` (1 a 3 archivos
    por request, tope **3 en total** por producto), formatos `png/jpeg/webp`, **≤ 5 MB** c/u. Sube a
    Cloudinary (`botasdonchuy/products`) y devuelve el producto con `images: { url, publicId }[]`.
  - `DELETE /api/admin/products/:id/images` — body JSON `{ publicId }`. Borra la imagen del producto
    **y de Cloudinary** (sin dejar assets huérfanos) y devuelve el producto.
  - El producto expone `images: { url, publicId }[]` (galería, hasta 3) e `imageSrc` = URL de la
    **primera** imagen (solo lectura, compat con los consumidores actuales `Cart`/`ProductInfo`/etc.).
  - **Flujo sugerido del `ProductForm`**: 1) crear/editar el producto (JSON, sin imágenes) → 2) con el
    `id`, subir los `File` seleccionados a `POST /:id/images`; para quitar una, `DELETE /:id/images`
    con su `publicId`. Reemplazar el `URL.createObjectURL` (preview `blob:` que hoy no persiste) por
    esta subida real. `next.config.ts` ya whitelistea `res.cloudinary.com` para `next/image`.
  - Al **hard-delete** de un producto (sin pedidos) el backend borra también sus imágenes de
    Cloudinary; en **soft-delete** (con pedidos) las conserva.

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
- **Logo (backend listo — no se va a cablear por decisión del dueño):** Cloudinary ya está cableado
  con endpoints dedicados (`POST`/`DELETE /api/admin/brand/logo`) y siguen disponibles si algún día
  se retoma, pero **la tienda va a usar el nombre como logo** (marca secundaria, sin identidad gráfica
  propia por ahora) — no hay plan de subir un logo real, así que no hay trabajo de frontend pendiente
  aquí. El **PUT de marca ya no acepta `logoUrl`** (si el autosave lo manda, se ignora), lo cual sigue
  siendo correcto en este escenario.

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

### Fase 7 — Admin: pedidos ✅
- ✅ `GET /api/admin/orders` — contrato centralizado en `lib/api/adminOrders.ts` (patrón
  `getProducts.ts`): `AdminOrderSchema`/`AdminOrderItemSchema` (Zod, item **sí** trae
  `unitCost`), `adminOrderKeys`, `getAdminOrders(page, perPage, date?)`. Paginado en
  servidor (`{ orders, total, page, perPage, totalPages }`), solo lectura.
- ✅ `components/admin/sections/OrdersSection.tsx` es dueño de la query: filtro de fecha
  (`<input type="date">`, viaja al backend — no filtra en cliente, ver "Notas de
  implementación" en `CLAUDE.md`) y tamaño de página según viewport
  (`useSyncExternalStore` sobre `matchMedia`, 20 en desktop / 5 en mobile).
- ✅ Subcomponentes en `components/admin/orders/`: `OrdersTable` (tabla desktop / cards
  mobile), `OrdersPagination` (ventana + elipsis), `OrderDetailModal` (con trampa de
  foco; muestra `unitCost` + margen), `StatusBadges` (color de `status`/`paymentStatus`
  — campos independientes — más `DropoffBadge`, que ya pinta el aviso "Sin recolección"
  cuando `shippingRequiresDropoff === true`, tanto en la tabla como en el modal).
- **Pendiente:** el resto de la data de envío que el endpoint ya manda pero el schema
  descarta (`trackingNumber`/`trackingUrl`/`labelUrl`/`shipmentStatus`) — ver **Fase 11**.

### Fase 9 — Outlet: sincronización en vivo con el admin ✅
- **Problema 1 — altas no aparecen:** `components/outlet/OutletView.tsx` (`useQuery` sobre
  `productKeys.filtered(filters)`) no se invalidaba cuando `ProductForm` creaba/editaba un
  producto desde el admin.
- **Problema 2 — bajas seguían visibles:** al borrar un producto (`deleteProduct()` en
  `ProductCategoryView.tsx` / `ProductForm.tsx`), el outlet público no se enteraba — seguía
  pintando la card hasta que el usuario refrescaba.
- **Problema 3 — faltaba imagen en la card:** `OutletCard` solo pintaba `imageSrc` si venía
  definido, sin fallback visual cuando el producto no tenía imágenes.
- **Causa raíz real (afinada respecto a la hipótesis original):** `QueryProvider` se monta una
  sola vez en `app/layout.tsx`, así que **dentro de una misma pestaña** admin y storefront
  comparten el mismo `QueryClient`. El bug de altas/bajas no era por `QueryClient`s separados
  sino porque los `onSuccess` de las mutaciones de `ProductForm.tsx`/`ProductCategoryView.tsx`
  solo invalidaban `adminProductKeys.all`, nunca `productKeys` (el key que consume
  `OutletView`). Para el caso de **pestañas de navegador distintas** (cada una con su propio
  `QueryClient` en memoria) sí aplica la necesidad de un mecanismo cross-tab.
- **Fix aplicado:**
  1. `ProductForm.tsx` (create/update y delete) y `ProductCategoryView.tsx` (delete) ahora
     también invalidan `productKeys.all` (match por prefijo → cubre `productKeys.filtered(...)`)
     junto con `adminProductKeys.all`. Resuelve el caso misma-pestaña.
  2. `OutletView.tsx` agrega `staleTime: 30_000` + `refetchOnWindowFocus: true` **local a esa
     query** (el default global en `QueryProvider.tsx` sigue en `refetchOnWindowFocus: false`
     para no afectar el resto de la app). Resuelve el caso pestañas-distintas: al volver el
     foco a `/outlet` tras crear/borrar algo en `/admin`, se refetch sola.
  3. `OutletCard.tsx` ahora muestra el icono `ImageOff` (mismo patrón que
     `components/ui/ImageCarousel.tsx`) cuando `imageSrc` falta, en vez de un hueco vacío.

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

### Fase 10 — Recuperación de contraseña con código + emails (Resend) ✅

> El backend migró `forgot-password` de un stub a un flujo real de **código de 5
> dígitos** enviado por correo vía **Resend**, más dos endpoints nuevos para verificarlo y
> consumirlo. **El frontend ya está conectado**: `ForgotPasswordForm` es un wizard de 3 pasos
> (email → código → nueva contraseña → `/login`).

**Lo que el backend ya hace (referencia):**
- `POST /api/auth/forgot-password` — sin cambios de contrato (`{ email }` → siempre
  `{ ok: true }`), pero ahora, si el correo existe, genera un código numérico de 5 dígitos,
  guarda su hash (nunca el código en claro) + expiración (15 min) + contador de intentos, y lo
  envía por correo con Resend (`../backend/src/services/email.service.ts` +
  `../backend/src/services/email/templates/`).
- `POST /api/auth/verify-reset-code` (`{ email, code }`) — valida el código **sin
  consumirlo**; solo desbloquea la pantalla de nueva contraseña. Responde `400` genérico
  ("Código inválido o expirado") si falta, expiró o se agotaron los intentos (5) —
  el mismo mensaje para los tres casos, para no filtrar cuál fue.
- `POST /api/auth/reset-password` (`{ email, code, newPassword, confirmPassword }`) —
  revalida el código (no confía en el paso anterior), actualiza la contraseña y quema el
  código (un solo uso). `newPassword` exige la misma complejidad que `loginSchema` (min 8
  + mayúscula + símbolo).
- Ambos endpoints nuevos están detrás de `authRateLimiter` (10 req / 15 min), igual que
  `login`/`forgot-password`.
- **Caveat de dominio (Resend):** sin un dominio verificado, `EMAIL_FROM` es
  `onboarding@resend.dev` y Resend **solo entrega a la cuenta owner** del proyecto — un
  correo de prueba a cualquier otra dirección devuelve `403` (silencioso: `sendEmail` lo
  loggea pero no lanza, así que el request de `forgot-password` igual responde `{ ok: true
  }`). Para probar el flujo completo en local/staging hay que usar el correo de esa cuenta
  Resend hasta que se verifique un dominio propio (paso manual de DNS, sin código).

**Trabajo del frontend (esta fase — hecho):**
1. ✅ **Pantalla de código:** `ForgotPasswordForm.tsx` es un wizard de 3 pasos; tras el
   `onSuccess` de `forgotPassword()` avanza al paso `code` (`components/auth/ResetCodeForm.tsx`),
   que usa `CodeInput` (`components/auth/CodeInput.tsx`, OTP de 5 casillas con auto-avance,
   backspace y pegar) y llama `verifyResetCode({ email, code })`.
2. ✅ **Pantalla de nueva contraseña:** `components/auth/NewPasswordForm.tsx` valida con
   `resetPasswordSchema` (reutiliza `passwordComplexity` de `schemas/users.ts`) y llama
   `resetPassword({ email, code, newPassword, confirmPassword })`; éxito → redirige a `/login`.
3. ✅ **Contratos y schemas:** `schemas/auth.ts` expone `resetCodeSchema`/`verifyResetCodeSchema`/
   `resetPasswordSchema`; `lib/api/auth.ts` expone `verifyResetCode()`/`resetPassword()`.
4. ✅ **Errores:** `400` ("Código inválido o expirado") inline bajo el `CodeInput`; en
   `reset-password` el `400` mapea a "El código expiró o ya no es válido"; `429` → mensaje de
   rate-limit en cada paso.
5. ✅ **Reenviar código:** enlace "Reenviar código" en `ResetCodeForm` que rellama
   `forgotPassword()` (el backend regenera el código y resetea los intentos a 0).

### Fase 11 — Admin: envíos y guía Skydropx en pedidos ✅ *(depende de Fase 7)*

> **Contexto.** El backend ya integra Skydropx de punta a punta (`../backend/roadmap-skydropx.md`
> Fases 8.1–8.6): al confirmarse el pago genera la guía automáticamente y el webhook
> `POST /api/webhooks/skydropx` puebla, en cuanto la paquetería la procesa (asíncrono),
> `trackingNumber` / `trackingUrl` / `labelUrl` (PDF de la guía) / `shipmentStatus` en la orden.
> **Ese dato ya viaja al front en `GET /api/admin/orders`** — el backend hace `Order.findAll`
> sin excluir atributos — pero hoy el frontend lo descarta y no lo muestra. Esta fase cierra ese
> hueco: que el dueño pueda **descargar la guía e ver el rastreo** desde el panel de pedidos.

**Lo que el backend ya hace (referencia — no tocar):**
- `GET /api/admin/orders` `[auth]` devuelve cada pedido con las columnas de envío ya pobladas
  por el webhook de Skydropx: `labelUrl` (PDF de la guía para imprimir), `trackingNumber`,
  `trackingUrl` (rastreo del carrier), `shipmentStatus` (estado crudo: `in_transit`,
  `delivered`, etc.) y `skydropxShipmentId`. Nacen `null` y se llenan cuando el webhook los
  reporta (la creación de la guía es asíncrona — ver `roadmap-skydropx.md` §Fase 8.5/8.6).
- `Order.status` avanza solo hacia adelante (`paid` → `shipped` → `delivered`) desde el mismo
  webhook, así que el estado del pedido ya refleja el envío sin polling.
- `shippingRequiresDropoff` (bandera operativa: la paquetería no recoge a domicilio, hay que
  llevar el paquete a sucursal) ya está en el contrato y **ya se valida** en `AdminOrderSchema`.

**Trabajo del frontend (esta fase — hecho):**
1. ✅ **Contrato Zod extendido:** `AdminOrderSchema` (`lib/api/adminOrders.ts`) agrega
   `skydropxShipmentId` / `trackingNumber` / `trackingUrl` / `labelUrl` / `shipmentStatus`
   (todos `z.string().nullable().optional()`) — Zod ya no descarta esas llaves del `.parse()`.
2. ✅ **Guía en la vista de pedidos:** `components/admin/orders/OrdersTable.tsx` (columna
   desktop "Envío" + badges de la card mobile) pinta **"Descargar guía"** (`<a target="_blank"
   rel="noopener noreferrer">`, con `stopPropagation` para no abrir el modal de detalle) cuando
   `order.labelUrl` existe; si no, y el pedido ya está pagado (`canHaveLabel`, excluye
   `pending`/`cancelled`), muestra "Guía en proceso" en vez de un hueco vacío.
3. ✅ **Rastreo y estado del envío:** `OrderDetailModal.tsx` agrega los campos "Guía" / "Rastreo"
   (enlazado a `trackingUrl` si viene) / "Estado del envío" junto a "Paquetería". El estado crudo
   de Skydropx se traduce vía `ShipmentStatusBadge` (`StatusBadges.tsx`,
   `SHIPMENT_STATUS_META` — `in_transit` → "En tránsito", etc., con fallback legible para
   estados no mapeados, ya que `shipmentStatus` no es un enum cerrado).
4. ✅ **Estado del pedido:** `STATUS_META`/`OrderStatusBadge` ya soportaban `shipped`/`delivered`
   desde la Fase 7 — se refleja solo en cuanto el schema (punto 1) deja pasar los campos que
   permiten que el backend avance `order.status`.
5. ✅ **Bandera de recolección:** sin cambios — `DropoffBadge` + alerta inline ya implementados
   en la Fase 7 siguen funcionando igual.
6. ✅ **Contrato validado con Zod**, igual que el resto (`getProducts.ts`); todos los campos
   nuevos son `nullable`, así que un pedido con fallback de tarifa plana (sin guía Skydropx)
   sigue pintando la vista de la Fase 7 sin huecos.

**Salida:** el dueño imprime la guía y sigue el rastreo de cada pedido desde el panel, sin entrar
al dashboard de Skydropx.

### Fase 12 — Admin: cancelación/reembolso manual de pedidos ✅ *(depende de Fase 7)*

> **Contexto.** El backend agregó `POST /api/admin/orders/:id/cancel` (Fase H.5 del
> `../backend/roadmap-hardening.md`) para atender una cancelación pedida **fuera del flujo de
> Stripe** (WhatsApp, llamada): un pedido `pending` libera el stock reservado; un pedido `paid`
> se **reembolsa en Stripe** (reembolso total) y luego se restockea. Hoy el panel de pedidos es
> **solo lectura** (Fase 7) — no hay ninguna acción para cancelar. Esta fase cablea ese botón.

**Lo que el backend ya hace (referencia — no tocar):**
- `POST /api/admin/orders/:id/cancel` `[auth]` — body opcional `{ reason?: string }` (máx. 200
  caracteres, solo una nota para el log). Devuelve `{ order }` con el pedido ya cancelado.
- **Solo `pending` y `paid` son cancelables.** Un pedido `pending` reusa `releaseOrderStock`
  (restock + `status: cancelled` / `paymentStatus: failed`) y cancela el PaymentIntent
  best-effort. Un pedido `paid` emite un **reembolso total real en Stripe** (idempotente) **antes**
  de restockear y queda en `status: cancelled` / `paymentStatus: refunded`, con `refundId` /
  `refundedAt` poblados.
- **Guards:** `shipped` / `delivered` / `cancelled` → **409** (no se restockea un paquete que ya
  salió con guía); id inexistente → **404**; id no numérico → **400**; si el reembolso en Stripe
  falla → **502** y el pedido **no** se cancela (el dinero no se devolvió, requiere atención
  manual).
- El contrato del pedido ya trae el nuevo valor `refunded` en `paymentStatus` y las columnas
  `refundId` / `refundedAt` (ver `../backend/CLAUDE.md`, sección Order + "Manual order
  cancel/refund").

**Trabajo del frontend (esta fase — hecho):**
1. ✅ **Contrato Zod:** `lib/api/adminOrders.ts` agrega `"refunded"` al enum de
   `paymentStatus` de `AdminOrderSchema` y los campos `refundId` / `refundedAt`
   (`z.string().nullable().optional()`). Expone `cancelAdminOrder(id, reason?)`
   (`POST /:id/cancel`, valida la respuesta `{ order }` con `AdminOrderSchema`).
2. ✅ **Acción en la UI:** botón "Cancelar / reembolsar pedido" en `OrderDetailModal.tsx`,
   visible **solo** cuando `status` es `pending` o `paid` (`canCancel`, oculto en
   `shipped`/`delivered`/`cancelled`, que el backend rechaza con 409). Confirmación inline
   (el reembolso es irreversible) con un textarea opcional de motivo (`reason`, máx. 200,
   contador de caracteres) y aviso distinto según `pending` (libera stock) vs `paid`
   (reembolso Stripe + restock). `refundId`/`refundedAt` se muestran en el modal cuando
   existen (junto a Totales).
3. ✅ **Mutation + invalidación:** `useMutation({ mutationFn: cancelAdminOrder })` en
   `OrderDetailModal.tsx` que al `onSuccess` invalida `adminOrderKeys.all`,
   `adminProductKeys.all` y `productKeys.all` (el restock cambia el stock visible en el
   catálogo admin y el outlet público) y notifica al padre vía `onCancelled(order)` —
   `OrdersSection.tsx` usa ese callback para mantener `viewing` sincronizado (el modal
   no se cierra solo, sigue mostrando el pedido ya cancelado/reembolsado) y marca el
   refresh como "manual" (`isManualRefreshRef`) para no disparar el toast de polling que
   normalmente avisa de cambios traídos por el webhook de Skydropx.
4. ✅ **Badges de estado:** `StatusBadges.tsx` pinta `paymentStatus: refunded` ("Reembolsado",
   acento violeta) junto a `unpaid`/`processing`/`paid`/`failed`.
5. ✅ **Errores mapeados:** `409` (estado no cancelable) y `502` (falló el reembolso) se
   muestran inline con el `message` del backend —copia UI accionable— sin cerrar el modal;
   `400`/`404` igual (`cancelOrderErrorMessage()`).

**Salida:** el dueño cancela y reembolsa un pedido desde el panel, con el stock restablecido
automáticamente y el reembolso reflejado en Stripe, sin tocar el dashboard de Stripe.

## Notas de implementación

- **Base URL:** `NEXT_PUBLIC_API_URL` debe apuntar al backend (`http://localhost:4000`);
  sin definir cae a `/api`. No commitear secretos.
- **Contratos:** el backend expone las mismas formas que los tipos del front
  (`components/admin/data/types.ts`, `ProductSchema` en `lib/api/products.ts`). Validar
  cada respuesta con Zod, igual que en `getProducts.ts`.
- **Datos sensibles:** `unitCost` y márgenes solo llegan por rutas `/api/admin/*`
  autenticadas — nunca en el catálogo público.
- **Envíos (Skydropx):** el backend **ya integra Skydropx de punta a punta** (cotización en
  vivo `POST /api/shipping/rates`, guía automática al pagar y webhook de estado —
  `../backend/roadmap-skydropx.md` Fases 8.1–8.6). El checkout ya cotiza en vivo (ver "Shipping"
  en `CLAUDE.md`) y el panel de pedidos ya muestra guía/rastreo (**Fase 11** ✅).
- Ya no quedan fases pendientes del roadmap de integración: la **Fase 12** (cancelación/reembolso
  manual de pedidos) cierra el mapa de endpoints — `POST /api/admin/orders/:id/cancel` (Fase H.5
  del `../backend/roadmap-hardening.md`) ya está cableado en el panel de pedidos.
