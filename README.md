# Botas Don Chuy — Outlet

Online store for Botas Don Chuy, specializing in western-style footwear and accessories. This is the outlet frontend application.

## Stack

- **Next.js 16** with App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4** — via `@theme {}` in `globals.css` (no `tailwind.config.*`)
- **Zustand v5** — cart + auth session state (persisted to localStorage)
- **TanStack Query + Axios + Zod** — data fetching / server state, runtime-validated
- **react-hook-form + zod** — form validation (checkout, auth, admin)
- **@stripe/stripe-js** — checkout payment gateway (test/sandbox)
- **framer-motion** — animations (drawers, transitions, carousels)
- **recharts** — admin dashboard charts
- **Playwright** — installed as a dev dependency for e2e testing
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
  layout.tsx      # Root layout: fonts, base classes, metadata, QueryProvider + CartProvider
  page.tsx        # Home page
  not-found.tsx   # Custom 404 (catches any unmatched URL app-wide)
  error.tsx       # Root error boundary (client component) — catches RSC throws (e.g. backend down)
                  #   and replaces Next's raw overlay with the site's look; "Retry" re-fetches via
                  #   router.refresh() + reset()
  admin/          # Admin dashboard (Sidebar + section routing)
  (public)/
    outlet/[slug]/producto/  # Product detail view
    botas/ sombreros/ ropa/  # Category listings (reuse OutletView)
    terminos/ privacidad/ envios/  # Legal pages
    nosotros/       # About Us page
  login/                # Login page
  forgot-password/      # Forgot password wizard
components/
  home/           # Page sections (NavHeader, Hero, Footer, CategoryCard)
  outlet/         # OutletView — product listing with category filters
  product/        # ProductInfo — product detail panel (gallery, size picker, add-to-cart)
  ui/             # Global primitives: Cart, CartProvider, FormControls, ImageCarousel
  providers/      # QueryProvider (TanStack Query), BrandProvider (brand identity)
  checkout/       # Multi-step checkout wizard
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal pages
  nosotros/       # AboutUs — static "About Us" page
  auth/           # AuthShell, LoginForm, ForgotPasswordForm (+ CodeInput/ResetCodeForm/NewPasswordForm), AdminGuard
  admin/          # Sidebar, types.ts + sections/ (Marca, Productos, Pedidos, Datos, Reportes, Configuración)
                  #   data/ — chart/table subcomponents (recharts)
                  #   reportes/ — SalesReport (historical) + ReplenishmentReport (forecast)
lib/
  api/            # axios client + per-domain contracts (Zod schemas + fetchers + query keys):
                  #   auth, products, adminProducts, adminOrders, adminUsers, account,
                  #   dashboard, reports, brand, orders
  domain/         # pure business logic: cart.ts (totals), brand.ts (fallback identity), categories.ts
  stripe/         # getStripe() singleton (Stripe.js)
  ui/             # motion.ts — shared framer-motion variants
  utils/          # formatPrice() helper
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema + resetPasswordSchema
  users.ts        # zod createUserSchema + updateAccountSchema (shared password complexity rules)
store/
  cartStore.ts    # Zustand cart store with localStorage persistence
  authStore.ts    # Zustand auth store (token + user) — admin session, persisted
```

See `CLAUDE.md` for the full architecture reference (file-by-file responsibilities, auth/data-fetching patterns, checkout internals, reports/forecast pipeline, and the backend contract).

## Implemented routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/outlet` | Product listing with category filters |
| `/botas`, `/sombreros`, `/ropa` | Category listings (same `OutletView`, scoped) |
| `/outlet/[slug]/producto` | Product detail |
| `/checkout` | 3-step checkout wizard |
| `/terminos` | Terms & Conditions |
| `/privacidad` | Privacy Policy |
| `/envios` | Shipping Policy |
| `/nosotros` | About Us |
| `/admin` | Admin panel (brand, products, orders, data, reports, config) |
| `/login` | Login form |
| `/forgot-password` | Password recovery wizard (email → 5-digit code → new password) |

## Planned routes

`/carrito`, `/devoluciones`

## Shopping cart

The cart is a slide-in drawer powered by a Zustand store persisted to localStorage. Opening/closing is triggered from `NavHeader` (desktop and mobile). Adding items is done from the product detail page (`ProductInfo`) with per-size stock validation — the button is disabled when the selected size is already at stock limit.

Key files: `store/cartStore.ts`, `components/ui/Cart.tsx`, `components/ui/CartProvider.tsx`.

## Authentication

`/admin` is protected by `AdminGuard` (`components/auth/AdminGuard.tsx`): without a session token it redirects to `/login`, and it also validates the token against `GET /api/auth/me`, rehydrating the user. The session (`{ token, user }`) lives in `store/authStore.ts` (Zustand + persist). `LoginForm` uses a TanStack Query `useMutation` connected to the real backend (`POST /api/auth/login`). Password recovery (`ForgotPasswordForm`) is a 3-step wizard — email → 5-digit code (`CodeInput`) → new password — backed by `POST /api/auth/forgot-password`, `/verify-reset-code`, `/reset-password`. The axios client (`lib/api/client.ts`) attaches `Authorization: Bearer <token>` and, on a `401`, clears the session and redirects to `/login`. Logout lives in the admin **Configuración** section.

Env: set `NEXT_PUBLIC_API_URL` to the backend URL (defaults to `/api`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Stripe's **publishable** key (`pk_test_…` in sandbox, same account as the backend's `STRIPE_SECRET_KEY`). `NEXT_PUBLIC_*` vars are inlined at build time — restart the dev server after changing them. See `BACKEND.md` for the full API contract.

## Checkout flow

`/checkout` is a 3-step wizard (state held in React context, resets on refresh). Steps render conditionally, so navigating away unmounts them — anything that must survive back-and-forth lives in the context instead: a shipping draft (restored when `UserDetails` remounts), the pending Stripe order, and `acceptedTerms`. The `Stepper` distinguishes three states per step (done / visited-but-not-current / pending), letting users jump back to any step they've already seen.

1. **Resumen** — read-only cart review; requires accepting terms & privacy before continuing.
2. **Datos de envío + pago** — shipping form validated with react-hook-form + zod (Mexico only). On submit `usePlaceOrder` runs a two-phase flow: (1) **posts the order** (`POST /api/orders` via `createOrder` in `lib/api/orders.ts`) — only `{ items: [{ productId, size, quantity }], customer }`, no amounts; the backend recalculates totals, atomically decrements stock, and returns a Stripe `clientSecret`; a `409` (out of stock) or `400` keeps the user on the form. (2) **confirms payment** with Stripe.js (`confirmCardPayment`). Running in **test/sandbox**, so the test card is hardcoded (`pm_card_visa` = `4242 4242 4242 4242`) and `PaymentSection` is a read-only test-card panel. Only after `succeeded` does it freeze the order snapshot and advance; the `paid` status is reconciled by the backend webhook. The created order is cached (keyed by cart contents **and** customer data) so retrying doesn't duplicate it, and editing the address after a failed payment correctly invalidates the cache.
3. **Confirmación** — frozen order snapshot (with `Pedido #<id>` and the server's authoritative totals) plus shipping address.

Key files: `app/(public)/checkout/`, `components/checkout/`, `schemas/checkout.ts`, `lib/domain/cart.ts`, `lib/api/orders.ts`.

## Shipping

Shipping is calculated in `lib/domain/cart.ts` via flat rates by product type (boots › hats › clothing) — the rate of the highest-priced item in the cart applies to the whole order. `CartTotals.shipping` flows through `OrderTotals`, `OrderSummary`, `Success`, and the order snapshot in `CheckoutContext`.

When ready to integrate a real carrier API (Skydropx), only the shipping calculation needs to be replaced. See `CLAUDE.md` for the full migration guide.

## Admin panel

`/admin` has six sections (`components/admin/sections/`), all connected to the real backend:

- **Marca** — brand identity/copy editor (autosaved).
- **Productos** — catalog CRUD, including a Cloudinary-backed image gallery (up to 3 images per product).
- **Pedidos** — read-only, paginated order listing with a detail modal (includes cost/margin, admin-only).
- **Datos** — KPIs, revenue chart, inventory and recent-sales tables (7/30/90-day windows).
- **Reportes** — monthly sales history feeding an auto-scaling replenishment forecast (simple average → weighted+trend → Holt exponential smoothing, depending on history depth); both export to CSV.
- **Configuración** — own account settings + admin user management, and logout.

See `CLAUDE.md` for the full breakdown of each section's subcomponents and API contracts.
