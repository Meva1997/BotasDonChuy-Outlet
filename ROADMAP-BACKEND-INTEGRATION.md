# Roadmap — Conexión del frontend con el backend real

Estado de la migración de **mocks → endpoints reales** del backend Express
(`../backend`, `http://localhost:4000`, Swagger en `/api/docs`).

Todas las llamadas deben pasar por la instancia axios única `lib/api/client.ts`
(adjunta `Bearer` del `authStore` y maneja el `401`). El patrón de referencia
—ya implementado— es `lib/api/products.ts`: **axios + validación Zod en runtime +
query-key factory listo para TanStack Query**. Replicar ese patrón en cada
migración.

**Cómo está organizado este documento:** primero el mapa de endpoints ↔ consumidor
(la vista por API), después las fases en **orden numérico estricto**, separadas en
[completadas](#fases-completadas-) (1–15) y [pendientes](#fases-pendientes-) (16–20).
Las fases están numeradas por el orden en que se hicieron/se van a hacer, no por
dependencia: esa se lee en la columna "Depende de" del índice.

## Leyenda

- ✅ **Conectado** — ya consume el endpoint real.
- 🔴 **Pendiente** — el frontend sigue con mock / stub.
- ⚪ **Diferido** — depende de una fase externa (Stripe / UI aún no construida).

## Mapa de endpoints ↔ consumidor en el frontend

| Endpoint backend | Consumidor en el frontend | Estado | Fase |
|---|---|---|---|
| `POST /api/auth/login` | `components/auth/LoginForm.tsx` → `login()` de `lib/api/auth.ts` | ✅ | 1 |
| `POST /api/auth/forgot-password` | `components/auth/ForgotPasswordForm.tsx` → `forgotPassword()` (`useMutation`) | ✅ | 1 · 10 |
| `POST /api/auth/verify-reset-code` | `components/auth/ResetCodeForm.tsx` → `verifyResetCode()` de `lib/api/auth.ts` (`useMutation`, `CodeInput` OTP) | ✅ | 10 |
| `POST /api/auth/reset-password` | `components/auth/NewPasswordForm.tsx` → `resetPassword()` (`useMutation` → redirect `/login`) | ✅ | 10 |
| `GET /api/auth/me` | `components/auth/AdminGuard.tsx` → `getMe()` (valida token + rehidrata `user`) | ✅ | 1 |
| `GET /api/products` | `lib/api/products.ts` → `getProducts()` | ✅ | — |
| `GET /api/products` → `q` / `orden` / `precioMin` / `precioMax` | *(sin consumidor todavía)* — `components/outlet/OutletFilters.tsx` necesita buscador, selector de orden y rango de precio; hoy `ProductFilters` solo manda `categoria`/`talla`/`page` | 🔴 | **18** |
| `GET /api/products/:id` | `lib/api/products.ts` → `getProductById()` | ✅ | — |
| `POST /api/orders` | `components/checkout/UserDetails.tsx` → `createOrder()` de `lib/api/orders.ts` (`useMutation`); `completeOrder()` congela la respuesta `201` | ✅ | 2 |
| `POST /api/orders` → `clientSecret` | `components/checkout/usePlaceOrder.ts` confirma el pago con Stripe.js (`confirmCardPayment` + `pm_card_visa`) usando el `clientSecret` que devuelve `createOrder()`; `PaymentSection.tsx` es el panel de tarjeta de prueba | ✅ | 8 (**test/sandbox**) |
| `POST /api/webhooks/stripe` | *(lo invoca Stripe, no el front)* — el pago se confirma en el cliente; el webhook marca la orden `paid` | ✅ | 8 — backend activo (firma verificada); no requiere código de front |
| `POST /api/orders` → header `Idempotency-Key` | `components/checkout/usePlaceOrder.ts` pide la clave al `CheckoutContext` (`getIdempotencyKey(signature)`) y `createOrder()` de `lib/api/orders.ts` la manda como header; la respuesta expone `replayed` leyendo `Idempotency-Replayed` | ✅ | 15 |
| `POST /api/orders` → `order.publicToken` | `components/checkout/usePlaceOrder.ts` — el `201` del checkout ya trae el token; sirve para mandar al comprador a `/pedido/<token>` sin esperar el correo | 🔴 | **17** |
| `GET /api/orders/lookup/:token` | *(sin consumidor todavía)* — falta la página pública de seguimiento `/pedido/[token]`, a la que apunta el link del correo de confirmación | 🔴 | **17** |
| `GET /api/admin/products` | `components/admin/ProductSection.tsx` → `getAdminProducts()` de `lib/api/adminProducts.ts` (`useQuery`) | ✅ | 3 |
| `POST /api/admin/products` | `components/admin/ProductForm.tsx` → `createProduct()` (`useMutation` + invalidación) | ✅ | 3 |
| `PUT /api/admin/products/:id` | `components/admin/ProductForm.tsx` → `updateProduct()` (`useMutation`) | ✅ | 3 |
| `DELETE /api/admin/products/:id` | `ProductCategoryView.tsx` / `ProductForm.tsx` → `deleteProduct()` (`useMutation`; soft/hard lo decide el backend) | ✅ | 3 |
| `POST /api/admin/products/:id/images` | `ProductForm.tsx` → `addProductImages()` de `lib/api/adminProducts.ts` (galería de hasta 3, subida al guardar) | ✅ | 3 |
| `DELETE /api/admin/products/:id/images` | `ProductForm.tsx` → `deleteProductImage()` (quitar una imagen por `publicId` al guardar) | ✅ | 3 |
| `POST /api/admin/products/import/preview` | `components/admin/sections/ImportSection.tsx` → `previewProductImport()` de `lib/api/adminProductImport.ts` (`useMutation`, multipart) | ✅ | 13 |
| `POST /api/admin/products/import` | `ImportSection.tsx` → `commitProductImport()` (`useMutation` + invalidación de `adminProductKeys`/`productKeys`) | ✅ | 13 |
| `GET /api/admin/dashboard` | `components/admin/DataSection.tsx` → `getAdminDashboard()` de `lib/api/dashboard.ts` (`useQuery`) | ✅ | 3 |
| `GET /api/admin/dashboard` → KPI `GASTOS` | `components/admin/sections/DataSection.tsx` → `KpiGrid` (ya lo pinta genérico) | ✅ | El label cambió de `GASTOS FIJOS` a `GASTOS` y ahora sale de gastos reales; el front no requiere cambios |
| `GET /api/admin/reports/monthly` | `components/admin/ReportesSection.tsx` → `getMonthlyReport()` de `lib/api/reports.ts` (`useQuery`); pasa `reports` a `SalesReport` | ✅ | 4 |
| `GET /api/admin/reports/replenishment` | `components/admin/reportes/ReplenishmentReport.tsx` → `getReplenishmentReport()` (`useQuery`) | ✅ | 4 |
| `GET /api/admin/brand` | `components/providers/BrandProvider.tsx` → `getBrandSettings()` de `lib/api/brand.ts` (`useQuery`); `useBrand()` alimenta `Hero`/`Footer`/`NavHeader`/`Cart`. `BRAND` = fallback SSR | ✅ | 5 |
| `PUT /api/admin/brand` | `components/admin/MarcaSection.tsx` → `updateBrandSettings()` (`useMutation`, autosave con debounce) | ✅ | 5 |
| `POST /api/admin/brand/logo` | `MarcaSection.tsx` *(no se va a cablear por ahora)* — subida real del logo a Cloudinary | ⚪ | Sin trabajo previsto — decisión del dueño, ver Fase 5 |
| `DELETE /api/admin/brand/logo` | `MarcaSection.tsx` *(no se va a cablear por ahora)* — quitar el logo | ⚪ | Sin trabajo previsto |
| `GET /api/admin/users` | `components/admin/ConfigSection.tsx` → `getAdminUsers()` de `lib/api/adminUsers.ts` (`useQuery`) | ✅ | 6 |
| `POST /api/admin/users` | `components/admin/ConfigSection.tsx` → `createAdminUser()` (`useMutation` + invalidación) | ✅ | 6 |
| `DELETE /api/admin/users/:id` | `components/admin/ConfigSection.tsx` → `deleteAdminUser()` (`useMutation`, confirmación inline) | ✅ | 6 |
| `PUT /api/admin/account` | `components/admin/ConfigSection.tsx` → `updateOwnAccount()` de `lib/api/account.ts` (`useMutation`) | ✅ | 6 |
| `GET /api/admin/orders` | `components/admin/sections/OrdersSection.tsx` → `getAdminOrders()` de `lib/api/adminOrders.ts` (`useQuery` paginado + filtro de fecha) | ✅ | 7 (vista base) + 11 (guía/rastreo Skydropx) |
| `POST /api/admin/orders/:id/cancel` | `components/admin/orders/OrderDetailModal.tsx` → `cancelAdminOrder()` de `lib/api/adminOrders.ts` (`useMutation`, botón "Cancelar / reembolsar pedido") | ✅ | 12 |
| `PATCH /api/admin/orders/:id/status` | `components/admin/orders/OrderDetailModal.tsx` → `updateAdminOrderStatus()` de `lib/api/adminOrders.ts` (`useMutation`, sección "Estado del envío": enviado / entregado / agregar guía) | ✅ | 14 |
| `POST /api/admin/orders/:id/shipment/retry` | *(sin consumidor todavía)* — `components/admin/orders/OrderDetailModal.tsx` necesita el botón "Reintentar guía" para un pedido pagado sin `skydropxShipmentId` | 🔴 | **16** |
| `POST /api/coupons/validate` | *(sin consumidor todavía)* — `components/checkout/OrderSummary.tsx` necesita el campo de cupón (y revalidar con el correo en `ShippingOptions.tsx`) | 🔴 | **19** |
| `POST /api/orders` → `couponCode` | `lib/api/orders.ts` (`CreateOrderPayload`) + `components/checkout/usePlaceOrder.ts` (el cupón entra en `orderSignature`) | 🔴 | **19** |
| `POST /api/orders` → `order.couponCode`/`couponDiscount` | `components/checkout/OrderTotals.tsx` (fila de descuento) y `Success.tsx` — el total ya viene neto de cupón | 🔴 | **19** |
| `GET /api/admin/coupons` | *(sin consumidor todavía)* — falta la sección **Cupones** del panel | 🔴 | **19** |
| `POST /api/admin/coupons` | *(sin consumidor todavía)* — formulario de alta en la sección **Cupones** | 🔴 | **19** |
| `PUT /api/admin/coupons/:id` | *(sin consumidor todavía)* — edición y cancelación (`active: false`) en la sección **Cupones** | 🔴 | **19** |
| `DELETE /api/admin/coupons/:id` | *(sin consumidor todavía)* — borrado con confirmación inline, igual que `AdminsCard.tsx` | 🔴 | **19** |
| `GET /api/admin/expenses` | *(sin consumidor todavía)* — falta la sección **Gastos** del panel | 🔴 | **20** |
| `GET /api/admin/expenses/summary` | *(sin consumidor todavía)* — tarjeta "cuánto retirar este mes" + lista de próximos cargos | 🔴 | **20** |
| `GET /api/admin/expenses/history` | *(sin consumidor todavía)* — historial mes con mes + los cambios de precio de cada mes | 🔴 | **20** |
| `POST /api/admin/expenses` | *(sin consumidor todavía)* — formulario de alta en la sección **Gastos** | 🔴 | **20** |
| `PUT /api/admin/expenses/:id` | *(sin consumidor todavía)* — edición; mandar `amount` **agrega una versión**, no sobrescribe | 🔴 | **20** |
| `DELETE /api/admin/expenses/:id` | *(sin consumidor todavía)* — borrado con confirmación inline, igual que `AdminsCard.tsx` | 🔴 | **20** |

## Índice de fases

| # | Fase | Estado | Depende de |
|---|---|---|---|
| 1 | Autenticación *(desbloquea todo el admin)* | ✅ | — |
| 2 | Checkout público *(ruta de ingresos)* | ✅ | — |
| 3 | Admin: catálogo y dashboard | ✅ | 1 |
| 4 | Admin: reportes | ✅ | 1 |
| 5 | Marca (identidad de tienda) | ✅ | 1 |
| 6 | Admin: usuarios y cuenta | ✅ | 1 |
| 7 | Admin: pedidos | ✅ | 1 |
| 8 | Pagos con Stripe *(modo prueba / sandbox)* | ✅ | 2 |
| 9 | Outlet: sincronización en vivo con el admin | ✅ | 3 |
| 10 | Recuperación de contraseña con código + emails (Resend) | ✅ | 1 |
| 11 | Admin: envíos y guía Skydropx en pedidos | ✅ | 7 |
| 12 | Admin: cancelación/reembolso manual de pedidos | ✅ | 7 |
| 13 | Admin: importación/restock masivo vía Excel | ✅ | 3 |
| 14 | Admin: marcar pedido como enviado/entregado a mano | ✅ | 7 |
| 15 | `Idempotency-Key` en el checkout | ✅ | 2 |
| 16 | Admin: reintentar la guía de Skydropx | 🔴 | 11 |
| 17 | Página pública de seguimiento del pedido *(cara al cliente)* | 🔴 | 2 |
| 18 | Outlet: buscador, orden y rango de precio *(cara al cliente)* | 🔴 | — |
| 19 | Cupones: campo en el checkout + sección en el panel | 🔴 | 2 |
| 20 | Admin: gastos y suscripciones | 🔴 | — |

---

# Fases completadas ✅

## Fase 1 — Autenticación ✅ *(desbloquea todo el admin)*

- ✅ `POST /api/auth/login` — `LoginForm` usa `login()` de `lib/api/auth.ts` (sin mock).
- ✅ `POST /api/auth/forgot-password` — `ForgotPasswordForm` con `useMutation` → `forgotPassword()`.
- ✅ `GET /api/auth/me` — `AdminGuard` valida el token real (`getMe()`) y rehidrata `user`;
  render bloqueante con `staleTime` de 5 min.
- **Salida:** sesión real de admin; el interceptor `401` cierra sesión y redirige.
- Contratos y validación Zod centralizados en `lib/api/auth.ts` (patrón `getProducts.ts`).

> El flujo completo de recuperación de contraseña (código de 5 dígitos + correo) se cerró
> después, en la **Fase 10**.

---

## Fase 2 — Checkout público ✅ *(ruta de ingresos)*

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

---

## Fase 3 — Admin: catálogo y dashboard ✅

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

---

## Fase 4 — Admin: reportes ✅

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

---

## Fase 5 — Marca (identidad de tienda) ✅

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

---

## Fase 6 — Admin: usuarios y cuenta ✅

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

---

## Fase 7 — Admin: pedidos ✅

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
- ✅ **Cerrado en la Fase 11:** el resto de la data de envío que el endpoint ya mandaba pero
  el schema descartaba (`trackingNumber`/`trackingUrl`/`labelUrl`/`shipmentStatus`).

---

## Fase 8 — Pagos con Stripe ✅ *(modo prueba / sandbox)*

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

---

## Fase 9 — Outlet: sincronización en vivo con el admin ✅ *(depende de Fase 3)*

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

---

## Fase 10 — Recuperación de contraseña con código + emails (Resend) ✅ *(depende de Fase 1)*

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

---

## Fase 11 — Admin: envíos y guía Skydropx en pedidos ✅ *(depende de Fase 7)*

> **Contexto.** El backend ya integra Skydropx de punta a punta (`../backend/roadmaps-completados/roadmap-skydropx.md`
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
  reporta (la creación de la guía es asíncrona — ver `roadmaps-completados/roadmap-skydropx.md` §Fase 8.5/8.6).
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

---

## Fase 12 — Admin: cancelación/reembolso manual de pedidos ✅ *(depende de Fase 7)*

> **Contexto.** El backend agregó `POST /api/admin/orders/:id/cancel` (Fase H.5 del
> `../backend/roadmaps-completados/roadmap-hardening.md`) para atender una cancelación pedida **fuera del flujo de
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

---

## Fase 13 — Admin: importación/restock masivo de productos vía Excel ✅ *(depende de Fase 3)*

> **Contexto.** El backend agregó la importación masiva por Excel para que el dueño pueda subir un
> `.xlsx` cuando llega mercancía nueva (productos nuevos + restock de los existentes) en vez de
> editar producto por producto. Son **dos endpoints**: uno previsualiza y otro aplica. Hoy no hay
> ninguna UI que los consuma — es puramente backend hasta esta fase.
>
> **Por qué el flujo es de dos pasos y la pantalla de revisión no es opcional:** el restock **suma**
> stock y **no hay forma de deshacerlo** desde la app. Si el dueño aplica un archivo a ciegas y
> traía una fórmula que no se pudo leer, una columna mal escrita o un nombre que empareja con el
> producto equivocado, la corrección es manual producto por producto. Por eso el paso 1 nunca
> escribe nada y el paso 2 recibe lo que el dueño **vio y corrigió en pantalla**, no el archivo.

**Lo que el backend ya hace (referencia — no tocar):**

- **Paso 1 · `POST /api/admin/products/import/preview` `[auth]`** — multipart/form-data, campo
  `file` (máx. 2 MB, solo `.xlsx`, máx. **500 filas**). **No escribe nada.** Encabezado canónico en
  español: `Código | Nombre | Categoría | Descripción | Precio original | Precio oferta | Costo
  unitario | Tallas | Peso (kg) | Largo (cm) | Ancho (cm) | Alto (cm) | Visible` (insensible a
  acentos/mayúsculas, con alias comunes tipo `SKU`/`Tipo`). Responde `200` con
  `{ summary, warnings, rows }`:
  - `summary`: `{ total, created, updated, unchanged, failed }`.
  - `warnings` (nivel archivo): `string[]`, p. ej. columnas que **no se reconocieron y no se van a
    importar** — hay que mostrarlas, es el aviso que evita una importación fantasma.
  - `rows[]`: por fila, `{ row, action, code, name, productId, before, after, changes, sizeChanges,
    reactivated, warnings, message, input }`.
    - `action`: `"create"` · `"update"` · `"unchanged"` (empareja pero no cambia nada) · `"error"`.
    - `before`: el producto tal como está hoy (`null` si se va a crear) · `after`: cómo quedaría.
      Ambos con la forma `{ id, code, name, type, description, originalPrice, salePrice, unitCost,
      weightKg, lengthCm, widthCm, heightCm, visible, discontinued, sizes: [{size, stock}], stock }`.
    - `changes`: solo los campos escalares que cambian → `{ field, label, before, after }` (`label`
      ya viene en español, listo para la tabla).
    - `sizeChanges`: `{ size, before, added, after }` — **`added` se SUMA a `before`**, no lo
      reemplaza. Es el dato que más conviene resaltar en la UI.
    - `warnings` (por fila): interpretaciones a confirmar (coma decimal, celda con formato de
      fecha, código que solo difiere en mayúsculas) o el aviso de que la fila no cambia nada.
    - `input`: **la fila que hay que devolver al backend** en el paso 2 (editada si hace falta).
- **Paso 2 · `POST /api/admin/products/import` `[auth]`** — **JSON**, `{ rows: [...] }` con los
  `input` del preview. Responde `200` con `{ summary, rows: [{ row, status: "created" | "updated" |
  "unchanged" | "error", code, name, productId?, message }] }`.
  - En cada `input`, una clave **ausente** significa "no toques esa columna del producto"; `null`
    equivale a omitirla. **No se aceptan claves desconocidas** (400) — no manden el objeto de
    preview completo, solo `input`.
  - `sizes` acepta `"25, 26, 26"` (una ocurrencia = una unidad) **o `"26x20"`** (20 piezas de la
    26), mezclables. La notación `x` es la que hace usable el restock en una hoja de cálculo.
  - Enviar el **mismo lote dos veces en menos de 60 s** responde **`409`** (protección de doble
    clic). El `message` explica que el stock se duplicaría; mostrarlo tal cual.
- Emparejamiento por `Código` (insensible a mayúsculas) o, si la fila no lo trae, por `Nombre`
  exacto insensible a mayúsculas. Un valor que empareja con **más de un producto** es ambiguo y esa
  fila sale como `error` pidiendo un código. Sin match crea un producto nuevo; con match actualiza
  **sin borrar** ningún campo que la fila no mencione. Un producto descontinuado que hace match se
  reactiva (`reactivated: true`).
- Éxito parcial: una fila inválida no bloquea las demás, ni en el preview ni al confirmar. Todo
  `message` ya es una oración en español lista para mostrar tal cual (mismo criterio que el resto
  del backend, ver `../backend/CLAUDE.md` sección "Error messages are the frontend's UI copy").
- Ver `../backend/CLAUDE.md`, sección **"Importación/restock masivo de productos"**, para el
  detalle completo (upsert aditivo, índice único parcial en `code`, lectura de celdas, etc.).

**Trabajo del frontend (esta fase — hecho):**
1. ✅ **Sección propia `importar`** en el Sidebar (la pantalla de revisión necesita todo el ancho)
   **más** un botón "Importar Excel" en la cabecera de `ProductSection.tsx` que navega a
   `?seccion=importar`, para que se descubra desde donde el dueño gestiona el catálogo.
2. ✅ `lib/api/adminProductImport.ts` expone `previewProductImport(file)` (`FormData`, campo
   `file`, `Content-Type: multipart/form-data`) y `commitProductImport(rows)` (JSON), con Zod:
   **preview con `.parse()` estricto** (es de solo lectura y un parse fallido es reintentable sin
   riesgo) y **commit con `safeParse` + `console.warn` + dato crudo** (razonamiento de
   `acceptWrite`: un 2xx ya escribió, y convertirlo en error invitaría a un reintento que
   **duplica el stock**). `importPreviewErrorMessage()`/`importCommitErrorMessage()` mapean los
   status prefiriendo el `message` del backend.
3. ✅ **Pantalla de revisión** (`components/admin/import/`): `warnings` de archivo fijos arriba
   (`ImportWarnings`, colapsable pero con el conteo siempre visible), una fila por `rows[]`
   filtrable por acción con badge propio, diff campo por campo (`ImportDiff`) y la aritmética de
   stock por talla como ecuación explícita `antes + suma = queda` (`ImportSizeDiff`, el bloque
   con más peso visual de la pantalla porque es la operación irreversible). `create` muestra los
   valores de `after`; `error` muestra el `message` tal cual y deja corregir la fila ahí mismo.
   Los `warnings` por fila se muestran junto a la fila, y su conteo aparece en la cabecera
   colapsada para que una fila cerrada nunca esconda un aviso.
4. ✅ **Edición inline** (`ImportRowEditor`/`EditableCell`) con un **modelo de presencia
   explícita**: cada celda lleva `presence: "absent" | "present"` aparte del texto, porque en el
   contrato una clave ausente significa "no toques esa columna" pero `description: ""` **sí**
   borra la descripción — y el valor de un `<input>` siempre es un string. Teclear y borrar
   significa `""`; a "ausente" solo se llega por el control "No tocar". `visible` es un
   tri-estado (`No tocar`/`Sí`/`No`) por el mismo motivo.
   > ⚠️ **Re-previsualizar tras editar es imposible con este contrato**: `/import/preview` solo
   > acepta un archivo, así que re-subirlo devuelve el mismo plan e ignora las ediciones. En vez
   > de fingirlo, la UI **suprime el diff que dejó de ser cierto**: editar `code`/`name` invalida
   > todo (la fila puede emparejar con otro producto), editar otro campo suprime solo lo afectado,
   > y en su lugar se muestra un **diff local de la instrucción** ("Cambios que hiciste a la
   > fila"), que es lo único que sí se puede afirmar con certeza.
5. ✅ Checkbox por fila (por defecto todas menos `error` y `unchanged`; las `unchanged` van en un
   grupo colapsado tras un contador para no enterrar lo relevante) + botón **"Aplicar N filas"**
   en una **barra fija** con el doble conteo (lo que trae el archivo vs. lo que se va a aplicar),
   para que en un archivo de 500 filas el compromiso nunca quede fuera de pantalla.
6. ✅ Todo se deshabilita mientras la petición está en vuelo, pero **la tabla no se desmonta**:
   si el commit falla, no se pierden las ediciones ni la selección.
7. ✅ `ImportResults` muestra el resumen (contadores animados) + el detalle por fila, con
   "Corregir las filas con error" que reselecciona **solo** las fallidas.
8. ✅ `onSuccess` invalida `adminProductKeys.all` + `productKeys.all` — también con
   `summary.failed > 0` (un éxito parcial sí escribió) y también si el Zod del cuerpo falló.
9. ✅ Plantilla `public/plantilla-importacion-productos.xlsx` (descargable desde el dropzone),
   generada por `scripts/generate-plantilla-importacion.mjs` con el `exceljs` **del backend**
   (cero dependencias nuevas en el frontend). Trae el encabezado canónico, tres filas de ejemplo
   —una de ellas demuestra `26x20`— y una hoja "Instrucciones". Además, panel plegable
   "Formato del archivo" en la UI.

**Decisiones de diseño que conviene no revertir sin leer esto:**
- **El estado vive en `store/importStore.ts` (Zustand, SIN `persist`)**, no en el componente: el
  panel desmonta la sección activa al cambiar de pestaña del Sidebar, y perder una revisión a
  medias obligaría a rehacerlo todo. Sin `persist` a propósito: un plan restaurado tras recargar
  se calculó contra un catálogo que pudo cambiar, y presentarlo como fresco es la misma mentira
  que un diff desactualizado pero más difícil de notar.
- **Todo se clavea por el ÍNDICE de `plan.rows`, nunca por el folio `row`** (dato externo,
  opcional en el contrato y potencialmente repetido). El merge del resultado del commit es
  **posicional** (`response.rows[k]` ↔ `sentIndices[k]`), con fallback por folio.
- **Una fila aplicada con éxito nunca vuelve al payload** (`applied` en el reducer). El restock
  suma; el candado es estructural, no una convención de quien arme el siguiente lote.
- **Dependencias entre filas del mismo archivo**: el preview resuelve contra un catálogo virtual,
  así que deseleccionar la fila que crea `BTA-9` cambia el resultado de la que lo restockea.
  `dependencies.ts` lo detecta con una señal exacta (`action === "update" && productId === null`),
  lo avisa y ofrece "Seleccionar las filas faltantes" — sin bloquear (confirmación inline).
- **Los conteos se derivan de `rows`, no del `summary`** (que solo se usa como verificación
  cruzada con `console.warn`): la tabla es lo que el dueño puede auditar.
- **`serializeRowEdit` usa una whitelist** (`EDITABLE_FIELDS ... satisfies keyof ImportRowInput`),
  también para las filas no editadas: el body del commit es `.strict()`, así que una clave que el
  preview devuelva y el commit no acepte mataría el **lote entero** con un 400.
- El **409 de doble envío** se pre-detecta en cliente comparando contra el último lote enviado
  (reintentar solo las fallidas es un subconjunto y no se bloquea, pero reintentar *todas* cuando
  todas fallaron sí daría 409 sin haber escrito nada).

**Tests** (`components/admin/import/__tests__/`, los primeros del repo): 38 casos sobre los
módulos puros — round-trip ausente ↔ `""`, coerción de `"1,250.50"`/`"1,5"`/basura, la whitelist
de serialización, el candado de filas aplicadas, y el detector de dependencias.

**Salida:** el dueño sube un Excel con mercancía nueva/restock, **revisa en pantalla lo viejo vs.
lo nuevo antes de que se escriba nada**, corrige lo que haga falta, y recién entonces aplica —
sin salir del panel y sin riesgo de duplicar stock.

---

## Fase 14 — Admin: marcar pedido como enviado/entregado a mano ✅ *(depende de Fase 7)*

> **Contexto.** Antes de esta fase un pedido solo llegaba a `shipped`/`delivered` cuando **Skydropx**
> reportaba un envío que **Skydropx** creó. Si en el checkout la cotización en vivo falló y se cayó al
> fallback de tarifa plana, el pedido nacía sin `skydropxRateId` → no se generaba guía → nunca llegaba
> el webhook → **se quedaba en `paid` para siempre**: el cliente jamás recibía el correo de "tu pedido
> va en camino" y el panel contaba como pendiente algo ya entregado. El panel podía **cancelar**
> (Fase 12) pero no **avanzar** el estado.

**Lo que el backend ya hacía (referencia — no se tocó):**
- `PATCH /api/admin/orders/:id/status` `[auth]` — body
  `{ status: "shipped" | "delivered", trackingNumber?, trackingUrl?, shippingCarrier? }`.
  Devuelve `{ order }` con el pedido actualizado y sus `items` (mismo shape que
  `GET /api/admin/orders`, así que `AdminOrderSchema` lo valida sin cambios).
- **Solo hacia adelante**, con el mismo rango que aplica el webhook de Skydropx
  (`pending < paid < shipped < delivered`). **Repetir el estado actual sí se permite** — es como se
  agrega una guía a un pedido ya marcado enviado sin ella; retroceder responde **409**.
- **Guards:** pedido `cancelled` → **409**; pedido todavía `pending` (sin pago confirmado) → **409**;
  `status: "cancelled"` en el body → **400** (cancelar es exclusivo de
  `POST /api/admin/orders/:id/cancel`, el único camino que reembolsa y restockea); id inexistente →
  **404**; id no numérico → **400**.
- **El correo "tu pedido va en camino" sale exactamente una vez por pedido**, lo dispare el panel o
  el webhook de Skydropx: los dos comparten el mismo guard atómico
  (`WHERE trackingNumber IS NULL`) y el mismo `idempotencyKey` de Resend. Marcar `delivered` **sin**
  guía es válido (entrega en mano o local) y no manda correo.
- Ninguna columna nueva: `trackingNumber`/`trackingUrl`/`shippingCarrier` ya existían en el contrato
  del pedido desde la Fase 11.

**Lo que se hizo en el frontend:**
1. ✅ **Contrato:** `lib/api/adminOrders.ts` expone `updateAdminOrderStatus(id, input)`
   (`PATCH /:id/status`, respuesta `{ order }` validada con `AdminOrderSchema`) + el tipo
   `AdminOrderStatusUpdate`.
2. ✅ **Acción en la UI:** sección "Estado del envío" en `OrderDetailModal.tsx`, antes del bloque de
   cancelación: "Marcar como enviado" (solo en `paid`) y "Marcar como entregado" (`paid`/`shipped`);
   nada en `pending`/`cancelled`/`delivered` — los estados que el backend rechaza con 409. El de
   "enviado" abre un formulario inline con guía / URL de rastreo / paquetería, **los tres
   opcionales**, y avisa qué pasa en cada caso (con guía: "se enviará el correo de rastreo, no se
   puede deshacer"; sin guía: "no se manda el correo, puedes agregarla después").
3. ✅ **Guía tardía:** un pedido ya `shipped` **sin** `trackingNumber` ofrece "Agregar guía" con el
   mismo formulario (el backend acepta repetir `status: "shipped"` justo para esto).
4. ✅ **Mutation + invalidación:** `useMutation` hermano del de cancelación; al `onSuccess` invalida
   **solo** `adminOrderKeys.all` (avanzar el estado no toca stock) y notifica al padre por callback.
5. ✅ **Errores mapeados:** `statusUpdateErrorMessage` — `409` (retroceso / cancelado / aún no
   pagado) y `400` (validación por campo) se pintan con el `message` del backend, `404` con copia
   propia; el modal no se cierra y no se pierde lo capturado.

**Decisiones de diseño que conviene no revertir sin leer esto:**
- **Las claves vacías se OMITEN del body, no se mandan como `""`** (`updateAdminOrderStatus` hace el
  trim y decide). El backend valida los tres campos con `.trim().min(1)`, así que un `""` sería un
  400; y una clave ausente significa "no toques ese campo", que es justo lo que permite avanzar el
  estado sin borrar la guía ya guardada (los campos son "último gana").
- **La confirmación de "entregado" no manda los campos de guía**, aunque el otro formulario los
  tenga en estado: escribiría datos que el dueño no está viendo en pantalla.
- **La prop del modal es `onOrderUpdated`, una sola para las dos mutations** (antes `onCancelled`).
  `OrdersSection` hace lo mismo en ambos casos —marcar `isManualRefreshRef` + `setViewing`—, y esa
  marca es obligatoria: `status`/`trackingNumber` están en `orderSignature`, así que sin ella el
  siguiente refetch dispararía el toast de "pedido actualizado" por un cambio que hizo el propio
  dueño hace dos segundos.
- **La URL de rastreo se valida en cliente** (`isValidTrackingUrl`, `new URL()` + protocolo http/s)
  porque es el único 400 que el dueño puede prevenir mientras teclea. El resto de las reglas
  (longitudes) se deja al backend, cuyo `message` ya dice qué campo corregir; los `maxLength` de los
  inputs espejean sus topes (100 / 500 / 80).
- **La acción vive solo en el modal**, no en la fila de `OrdersTable`: marcar enviado sin ver la
  dirección, los artículos y si el pedido requiere drop-off es justo el error que esta pantalla
  existe para evitar.

**Salida:** ningún pedido se queda atorado en `paid` por no haber pasado por Skydropx; el dueño lo
mueve a enviado/entregado desde el panel y el cliente recibe su correo de rastreo igual que en el
flujo automático.

---

## Fase 15 — `Idempotency-Key` en el checkout ✅ *(depende de Fase 2)*

> **Contexto.** `POST /api/orders` ya era idempotente antes de esta fase (Fase O.2 del backend), pero
> lo lograba **infiriendo** la identidad del intento a partir de una huella del carrito + los datos
> del cliente. Esa inferencia falla en los dos sentidos: dos pedidos legítimos que casualmente se ven
> iguales se leen como uno, y un reenvío cuyo cuerpo cambió mínimamente se lee como dos. El header
> convierte la protección en **explícita**: el front declara "este es el mismo intento de compra" en
> vez de dejar que el servidor lo adivine.

**Lo que el backend ya hacía (referencia — no se tocó):**
- `POST /api/orders` es **idempotente desde la Fase O.2**. Un reenvío del mismo checkout dentro de
  una **ventana de 60 s** no crea un segundo pedido: devuelve la **misma respuesta del original**
  (mismo `order`, mismo `clientSecret`, mismo `201`). Antes, un doble clic creaba otra orden, otro
  PaymentIntent real y **descontaba el stock otra vez**, y ese stock no se liberaba hasta 30–40 min
  después.
- El header `Idempotency-Key` (opcional, máx. 200 caracteres) **tiene prioridad** sobre esa huella.
- **Contrato del header:** un valor **nuevo por cada intento de compra**. Reenviarlo con el mismo
  carrito devuelve el pedido original; reusarlo con un carrito **distinto** responde **409**
  ("Esa clave de idempotencia ya se usó para otro pedido…"); uno de más de 200 caracteres, **400**.
- Un intento fallido que **no alcanzó a crear el pedido** (`409` sin stock, `503` de cotización,
  `400` de validación) **libera la clave**: el cliente puede corregir y reintentar de inmediato.
- El **cuerpo** del reenvío es idéntico al del original; lo que lo distingue es el header
  **`Idempotency-Replayed: true`**, presente solo en la respuesta repetida y expuesto por CORS
  (`exposedHeaders` en `app.ts`) para que el navegador lo deje leer.

**Lo que se hizo en el frontend:**
1. ✅ **Generación de la clave:** `lib/domain/idempotency.ts` → `newIdempotencyKey()`
   (`crypto.randomUUID()` con fallbacks, ver abajo). Módulo puro, con specs.
2. ✅ **Ciclo de vida:** `CheckoutContext` guarda `{ signature, key }` en un `ref` y expone
   `getIdempotencyKey(signature)` (perezosa: la crea si esa firma no tiene) + `resetIdempotencyKey()`.
   `completeOrder()` la limpia. Se clavea con la **misma firma** que la orden pendiente
   (carrito + cliente + tarifa elegida), así que rota sola cuando cambia el carrito o se re-cotiza el
   envío — sin un segundo mecanismo de invalidación que pueda desincronizarse del primero.
3. ✅ **Envío:** `createOrder(payload, idempotencyKey?)` en `lib/api/orders.ts` la manda como header.
4. ✅ **Botón deshabilitado mientras el pago está en vuelo:** ya existía
   (`ShippingOptions.tsx` → `disabled={!selected || isProcessing}`). Sin cambios.
5. ✅ **Error mapeado:** `isIdempotencyKeyConflict()` (nuevo `components/checkout/checkoutErrors.ts`)
   detecta el 409 de clave reusada; `usePlaceOrder` llama `resetIdempotencyKey()` antes de mostrar el
   `message` del backend, para que el siguiente clic no repita el mismo error para siempre.
6. ✅ **`Idempotency-Replayed` consumido:** `createOrder()` devuelve `replayed` leyéndolo de los
   headers. Si es `true`, `usePlaceOrder` consulta el PaymentIntent (`retrievePaymentIntent`) antes de
   confirmar y, si ya está `succeeded`, salta directo a la confirmación.

**Decisiones de diseño que conviene no revertir sin leer esto:**
- **La clave se deriva de `orderSignature`, no de un ciclo de vida propio.** Esa firma ya define qué
  es "el mismo intento de compra" para el caché de la orden pendiente; darle a la clave su propio
  criterio sería una segunda fuente de verdad sobre lo mismo. Rota exactamente cuando debe y no hay
  efectos ni invalidación aparte.
- **Se genera perezosamente en el submit, nunca en render.** Además de no desperdiciar claves, evita
  el desajuste de hidratación: `crypto.randomUUID()` no existe en SSR.
- **`newIdempotencyKey()` tiene dos fallbacks y no puede lanzar.** `crypto.randomUUID` solo existe en
  **contexto seguro**, así que abrir el sitio desde el teléfono en `http://192.168.x.x:3000` —cosa
  que se hace para probar— dejaría el checkout entero sin poder pagar con un `TypeError`. Cae a
  `crypto.getRandomValues` (que no exige contexto seguro) y, en último caso, a timestamp + random:
  la clave no necesita ser criptográfica, solo irrepetible dentro de la ventana de 60 s.
- **`replayed` solo puede ser `true` cuando la orden se creó en esa pasada.** Una orden servida del
  caché del contexto no trajo respuesta HTTP de la que leer el header.
- **Por qué se consulta el PaymentIntent en un replay:** el pedido devuelto puede tener su cobro ya
  hecho; confirmarlo otra vez devuelve un error de Stripe que le diría al comprador que su pago falló
  cuando en realidad ya se hizo, y lo empujaría a reintentar.
- **El mapeo de errores se extrajo a `components/checkout/checkoutErrors.ts`** (puro, con specs).
  Esta ruta devuelve **tres 409 distintos** —sin stock, cotización expirada, clave reusada— que solo
  se distinguen por el `message` y piden recuperaciones diferentes; confundir dos deja al comprador
  reintentando en bucle contra el mismo error.

**Salida:** un doble clic, un reintento del navegador o una conexión inestable en el momento de pagar
no pueden generar dos pedidos ni dos cobros — ni siquiera cuando el carrito cambió lo suficiente como
para que la huella automática no los reconozca como el mismo.

---

# Fases pendientes 🔴

Van en orden numérico, pero **no hay que hacerlas en ese orden**: son independientes entre sí.
Cómo priorizarlas:

- **Fase 16** es opcional en el sentido de que el backend ya se recupera solo con un
  barrido periódico (Fase O.3); el botón adelanta ese reintento y, sobre todo, muestra el motivo
  del fallo cuando hace falta decidir a mano.
- **Fase 18** es puramente aditiva: los params nuevos son opcionales y el catálogo sigue
  funcionando igual sin mandarlos, así que se puede cablear por partes (primero el buscador,
  después el orden y el rango) sin romper nada.
- **Fase 19** es la única pendiente que **no** es aditiva: aunque nadie mande un `couponCode`, el
  invariante de totales ya cambió a `subtotal − savings − couponDiscount + shipping` y
  `couponDiscount` llega en `0`. Mientras no se cablee, la aritmética actual sigue dando el mismo
  resultado; el riesgo aparece el día que se cree el primer cupón y algún componente siga sumando
  con cuatro términos. Conviene hacer primero los puntos 1, 2 y 7 (contratos + fila de descuento)
  aunque el campo del checkout llegue después.

---

## Fase 16 — Admin: reintentar la guía de Skydropx 🔴 *(depende de Fase 11)*

> **Contexto.** La guía se genera sola al confirmarse el pago. Si esa única llamada falla (Skydropx
> caído, saldo agotado, o el proceso se reinicia a media creación), el pedido queda **pagado y sin
> guía**: no hay webhook que llegue por una guía que nunca se creó. El backend agregó
> `POST /api/admin/orders/:id/shipment/retry` (Fase O.3 del
> `../backend/roadmap-operacion-y-negocio.md`) más un barrido automático que reintenta solo cada
> pocos minutos. El botón sirve para no esperar al barrido y, sobre todo, para ver **por qué** no se
> pudo.

**Lo que el backend ya hace (referencia — no tocar):**
- `POST /api/admin/orders/:id/shipment/retry` `[auth]`, **body opcional** `{ force?: boolean }` (el
  reintento normal no manda nada — ver el punto de `force` abajo). Devuelve `{ order }` con el
  pedido actualizado y sus `items` (mismo shape que `GET /api/admin/orders`, así que
  `AdminOrderSchema` lo valida sin cambios).
- **Espera el resultado** (a diferencia del camino automático): un `200` significa que la guía ya
  existe y `order.skydropxShipmentId` trae su id; un **502** que Skydropx volvió a fallar y el pedido
  sigue sin guía (se puede reintentar de inmediato).
- **Cada guía se cobra**, así que responde **409** ante cualquier duda: el pedido ya tiene guía, otra
  solicitud la está generando en este momento, el pedido no está pagado, está cancelado o **ya se
  marcó como enviado/entregado** (ese pedido ya salió: si le falta guía es porque se generó a mano),
  o se cobró con la **tarifa plana de respaldo** (no hay tarifa de Skydropx que convertir en guía —
  esa se genera en el panel de Skydropx y se captura con el `PATCH .../status` de la Fase 14).
- `skydropxShipmentId` puede traer **valores especiales** en vez de un id, y la UI no debería
  mostrarlos como si fueran una guía: `"creating"` (creación en curso), `"unreconciled:<id>"`
  (Skydropx la cobró pero no se pudo guardar — ese pedido necesita revisarse a mano en el panel de
  Skydropx; el `409` del reintento incluye el id real en su `message`) y
  **`"unreconciled:desconocido"`** (Skydropx no respondió al crear la guía, así que pudo haberla
  creado y cobrado sin que quedara registrada).
- **`force: true` es solo para `"unreconciled:desconocido"`.** Ese es el único estado que el backend
  no puede resolver solo: hay que abrir el panel de Skydropx y confirmar si la guía existe. Si
  existe, se captura su número con el `PATCH .../status`; si no existe, se reintenta con
  `{ force: true }`, que significa "ya verifiqué, genérala de todos modos". Un `unreconciled:<id>`
  con id conocido **no** se fuerza (esa guía existe y está cobrada) y el backend responde `409`
  aunque se mande `force`.
- El barrido automático corre en paralelo, así que un pedido puede aparecer con guía sin que nadie
  haya tocado el botón — la vista ya refresca con el polling de la Fase 11.

**Trabajo del frontend:**
1. [ ] **Contrato:** `lib/api/adminOrders.ts` expone `retryAdminOrderShipment(id, { force? })`
   (`POST /:id/shipment/retry`, body opcional, respuesta `{ order }` validada con
   `AdminOrderSchema`).
2. [ ] **Acción en la UI:** en `OrderDetailModal.tsx`, botón "Reintentar guía" visible solo cuando
   `status === "paid"`, hay `skydropxRateId` y **no** hay guía real (`skydropxShipmentId` nulo o con
   valor `"creating"`), con una nota de que cada guía se cobra.
3. [ ] **Estado "necesita revisión":** si `skydropxShipmentId` empieza con `unreconciled:`, mostrar
   un aviso (no un botón): la guía ya se pagó y hay que localizarla en el panel de Skydropx.
4. [ ] **Estado "sin confirmar" (`unreconciled:desconocido`):** aviso con dos salidas explícitas —
   "ya la encontré en Skydropx" (lleva al flujo de capturar la guía de la Fase 14) y "no existe,
   generar de todos modos", que es el único lugar donde se manda `force: true`. Conviene una
   confirmación explícita antes de mandarlo: si la guía sí existía, se paga otra.
5. [ ] **Mutation + invalidación:** `useMutation` que al `onSuccess` invalide `adminOrderKeys.all` y
   marque el refresh como manual (`isManualRefreshRef`), igual que las Fases 12/14.
6. [ ] **Errores mapeados:** `409` y `502` se muestran inline con el `message` del backend sin cerrar
   el modal — el `502` es reintentable, el `409` no (salvo el de `unreconciled:desconocido`, que se
   resuelve con el punto 4).

**Salida:** un pedido pagado deja de quedarse sin guía por una falla puntual de Skydropx, y cuando
requiere intervención humana el panel lo dice en vez de callarlo.

---

## Fase 17 — Página pública de seguimiento del pedido 🔴 *(cara al cliente, no al admin)*

> **Contexto.** No hay cuentas de cliente ni ninguna otra lectura pública de órdenes: después de
> pagar, lo único que tenía el comprador era el correo de confirmación. Si lo borraba o le caía en
> spam, cada "¿ya salió mi pedido?" acababa siendo un WhatsApp que el dueño contestaba a mano. El
> backend agregó `GET /api/orders/lookup/:token` (Fase O.4 del
> `../backend/roadmap-operacion-y-negocio.md`) y **el correo ya manda el link a
> `/pedido/<token>`** — o sea que esa ruta hoy es un 404 del front. Es la única fase de este
> documento que no toca el panel: el consumidor es el comprador.

**Lo que el backend ya hace (referencia — no tocar):**
- `GET /api/orders/lookup/:token` `[público, sin auth]`. El `publicToken` (UUID opaco de la orden)
  **es** la credencial; por eso no se pide correo ni ningún otro dato.
- Devuelve `{ order }` con una **proyección propia**, distinta de `AdminOrderSchema` — hay que
  escribirle su schema de zod:
  `{ id, status, paymentStatus, createdAt, subtotal, savings, shipping, total, customerName,
  shippingAddress: { street, neighborhood, city, state, postalCode, references }, shippingCarrier,
  trackingNumber, trackingUrl, shipmentStatus, refundedAt,
  items: [{ nameSnapshot, size, quantity, unitOriginalPrice, unitSalePrice }] }`.
- **No** incluye `unitCost`, `paymentIntentId`, `refundId`, `labelUrl`, los ids de Skydropx,
  `shippingRequiresDropoff`, el propio token ni el correo/teléfono del cliente. Es deliberado: el
  link se comparte por WhatsApp con facilidad.
- Un token **inexistente, alterado o mal formado** responde siempre el **mismo `404`** con el mismo
  `message`, a propósito (no revela si el pedido existe). Ese `message` es la copia de UI: píntalo
  tal cual.
- Rate limit propio de **30 req/min por IP** (`429` con su `message`). Es holgado, pero descarta un
  polling agresivo: si se quiere refresco automático, que sea de un minuto para arriba.
- El token también viene en el `201` de `POST /api/orders` (`order.publicToken`), así que el
  checkout puede llevar al comprador a la página sin esperar el correo.

**Trabajo del frontend:**
1. [ ] **Contrato:** `lib/api/orders.ts` expone `lookupOrder(token)` (`GET /api/orders/lookup/:token`,
   sin `Authorization`) + `PublicOrderSchema` de zod con la forma de arriba. **No reutilizar**
   `AdminOrderSchema`: la proyección es distinta y más chica a propósito.
2. [ ] **Ruta:** `app/(public)/pedido/[token]/page.tsx`. El path tiene que ser exactamente ese —
   es el que el backend construye en el correo (`publicOrderUrl` en `payment.service.ts`).
3. [ ] **Vista de estado:** línea de tiempo legible a partir de `status`
   (`pending` "esperando el pago" · `paid` "preparando tu envío" · `shipped` "va en camino" ·
   `delivered` "entregado" · `cancelled`), con `shipmentStatus` como detalle secundario (es el
   texto crudo de la paquetería, no copia nuestra) y el botón "Rastrear" cuando haya `trackingUrl`.
4. [ ] **Resumen de la compra:** renglones con los precios **congelados** que manda la API
   (`unitSalePrice`/`unitOriginalPrice`, tachado cuando hubo descuento), totales y dirección de
   envío — reusando el formato de moneda del checkout.
5. [ ] **Pedido cancelado:** cuando `paymentStatus === "refunded"`, decir que el dinero se devolvió
   y **cuándo** (`refundedAt`); el reembolso tarda días hábiles en aparecer en el estado de cuenta
   y esa es justo la siguiente pregunta del cliente.
6. [ ] **404 y 429:** estado vacío con el `message` del backend y una salida clara (volver a la
   tienda / buscar el correo de confirmación). Nada de "token inválido" inventado por el front.
7. [ ] **Enganche desde el checkout:** guardar `order.publicToken` del `201` y ofrecer el link
   "Ver el estado de mi pedido" en la pantalla de compra completada.
8. [ ] **SEO:** `noindex` en esta ruta — el token es una credencial y no debe acabar en un buscador.

**Salida:** el comprador consulta su pedido solo, a cualquier hora, y el dueño deja de contestar
estados por WhatsApp.

---

## Fase 18 — Outlet: buscador, orden y rango de precio 🔴 *(cara al cliente, no al admin)*

> **Contexto.** El outlet solo sabe filtrar por categoría y talla, y siempre lista en el mismo
> orden. Con la importación masiva por Excel el catálogo crece en lotes de **hasta 500 filas por
> archivo**, así que un listado de 9 productos por página sin buscador deja de ser navegable
> rápido: el comprador no encuentra lo que ya está en la tienda. El backend agregó `q`, `orden`,
> `precioMin` y `precioMax` (Fase N.1 del `../backend/roadmap-operacion-y-negocio.md`) y **los
> resuelve todos en SQL**; el front todavía manda solo `categoria`/`talla`/`page`.

**Lo que el backend ya hace (referencia — no tocar):**
- Cuatro query params nuevos en `GET /api/products`: **`q`** (busca en nombre y código, parcial y
  sin distinguir mayúsculas, máx. 100 caracteres), **`orden`**
  (`precio_asc` · `precio_desc` · `novedad`; sin valor, ordena por id ascendente),
  **`precioMin`/`precioMax`** (sobre el precio de venta, inclusive en ambos extremos).
- **La forma de la respuesta NO cambia.** `ProductListResponseSchema` se queda igual; lo único que
  crece es `ProductFilters`.
- **Un parámetro inválido se ignora en silencio: nunca responde `400`.** Un `orden` desconocido, un
  precio no numérico o negativo y una talla vacía se descartan y devuelven el catálogo normal. **No
  inventes mensajes de validación en el front** para estos campos.
- `%` y `_` se buscan como **texto literal**, así que el valor del input se manda tal cual, sin
  sanitizar ni escapar del lado del cliente.
- **`precioMin > precioMax` devuelve cero resultados a propósito** (no se invierte el rango). Si el
  front quiere evitarlo, que sea en la UI; el backend no lo va a corregir.
- **`availableSizes` ya viene acotado por `q` y por el rango de precio** (pero no por la `talla` ya
  elegida), así que el selector de tallas nunca ofrece opciones que darían cero resultados — **no
  hay que filtrarlo del lado del cliente**.

**Trabajo del frontend:**
1. [ ] **Contrato:** extender `ProductFilters` en `lib/api/products.ts` con
   `q?`/`orden?`/`precioMin?`/`precioMax?`. `productKeys.filtered` ya serializa el objeto completo,
   así que la cache de TanStack Query se separa sola sin tocar las keys.
2. [ ] **Buscador:** input de texto con **debounce (~300 ms)** en `OutletFilters.tsx`, sincronizado
   a la URL con el helper `updateParam()` que ya existe en `OutletView.tsx`.
3. [ ] **Selector de orden:** `<select>` con las tres opciones + el default, reusando el
   `SELECT_CLASS` y el `ARROW_STYLE` que ya comparten los dos selects actuales.
4. [ ] **Rango de precio:** dos campos (o un slider) que manden `precioMin`/`precioMax`.
5. [ ] **Resetear `pagina` a 1 al cambiar cualquiera de los filtros nuevos** — `updateParam()` ya lo
   hace para los existentes; hay que incluir los nuevos o se cae en la página clampeada.
6. [ ] **Estado vacío:** "no encontramos nada para «…»" con una salida clara a limpiar filtros. Hoy
   no existe: sin búsqueda, el catálogo nunca daba cero resultados.
7. [ ] **Nada de filtrado en cliente.** Todo lo resuelve el backend en SQL y `total`/`totalPages` ya
   reflejan los filtros; duplicarlo en el front rompería la paginación.

**Salida:** el comprador encuentra por nombre o código y ordena por precio, con el catálogo
creciendo por importación masiva.

---

## Fase 19 — Cupones: campo en el checkout + sección en el panel 🔴 *(las dos caras a la vez)*

> **Contexto.** No existe ninguna forma de lanzar una promoción sin repreciar producto por producto,
> que es permanente y toca el catálogo. El backend cerró la Fase N.2 del
> `../backend/roadmap-operacion-y-negocio.md`: hay modelo, validación pública, canje atómico y CRUD
> admin. Falta las dos mitades visibles — el campo donde el comprador teclea el código (paso 0 del
> checkout, `components/checkout/OrderSummary.tsx`) y la pantalla donde el dueño crea y cancela
> cupones.

**Lo que el backend ya hace (referencia — no tocar):**
- **El invariante de totales cambió** y hay que revisar todo lo que asuma la versión de cuatro
  términos: ahora es **`total = subtotal − savings − couponDiscount + shipping`**. Afecta a
  `components/checkout/OrderTotals.tsx` (compartido por `OrderSummary`, `Success` y
  `ShippingOptions`) y al objeto de totales que `ShippingOptions.tsx` arma a mano con la tarifa
  viva.
- **`savings` y `couponDiscount` son cosas distintas y NO se suman.** `savings` es el ahorro outlet
  (`originalPrice` vs `salePrice`); el cupón va en su propia columna. Mezclarlos en la UI le miente
  al comprador sobre de dónde viene cada descuento (y en el panel rompería el margen).
- **El descuento nunca toca el envío.** Se aplica sobre la mercancía neta (`subtotal − savings`), así
  que la fila del cupón va **arriba** de la de Envío — igual que en el correo de confirmación.
- **`POST /api/coupons/validate` valida SIN canjear** y devuelve el mismo monto que se va a cobrar
  (comparte la función de descuento con el checkout). Consultarlo las veces que sea **no** gasta la
  promoción.
- **El resultado de `/validate` NO es una reserva.** `remainingRedemptions` es informativo y el
  cupón puede agotarse entre la consulta y el pago: `POST /api/orders` re-decide todo de forma
  atómica. **Hay que pintar ese `409`**, no asumir que el visto bueno era garantía.
- **El `email` de `/validate` es opcional** porque el campo vive antes de los datos de envío. Sin él
  la respuesta trae `perCustomerChecked: false`: el "un uso por cliente" no se verificó todavía.
- **Un cupón inválido en `POST /api/orders` responde 400/409 y no crea el pedido** — al contrario de
  los filtros del catálogo, aquí nada se ignora en silencio. Los `message` ya son copia de UI
  accionable en español (incluyen cuánto falta para el mínimo, cuándo venció, etc.): **pintarlos tal
  cual, no inventar textos**.
- **El código se normaliza en el servidor** (se recorta y se sube a mayúsculas): mandar
  `" verano25 "` funciona. Solo acepta letras y números, 3–32 caracteres.
- En el panel, el listado devuelve `redeemedCount` **y** `activeRedemptions`. Normalmente coinciden;
  si difieren hubo una intervención manual en la BD. `code` y `redeemedCount` **no** se pueden
  editar (el `PUT` los ignora), y `active: false` es la forma de **cancelar** un cupón. `DELETE`
  responde `{ ok, deactivated }`: `deactivated: true` significa que se desactivó en vez de borrarse
  porque ya hay pedidos que lo usaron.
- `startsAt`/`expiresAt` aceptan una fecha sin hora (`2026-08-31`) y la interpretan en la zona de la
  tienda (fin de día para el vencimiento), así que un `<input type="date">` sirve tal cual.

**Trabajo del frontend:**
1. [ ] **Contratos:** `lib/api/coupons.ts` (público: `validateCoupon`) y `lib/api/adminCoupons.ts`
   (CRUD + `adminCouponKeys`), con el patrón de siempre — axios vía `lib/api/client.ts`, Zod en
   runtime, `.parse` en lecturas y `acceptWrite()` en escrituras.
2. [ ] **`CreateOrderPayload`** gana `couponCode?`; `OrderResponseSchema` gana
   `couponCode`/`couponDiscount`.
3. [ ] **Campo de cupón en `OrderSummary.tsx`**, entre `<OrderItems />` y el bloque de totales:
   input + botón "Aplicar", estado aplicado con opción de quitarlo, y el `message` del error pintado
   verbatim.
4. [ ] **Guardar el cupón aplicado en `CheckoutContext`** con el patrón de caché por firma que ya
   usan `getSelectedRate`/`getPendingOrder`, para que sobreviva al avance entre pasos.
5. [ ] **Revalidar en el paso de envío** (`ShippingOptions.tsx`) mandando ya el correo confirmado:
   es el único momento en que `/validate` puede verificar el "un uso por cliente", y avisar ahí es
   mejor que fallar al cobrar.
6. [ ] **`orderSignature` en `usePlaceOrder.ts` tiene que incluir el cupón**, o aplicar/quitar uno
   reconfirmaría el pedido cacheado con el precio anterior.
7. [ ] **Fila "Cupón" en `OrderTotals.tsx`** (arriba de Envío) y en `Success.tsx`, solo cuando
   `couponDiscount > 0`.
8. [ ] **Sección "Cupones" del panel:** `components/admin/types.ts` (`AdminSection`), `NAV_ITEMS` de
   `Sidebar.tsx`, y `VALID_SECTIONS` + el switch de `app/admin/page.tsx`. Tabla con estado/vigencia/
   usos, formulario de alta y edición, y borrado con confirmación inline como en `AdminsCard.tsx`.
9. [ ] **Nada de calcular el descuento en el cliente.** El monto que se muestra siempre sale de
   `/validate` o del pedido; duplicar la fórmula garantiza que un día diverja del cobro.

**Salida:** el dueño lanza una promoción desde el panel y el comprador la aplica en el checkout, con
el descuento calculado y canjeado por el backend.

---

## Fase 20 — Admin: gastos y suscripciones 🔴 *(solo panel, no toca la tienda)*

> **Contexto.** Hasta ahora el KPI **GANANCIA NETA** del panel restaba una constante de `$2,000`
> hardcodeada en el backend, con el comentario "no existe un modelo de gastos". La Fase N.3 del
> `../backend/roadmap-operacion-y-negocio.md` la sustituyó por gastos capturados: hay modelo, CRUD,
> resumen de "cuánto retirar" e historial mes con mes. Falta la pantalla donde el dueño da de alta
> Render, Vercel, la base de datos, la renta y lo que sea.
>
> **El KPI del dashboard ya funciona sin tocar el frontend** (`KpiGrid` pinta los labels tal como
> vienen), así que esta fase no desbloquea nada roto: agrega la pantalla que llena esos datos.

**Lo que el backend ya hace (referencia — no tocar):**
- **El monto no es un campo del gasto: está versionado por fecha de vigencia.** Mandar `amount` en el
  `PUT` **agrega una versión** con vigencia `amountEffectiveFrom` (o hoy) en vez de sobrescribir. Eso
  es lo que hace que subir Render de $290 a $340 no reescriba lo que costaba en julio. Dos
  excepciones que el backend resuelve solo: si ya existe una versión con esa misma fecha la
  **corrige en su lugar**, y si el monto no cambió no escribe nada. **La UI tiene que decir "esto es
  un cambio de precio", no "editar monto"** — y ofrecer la fecha desde la que aplica.
- **Cada gasto trae su historial de precios** en `amounts` (del más viejo al más nuevo), más
  `currentAmount`, `monthlyRunRate` y `nextChargeDate` ya calculados. **No recalcular nada de eso en
  el cliente.**
- **`/history` responde el "¿algo cambió?"**: cada mes trae `total`, `byCategory`, `byExpense` (con
  `occurrences`) y **`changes`** — los cambios de precio vigentes ese mes con `previousAmount` y
  `amount`. El delta y el % **los calcula el front** (misma regla que el resto de métricas
  derivadas). Los meses van sin huecos (los vacíos en `$0`) y el mes en curso trae `partial: true`,
  igual que el reporte mensual de ventas.
- **`/summary` responde "cuánto tengo que retirar"**: `monthlyRunRate` (la suma de los recurrentes
  llevados a su equivalente mensual — anual ÷ 12, semanal × 52/12), `annualRunRate`, `byCategory`,
  `byFrequency` y `upcomingCharges` (qué se cobra, de cuánto y en qué fecha, próximos 60 días).
- **Los gastos de única vez (`frequency: "once"`) no entran en la carga mensual**: cuentan completos
  en su mes. Si la UI los mezcla en el "cuánto retirar", miente.
- **Todo en pesos.** No hay divisas: si Render cobra en USD, se captura lo que cobró la tarjeta. Un
  movimiento del dólar se registra como un cambio de monto (y por eso `amountNote` existe: "subió el
  dólar").
- **Las fechas son días de calendario** (`"2026-08-01"`), así que un `<input type="date">` sirve tal
  cual — no hay que convertir a ISO ni preocuparse por la zona horaria.
- **`active` y `endsAt` se mantienen coherentes solos**: apagar un gasto le fija `endsAt` en hoy y
  reactivarlo lo limpia. La UI solo manda `active`.
- **`DELETE` responde `{ ok, deactivated }`**: `deactivated: true` significa que se desactivó en vez
  de borrarse porque ya generó cargos y borrarlo dejaría el historial mintiendo sobre meses cerrados.
  Mismo contrato que el `DELETE` de cupones.
- **Los filtros inválidos son `400`, no se ignoran** (al revés que los del catálogo público): aquí
  quien consulta es el dueño y un filtro que no aplicó le haría leer mal sus propios números. Los
  `message` ya son copia de UI accionable en español — **pintarlos verbatim**.
- El filtro `from`/`to` del listado es por **fecha de cargo**, no de alta: un gasto dado de alta en
  enero y vigente desde entonces sí sale al consultar agosto.

**Trabajo del frontend:**
1. [ ] **Contrato:** `lib/api/adminExpenses.ts` (CRUD + `summary` + `history` + `adminExpenseKeys`),
   con el patrón de siempre — axios vía `lib/api/client.ts`, Zod en runtime, `.parse` en lecturas y
   `acceptWrite()` en escrituras.
2. [ ] **Sección "Gastos" del panel:** `components/admin/types.ts` (`AdminSection`), `NAV_ITEMS` de
   `Sidebar.tsx`, y `VALID_SECTIONS` + el switch de `app/admin/page.tsx`.
3. [ ] **Tarjeta de encabezado con `/summary`:** "hay que retirar $X al mes" bien grande, el anual
   como secundario, y la lista de próximos cargos con fecha y monto.
4. [ ] **Tabla de gastos** con concepto, proveedor, categoría, frecuencia, monto vigente, carga
   mensual y próximo cargo; formulario de alta/edición y borrado con confirmación inline como en
   `AdminsCard.tsx`.
5. [ ] **Formulario de cambio de precio separado del de edición.** Cambiar el monto pide fecha de
   vigencia y una nota opcional; que se sienta distinto de corregir un typo en el concepto, porque
   en el backend lo es.
6. [ ] **Vista de historial** con el total por mes, el desglose por categoría y —lo importante— los
   `changes` del mes resaltados ("Render: $290 → $340 desde el 1 de agosto"), con el delta calculado
   en el cliente.
7. [ ] **Etiquetas en español de `category` y `frequency`** en un mapa local (como
   `lib/categories.ts` hace con los tipos de producto). El backend manda las claves crudas.
8. [ ] **Nada de recalcular montos en el cliente.** `currentAmount`, `monthlyRunRate` y los totales
   del historial vienen listos; duplicar las fórmulas (sobre todo `weekly × 52/12`) garantiza que un
   día diverjan del KPI del dashboard.

**Salida:** el dueño ve cuánto tiene que apartar de sus ventas cada mes, con qué se le va, cuándo se
le cobra y qué subió de precio — y la GANANCIA NETA del panel deja de restar un número inventado.

---

# Notas de implementación

- **Base URL:** `NEXT_PUBLIC_API_URL` debe apuntar al backend (`http://localhost:4000`);
  sin definir cae a `/api`. No commitear secretos.
- **Contratos:** el backend expone las mismas formas que los tipos del front
  (`components/admin/data/types.ts`, `ProductSchema` en `lib/api/products.ts`). Validar
  cada respuesta con Zod, igual que en `getProducts.ts`.
- **Datos sensibles:** `unitCost` y márgenes solo llegan por rutas `/api/admin/*`
  autenticadas — nunca en el catálogo público.
- **Envíos (Skydropx):** el backend **ya integra Skydropx de punta a punta** (cotización en
  vivo `POST /api/shipping/rates`, guía automática al pagar y webhook de estado —
  `../backend/roadmaps-completados/roadmap-skydropx.md` Fases 8.1–8.6). El checkout ya cotiza en vivo (ver "Shipping"
  en `CLAUDE.md`) y el panel de pedidos ya muestra guía/rastreo (**Fase 11** ✅).
- **Prioridad de lo pendiente:** ver la introducción de [Fases pendientes](#fases-pendientes-)
  — ahí está qué es mejora opcional (16), qué es aditivo (18) y qué ya cambió un invariante
  aunque no se cablee (19).
