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
| `POST /api/orders` | `components/checkout/CheckoutContext.tsx` → `completeOrder()` (solo snapshot local) | 🔴 | Postear el carrito antes de confirmar; el backend es autoridad de precios y stock |
| `GET /api/admin/products` | `components/admin/ProductSection.tsx` (`MOCK_PRODUCTS`) | 🔴 | `useQuery` → `api.get("/admin/products")` (trae `unitCost` + stock por talla) |
| `POST /api/admin/products` | `components/admin/ProductForm.tsx` (sin envío a API) | 🔴 | `useMutation` de creación + invalidar query de productos |
| `PUT /api/admin/products/:id` | `components/admin/ProductForm.tsx` | 🔴 | `useMutation` de edición parcial |
| `DELETE /api/admin/products/:id` | `components/admin/ProductCategoryView.tsx` (sin acción) | 🔴 | `useMutation` de borrado (soft/hard lo decide el backend) |
| `GET /api/admin/dashboard` | `components/admin/DataSection.tsx` (`MOCK_DASHBOARD`) | 🔴 | `useQuery` → `api.get("/admin/dashboard")` |
| `GET /api/admin/reports/monthly` | `components/admin/ReportesSection.tsx`, `reportes/SalesReport.tsx` (`MOCK_MONTHLY_REPORTS`) | 🔴 | `useQuery` → `api.get("/admin/reports/monthly")` |
| `GET /api/admin/reports/replenishment` | `components/admin/reportes/ReplenishmentReport.tsx` (`MOCK_REPLENISHMENT`) | 🔴 | `useQuery` → `api.get("/admin/reports/replenishment")` |
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

### Fase 2 — Checkout público *(ruta de ingresos)*
- `POST /api/orders` — en `completeOrder()`, postear `{ items, customer }` **sin montos**
  (el backend recalcula totales y descuenta stock por talla). Manejar `409`
  (sin stock / no disponible) mostrando el ítem en conflicto, y `400` (carrito vacío).
- El snapshot local sigue alimentando `Success`; solo se congela con la respuesta `201`.

### Fase 3 — Admin: catálogo y dashboard
- `GET /api/admin/products` + CRUD (`POST`/`PUT`/`DELETE`) — `ProductSection`,
  `ProductForm`, `ProductCategoryView`. Usar `useMutation` con invalidación de la query.
- `GET /api/admin/dashboard` — `DataSection`.
- Al terminar, retirar `db/mockProducts.ts` y `MOCK_DASHBOARD` de estos componentes.

### Fase 4 — Admin: reportes
- `GET /api/admin/reports/monthly` — `ReportesSection` + `SalesReport`.
- `GET /api/admin/reports/replenishment` — `ReplenishmentReport`.
- La lógica pura (`lib/forecast.ts`, reposición) ya vive en front y back; solo cambia
  el origen de los números. Retirar `MOCK_MONTHLY_REPORTS` / `MOCK_REPLENISHMENT`.

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
