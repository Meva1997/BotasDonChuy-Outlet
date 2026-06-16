# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standing rules

Before every git commit, proactively check if `README.md` and `CLAUDE.md` are up to date with the changes being committed. Update them if needed — do not wait for the user to ask.

## Commands

```bash
pnpm dev        # Start dev server (localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint
```

Package manager is **pnpm** (not npm/yarn). Use `pnpm add` to install dependencies.

## Stack

- **Next.js 16** with App Router (all pages in `app/`)
- **React 19**, **TypeScript**
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, not a `tailwind.config.*` file. Custom theme tokens (fonts, `tobacco-*` color scale) live in a `@theme {}` block in `globals.css`.
- **Playwright** (`@playwright/test`) — installed as a dev dependency for e2e testing.

## Architecture

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, base classes, metadata, CartProvider
  page.tsx        # Home page — composes NavHeader + Hero + Footer
  admin/
    layout.tsx    # Admin layout: full-height stone-950 shell
    page.tsx      # Admin dashboard — Sidebar + section routing (AdminSection type)
  (public)/
    outlet/
      [slug]/
        producto/ # Product detail page (async RSC → ProductInfo client component)
    terminos/     # Terms & Conditions page → TermsConditions component
    privacidad/   # Privacy Policy page → PrivacyPolicy component
    envios/       # Shipping Policy page → ShippingInfo component
  login/          # Login page → AuthShell + LoginForm
  forgot-password/ # Forgot password page → AuthShell + ForgotPasswordForm
components/
  home/           # Page-level sections (NavHeader, Hero, Footer)
  outlet/         # OutletView — product listing with category filters
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider, Sidebar)
  checkout/       # Multi-step checkout flow (see "Checkout flow" below)
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal content pages
  auth/           # AuthShell (split-panel layout) + LoginForm/ForgotPasswordForm — react-hook-form + zod (schemas/auth.ts), submission is mocked pending backend
  admin/          # Panel de administración — secciones completas:
                  #   MarcaSection — editor de identidad de marca (logo, colores, copy)
                  #   ProductSection — gestión de catálogo (ProductForm, ProductCategoryView)
                  #   DataSection — métricas y estadísticas (KpiGrid, RevenueChart, InventoryTable, SalesTable)
                  #   ReportesSection — análisis mensual con pestañas Ventas / Reposición + selector de mes
                  #   ConfigSection — ajustes generales de la tienda
                  #   data/ — subcomponentes de gráficas y tablas (recharts) + types.ts (contratos de datos del admin)
                  #   reportes/ — SalesReport (histórico por mes) y ReplenishmentReport (forecast + pedido sugerido)
db/
  mockProducts.ts # MockProduct interface + MOCK_PRODUCTS array
  mockData.ts     # Datos de ejemplo del admin: KPIs, ingresos, inventario, ventas mensuales y reposición.
                  #   Deriva MOCK_MONTHLY_REPORTS y MOCK_REPLENISHMENT desde MONTHLY_UNIT_SALES + MOCK_PRODUCTS
lib/
  getProducts.ts  # getProducts(filters), getProductById(id), Product type
  cart.ts         # computeTotals(items) — pure subtotal/savings/total helper
  forecast.ts     # computeForecast(monthlySales) — pronóstico de demanda auto-escalado por nº de meses
  utils/
    index.ts      # formatPrice(amount) — es-MX locale formatting
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema + LoginData/ForgotPasswordData types
store/
  cartStore.ts    # Zustand store (persist) — cart items, open/close, totals, stock-aware addItem
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/checkout`, `/terminos`, `/privacidad`, `/envios`, `/admin`, `/login`, `/forgot-password`

**Planned routes** (not yet built): `/botas`, `/sombreros`, `/ropa`, `/carrito`, `/nosotros`, `/devoluciones`

## State Management

Cart state lives in a Zustand store (`store/cartStore.ts`) with `persist` middleware (localStorage key: `botas-don-chuy-cart`). The `Cart` drawer is rendered globally via `CartProvider` (dynamic import, SSR disabled) mounted in the root layout. `NavHeader` reads `totalItems()` and calls `toggleCart()`. `ProductInfo` calls `addItem()` + `openCart()` with per-size stock validation.

## Checkout flow

`/checkout` is a 3-step wizard. Step state is held in a React context (`components/checkout/CheckoutContext.tsx`, scoped via `CheckoutProvider` in the page — not persisted, so a refresh restarts at step 0):

1. **Resumen** (`OrderSummary`) — read-only cart review + **required** terms & privacy checkbox; "Continuar" is disabled until accepted.
2. **Datos de envío** (`UserDetails`) — shipping form validated with `react-hook-form` + `zodResolver` against `schemas/checkout.ts`. Shipping is restricted to Mexico via the `MEXICAN_STATES` enum. Payment (`PaymentSection`) is a presentational placeholder to be replaced by **Stripe Elements** later — its fields are not validated or submitted. On submit, `completeOrder()` snapshots the cart + totals + customer into the context, clears the Zustand cart, and advances.
3. **Confirmación** (`Success`) — renders the frozen order snapshot + shipping address.

Shared, prop-driven pieces: `Stepper` (wizard indicator), `OrderItems`, `OrderTotals`, and `FormControls` (`TextField`/`SelectField` — `forwardRef` inputs that take RHF `register()` spread + an `error` string).

## Shipping — estado actual y hoja de ruta

### Estado actual: tarifa plana por categoría

`lib/cart.ts` contiene toda la lógica de envío. El campo `CartTotals.shipping` fluye por todo el sistema — `OrderTotals`, `OrderSummary`, `Success`, y la snapshot en `CheckoutContext.completeOrder()`. No hay más lugares que actualizar.

Regla activa: se cobra la tarifa del producto más caro del carrito (la bota domina sobre el sombrero, el sombrero sobre la ropa). Origen: Celaya, Guanajuato, CP 38000.

```
SHIPPING_BY_TYPE = { bota: 160, sombrero: 130, ropa: 100 }  // MXN
```

### Migración a Skydropx (cuando el volumen lo justifique)

La documentación oficial fue verificada contra la API real de Skydropx. Todo lo que se describe abajo está basado en endpoints confirmados.

**Lo que ya está listo en el proyecto**

- `MockProduct` ya incluye `weightKg`, `lengthCm`, `widthCm`, `heightCm` en todos los productos — los únicos datos de empaque que Skydropx necesita.
- `ShippingData` (schemas/checkout.ts) ya captura `postalCode`, `state`, `city`, `neighborhood` — que mapean directamente a los campos de Skydropx:

  | Campo en ShippingData | Campo en Skydropx |
  |---|---|
  | `postalCode` | `postal_code` |
  | `state` | `area_level1` |
  | `city` | `area_level2` |
  | `neighborhood` | `area_level3` |

**Paso 1 — Obtener credenciales**

Crear cuenta en skydropx.com y obtener el API key desde el panel. Agregar a Vercel:

```
SKYDROPX_API_KEY=tu_api_key_aqui
```

Base URL: `https://pro.skydropx.com`  
Autenticación: header `Authorization: Bearer $SKYDROPX_API_KEY`

**Paso 2 — Crear API route para cotización**

`app/api/shipping/rates/route.ts` — recibe el CP destino + items del carrito, llama a Skydropx y devuelve las opciones disponibles.

Endpoint Skydropx: `POST /api/v1/quotations`

```typescript
// Payload que construir con los datos que ya tenemos:
{
  quotation: {
    order_id: crypto.randomUUID(),          // UUID aleatorio por cotización
    address_from: {
      country_code: "MX",
      postal_code: "38000",                 // CP fijo de Celaya
      area_level1: "Guanajuato",
      area_level2: "Celaya",
      area_level3: "Centro",
    },
    address_to: {
      country_code: "MX",
      postal_code: shippingData.postalCode,
      area_level1: shippingData.state,
      area_level2: shippingData.city,
      area_level3: shippingData.neighborhood,
    },
    parcels: [
      // Un parcel por cada CartItem, usando las dimensiones del producto:
      {
        weight: item.product.weightKg,
        length: item.product.lengthCm,
        width: item.product.widthCm,
        height: item.product.heightCm,
      }
    ],
  }
}
```

La respuesta de Skydropx incluye: `provider_display_name`, `amount` (precio sin IVA), `total` (con IVA), `days` (días estimados de entrega).

**Paso 3 — Agregar paso de selección de envío al checkout**

Insertar un paso entre "Datos de envío" y "Confirmación":
- `CHECKOUT_STEPS` en `CheckoutContext.tsx` pasa de 3 a 4 elementos
- Nuevo componente `ShippingOptions.tsx` llama al API route y muestra las opciones con precio y días
- La opción elegida (carrier + precio) se guarda en el context y se pasa a `completeOrder()`

**Paso 4 — Reemplazar `computeShipping`**

`computeShipping(items)` en `lib/cart.ts` se elimina o queda como fallback. El costo de envío pasa a venir del context (opción elegida por el cliente). `CartTotals.shipping` no cambia — solo cambia de dónde viene el valor.

**Nada más cambia.** `OrderTotals`, `OrderSummary`, `Success`, y `CheckoutContext` consumen `CartTotals.shipping` de forma genérica y no necesitan modificaciones.

## Reportes, forecast y reposición

La sección **Reportes** (`components/admin/ReportesSection.tsx`) tiene dos pestañas que comparten **una sola fuente de datos** y están encadenadas: el reporte de ventas alimenta al de reposición.

### Flujo de datos (todo derivado, nada escrito a mano)

```
MONTHLY_UNIT_SALES (db/mockData.ts)        ← única matriz manual: unidades vendidas por mes/producto
        │
        ├──► buildMonthlyReports() ──► MOCK_MONTHLY_REPORTS ──► SalesReport
        │        (cruza unidades × MOCK_PRODUCTS para precio/categoría)   (histórico: qué se vendió)
        │
        └──► buildReplenishment() ──► MOCK_REPLENISHMENT ──► ReplenishmentReport
                 │                                              (futuro: qué comprar)
                 └─ toma SOLO los meses completos (no `partial`) de MOCK_MONTHLY_REPORTS,
                    extrae unitsSold por producto → computeForecast(monthlySales)
```

Cambiar `MONTHLY_UNIT_SALES` recalcula automáticamente ambos reportes, los KPIs y el pedido sugerido. **No hay números duplicados que mantener sincronizados.**

### `lib/forecast.ts` — pronóstico auto-escalado

`computeForecast(monthlySales: number[])` elige el algoritmo según cuántos meses de historial reciba (la función no sabe si los datos son mock o reales — solo recibe números):

| Meses | Nivel | Algoritmo | Confianza |
|---|---|---|---|
| 1–2 | 1 | Promedio simple | baja |
| 3 | 2 | Promedio ponderado + detector de tendencia (±15%) | media |
| 4+ | 3 | Suavización exponencial de Holt (α=0.4, β=0.3) | alta |

Devuelve `{ forecastNextMonth, method, methodLabel, trend, confidence }`. Con más meses, el sistema sube de nivel solo.

### Reposición — cobertura primero, margen como desempate

`buildReplenishment()` (`db/mockData.ts`) calcula por producto:
- `diasCobertura = stock / forecastNextMonth × 30`
- `suggestedOrder = max(0, forecastNextMonth × 2 − stock)` (objetivo: ~60 días de cobertura)
- `costoEstimadoPedido = suggestedOrder × costoUnitario`
- `ingresoMensual = unidadesProm/mes × salePrice` y `margenMensual = unidadesProm/mes × (salePrice − costoUnitario)`
- `priority`: `urgente` (<15 días) · `pronto` (<45) · `ok` (≥45)

**Orden de la tabla**: por urgencia de cobertura primero (un stock-out no se entierra), y **dentro de cada nivel, por `margenMensual` desc** — primero los productos que más ganancia generan. El dinero (margen) es **tie-breaker**, no el driver de urgencia: repones por demanda (unidades), no por facturación. Para ordenar por ingreso bruto en lugar de margen, cambiar `b.margenMensual` por `b.ingresoMensual` en el `.sort()`.

### Exportación CSV

Ambos reportes exportan CSV con un helper `csvField()` (escapado RFC 4180: envuelve en comillas y duplica las internas si hay `,`/`"`/salto de línea) y BOM `﻿` para que Excel respete acentos. Son **documentos distintos**:
- **Ventas** → `ventas-<YYYY-MM>.csv` (mes seleccionado): Pos, Producto, Tipo, Unidades, Ingresos, % del total.
- **Reposición** → `reposicion-<YYYY-MM>.csv` (mes actual): Producto, Tipo, Stock, Forecast, Tendencia, Método, Días Cobertura, Ingreso Mensual, Margen Mensual, Prioridad, Sugerido Comprar, Costo Est.

## Backend (Express.js) — contrato base

El frontend hoy lee de mocks en `db/`. El backend Express debe **reemplazar esos mocks exponiendo las mismas formas de datos** (los tipos viven en `components/admin/data/types.ts` y `db/mockProducts.ts`). Mientras los contratos se respeten, los componentes no cambian.

> **Principio:** la lógica de negocio (forecast, reposición, totales de carrito, envío) ya está en `lib/` como funciones puras que reciben números. El backend solo debe **persistir y servir los datos crudos**; puede reusar esa misma lógica o reimplementarla. La única matriz "fuente de verdad" es ventas-por-mes-por-producto.

### Modelos / tablas mínimas

| Modelo | Campos clave (ver tipos exactos en el front) | Sirve a |
|---|---|---|
| `Product` | `id, name, salePrice, costoUnitario, stock, type, weightKg, lengthCm, widthCm, heightCm, sizes/stock por talla` | catálogo, inventario, forecast, envío |
| `Sale` / `OrderItem` | `productId, unitsSold, revenue, costoUnitario, date` | ventas mensuales, KPIs |
| `Order` | snapshot de carrito + `ShippingData` + totales + envío elegido | checkout, confirmación |

### Endpoints sugeridos (REST)

```
GET  /api/products                 → Product[]            (público: outlet, detalle)
GET  /api/products/:id             → Product
POST /api/admin/products           → crea (ProductForm)
PUT  /api/admin/products/:id        → actualiza stock/precio/etc.

GET  /api/admin/dashboard          → DashboardData        (KpiData[], RevenuePoint[] por periodo, SaleRow[], InventoryRow[])
GET  /api/admin/reports/monthly    → MonthlyReport[]      (agrupa ventas por mes → byProduct, byCategory)
GET  /api/admin/reports/replenishment → ReplenishmentRow[] (corre computeForecast por producto sobre meses completos)

POST /api/orders                   → crea pedido (recibe snapshot del checkout)
POST /api/shipping/rates           → cotización Skydropx (ver "Shipping" abajo)
```

### Notas de implementación para el backend

- **`MonthlyReport`** se calcula agrupando ventas por mes; marcar `partial: true` el mes en curso. La reposición **debe excluir los meses parciales** del historial que pasa a `computeForecast` (igual que `buildReplenishment` filtra `!r.partial`).
- **`ReplenishmentRow`** no es persistente: se computa on-the-fly desde ventas históricas + stock actual + costo. Reusar la fórmula documentada arriba (cobertura, suggestedOrder, margen, priority y el orden con margen como tie-breaker).
- **`costoUnitario` y márgenes son datos sensibles** del negocio: exponerlos solo en rutas `/api/admin/*` autenticadas, nunca en las públicas de catálogo.
- **Forecast en el servidor**: `lib/forecast.ts` es puro y portable — se puede copiar tal cual al backend (o llamar desde una API route Next.js) para que front y back den el mismo número.
- **Validación**: reusar los esquemas zod de `schemas/` (p. ej. `shippingSchema`) en el backend para validar payloads de pedido y mantener una sola definición de las reglas.

## Design System

The site uses a luxury dark aesthetic — all new UI should follow these conventions:

- **Background**: `bg-stone-950`
- **Text primary**: `text-amber-50`
- **Text muted**: `text-amber-100/50` (or similar opacity variants)
- **Accent**: `text-amber-400` / `border-amber-400/70`
- **Serif font** (headings): `font-serif` → Playfair Display via CSS var `--font-playfair`
- **Sans font** (body/labels): `font-sans` → Jost via CSS var `--font-jost`
- Labels use heavy letter-spacing (`tracking-[0.25em]`) and `uppercase`
- All copy is in **Spanish** (Mexican market)
