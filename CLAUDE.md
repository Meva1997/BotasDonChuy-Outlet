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
  layout.tsx      # Root layout: fonts, base classes, metadata, QueryProvider + CartProvider
  page.tsx        # Home page — composes NavHeader + Hero + Footer
  admin/
    layout.tsx    # Admin layout: AdminGuard (route protection) + full-height tobacco-950 shell
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
  auth/           # AuthShell (split-panel layout) + LoginForm/ForgotPasswordForm — react-hook-form + zod (schemas/auth.ts). LoginForm usa TanStack Query (useMutation), mockeada pendiente de backend. AdminGuard — protege /admin (ver "Auth & data fetching")
  providers/      # QueryProvider — QueryClientProvider de TanStack Query (montado en root layout)
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
  api/
    client.ts     # instancia axios (baseURL NEXT_PUBLIC_API_URL ?? /api) + interceptors: request adjunta Bearer del authStore, response cierra sesión y va a /login en 401
  getProducts.ts  # getProducts(filters), getProductById(id), Product type
  cart.ts         # computeTotals(items) — pure subtotal/savings/total helper
  motion.ts       # variantes framer-motion compartidas (fadeUp, fadeIn, staggerContainer, EASE_LUXE)
  forecast.ts     # computeForecast(monthlySales) — pronóstico de demanda auto-escalado por nº de meses
  brand.ts        # BRAND — fuente única de identidad/copy de marca (nombre, email, hero, tagline, cartNotice…). Defaults de MarcaSection y textos del storefront salen de aquí
  categories.ts   # CATEGORIES + CategoryInfo/ProductType + categoryPlural()/categorySingular() — fuente única de categorías y etiquetas (antes duplicadas en ~10 archivos)
  utils/
    index.ts      # formatPrice(amount) — es-MX locale formatting (incluye el símbolo $)
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema + LoginData/ForgotPasswordData types
store/
  cartStore.ts    # Zustand store (persist) — cart items, open/close, totals, stock-aware addItem
  authStore.ts    # Zustand store (persist, key botas-don-chuy-auth) — token + user de sesión admin, login()/logout()/isAuthenticated(). Fuente única del token (axios client + AdminGuard)
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/botas`, `/sombreros`, `/ropa`, `/checkout`, `/terminos`, `/privacidad`, `/envios`, `/admin`, `/login`, `/forgot-password` (las 3 de categoría reutilizan `OutletView` con `defaultCategoria`)

**Planned routes** (not yet built): `/carrito`, `/nosotros`, `/devoluciones`

## State Management

Cart state lives in a Zustand store (`store/cartStore.ts`) with `persist` middleware (localStorage key: `botas-don-chuy-cart`). The `Cart` drawer is rendered globally via `CartProvider` (dynamic import, SSR disabled) mounted in the root layout. `NavHeader` reads `totalItems()` and calls `toggleCart()`. `ProductInfo` calls `addItem()` + `openCart()` with per-size stock validation.

Auth/session state lives in `store/authStore.ts` (Zustand + `persist`, key `botas-don-chuy-auth`) — ver "Auth & data fetching".

## Auth & data fetching

Stack de datos: **TanStack Query + Axios + Zod**. `QueryProvider` (`components/providers/QueryProvider.tsx`) monta el `QueryClientProvider` en el root layout.

- **`lib/api/client.ts`** — instancia axios única. `baseURL = process.env.NEXT_PUBLIC_API_URL ?? "/api"`. El **request interceptor** adjunta `Authorization: Bearer <token>` leyendo `useAuthStore.getState().token`; el **response interceptor** en `401` llama `logout()` y redirige a `/login` (vía `window.location`, para poder usarse fuera de componentes). Toda llamada al backend debe pasar por esta instancia.
- **Sesión** — `store/authStore.ts` guarda `{ token, user }` en localStorage. Es la fuente única que leen el interceptor y el guard.
- **Login** — `components/auth/LoginForm.tsx` usa `useMutation`. Hoy la `mutationFn` está **mockeada** (devuelve un token `mock-<uuid>`); para el backend real, reemplazar su cuerpo por `api.post("/auth/login", credentials)` (ver `BACKEND.md`). En `onSuccess` guarda la sesión y navega a `/admin`.
- **Protección de `/admin`** — `components/auth/AdminGuard.tsx` (en `app/admin/layout.tsx`) lee el token con un patrón hidratación-safe (`useSyncExternalStore`); sin token redirige a `/login`. **Logout** desde el botón "Cerrar Sesión" de `ConfigSection`.

> Modelo de seguridad: token en localStorage + guard cliente es lo correcto para el approach axios/SPA en esta etapa sin backend. En producción (con backend) conviene cookie `httpOnly` + middleware de Next; el interceptor 401 ya deja listo el camino. `unitCost`/márgenes solo deben exponerse en rutas `/api/admin/*` autenticadas.

Env: `NEXT_PUBLIC_API_URL` apunta al backend (sin definir → `/api`). No commitear secretos.

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
- `costoEstimadoPedido = suggestedOrder × unitCost`
- `ingresoMensual = unidadesProm/mes × salePrice` y `margenMensual = unidadesProm/mes × (salePrice − unitCost)`
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
| `Product` | `id, name, salePrice, unitCost, stock, type, weightKg, lengthCm, widthCm, heightCm, sizes/stock por talla` | catálogo, inventario, forecast, envío |
| `Sale` / `OrderItem` | `productId, unitsSold, revenue, unitCost, date` | ventas mensuales, KPIs |
| `Order` | snapshot de carrito + `ShippingData` + totales + envío elegido | checkout, confirmación |

### Endpoints sugeridos (REST)

```
POST /api/auth/login               → { token, user }      (login admin — ver "Auth")
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
- **`unitCost` y márgenes son datos sensibles** del negocio: exponerlos solo en rutas `/api/admin/*` autenticadas, nunca en las públicas de catálogo.
- **Forecast en el servidor**: `lib/forecast.ts` es puro y portable — se puede copiar tal cual al backend (o llamar desde una API route Next.js) para que front y back den el mismo número.
- **Validación**: reusar los esquemas zod de `schemas/` (p. ej. `shippingSchema`) en el backend para validar payloads de pedido y mantener una sola definición de las reglas.
- **Auth**: `POST /api/auth/login` recibe `{ email, password }` (validar con `loginSchema` de `schemas/auth.ts`) y devuelve `{ token, user: { email } }`. El front guarda el token y lo manda como `Authorization: Bearer <token>`; el backend debe responder `401` cuando sea inválido/expirado (el axios interceptor ya cierra sesión y redirige). Proteger todas las rutas `/api/admin/*` con ese token.

## Design System

The site uses a luxury dark aesthetic — all new UI should follow these conventions:

- **Background (page/shell)**: `bg-tobacco-950` — única fuente de verdad. Aplica al `<body>` (root layout), storefront, admin y auth. No usar `bg-stone-950` como fondo de página.
- **Surfaces** (cards, drawers, dropdowns sobre el fondo): `bg-stone-900` / `bg-stone-900/60` — capa elevada sobre `tobacco-950` (mismo patrón en storefront y admin).
- **Text primary**: `text-amber-50`
- **Text muted**: `text-amber-100/50` (or similar opacity variants)
- **Accent**: `text-amber-400` / `border-amber-400/70`
- **Serif font** (headings): `font-serif` → Playfair Display via CSS var `--font-playfair`
- **Sans font** (body/labels): `font-sans` → Jost via CSS var `--font-jost`
- Labels use heavy letter-spacing (`tracking-[0.25em]`) and `uppercase`
- All copy is in **Spanish** (Mexican market)

### Animaciones, accesibilidad e imágenes

- **Animaciones**: usar **framer-motion** (no transiciones CSS ad-hoc para entradas/salidas). Variantes compartidas en `lib/motion.ts` (`fadeUp`, `fadeIn`, `staggerContainer`, `EASE_LUXE`). Los drawers (`Cart`, `Sidebar`) usan `AnimatePresence` + `motion`. Respetar `useReducedMotion()` para desactivar slides.
- **Foco / teclado**: `globals.css` define un anillo `:focus-visible` ámbar global para todos los controles. No usar `focus:outline-none` sin un `focus-visible` de reemplazo.
- **Movimiento reducido**: `globals.css` neutraliza animaciones/transiciones bajo `prefers-reduced-motion: reduce`.
- **Imágenes**: `next/image` para imágenes reales de producto (URL remota — registrar el host en `images.remotePatterns` de `next.config.ts`). `<img>` crudo **solo** para previews locales `blob:` (next/image no las optimiza), con `eslint-disable @next/next/no-img-element`. Todo `<img>` de contenido lleva `alt` descriptivo; los previews de subida pueden ir `alt=""` (decorativos).
