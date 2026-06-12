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
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, not a `tailwind.config.*` file. Custom theme tokens (fonts) live in a `@theme {}` block in `globals.css`.

## Architecture

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, base classes, metadata, CartProvider
  page.tsx        # Home page — composes NavHeader + Hero + Footer
  (public)/
    outlet/
      [slug]/
        producto/ # Product detail page (async RSC → ProductInfo client component)
    terminos/     # Terms & Conditions page → TermsConditions component
    privacidad/   # Privacy Policy page → PrivacyPolicy component
    envios/       # Shipping Policy page → ShippingInfo component
components/
  home/           # Page-level sections (NavHeader, Hero, Footer)
  outlet/         # OutletView — product listing with category filters
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider)
  checkout/       # Multi-step checkout flow (see "Checkout flow" below)
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal content pages
db/
  mockProducts.ts # MockProduct interface + MOCK_PRODUCTS array
lib/
  getProducts.ts  # getProducts(filters), getProductById(id), Product type
  cart.ts         # computeTotals(items) — pure subtotal/savings/total helper
  utils/
    index.ts      # formatPrice(amount) — es-MX locale formatting
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
store/
  cartStore.ts    # Zustand store (persist) — cart items, open/close, totals, stock-aware addItem
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/checkout`, `/terminos`, `/privacidad`, `/envios`

**Planned routes** (not yet built): `/botas`, `/sombreros`, `/ropa`, `/admin`, `/carrito`, `/nosotros`, `/devoluciones`

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
