# Botas Don Chuy — Outlet

Online store for Botas Don Chuy, specializing in western-style footwear and accessories. This is the outlet frontend application.

## Stack

- **Next.js** with App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Zustand v5** — cart state management (persisted to localStorage)
- **react-hook-form + zod** — checkout form validation
- **recharts** — gráficas del panel de administración
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
    terminos/     # Terms & Conditions page
    privacidad/   # Privacy Policy page
    envios/       # Shipping Policy page
  login/          # Login page
  forgot-password/ # Forgot password page
components/
  home/           # Page sections (NavHeader, Hero, Footer)
  outlet/         # OutletView — product listing with filters
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider)
  checkout/       # Multi-step checkout wizard components
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal pages
  auth/           # AuthShell layout + LoginForm, ForgotPasswordForm
  admin/          # Secciones del panel admin: MarcaSection, ProductSection, DataSection, ReportesSection, ConfigSection
                  #   data/ — subcomponentes de métricas (KpiGrid, RevenueChart, InventoryTable, SalesTable)
                  #   reportes/ — SalesReport (histórico) y ReplenishmentReport (forecast + pedido sugerido)
db/
  mockProducts.ts # Mock data (MockProduct interface + MOCK_PRODUCTS)
  mockData.ts     # Datos del admin: KPIs, ingresos, inventario, ventas mensuales y reposición (derivados)
lib/
  getProducts.ts  # getProducts(), getProductById() and types
  cart.ts         # computeShipping() + computeTotals() — shipping + order totals
  forecast.ts     # computeForecast() — pronóstico de demanda auto-escalado por nº de meses
  utils/index.ts  # formatPrice() helper
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema
store/
  cartStore.ts    # Zustand cart store with localStorage persistence
```

## Implemented routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/outlet` | Product listing with category filters |
| `/outlet/[id]/producto` | Product detail |
| `/checkout` | 3-step checkout wizard |
| `/terminos` | Terms & Conditions |
| `/privacidad` | Privacy Policy |
| `/envios` | Shipping Policy |
| `/admin` | Panel de administración (marca, productos, datos, configuración) |
| `/login` | Login form |
| `/forgot-password` | Forgot password form |

## Planned routes

`/botas`, `/sombreros`, `/ropa`, `/carrito`, `/nosotros`, `/devoluciones`

## Shopping cart

The cart is a slide-in drawer powered by a Zustand store persisted to localStorage. Opening/closing is triggered from `NavHeader` (desktop and mobile). Adding items is done from the product detail page (`ProductInfo`) with per-size stock validation — the button is disabled when the selected size is already at stock limit.

Key files: `store/cartStore.ts`, `components/ui/Cart.tsx`, `components/ui/CartProvider.tsx`.

## Checkout flow

`/checkout` is a 3-step wizard (state held in React context, resets on refresh):

1. **Resumen** — read-only cart review; requires accepting terms & privacy before continuing.
2. **Datos de envío** — shipping form validated with react-hook-form + zod (Mexico only). Payment section is a placeholder for future Stripe Elements integration.
3. **Confirmación** — frozen order snapshot with shipping address.

Key files: `app/(public)/checkout/page.tsx`, `components/checkout/`, `schemas/checkout.ts`, `lib/cart.ts`.

## Shipping

Shipping is calculated in `lib/cart.ts` via `computeShipping(items)`. Currently uses flat rates by product type (boots › hats › clothing). The rate of the heaviest item in the cart applies to the whole order. `CartTotals.shipping` flows through `OrderTotals` and the order snapshot in `CheckoutContext` — the total shown at every checkout step always includes shipping.

When ready to integrate a real carrier API (e.g. Skydropx), only `computeShipping` needs to be replaced. See `CLAUDE.md` for the full migration guide.
