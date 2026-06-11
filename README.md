# Botas Don Chuy — Outlet

Online store for Botas Don Chuy, specializing in western-style footwear and accessories. This is the outlet frontend application.

## Stack

- **Next.js** with App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
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
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo)
db/
  mockProducts.ts # Mock data (MockProduct interface + MOCK_PRODUCTS)
lib/
  getProducts.ts  # getProducts(), getProductById() and types
```

## Implemented routes

| Route | Status |
|-------|--------|
| `/` | Done |
| `/outlet` | Done |
| `/outlet/[id]/producto` | Done |

## Planned routes

`/botas`, `/sombreros`, `/ropa`, `/admin`, `/carrito`, `/nosotros`, `/devoluciones`, `/envios`
