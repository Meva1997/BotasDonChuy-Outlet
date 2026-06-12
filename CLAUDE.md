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
components/
  home/           # Page-level sections (NavHeader, Hero, Footer)
  outlet/         # OutletView — product listing with category filters
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider)
  checkout/       # Multi-step checkout flow (see "Checkout flow" below)
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

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/checkout`

**Planned routes** (not yet built): `/botas`, `/sombreros`, `/ropa`, `/admin`, `/carrito`, `/nosotros`, `/devoluciones`, `/envios`

## State Management

Cart state lives in a Zustand store (`store/cartStore.ts`) with `persist` middleware (localStorage key: `botas-don-chuy-cart`). The `Cart` drawer is rendered globally via `CartProvider` (dynamic import, SSR disabled) mounted in the root layout. `NavHeader` reads `totalItems()` and calls `toggleCart()`. `ProductInfo` calls `addItem()` + `openCart()` with per-size stock validation.

## Checkout flow

`/checkout` is a 3-step wizard. Step state is held in a React context (`components/checkout/CheckoutContext.tsx`, scoped via `CheckoutProvider` in the page — not persisted, so a refresh restarts at step 0):

1. **Resumen** (`OrderSummary`) — read-only cart review + **required** terms & privacy checkbox; "Continuar" is disabled until accepted.
2. **Datos de envío** (`UserDetails`) — shipping form validated with `react-hook-form` + `zodResolver` against `schemas/checkout.ts`. Shipping is restricted to Mexico via the `MEXICAN_STATES` enum. Payment (`PaymentSection`) is a presentational placeholder to be replaced by **Stripe Elements** later — its fields are not validated or submitted. On submit, `completeOrder()` snapshots the cart + totals + customer into the context, clears the Zustand cart, and advances.
3. **Confirmación** (`Success`) — renders the frozen order snapshot + shipping address.

Shared, prop-driven pieces: `Stepper` (wizard indicator), `OrderItems`, `OrderTotals`, and `FormControls` (`TextField`/`SelectField` — `forwardRef` inputs that take RHF `register()` spread + an `error` string).

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
