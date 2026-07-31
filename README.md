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
- **sileo** — toast notifications (admin panel only)
- **pnpm** as package manager

> **Jest + React Testing Library** are installed (`jest.config.ts`, `jest.setup.ts`). The only specs today cover the Excel import (`components/admin/import/__tests__/`) — both its pure modules and every component of that screen. See that folder's `README.md` for the layout.

## Commands

```bash
pnpm dev        # Dev server (localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint
pnpm test       # Jest + React Testing Library
```

## Structure

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, base classes, global metadata (SEO), QueryProvider + CartProvider
  page.tsx        # Home page (+ ClothingStore JSON-LD)
  not-found.tsx   # Custom 404 (catches any unmatched URL app-wide)
  error.tsx       # Root error boundary (client component) — catches RSC throws (e.g. backend down)
                  #   and replaces Next's raw overlay with the site's look; "Retry" re-fetches via
                  #   router.refresh() + reset()
  global-error.tsx # Last-resort boundary — the only one that catches root-layout errors. Ships its
                  #   own <html>/<body> (the layout it would inherit is the thing that failed), so no
                  #   providers exist here: it's fully static, no NavHeader/Footer. Production only.
  sitemap.ts      # /sitemap.xml — static routes + every product, revalidated hourly
  robots.ts       # /robots.txt — disallows /admin, /login, /forgot-password, /checkout, /api/
  opengraph-image.tsx # Generated 1200x630 share image (next/og), inherited by every route
  admin/          # Admin dashboard (Sidebar + section routing). Layout carries noindex for all /admin/*
  (public)/
    outlet/[slug]/producto/  # Product detail view (generateMetadata + Product/Breadcrumb JSON-LD).
                             #   Deliberately has no loading.tsx — see "Loading & error states"
    botas/ sombreros/ ropa/  # Category listings (reuse OutletView)
    terminos/ privacidad/ envios/  # Legal pages
    nosotros/       # About Us page
  login/                # Login page
  forgot-password/      # Forgot password wizard
components/
  home/           # Page sections (NavHeader, Hero, Footer, CategoryCard)
  outlet/         # OutletView — product listing with category filters; OutletSkeleton (Suspense fallback)
  seo/            # JsonLd — renders a schema.org block into the HTML
  product/        # ProductInfo — product detail panel (gallery, size picker, add-to-cart)
  ui/             # Global primitives: Cart, CartProvider, FormControls, ImageCarousel
  providers/      # QueryProvider (TanStack Query), BrandProvider (brand identity)
  checkout/       # 4-step checkout wizard, incl. ShippingOptions (live Skydropx rate quoting)
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal pages
  nosotros/       # AboutUs — static "About Us" page
  auth/           # AuthShell, LoginForm, ForgotPasswordForm (+ CodeInput/ResetCodeForm/NewPasswordForm), AdminGuard
  admin/          # Sidebar, types.ts + sections/ (Marca, Productos, Importar, Pedidos, Datos, Reportes, Configuración)
                  #   data/ — chart/table subcomponents (recharts)
                  #   reportes/ — SalesReport (historical) + ReplenishmentReport (forecast)
                  #   import/ — Excel import review screen: pure modules (types, rowInput, importReducer,
                  #   dependencies, labels) + components. The only part of the app with Jest specs;
                  #   they live in import/__tests__/ (see its README.md)
lib/
  api/            # axios client + per-domain contracts (Zod schemas + fetchers + query keys):
                  #   auth, products, adminProducts, adminProductImport, adminOrders, adminUsers, account,
                  #   dashboard, reports, brand, orders, shipping (live Skydropx rate quotes)
  domain/         # pure business logic: cart.ts (totals + shared item/signature helpers),
                  #   brand.ts (fallback identity), categories.ts
  seo/            # site.ts (SITE_URL/absoluteUrl/keywords) + jsonLd.ts (schema.org builders)
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
  importStore.ts  # Zustand store (no persist) — Excel import review state, kept outside the
                  #   component tree so an in-progress review survives switching admin tabs
scripts/
  generate-plantilla-importacion.mjs  # one-off script that generated public/plantilla-importacion-productos.xlsx
```

See `CLAUDE.md` for the full architecture reference (file-by-file responsibilities, auth/data-fetching patterns, checkout internals, reports/forecast pipeline, and the backend contract).

## Implemented routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/outlet` | Product listing with category filters |
| `/botas`, `/sombreros`, `/ropa` | Category listings (same `OutletView`, scoped) |
| `/outlet/[slug]/producto` | Product detail |
| `/checkout` | 4-step checkout wizard (incl. live shipping-rate selection) |
| `/terminos` | Terms & Conditions |
| `/privacidad` | Privacy Policy |
| `/envios` | Shipping Policy |
| `/nosotros` | About Us |
| `/admin` | Admin panel (brand, products, orders, data, reports, config) |
| `/login` | Login form |
| `/forgot-password` | Password recovery wizard (email → 5-digit code → new password) |

## Planned routes

`/carrito`, `/devoluciones`

## Loading & error states

The catalog routes suspend for different reasons, so they get different treatment — or none. Both decisions are deliberate:

- **Listing routes** (`/outlet`, `/botas`, `/sombreros`, `/ropa`) are *not* async RSCs — `OutletView` is a client component that fetches with TanStack Query. What suspends during prerender is its `useSearchParams`, and that bailout is caught by the nearest boundary: the `<Suspense>` inside the page. So the skeleton goes there as `fallback={<OutletSkeleton />}` (a `loading.tsx` would never be reached). Once hydrated, OutletView's own spinner takes over.
- **Product detail** (`/outlet/[slug]/producto`) is an async Server Component and still has **no `loading.tsx`, on purpose**. Any streaming boundary forces Next to send the shell before it knows whether the product exists, committing a 200 status — so the later `notFound()` renders the 404 page with HTTP 200 (a **soft 404**). Measured: with `loading.tsx`, `/outlet/999999/producto` returns 200; without it, 404. Since sold-out pieces get retired and their indexed URLs keep getting crawled, the correct status won over the skeleton; the accepted cost is no feedback between clicking a card and the backend answering.

Error boundaries stack: `error.tsx` covers RSC throws (e.g. backend down) and `global-error.tsx` covers failures of the root layout itself — see the structure tree above.

## Shopping cart

The cart is a slide-in drawer powered by a Zustand store persisted to localStorage. Opening/closing is triggered from `NavHeader` (desktop and mobile). Adding items is done from the product detail page (`ProductInfo`) with per-size stock validation — the button is disabled when the selected size is already at stock limit.

Key files: `store/cartStore.ts`, `components/ui/Cart.tsx`, `components/ui/CartProvider.tsx`.

## Authentication

`/admin` is protected by `AdminGuard` (`components/auth/AdminGuard.tsx`): without a session token it redirects to `/login`, and it also validates the token against `GET /api/auth/me`, rehydrating the user. The session (`{ token, user }`) lives in `store/authStore.ts` (Zustand + persist). `LoginForm` uses a TanStack Query `useMutation` connected to the real backend (`POST /api/auth/login`). Password recovery (`ForgotPasswordForm`) is a 3-step wizard — email → 5-digit code (`CodeInput`) → new password — backed by `POST /api/auth/forgot-password`, `/verify-reset-code`, `/reset-password`. The axios client (`lib/api/client.ts`) attaches `Authorization: Bearer <token>` and, on a `401`, clears the session and redirects to `/login`. Logout lives in the admin **Configuración** section.

Env: set `NEXT_PUBLIC_API_URL` to the backend URL (defaults to `/api`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Stripe's **publishable** key (`pk_test_…` in sandbox, same account as the backend's `STRIPE_SECRET_KEY`), and `NEXT_PUBLIC_SITE_URL` to the site's public origin (see SEO below). `NEXT_PUBLIC_*` vars are inlined at build time — restart the dev server after changing them. See `BACKEND.md` for the full API contract.

## SEO

All storefront routes carry title/description/canonical/Open Graph metadata; `/admin`, `/login`, `/forgot-password` and `/checkout` are `noindex` and also disallowed in `robots.txt` (two layers: robots.txt blocks crawling, the meta tag blocks indexing of URLs linked from elsewhere).

- **Build public pages' metadata with `pageMetadata()`** (`lib/seo/metadata.ts`), not by hand. Next inherits `alternates` from the parent layout but *replaces* `openGraph` wholesale, so hand-rolled metadata silently ends up either canonicalized to the wrong URL or stripped of its share image. The helper always emits the full block. Exceptions: the home page (defines only `alternates`; its OG block is the layout's default) and product pages (their image is the real photo).
- **`NEXT_PUBLIC_SITE_URL`** is the base for `metadataBase`, canonicals, the sitemap and OG image URLs. Unset it falls back to `http://localhost:3000` (`lib/seo/site.ts`) — **set it in Vercel (Production) to the real origin, no trailing slash**, otherwise canonicals and `sitemap.xml` will point at localhost.
- **Listing canonicals drop the query string**: `/outlet?categoria=bota&pagina=2` canonicalizes to `/outlet`, so filter combinations aren't indexed as duplicates competing with each other.
- **Structured data** (`lib/seo/jsonLd.ts`, rendered by `components/seo/JsonLd.tsx`): `ClothingStore` on the home page (Celaya address, Instagram), `Product` + `BreadcrumbList` on product pages. `Product.offers` reflects `salePrice` (the price actually charged) and maps stock to `InStock`/`SoldOut` — the outlet never restocks, so a sold-out piece is `SoldOut`, not "back soon". Only describe what the page actually shows: marking data users can't see violates Google's policy and can cost the whole domain its rich results.
- **Share image**: `app/opengraph-image.tsx` generates a branded 1200x630 PNG at build time (Playfair fetched from Google Fonts, falling back to a system serif if the fetch fails). Only routes that don't declare `openGraph` inherit it automatically; the rest reference it explicitly through `pageMetadata()`. Product pages override it with the real product photo, falling back to the site image when a product has no photos yet.
- **`sitemap.xml`** lists static routes plus every product, paging through the catalog and revalidating hourly. If the backend is unreachable at build time it logs and emits static routes only, rather than failing the deploy.

## Checkout flow

`/checkout` is a 4-step wizard (state held in React context, resets on refresh). Steps render conditionally, so navigating away unmounts them — anything that must survive back-and-forth lives in the context instead: a shipping draft (restored when `UserDetails` remounts), the validated address (`confirmedCustomer`, what step 3 quotes against), the selected shipping rate (cached by cart+customer signature), the pending Stripe order, and `acceptedTerms`. The `Stepper` distinguishes three states per step (done / visited-but-not-current / pending), letting users jump back to any step they've already seen.

1. **Resumen** — read-only cart review; requires accepting terms & privacy before continuing. Shows a flat-rate shipping estimate (no address yet, never charged).
2. **Dirección** — shipping address form validated with react-hook-form + zod (Mexico only). Submitting just saves the validated address to context and advances — no order, no payment yet.
3. **Envío** — **live shipping-rate quoting** against Skydropx (`POST /api/shipping/rates` via `lib/api/shipping.ts`; always resolves 200, falling back to the same flat rate as step 1 if Skydropx is unavailable). One option auto-selects; two or more require an explicit pick. The total shown here is exactly what gets charged. On "Pagar y confirmar", `usePlaceOrder` runs a two-phase flow: (1) **posts the order** (`POST /api/orders` via `createOrder` in `lib/api/orders.ts`) — `{ items, customer, quotationId?, rateId? }`, no amounts; the backend re-queries Skydropx for that exact quote (or falls back to its own flat rate) and returns a Stripe `clientSecret`; a `409` (out of stock, or an expired quote — which also clears the selected rate so the user re-quotes) or `400` keeps the user on the form. (2) **confirms payment** with Stripe.js (`confirmCardPayment`). Running in **test/sandbox**, so the test card is hardcoded (`pm_card_visa` = `4242 4242 4242 4242`) and `PaymentSection` is a read-only test-card panel. Only after `succeeded` does it freeze the order snapshot and advance; the `paid` status is reconciled by the backend webhook. The created order is cached (keyed by cart contents, customer data, **and** the selected rate) so retrying doesn't duplicate it.
4. **Confirmación** — frozen order snapshot (with `Pedido #<id>` and the server's authoritative totals) plus shipping address.

Key files: `app/(public)/checkout/`, `components/checkout/` (incl. `ShippingOptions.tsx`), `schemas/checkout.ts`, `lib/domain/cart.ts`, `lib/api/orders.ts`, `lib/api/shipping.ts`.

## Shipping

Shipping is quoted **live** against Skydropx from checkout step 3 (see above) — the backend is the authority and re-queries the chosen quote when creating the order, so the amount shown always matches the amount charged. `lib/domain/cart.ts`'s flat-rate table (`computeShipping`, boots › hats › clothing) is kept as the frontend's copy of the backend's own fallback rate: it's used as a pre-address estimate in step 1 (`OrderSummary`), and both copies must stay in sync with what the backend charges when Skydropx is unavailable. See `CLAUDE.md`'s "Shipping" section for the full contract.

## Admin panel

`/admin` has seven sections (`components/admin/sections/`), all connected to the real backend:

- **Marca** — brand identity/copy editor (autosaved).
- **Productos** — catalog CRUD, including a Cloudinary-backed image gallery (up to 3 images per product).
- **Importar** — bulk Excel import/restock: upload → preview (no writes) → review/edit → commit. Restock only ever adds stock and can't be undone from the app, so the review screen enforces several invariants (rows that already wrote lock for the session, dependent rows across the same file get flagged, etc.) — see `CLAUDE.md`'s "Importación por Excel" for the full list.
- **Pedidos** — paginated order listing with a detail modal (includes cost/margin, admin-only). From the modal the owner can cancel/refund an order, and move it forward to shipped/delivered by hand — capturing the tracking number, URL and carrier when the order never went through Skydropx (a flat-rate order gets no label, so no webhook ever advances it).
- **Datos** — KPIs, revenue chart, inventory and recent-sales tables (7/30/90-day windows).
- **Reportes** — monthly sales history feeding an auto-scaling replenishment forecast (simple average → weighted+trend → Holt exponential smoothing, depending on history depth); both export to CSV.
- **Configuración** — own account settings + admin user management, and logout.

See `CLAUDE.md` for the full breakdown of each section's subcomponents and API contracts.
