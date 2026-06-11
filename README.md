# Botas Don Chuy — Outlet

Online store for Botas Don Chuy, specializing in western-style footwear and accessories. This is the outlet frontend application.

## Stack

- **Next.js** with App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Zustand v5** — cart state management (persisted to localStorage)
- **pnpm** as package manager

## Commands

```bash
pnpm dev        # Dev server (localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint
```

## Structure

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, base classes, metadata
  page.tsx        # Home page
  (public)/
    outlet/
      [slug]/
        producto/ # Product detail view
components/
  home/           # Page sections (NavHeader, Hero, Footer)
  outlet/         # OutletView — product listing with filters
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider)
db/
  mockProducts.ts # Mock data (MockProduct interface + MOCK_PRODUCTS)
lib/
  getProducts.ts  # getProducts(), getProductById() and types
  utils/index.ts  # formatPrice() helper
store/
  cartStore.ts    # Zustand cart store with localStorage persistence
```

## Implemented routes

| Route | Status |
|-------|--------|
| `/` | Done |
| `/outlet` | Done |
| `/outlet/[id]/producto` | Done |

## Planned routes

`/botas`, `/sombreros`, `/ropa`, `/admin`, `/carrito`, `/nosotros`, `/devoluciones`, `/envios`

## Shopping cart

The cart is a slide-in drawer powered by a Zustand store persisted to localStorage. Opening/closing is triggered from `NavHeader` (desktop and mobile). Adding items is done from the product detail page (`ProductInfo`) with per-size stock validation — the button is disabled when the selected size is already at stock limit.

Key files: `store/cartStore.ts`, `components/ui/Cart.tsx`, `components/ui/CartProvider.tsx`.
