# Botas Don Chuy — Outlet

Online store for Botas Don Chuy, specializing in western-style footwear and accessories. This is the outlet frontend application.

## Stack

- **Next.js** with App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **Zustand v5** — cart + auth session state (persisted to localStorage)
- **TanStack Query + Axios** — data fetching / server state (axios client en `lib/api/client.ts`)
- **react-hook-form + zod** — form validation (checkout, login)
- **@stripe/stripe-js** — pasarela de pago del checkout (test/sandbox)
- **framer-motion** — animaciones (incl. drawers Cart/Sidebar)
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
  ui/             # Reusable primitives (CategoryCard, OutletCard, ProductInfo, Cart, CartProvider, Sidebar)
  providers/      # QueryProvider — TanStack Query
  checkout/       # Multi-step checkout wizard components
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal pages
  auth/           # AuthShell layout + LoginForm, ForgotPasswordForm + AdminGuard (protege /admin)
  admin/          # Secciones del panel admin: MarcaSection, ProductSection, DataSection, ReportesSection, ConfigSection
                  #   data/ — subcomponentes de métricas (KpiGrid, RevenueChart, InventoryTable, SalesTable)
                  #   reportes/ — SalesReport (histórico) y ReplenishmentReport (forecast + pedido sugerido) — conectados al backend
lib/
  api/client.ts   # axios instance + interceptors (Bearer token, 401 → /login)
  api/reports.ts  # getMonthlyReport(), getReplenishmentReport() + Zod schemas (GET /api/admin/reports/*)
  getProducts.ts  # getProducts(), getProductById() and types
  cart.ts         # computeShipping() + computeTotals() — shipping + order totals
  utils/index.ts  # formatPrice() helper
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema
store/
  cartStore.ts    # Zustand cart store with localStorage persistence
  authStore.ts    # Zustand auth store (token + user) — sesión admin, persistida
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

## Authentication

`/admin` is protected by `AdminGuard` (`components/auth/AdminGuard.tsx`): without a session token it redirects to `/login`. The session (`{ token, user }`) lives in `store/authStore.ts` (Zustand + persist). `LoginForm` uses a TanStack Query `useMutation` **connected to the real backend** (`POST /auth/login`); `AdminGuard` also validates the token against `GET /auth/me`. The axios client (`lib/api/client.ts`) attaches `Authorization: Bearer <token>` and, on a `401`, clears the session and redirects to `/login`. Logout lives in the admin **Configuración** section.

Env: set `NEXT_PUBLIC_API_URL` to the backend URL (defaults to `/api`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Stripe's **publishable** key (`pk_test_…` in sandbox, same account as the backend's `STRIPE_SECRET_KEY`). `NEXT_PUBLIC_*` vars are inlined at build time — restart the dev server after changing them. See `BACKEND.md` for the full API contract.

## Checkout flow

`/checkout` is a 3-step wizard (state held in React context, resets on refresh):

1. **Resumen** — read-only cart review; requires accepting terms & privacy before continuing.
2. **Datos de envío + pago** — shipping form validated with react-hook-form + zod (Mexico only). On submit `usePlaceOrder` runs a two-phase flow: (1) **posts the order** (`POST /api/orders` via `createOrder` in `lib/api/orders.ts`) — only `{ items: [{ productId, size, quantity }], customer }`, no amounts; the backend recalculates totals, atomically decrements stock, and returns a Stripe `clientSecret`; a `409` (out of stock) or `400` keeps the user on the form. (2) **confirms payment** with Stripe.js (`confirmCardPayment`). Running in **test/sandbox**, so the test card is hardcoded (`pm_card_visa` = `4242 4242 4242 4242`) and `PaymentSection` is a read-only test-card panel. Only after `succeeded` does it freeze the order snapshot and advance; the `paid` status is reconciled by the backend webhook.
3. **Confirmación** — frozen order snapshot (with `Pedido #<id>` and the server's authoritative totals) plus shipping address.

Key files: `app/(public)/checkout/page.tsx`, `components/checkout/`, `schemas/checkout.ts`, `lib/domain/cart.ts`, `lib/api/orders.ts`.

## Shipping

Shipping is calculated in `lib/domain/cart.ts` via `computeShipping(items)`. Currently uses flat rates by product type (boots › hats › clothing). The rate of the heaviest item in the cart applies to the whole order. `CartTotals.shipping` flows through `OrderTotals` and the order snapshot in `CheckoutContext` — the total shown at every checkout step always includes shipping.

When ready to integrate a real carrier API (e.g. Skydropx), only `computeShipping` needs to be replaced. See `CLAUDE.md` for the full migration guide.
