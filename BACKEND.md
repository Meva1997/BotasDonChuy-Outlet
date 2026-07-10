# Especificación del Backend — Botas Don Chuy Outlet

Documento de contrato para construir el backend con **Node.js + Express.js**. Define cada modelo de datos, endpoint, regla de negocio y validación que el frontend ya espera consumir.

> **Principio rector:** el frontend hoy lee de mocks en `db/`. El backend debe **reemplazar esos mocks exponiendo exactamente las mismas formas de datos**. Mientras los contratos (tipos) se respeten, **ningún componente del frontend cambia**. Los tipos canónicos viven en `components/admin/data/types.ts`, `db/mockProducts.ts`, `lib/api/products.ts`, `lib/domain/cart.ts`, `lib/forecast.ts` y `schemas/`.
>
> La **lógica de negocio** (forecast, reposición, totales de carrito, envío) ya está escrita como **funciones puras que reciben números** en `lib/`. El backend solo debe **persistir y servir los datos crudos**; puede copiar esas funciones tal cual o reimplementarlas. La única "fuente de verdad" manual es la matriz de ventas-por-mes-por-producto.

---

## Tabla de contenidos

1. [Stack recomendado](#1-stack-recomendado)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Modelos de datos / tablas](#3-modelos-de-datos--tablas)
4. [Autenticación y roles](#4-autenticación-y-roles)
5. [Endpoints REST](#5-endpoints-rest)
   - [5.1 Auth](#51-auth)
   - [5.2 Catálogo público](#52-catálogo-público)
   - [5.3 Pedidos (checkout)](#53-pedidos-checkout)
   - [5.4 Cotización de envío](#54-cotización-de-envío)
   - [5.5 Admin — productos](#55-admin--productos)
   - [5.6 Admin — dashboard](#56-admin--dashboard)
   - [5.7 Admin — reportes](#57-admin--reportes)
   - [5.8 Admin — marca y configuración](#58-admin--marca-y-configuración)
6. [Reglas de negocio (portar desde `lib/`)](#6-reglas-de-negocio-portar-desde-lib)
7. [Esquemas de validación (zod)](#7-esquemas-de-validación-zod)
8. [Notas de seguridad](#8-notas-de-seguridad)
9. [Notas de verificación (barrido completo)](#9-notas-de-verificación-barrido-completo-de-components-y-app)
10. [Checklist de implementación](#10-checklist-de-implementación)

---

## 1. Stack recomendado

| Capa | Sugerencia | Notas |
|---|---|---|
| Runtime | Node.js 24 LTS | |
| Framework | Express.js | |
| Lenguaje | TypeScript | Permite **compartir tipos y esquemas zod** con el frontend |
| ORM | Prisma | Los `schema.prisma` de abajo están listos para copiar |
| Base de datos | PostgreSQL | Cualquier SQL sirve; los tipos `Decimal`/`Json` asumen Postgres |
| Validación | **zod** (mismos esquemas del front) | Reusar `schemas/` evita duplicar reglas |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` | Ver [sección 4](#4-autenticación-y-roles) |
| Subida de imágenes | Cloudinary (ya configurado en el entorno) | Productos y logo de marca |
| Envíos | Skydropx API | Ver [sección 5.4](#54-cotización-de-envío) |
| Pagos | Stripe (pendiente) | El checkout ya tiene el hueco para Stripe Elements |

**Convenciones de API:**
- Base URL sugerida: `/api`
- Todas las respuestas en JSON.
- Precios: números en **MXN** que **pueden tener hasta 2 decimales** (centavos), p. ej. `salePrice: 1920.50`. Se guardan como `DECIMAL(10,2)` y se sirven como **número** (no string); el frontend los formatea con 2 decimales.
- Fechas: ISO 8601 (`2026-06-17T07:33:00Z`) en payloads nuevos; los reportes mensuales usan claves `"2026-06"`.
- Idioma de los mensajes de error visibles: **español** (el front muestra el `message` de zod directamente).

---

## 2. Variables de entorno

```bash
# Servidor
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com   # origen del frontend Next.js

# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/botasdonchuy

# Auth
JWT_SECRET=                # secreto largo y aleatorio
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Skydropx (envíos) — ver sección 5.4
SKYDROPX_API_KEY=
SKYDROPX_BASE_URL=https://pro.skydropx.com

# Origen de envíos (bodega) — Celaya, Guanajuato
SHIP_FROM_POSTAL_CODE=38000
SHIP_FROM_STATE=Guanajuato
SHIP_FROM_CITY=Celaya
SHIP_FROM_NEIGHBORHOOD=Centro

# Cloudinary (imágenes de producto + logo)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Stripe (pendiente)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 3. Modelos de datos / tablas

### 3.1 `Product` — catálogo

Fuente del tipo: `db/mockProducts.ts` (`MockProduct`). Es el modelo central: alimenta catálogo, detalle, inventario, forecast y envío.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `int` PK | El front usa IDs numéricos (`getProductById(id: number)`). |
| `name` | `string` | Requerido. |
| `description` | `string?` | Opcional. |
| `originalPrice` | `decimal(10,2)` (MXN) | Precio tachado. Admite centavos. |
| `salePrice` | `decimal(10,2)` (MXN) | Precio outlet. Admite centavos. **Debe ser ≤ `originalPrice`** (validado en el form). |
| `discountPercent` | `int` | Derivable: `round((originalPrice - salePrice) / originalPrice * 100)`. El front lo recibe ya calculado. |
| `unitCost` | `decimal(10,2)` (MXN) | **SENSIBLE** — costo de adquisición, admite centavos. Solo en rutas `/admin/*`. |
| `stock` | `int` | Existencias totales. |
| `type` | `enum('bota','sombrero','ropa')` | Categoría. |
| `sizes` | `int[]` | Tallas. **Un valor repetido = stock de esa talla** (ver nota abajo). |
| `imageSrc` | `string?` | URL de imagen (Cloudinary). |
| `code` | `string?` | SKU / código interno, puede ser `null`. |
| `weightKg` | `float` | Peso del paquete (Skydropx). |
| `lengthCm` | `float` | Largo del paquete (Skydropx). |
| `widthCm` | `float` | Ancho del paquete (Skydropx). |
| `heightCm` | `float` | Alto del paquete (Skydropx). |
| `visible` | `bool` | El form lo envía (`visible: true`); las rutas públicas deben filtrar `visible = true`. |

> **⚠️ Nota sobre `sizes` y stock por talla:** hoy el front modela el stock por talla con **repetición en el array** — `sizes: [25, 25, 26]` significa 2 piezas de la 25 y 1 de la 26 (ver `ProductInfo.tsx` y `cartStore.ts`, que cuentan `product.sizes.filter(s => s === size).length`). El campo `stock` es el total. Esto es frágil. **Recomendación para el backend:** introducir una tabla `ProductSize { productId, size, stock }` y exponer `sizes` como `number[]` derivado para no romper el front, o mantener la convención de repetición. Decidir antes de migrar; afecta `addItem`/`updateQuantity` y la validación de stock en el checkout.

**Prisma:**
```prisma
model Product {
  id             Int      @id @default(autoincrement())
  name           String
  description    String?
  originalPrice  Decimal  @db.Decimal(10, 2)
  salePrice      Decimal  @db.Decimal(10, 2)
  discountPercent Int
  unitCost       Decimal  @db.Decimal(10, 2)
  stock          Int
  type           String   // 'bota' | 'sombrero' | 'ropa'
  sizes          Int[]
  imageSrc       String?
  code           String?
  weightKg       Float
  lengthCm       Float
  widthCm        Float
  heightCm       Float
  visible        Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  orderItems     OrderItem[]
  saleItems      SaleItem[]
}
```

### 3.2 `Order` + `OrderItem` — pedidos del checkout

Fuente: `CompletedOrder` (`CheckoutContext.tsx`) = `{ items: CartItem[], totals: CartTotals, customer: ShippingData }`.

**`Order`:**

| Campo | Tipo | Origen en el front |
|---|---|---|
| `id` | `uuid` PK | generado en backend |
| `status` | `enum('pending','paid','shipped','delivered','cancelled')` | nuevo |
| `subtotal` | `int` | `CartTotals.subtotal` |
| `savings` | `int` | `CartTotals.savings` |
| `shipping` | `int` | `CartTotals.shipping` |
| `total` | `int` | `CartTotals.total` |
| `customerName` | `string` | `ShippingData.fullName` |
| `customerEmail` | `string` | `ShippingData.email` |
| `customerPhone` | `string` | `ShippingData.phone` |
| `street` | `string` | `ShippingData.street` |
| `neighborhood` | `string` | `ShippingData.neighborhood` |
| `city` | `string` | `ShippingData.city` |
| `state` | `string` | `ShippingData.state` (uno de `MEXICAN_STATES`) |
| `postalCode` | `string` | `ShippingData.postalCode` |
| `references` | `string?` | `ShippingData.references` |
| `shippingCarrier` | `string?` | futuro: opción Skydropx elegida |
| `createdAt` | `datetime` | |

**`OrderItem`** (un renglón por `CartItem`):

| Campo | Tipo | Origen |
|---|---|---|
| `id` | `uuid` PK | |
| `orderId` | FK → Order | |
| `productId` | FK → Product | `CartItem.product.id` |
| `nameSnapshot` | `string` | nombre al momento de compra |
| `size` | `int` | `CartItem.size` |
| `quantity` | `int` | `CartItem.quantity` |
| `unitOriginalPrice` | `decimal(10,2)` | `product.originalPrice` (congelado) |
| `unitSalePrice` | `decimal(10,2)` | `product.salePrice` (congelado) |
| `unitCosto` | `decimal(10,2)` | `product.unitCost` (congelado, para márgenes) |

> Los precios se **congelan** en el OrderItem: un pedido histórico no debe cambiar si luego se reajusta el precio del producto.

```prisma
model Order {
  id              String   @id @default(uuid())
  status          String   @default("pending")
  subtotal        Decimal  @db.Decimal(10, 2)
  savings         Decimal  @db.Decimal(10, 2)
  shipping        Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)
  customerName    String
  customerEmail   String
  customerPhone   String
  street          String
  neighborhood    String
  city            String
  state           String
  postalCode      String
  references      String?
  shippingCarrier String?
  createdAt       DateTime @default(now())
  items           OrderItem[]
}

model OrderItem {
  id                String  @id @default(uuid())
  orderId           String
  order             Order   @relation(fields: [orderId], references: [id])
  productId         Int
  product           Product @relation(fields: [productId], references: [id])
  nameSnapshot      String
  size              Int
  quantity          Int
  unitOriginalPrice Decimal @db.Decimal(10, 2)
  unitSalePrice     Decimal @db.Decimal(10, 2)
  unitCosto         Decimal @db.Decimal(10, 2)
}
```

### 3.3 `Sale` / `SaleItem` — ventas históricas (fuente del forecast)

Esta es la **única matriz "fuente de verdad"**: unidades vendidas por producto y por mes. Hoy es `MONTHLY_UNIT_SALES` en `db/mockData.ts`. En producción se obtiene **agrupando los `OrderItem` por mes** — no necesita ser una tabla aparte si los pedidos quedan registrados, pero conviene una vista/consulta agregada.

Forma cruda que necesita el reporte (`MonthlyProductSales` por mes):
```ts
{ productId, unitsSold, revenue, unitCost, monthKey: "2026-06" }
```

> Si los pedidos reales aún no existen y se quiere arrancar con histórico cargado a mano, crear una tabla simple `MonthlySale { monthKey, productId, unitsSold }` y derivar `revenue`/`costo` cruzando con `Product` (igual que `buildMonthlyReports()`).

### 3.4 `AdminUser` — usuarios del panel

Fuente: `ConfigSection.tsx` (gestión de administradores) + `schemas/auth.ts` (login).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `string` | "Don Chuy" |
| `email` | `string` unique | login |
| `passwordHash` | `string` | bcrypt |
| `role` | `enum('owner','admin','editor')` | El form ofrece "Administrador" / "Editor"; "Propietario" es el dueño |
| `createdAt` | `datetime` | |

```prisma
model AdminUser {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         String   @default("admin") // 'owner' | 'admin' | 'editor'
  createdAt    DateTime @default(now())
}
```

### 3.5 `BrandSettings` — identidad de la tienda (singleton)

Fuente: `MarcaSection.tsx` (`MarcaData`). Es una sola fila editable.

| Campo | Tipo | Default actual |
|---|---|---|
| `brandName` | `string` | "Botas Don Chuy" |
| `heroText` | `string` | "Liquidación final · Sin reposición" |
| `tagline` | `string` (multilínea) | "Piezas únicas. Sin reposición.\nCuando se acaba, se acaba." |
| `cartNotice` | `string` | "Estos artículos no se reservan" |
| `footerNote` | `string` | "Liquidación de inventario · piezas finales · sin reposición" |
| `logoUrl` | `string?` | `null` |

```prisma
model BrandSettings {
  id         Int     @id @default(1) // singleton
  brandName  String
  heroText   String
  tagline    String
  cartNotice String
  footerNote String
  logoUrl    String?
  updatedAt  DateTime @updatedAt
}
```

---

## 4. Autenticación y roles

- El frontend tiene `/login` y `/forgot-password` (`/login` ya cableado, `mutationFn` mockeada pendiente del backend; ver `components/auth/`). El backend debe respaldarlos.
- **Login** valida contra `loginSchema` (`email` + `password` ≥ 8 chars). Devuelve un **JWT**; el front lo guarda y lo manda en `Authorization: Bearer <token>`.
- **Estado actual del front (ya implementado):**
  - `store/authStore.ts` (Zustand persist) guarda `{ token, user }` — fuente única de la sesión.
  - `lib/api/client.ts` (axios) adjunta el `Authorization: Bearer` en cada request y, ante un **`401`**, cierra sesión y redirige a `/login`. El backend debe devolver `401` con token inválido/expirado.
  - `components/auth/AdminGuard.tsx` protege `/admin` en cliente (redirige a `/login` sin token). `LoginForm` usa `useMutation`; para conectar el backend basta cambiar la `mutationFn` por `api.post("/auth/login", credentials)`.
  - Nota: hoy la sesión es token en localStorage (approach SPA). En producción puede migrarse a cookie `httpOnly` + middleware; el contrato de endpoints no cambia.
- **Rutas públicas** (sin token): catálogo (`GET /api/products`, `GET /api/products/:id`), creación de pedido (`POST /api/orders`), cotización de envío (`POST /api/shipping/rates`).
- **Rutas admin** (`/api/admin/*`): requieren JWT válido. Middleware `requireAuth`.
- **Roles:** `owner` > `admin` > `editor`. Crear/eliminar administradores: solo `owner`. Editar productos/marca/config: `admin` y `owner`. `editor` solo lectura del dashboard (ajustar según necesidad de negocio).
- **`unitCost` y todos los márgenes son datos sensibles**: jamás exponerlos en rutas públicas.

---

## 5. Endpoints REST

Resumen:

```
POST   /api/auth/login                       → { token, user }
POST   /api/auth/forgot-password             → { ok }
GET    /api/auth/me                  [auth]   → { user }

GET    /api/products                          → ProductsResult         (público, visible=true)
GET    /api/products/:id                       → Product               (público)

POST   /api/orders                             → { order }             (público)
POST   /api/shipping/rates                     → { rates: ShippingRate[] } (público)

GET    /api/admin/products            [auth]  → Product[]              (incluye unitCost)
POST   /api/admin/products            [auth]  → Product
PUT    /api/admin/products/:id         [auth]  → Product
DELETE /api/admin/products/:id         [auth]  → { ok }

GET    /api/admin/dashboard            [auth]  → DashboardData
GET    /api/admin/orders               [auth]  → Order[]

GET    /api/admin/reports/monthly      [auth]  → MonthlyReport[]
GET    /api/admin/reports/replenishment[auth]  → ReplenishmentRow[]

GET    /api/admin/brand                         → BrandSettings         (público lectura: el front la usa en la tienda)
PUT    /api/admin/brand                [auth]  → BrandSettings

GET    /api/admin/users                [auth]  → AdminUser[]            (sin passwordHash)
POST   /api/admin/users                [auth]  → AdminUser              (solo owner)
DELETE /api/admin/users/:id            [auth]  → { ok }                 (solo owner)
PUT    /api/admin/account              [auth]  → { ok }                 (cambiar correo/contraseña propios)
```

---

### 5.1 Auth

#### `POST /api/auth/login`
Body (valida con `loginSchema`):
```json
{ "email": "admin@botasdonchuy.mx", "password": "********" }
```
Respuesta `200`:
```json
{ "token": "<jwt>", "user": { "id": "...", "name": "Don Chuy", "email": "...", "role": "owner" } }
```
Errores: `400` validación, `401` credenciales inválidas.

#### `POST /api/auth/forgot-password`
Body (valida con `forgotPasswordSchema`): `{ "email": "..." }`.
Respuesta `200`: `{ "ok": true }` **siempre** (no revelar si el correo existe). Enviar correo de recuperación si aplica.

#### `GET /api/auth/me` `[auth]`
Devuelve el usuario del token: `{ "user": { id, name, email, role } }`.

---

### 5.2 Catálogo público

#### `GET /api/products`
Reemplaza `getProducts(filters)`. **Debe filtrar `visible = true`** y **omitir `unitCost`**.

Query params (`ProductFilters`):
| Param | Tipo | Default | Efecto |
|---|---|---|---|
| `categoria` | `string` | — | filtra por `type` |
| `talla` | `number` | — | filtra productos que incluyan esa talla |
| `page` | `number` | `1` | paginación (clamp a rango válido) |
| `perPage` | `number` | `9` | tamaño de página |

Respuesta `200` (`ProductsResult`):
```json
{
  "products": [ /* Product[] sin unitCost */ ],
  "total": 6,
  "page": 1,
  "perPage": 9,
  "totalPages": 1,
  "availableSizes": [24, 25, 26, 27, 28, 56, 58, 60]
}
```
- `availableSizes`: tallas únicas disponibles **del conjunto filtrado por categoría** (no por talla), ordenadas asc. Ver `getProducts.ts` líneas 53-60.
- `page` se ajusta al rango `[1, totalPages]`.

#### `GET /api/products/:id`
Reemplaza `getProductById(id)`. Respuesta `200`: `Product` (sin `unitCost`). `404` si no existe o no es visible.

---

### 5.3 Pedidos (checkout)

#### `POST /api/orders`
Crea un pedido a partir del snapshot del checkout. Llamado por `completeOrder()`.

Body sugerido:
```json
{
  "items": [
    { "productId": 1, "size": 26, "quantity": 1 }
  ],
  "customer": {
    "fullName": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "4611234567",
    "street": "Av. Reforma 123",
    "neighborhood": "Centro",
    "city": "Celaya",
    "state": "Guanajuato",
    "postalCode": "38000",
    "references": "Casa azul"
  },
  "shippingCarrier": null
}
```
**El backend recalcula los totales** (no confiar en montos del cliente):
1. Validar `customer` con `shippingSchema`.
2. Cargar cada `Product` por `productId`, **verificar stock** (por talla — ver nota en 3.1).
3. Calcular `subtotal`, `savings`, `shipping`, `total` con la lógica de [sección 6](#6-reglas-de-negocio-portar-desde-lib).
4. Congelar precios en cada `OrderItem`, descontar stock, persistir `Order`.

Respuesta `201`:
```json
{ "order": { "id": "uuid", "status": "pending", "subtotal": 4800, "savings": 2880, "shipping": 160, "total": 2080, "items": [ ... ] } }
```
Errores: `400` validación, `409` stock insuficiente (devolver qué ítem falló).

> Cuando entre Stripe: este endpoint crea el pedido en `pending`, se genera el PaymentIntent, y un webhook (`POST /api/webhooks/stripe`) lo pasa a `paid`.

---

### 5.4 Cotización de envío

#### `POST /api/shipping/rates`
Hoy el envío es **tarifa plana por categoría** (ver [sección 6.3](#63-envío-shipping)). Este endpoint es para la **migración a Skydropx** documentada en `CLAUDE.md`. Mientras no se use Skydropx, el front no lo llama (calcula el envío localmente con `computeShipping`).

Body:
```json
{
  "postalCode": "44100",
  "state": "Jalisco",
  "city": "Guadalajara",
  "neighborhood": "Americana",
  "items": [ { "productId": 1, "quantity": 1 } ]
}
```

El backend construye el payload de Skydropx (`POST {SKYDROPX_BASE_URL}/api/v1/quotations`, header `Authorization: Bearer $SKYDROPX_API_KEY`) usando las dimensiones del producto:

```ts
{
  quotation: {
    order_id: crypto.randomUUID(),
    address_from: {
      country_code: "MX",
      postal_code: process.env.SHIP_FROM_POSTAL_CODE,   // "38000"
      area_level1: process.env.SHIP_FROM_STATE,         // "Guanajuato"
      area_level2: process.env.SHIP_FROM_CITY,          // "Celaya"
      area_level3: process.env.SHIP_FROM_NEIGHBORHOOD,  // "Centro"
    },
    address_to: {
      country_code: "MX",
      postal_code: body.postalCode,
      area_level1: body.state,
      area_level2: body.city,
      area_level3: body.neighborhood,
    },
    parcels: items.map(it => ({
      weight: product.weightKg,
      length: product.lengthCm,
      width:  product.widthCm,
      height: product.heightCm,
    })),
  }
}
```

Mapeo `ShippingData` → Skydropx: `postalCode→postal_code`, `state→area_level1`, `city→area_level2`, `neighborhood→area_level3`.

Respuesta normalizada al front (`ShippingRate[]`):
```json
{
  "rates": [
    { "carrier": "Estafeta", "amount": 145, "total": 168.20, "days": 3 }
  ]
}
```
(de la respuesta Skydropx: `provider_display_name`, `amount`, `total` con IVA, `days`).

---

### 5.5 Admin — productos

Reemplazan el flujo de `ProductForm.tsx` / `ProductSection.tsx`. **Incluyen `unitCost`.**

#### `GET /api/admin/products` `[auth]`
Todos los productos (incluye `visible=false` y `unitCost`).

#### `POST /api/admin/products` `[auth]`
Body (del `ProductForm`, valida con `productSchema` de [7.3](#73-productschema-admin)):
```json
{
  "name": "Bota Ranchera 1972",
  "visible": true,
  "type": "bota",
  "originalPrice": 4800,
  "salePrice": 1920,
  "stock": 4,
  "sizes": "25, 26, 27, 28",
  "description": "...",
  "imageUrl": "https://res.cloudinary.com/...",
  "unitCost": 800,
  "weightKg": 2.5, "lengthCm": 35, "widthCm": 30, "heightCm": 20,
  "code": null
}
```
- `sizes` llega como **string separado por comas** desde el form actual → parsear a `int[]`.
- `discountPercent` se **calcula en el backend**: `round((originalPrice - salePrice) / originalPrice * 100)`.
- Validar `salePrice ≤ originalPrice`.

> El `ProductForm` actual **no captura** `unitCost` ni las dimensiones (`weightKg`, etc.); esos campos existen en el modelo pero el form los omite. Al conectar el backend, **agregar esos inputs al form** o asignar defaults por categoría. Sin `unitCost` real, los márgenes/reposición salen incorrectos.

Respuesta `201`: `Product`.

#### `PUT /api/admin/products/:id` `[auth]`
Actualiza (mismo body, parcial permitido). Respuesta `200`: `Product`.

#### `DELETE /api/admin/products/:id` `[auth]`
El form tiene botón "Eliminar". Respuesta `200`: `{ "ok": true }`. Considerar soft-delete si hay pedidos históricos que referencian el producto.

---

### 5.6 Admin — dashboard

#### `GET /api/admin/dashboard` `[auth]`
Reemplaza `MOCK_DASHBOARD`. Respuesta = `DashboardData` (`components/admin/data/types.ts`):

```ts
{
  kpis: KpiData[];          // INGRESOS, PIEZAS VENDIDAS, TICKET PROMEDIO, MEJOR DÍA
  profitKpis: KpiData[];    // GANANCIA BRUTA, MARGEN BRUTO, GASTOS FIJOS/MES, GANANCIA NETA
  revenueByPeriod: { "7": RevenuePoint[]; "30": RevenuePoint[]; "90": RevenuePoint[] };
  recentSales: SaleRow[];
  inventory: InventoryRow[];
}
```
Donde:
```ts
KpiData      = { label: string; value: string; trend?: { label: string; positive: boolean }; subtitle?: string }
RevenuePoint = { date: string; revenue: number }   // date es etiqueta legible "12 jun"
SaleRow      = { id: string; date: string; pieces: number; items: string; savings: number; total: number; costoTotal: number }
InventoryRow = { id: number; name: string; type: string; stock: number; salePrice: number; unitCost: number; valorInventario: number }
```
- `value` de los KPIs es **string ya formateado** (`"$245,506"`, `"58%"`). El front lo pinta tal cual. Formatear en es-MX en el backend.
- `Period` solo admite `"7" | "30" | "90"`.
- `valorInventario = stock × unitCost`.
- `recentSales`: últimos pedidos resumidos (concatenar nombres en `items`, p. ej. `"Bota Ranchera 1972, Bota Exótica ×2"`).

#### `GET /api/admin/orders` `[auth]`
Lista de pedidos completos (`Order[]` con `items`). Para la vista de ventas detalladas.

---

### 5.7 Admin — reportes

La sección **Reportes** encadena dos pestañas que comparten una sola fuente: ventas-por-mes-por-producto. Ver `CLAUDE.md` § "Reportes, forecast y reposición".

#### `GET /api/admin/reports/monthly` `[auth]`
Reemplaza `MOCK_MONTHLY_REPORTS`. Agrupa ventas por mes. Respuesta = `MonthlyReport[]`:
```ts
MonthlyReport = {
  key: string;            // "2026-06"
  label: string;          // "Junio 2026"
  partial?: boolean;      // true para el mes en curso
  totalRevenue: number;
  totalUnits: number;
  byProduct: MonthlyProductSales[];      // ordenado por unitsSold desc
  byCategory: MonthlyCategoryBreakdown[]; // ordenado por revenue desc
}
MonthlyProductSales      = { productId, name, type, unitsSold, revenue, unitCost }
MonthlyCategoryBreakdown = { category, label, revenue, units }
```
- `revenue = unitsSold × salePrice` (cruzar con `Product`).
- `byCategory.label`: `bota→"Botas"`, `sombrero→"Sombreros"`, `ropa→"Ropa"`.
- **Marcar `partial: true` el mes en curso.**

#### `GET /api/admin/reports/replenishment` `[auth]`
Reemplaza `MOCK_REPLENISHMENT`. **Se computa on-the-fly**, no se persiste. Respuesta = `ReplenishmentRow[]`:
```ts
ReplenishmentRow = {
  productId, name, type,
  currentStock: number,
  forecastNextMonth: number,
  forecastMethod: "promedio-simple" | "tendencia" | "suavizacion-exponencial",
  forecastMethodLabel: string,
  trend: "creciendo" | "estable" | "bajando",
  confidence: "baja" | "media" | "alta",
  diasCobertura: number,
  ingresoMensual: number,
  margenMensual: number,
  suggestedOrder: number,
  costoEstimadoPedido: number,
  priority: "urgente" | "pronto" | "ok",
}
```
Algoritmo exacto en [sección 6.2](#62-reposición). **Excluir los meses `partial`** del historial que se pasa a `computeForecast`.

---

### 5.8 Admin — marca y configuración

#### `GET /api/admin/brand`
Devuelve `BrandSettings`. Pensado como **lectura pública** (para que la tienda pinte estos textos) y escritura protegida.

> **Estado real (verificado):** la tienda aún no consume `BrandSettings` (datos dinámicos), pero los textos de marca ya están **centralizados en `lib/domain/brand.ts`** (`BRAND`): `NavHeader`, `Hero`, `Footer`, `Cart` y los **defaults de `MarcaSection`** salen todos de ahí — ya no hay strings duplicados. Cuando exista el endpoint, el cableado consiste en sustituir el `BRAND` estático por los valores servidos (con `BRAND` como fallback). El backend debe persistir estos campos igual.

#### `PUT /api/admin/brand` `[auth]`
Body parcial de `BrandSettings`. El `MarcaSection` autoguarda campo por campo, así que aceptar updates parciales. Respuesta `200`: `BrandSettings`.

#### `GET /api/admin/users` `[auth]`
Lista de administradores (`AdminUser[]` **sin `passwordHash`**).

#### `POST /api/admin/users` `[auth]` (solo `owner`)
Body (de `ConfigSection`): `{ "name", "email", "password", "role": "admin" | "editor" }`. Hashea la contraseña temporal. Respuesta `201`: `AdminUser`.

#### `DELETE /api/admin/users/:id` `[auth]` (solo `owner`)

#### `PUT /api/admin/account` `[auth]`
Cambiar correo o contraseña propios. Para contraseña: `{ currentPassword, newPassword, confirmPassword }` — verificar `currentPassword`, exigir `newPassword === confirmPassword` y ≥ 8 chars.

---

## 6. Reglas de negocio (portar desde `lib/`)

Estas funciones son **puras y portables**: cópialas tal cual al backend para que front y back den el mismo número.

### 6.1 Totales del carrito — `lib/domain/cart.ts`

```ts
subtotal = Σ (item.originalPrice × quantity)
savings  = Σ ((item.originalPrice − item.salePrice) × quantity)
shipping = computeShipping(items)            // ver 6.3
total    = subtotal − savings + shipping
```
`CartTotals = { subtotal, savings, shipping, total }`. **El backend recalcula esto en `POST /api/orders`** — nunca confiar en los montos del cliente.

### 6.2 Reposición — `db/mockData.ts` `buildReplenishment()`

Por producto, sobre el historial de **meses completos** (`!partial`):
```ts
monthlySales      = [unitsSold por mes, en orden cronológico]
forecast          = computeForecast(monthlySales)            // ver 6.4
avgUnits          = promedio(monthlySales)
ingresoMensual    = round(avgUnits × salePrice)
margenMensual     = round(avgUnits × (salePrice − unitCost))
diasCobertura     = forecast.forecastNextMonth > 0
                      ? round(stock / forecast.forecastNextMonth × 30)
                      : 999
suggestedOrder    = max(0, round(forecast.forecastNextMonth × 2) − stock)  // objetivo ~60 días
costoEstimadoPedido = suggestedOrder × unitCost
priority          = diasCobertura < 15 ? "urgente"
                  : diasCobertura < 45 ? "pronto" : "ok"
```
**Orden de la tabla:** por urgencia de cobertura primero (`urgente`→`pronto`→`ok`); dentro de cada nivel, **por `margenMensual` desc** (desempate por ganancia, no por urgencia). Para ordenar por ingreso bruto, usar `ingresoMensual` en vez de `margenMensual`.

### 6.3 Envío (shipping) — `lib/domain/cart.ts` `computeShipping()`

**Estado actual: tarifa plana por categoría.** Se cobra la tarifa del producto **más caro de enviar** en el carrito:
```ts
SHIPPING_BY_TYPE = { bota: 160, sombrero: 130, ropa: 100 }  // MXN
SHIPPING_FALLBACK = 150
shipping = items.length === 0 ? 0 : max(items.map(i => SHIPPING_BY_TYPE[i.type] ?? 150))
```
Origen: Celaya, Guanajuato, CP 38000. Migración a Skydropx en [5.4](#54-cotización-de-envío) (entonces el costo viene de la opción elegida por el cliente, no de esta función).

### 6.4 Forecast — `lib/forecast.ts` `computeForecast(monthlySales: number[])`

Auto-escala el algoritmo según cuántos meses reciba:

| Meses | Algoritmo | `method` | confianza |
|---|---|---|---|
| 0 | sin datos → `forecastNextMonth: 0` | `promedio-simple` | baja |
| 1–2 | promedio simple | `promedio-simple` | baja |
| 3 | promedio ponderado + tendencia (±15%, cap 1.6 / floor 0.5) | `tendencia` | media |
| 4+ | suavización exponencial de Holt (α=0.4, β=0.3) | `suavizacion-exponencial` | alta |

Devuelve `{ forecastNextMonth, method, methodLabel, trend, confidence }`. **Copiar el archivo `lib/forecast.ts` completo** — es independiente del front.

### 6.5 Exportación CSV (ya está en el front)

Los reportes exportan CSV **en el cliente** (`SalesReport.tsx`, `ReplenishmentReport.tsx`) con escapado RFC 4180 + BOM para Excel. **El backend no necesita generar CSV** salvo que se quiera mover la exportación al servidor. Si se mueve: misma forma de columnas que documenta `CLAUDE.md` § "Exportación CSV".

---

## 7. Esquemas de validación (zod)

Reusar los esquemas del front (`schemas/`) en el backend para tener **una sola definición de reglas**. Si el backend es TS, importar/compartir; si no, replicar.

### 7.1 `shippingSchema` (`schemas/checkout.ts`) — usado en `POST /api/orders`
```ts
{
  fullName:    string, trim, min 3, max 80,
  email:       email válido,
  phone:       /^\d{10}$/  (10 dígitos),
  street:      string, trim, min 3,
  neighborhood:string, trim, min 2,
  city:        string, trim, min 2,
  state:       enum(MEXICAN_STATES),   // 32 estados — lista cerrada
  postalCode:  /^\d{5}$/  (5 dígitos),
  references:  string, trim, max 200, opcional,
}
```
`MEXICAN_STATES`: lista de los 32 estados (ver `schemas/checkout.ts`). **Los envíos solo se permiten dentro de México.**

### 7.2 `loginSchema` / `forgotPasswordSchema` (`schemas/auth.ts`)
```ts
loginSchema          = { email: email válido, password: string trim min 8 }
forgotPasswordSchema = { email: email válido }
```

### 7.3 `productSchema` (admin) — derivado de `ProductForm.tsx`
```ts
{
  name:          string min 1,
  visible:       boolean,
  type:          enum('bota','sombrero','ropa'),
  originalPrice: number ≥ 0,
  salePrice:     number ≥ 0,
  stock:         int ≥ 0,
  sizes:         string,        // "25, 26, 27" → parsear a int[]
  description:   string,
  imageUrl:      string | null,
}
.refine(salePrice ≤ originalPrice)
```
**El backend debe extender este esquema** con los campos que el form aún no captura pero el modelo necesita: `unitCost`, `weightKg`, `lengthCm`, `widthCm`, `heightCm`, `code`.

---

## 8. Notas de seguridad

- **`unitCost`, `margenMensual`, `costoTotal`, `valorInventario`, `costoEstimadoPedido` son datos sensibles del negocio.** Exponerlos **solo** en rutas `/api/admin/*` autenticadas. Las rutas públicas de catálogo nunca deben incluirlos.
- **Recalcular siempre los totales en el servidor** al crear pedidos. El cliente envía qué quiere comprar; el backend decide cuánto cuesta.
- **Verificar stock por talla** en el servidor antes de confirmar el pedido (el front valida, pero no es autoritativo).
- **Contraseñas con bcrypt** (nunca texto plano). `forgot-password` no debe revelar si un correo existe.
- **CORS** restringido al origen del frontend (`CORS_ORIGIN`).
- **Rate limiting** en `/api/auth/login` y `/api/auth/forgot-password`.
- **JWT** con expiración; validar rol en rutas que lo requieran (crear/eliminar admins = solo `owner`).
- **Skydropx / Stripe keys** solo en el servidor, nunca expuestas al cliente.

---

## 9. Notas de verificación (barrido completo de `components/` y `app/`)

Revisé **todos** los componentes y rutas, no solo los mocks. Hallazgos que afinan el contrato:

- **El detalle de producto usa el `id` como slug.** La ruta es `/outlet/[slug]/producto` y resuelve con `getProductById(Number(slug))` (`app/(public)/outlet/[slug]/producto/page.tsx`). Es decir, `slug` = `Product.id` numérico → `GET /api/products/:id`. No hay slugs de texto.

- **Las rutas por categoría YA existen** (`/botas`, `/sombreros`, `/ropa`) — cada una renderiza `OutletView` con `defaultCategoria`. **No requieren endpoint nuevo**: todas consumen `GET /api/products?categoria=<tipo>`. (CLAUDE.md las listaba como "planeadas"; en realidad están construidas.)

- **Params de URL del outlet:** el front lee `categoria`, `talla` (un solo número) y `pagina` de la URL y los mapea a los filtros `categoria`/`talla`/`page` del endpoint. El contrato de query (`page`, `perPage`) no cambia.

- **Lista de outlet (`OutletCard`)** solo necesita `id, name, originalPrice, salePrice, discountPercent, stock, imageSrc`. La regla `stock === 1 → "última pieza"` es lógica de front. Todo cubierto por `Product`.

- **Métricas derivadas se calculan en el cliente — el backend NO las envía.** Confirmado leyendo `SalesReport`, `ReplenishmentReport` y `RevenueChart`:
  - `SalesReport` calcula `% del total`, `precio promedio/pieza` y la `tendencia vs mes anterior` a partir del arreglo `MonthlyReport[]`. El backend solo devuelve los meses crudos.
  - `ReplenishmentReport` calcula el conteo de `urgentes`, la `inversión sugerida` total y el rango de historial a partir de `ReplenishmentRow[]` + `MonthlyReport[]`.
  - `RevenueChart` recibe las **tres series** (`"7"|"30"|"90"`) de una vez en `revenueByPeriod` y alterna en el cliente. El backend debe mandar las tres juntas en `GET /api/admin/dashboard`.
  - **Implicación:** mantener las respuestas "crudas" como están tipadas; no pre-agregar en el servidor más allá de lo que ya pide cada tipo.

- **La exportación CSV es 100% del cliente** (`SalesReport.exportCSV`, `ReplenishmentReport.exportCSV`). El backend **no genera CSV**. Columnas confirmadas:
  - Ventas: `Pos, Producto, Tipo, Unidades, Ingresos, % del total` → `ventas-<key>.csv`.
  - Reposición: `Producto, Tipo, Stock Actual, Forecast Próx. Mes, Tendencia, Método, Días Cobertura, Ingreso Mensual, Margen Mensual, Prioridad, Sugerido Comprar, Costo Est. Pedido` → `reposicion-<YYYY-MM>.csv`.

- **El carrito vive 100% en el cliente** (`store/cartStore.ts`, persistido en localStorage `botas-don-chuy-cart`). Guarda el **objeto `MockProduct` completo** por ítem. No hay endpoint de carrito; el backend solo recibe el snapshot en `POST /api/orders` (`{ productId, size, quantity }`).

- **El stock por talla depende de la repetición en `sizes`** — reconfirmado en `ProductInfo`, `Cart` y `cartStore` (todos hacen `product.sizes.filter(s => s === size).length` para el máximo por talla). Esto refuerza la decisión pendiente de `ProductSize` en [sección 3.1](#31-product--catálogo): si el backend cambia este modelo, hay que actualizar el cálculo de stock por talla en esos tres lugares.

- **Auth está mockeado** (`LoginForm` hace `console.log`, `ForgotPasswordForm` solo muestra confirmación). Ambos ya validan con los esquemas de `schemas/auth.ts` y están listos para cambiar el `onSubmit` por una llamada real a `/api/auth/*`. Sin campos nuevos.

- **Marca unificada:** se eliminó el remanente "El Último Corte" / `admin@elultimocorte.mx`. El nombre canónico es **"Botas Don Chuy Outlet"** y el correo semilla **`admin@botasdonchuy.mx`**, ambos en `lib/domain/brand.ts` (`BRAND`). Usar esos valores al hacer el seed de `AdminUser` y `BrandSettings`.

- **Secciones del panel** (`app/admin/page.tsx`, tipo `AdminSection`): `marca`, `productos`, `datos`, `reportes`, `configuracion` — todas mapeadas a endpoints en [sección 5](#5-endpoints-rest). No surgió ninguna necesidad de datos adicional.

---

## 10. Checklist de implementación

- [ ] Proyecto Express + TypeScript + Prisma + Postgres
- [ ] Migraciones: `Product`, `Order`, `OrderItem`, `AdminUser`, `BrandSettings` (+ decisión sobre `ProductSize`)
- [ ] Seed con los 6 productos de `db/mockProducts.ts` y el histórico de `MONTHLY_UNIT_SALES`
- [ ] Copiar `lib/forecast.ts` y la lógica de `lib/domain/cart.ts` al backend
- [ ] Middleware `requireAuth` + verificación de rol
- [ ] Auth: `/login`, `/forgot-password`, `/me`
- [ ] Catálogo público: `GET /products`, `GET /products/:id` (filtrar `visible`, ocultar `unitCost`)
- [ ] Checkout: `POST /orders` (recalcular totales, verificar stock, congelar precios)
- [ ] Admin productos: GET/POST/PUT/DELETE (extender form con `unitCost` + dimensiones)
- [ ] Admin dashboard: `GET /dashboard` (KPIs formateados, inventario, ventas recientes)
- [ ] Admin reportes: `GET /reports/monthly`, `GET /reports/replenishment` (excluir meses `partial`)
- [ ] Admin marca: `GET/PUT /brand` (lectura pública)
- [ ] Admin usuarios + cuenta: `/users`, `/account`
- [ ] Compartir/replicar esquemas zod (`shippingSchema`, `loginSchema`, `productSchema`)
- [ ] (Después) Skydropx: `POST /shipping/rates` + paso de selección en checkout
- [ ] (Después) Stripe: PaymentIntent + webhook `paid`
```
