# Roadmap — Conexión del frontend con el backend real

Estado de la migración de **mocks → endpoints reales** del backend Express
(`../backend`, `http://localhost:4000`, Swagger en `/api/docs`).

Todas las llamadas deben pasar por la instancia axios única `lib/api/client.ts`
(adjunta `Bearer` del `authStore` y maneja el `401`). El patrón de referencia
—ya implementado— es `lib/getProducts.ts`: **axios + validación Zod en runtime +
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
| `GET /api/products` | `lib/getProducts.ts` → `getProducts()` | ✅ | — |
| `GET /api/products/:id` | `lib/getProducts.ts` → `getProductById()` | ✅ | — |
| `POST /api/orders` | `components/checkout/UserDetails.tsx` → `createOrder()` de `lib/api/orders.ts` (`useMutation`); `completeOrder()` congela la respuesta `201` | ✅ | — |
| `GET /api/admin/products` | `components/admin/ProductSection.tsx` → `getAdminProducts()` de `lib/api/adminProducts.ts` (`useQuery`) | ✅ | — |
| `POST /api/admin/products` | `components/admin/ProductForm.tsx` → `createProduct()` (`useMutation` + invalidación) | ✅ | — |
| `PUT /api/admin/products/:id` | `components/admin/ProductForm.tsx` → `updateProduct()` (`useMutation`) | ✅ | — |
| `DELETE /api/admin/products/:id` | `ProductCategoryView.tsx` / `ProductForm.tsx` → `deleteProduct()` (`useMutation`; soft/hard lo decide el backend) | ✅ | — |
| `GET /api/admin/dashboard` | `components/admin/DataSection.tsx` → `getAdminDashboard()` de `lib/api/dashboard.ts` (`useQuery`) | ✅ | — |
| `GET /api/admin/reports/monthly` | `components/admin/ReportesSection.tsx` → `getMonthlyReport()` de `lib/api/reports.ts` (`useQuery`); pasa `reports` a `SalesReport` | ✅ | — |
| `GET /api/admin/reports/replenishment` | `components/admin/reportes/ReplenishmentReport.tsx` → `getReplenishmentReport()` (`useQuery`) | ✅ | — |
| `GET /api/admin/brand` | `lib/brand.ts` (`BRAND` estático) — storefront (`Hero`, footer…) + `MarcaSection` | 🔴 | Hidratar la marca desde la API (lectura pública); `BRAND` queda como fallback |
| `PUT /api/admin/brand` | `components/admin/MarcaSection.tsx` (editor sin guardado) | 🔴 | `useMutation` → `api.put("/admin/brand", data)` |
| `GET /api/admin/users` | `components/admin/ConfigSection.tsx` (sin listado) | 🔴 | `useQuery` de usuarios del panel |
| `POST /api/admin/users` | `components/admin/ConfigSection.tsx` (formulario no conectado) | 🔴 | `useMutation` de alta con contraseña temporal |
| `DELETE /api/admin/users/:id` | `components/admin/ConfigSection.tsx` | 🔴 | `useMutation` de baja |
| `PUT /api/admin/account` | `components/admin/ConfigSection.tsx` (campos email/password no enviados) | 🔴 | `useMutation` → `api.put("/admin/account", data)` |
| `GET /api/admin/orders` | *(sin UI todavía)* | ⚪ | Construir vista de pedidos del admin y conectar |
| `POST /api/webhooks/stripe` | *(pago es placeholder — `PaymentSection`)* | ⚪ | Fase 8 (Stripe): stub en backend, sin front |

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

### Fase 5 — Marca (identidad de tienda)
- `GET /api/admin/brand` (público) — hidratar el storefront; `lib/brand.ts` (`BRAND`)
  queda como valor por defecto/fallback SSR.
- `PUT /api/admin/brand` — guardado desde `MarcaSection`.

### Fase 6 — Admin: usuarios y cuenta
- `GET`/`POST`/`DELETE /api/admin/users` — gestión de usuarios del panel.
- `PUT /api/admin/account` — cambio de email/contraseña propios desde `ConfigSection`.
- Reglas del backend: no borrar la propia cuenta ni al único propietario (`400`);
  email duplicado (`409`).

### Fase 7 — Admin: pedidos *(UI nueva)*
- `GET /api/admin/orders` (paginado, incluye `unitCost`) — construir la vista y conectarla.

### Fase 8 — Pagos *(diferido)*
- `POST /api/webhooks/stripe` — hoy stub en backend. Reemplazar `PaymentSection` por
  Stripe Elements y consumir `clientSecret` cuando la fase esté activa.

## Notas de implementación

- **Base URL:** `NEXT_PUBLIC_API_URL` debe apuntar al backend (`http://localhost:4000`);
  sin definir cae a `/api`. No commitear secretos.
- **Contratos:** el backend expone las mismas formas que los tipos del front
  (`components/admin/data/types.ts`, `ProductSchema` en `lib/getProducts.ts`). Validar
  cada respuesta con Zod, igual que en `getProducts.ts`.
- **Datos sensibles:** `unitCost` y márgenes solo llegan por rutas `/api/admin/*`
  autenticadas — nunca en el catálogo público.
- **Envíos (Skydropx):** `POST /api/shipping/rates` está documentado en `BACKEND.md`
  §5.4 y `CLAUDE.md`, pero **aún no está montado** en el backend. Se aborda cuando el
  volumen lo justifique (hoy: tarifa plana en `lib/cart.ts`).
