# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Standing rules

Before every git commit, check if `README.md` and `CLAUDE.md` need updating for the changes being committed — don't wait to be asked.

**File and directory names are English; everything user-facing stays Spanish.** The only Spanish paths left are the ones the browser sees: route segments under `app/` (`/botas`, `/pedido`, `/terminos`, …), which are part of the public URL and must not be translated. Identifiers that are *values*, not file names — the `AdminSection` keys (`"marca"`, `"reportes"`), UI labels, copy, comments — are also Spanish and stay that way.

## Commands

```bash
pnpm dev        # Start dev server (localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint
pnpm test       # Jest (--passWithNoTests)
pnpm test:coverage  # Jest + reporte de cobertura (NO uses `pnpm test -- --coverage`:
                    #   el `--` manda las banderas al lado equivocado y Jest las lee
                    #   como patrón de tests, corriendo todo sin medir nada)
```

Package manager is **pnpm**. Use `pnpm add` to install.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: lint, `tsc --noEmit`, test, build. Deploys are unrelated to this workflow — Vercel's own GitHub integration handles previews/production on push, independent of Actions.

## Stack

- **Next.js 16** (App Router, all pages in `app/`), **React 19**, **TypeScript**
- **Tailwind CSS v4** — `@import "tailwindcss"` in `globals.css`, no `tailwind.config.*`. Theme tokens (fonts, `tobacco-*` scale) live in a `@theme {}` block there.
- **Testing** — Jest + React Testing Library + user-event (`next/jest`; `jest.setup.ts` stubs `window.matchMedia`, needed by framer-motion's `useReducedMotion()`). `testMatch` is scoped to `**/*.test.{ts,tsx}` (not "anything under `__tests__/`") so fixtures/helpers can live alongside specs. **`jest.mock("@/...")` does not resolve** — Next's alias transform only rewrites real `import`/`require` specifiers, not the string literal passed to `jest.mock()`, which goes through Jest's own resolver instead (no `@/*` mapper configured). Use a relative path in `jest.mock()` calls (e.g. `jest.mock("../../../lib/api/orders", ...)`) even though the rest of the file imports the same module with `@/`. **TanStack Query notifies subscribers on a macrotask**, so any assertion of *absence* right after a query state change (e.g. "a failed refetch must NOT show the error block") needs a `setTimeout(…, 0)` flush inside the same `act()` — without it the assertion runs against the pre-change DOM and passes either way (see `OutletView.test.tsx`'s refetch case). Coverage today: **the full checkout flow** (`components/checkout/__tests__/` — `CheckoutContext`, `usePlaceOrder`, `CouponField`, `OrderTotals`, `ShippingOptions`, `UserDetails`, `Stepper`, `checkoutErrors`, own `helpers/factories.ts` + `helpers/apiError.ts` + `helpers/render.tsx` for the `QueryClientProvider`+`CheckoutProvider` wrapper), **the full public order-tracking flow** (`components/order/__tests__/` — `OrderLookupForm`, `OrderStatusTimeline`, `TrackedOrderItems`, `OrderTracking`, `orderTimeline`, own `helpers/factories.ts` for `PublicOrder`/`PublicOrderItem` fixtures), **the full public outlet/catalog listing** (`components/outlet/__tests__/` — `OutletFilters`, `OutletView`, `EmptyState`, `OutletCard`, `OutletPagination`, own `helpers/factories.ts` for `Product`/`ProductsResult` fixtures; `next/navigation`'s `useRouter`/`useSearchParams` mocked directly per-file, same pattern as `OrderLookupForm.test.tsx` — the `<Suspense fallback={<OutletSkeleton />}>` boundary itself lives in `app/(public)/outlet/page.tsx` and its category siblings, outside what a component test can exercise), **the full Excel-import screen** (`components/admin/import/__tests__/` — the other place with component specs), **auth** (`components/auth/__tests__/` — `LoginForm`, `ForgotPasswordForm` tested as one integrated flow with the `ResetCodeForm`/`NewPasswordForm` steps it renders (one exception: `NewPasswordForm` is mounted standalone for the `onExpired`-absent branch, unreachable through the wizard, which always passes it), `CodeInput`, `AdminGuard`; own `helpers/render.tsx` for a bare `QueryClientProvider` wrapper, `helpers/apiError.ts` duplicated from checkout's — a `__tests__/` doesn't import across sibling folders. `CodeInput`'s auto-advance had a real bug caught while writing these specs: `handleFocus` read `value` from a stale render closure inside the synchronous `focus` event it triggers itself, so it bounced back to the same box instead of the next one — typing a code digit-by-digit silently corrupted it. Fixed with a ref updated synchronously by `setValue()` at commit time — see `CodeInput.tsx`), and **Admin: Órdenes** (`components/admin/orders/__tests__/` — `StatusBadges` (the disjoint-color invariant between `STATUS_META`/`PAYMENT_META`, verified by breaking the source and confirming the test fails), `OrdersPagination`, `OrdersTable` (row selection, `labelNote`'s four branches; the `xl:hidden` cards and `hidden xl:block` table both render in jsdom at once, so unique-text assertions go through `within(screen.getByRole("table"))` — and the cards' handlers are their own, so they need their own clicks despite rendering in every test), `OrderDetailModal` (coupon row ordering, `size === 0` dash, cancel/refund visibility, the emitted-refund block, the dropoff notice, forward-only status advance, all 5 `shipmentLabel.ts` states including the `force` confirmation), own `helpers/factories.ts`/`apiError.ts`/`render.tsx` — see that folder's `README.md`), and **Admin: Productos** (`components/admin/products/__tests__/` — `ProductForm` (the "Maneja tallas" toggle never sends `sizes` and `stockQuantity` together, the up-to-3-image gallery incl. type/size/cupo rejection and precedence, a mid-flight image-upload failure retries with `updateProduct` instead of recreating and never re-deletes an image already gone, images deleted before uploaded (frees quota within the 3-image cap), per-category dimension reset only on untouched fields and never while editing, 400/404/502 error mapping), `ProductCategoryView` ("Cargar más" pagination, view/edit navigation, inline delete confirm/cancel/pending/error), `ProductDetailModal` (grouped sizes, the "Tallas" block fully absent — not empty — when `hasSizes: false`), `notices` (the shared `deleteNotice`/`saveNotice` copy), own `helpers/factories.ts`/`apiError.ts`/`render.tsx` — see that folder's `README.md`. A real bug was caught here too: `ProductForm`'s unmount cleanup for `blob:` image previews had `useEffect(..., [])` closing over `newImages` from the mount render (always empty), so it never actually revoked anything added during the session — same stale-closure shape as the `CodeInput` bug above. Fixed with a ref kept in sync by a second effect), plus a handful of pure modules elsewhere: `lib/domain/__tests__/idempotency.test.ts`, `orders/__tests__/shipmentLabel.test.ts`, `publicOrderToken.test.ts`, `catalogFilters.test.ts`, `couponStatus.test.ts`, `expenseStatus.test.ts`, `cart.test.ts`, `categories.test.ts`, `brand.test.ts`, `shipmentStatus.test.ts` (see `ROADMAP-TEST-COVERAGE.md` for the phased plan covering the rest). No specs yet for the other admin sections (coupons/expenses/dashboard/reports/config) or `AuthShell`. Import tests are grouped by pipeline phase (`pure/`, `intake/`, `review/`, `editing/`, `presentation/`, `commit/` + `helpers/`) — see `components/admin/import/__tests__/README.md` before adding more. No snapshots (would break on every Tailwind tweak). No Playwright/e2e — don't reintroduce without being asked.
- **Sileo** — physics-based toast library, admin-only (`<Toaster />` in `app/admin/layout.tsx`, not root). Only consumer today is `OrdersSection`'s polling toast. Styled black pill via `globals.css` `!important` overrides (needed because `sileo/styles.css` loads after and ties on specificity).

## Architecture

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, QueryProvider + CartProvider, global SEO metadata (see "SEO")
  page.tsx        # Home — NavHeader + Hero + Footer + ClothingStore JSON-LD
  sitemap.ts      # Static routes + one <url> per product. revalidate=3600; backend-down → static only
  robots.ts       # Disallows /admin, /login, /forgot-password, /checkout, /api/
  opengraph-image.tsx # Generated 1200x630 share image, inherited by routes without their own openGraph
  global-error.tsx # Last-resort boundary for root-layout errors only. Own <html>/<body> — no
                  #   QueryProvider/BrandProvider/CartProvider available, so it can't reuse
                  #   NavHeader/Footer (cart drawer wouldn't be mounted). Prod-only (dev uses Next overlay)
  not-found.tsx   # Custom 404, imports NavHeader/Footer directly (not inherited)
  error.tsx       # Root error boundary (client). Catches RSC throws (e.g. backend down). "Reintentar"
                  #   = startTransition(() => { router.refresh(); reset() }) — reset() alone doesn't
                  #   re-fetch, so it can't recover a failed Server Component on its own
  admin/
    layout.tsx    # AdminGuard + shell + `robots: noindex` for all of /admin/* (set once, here)
    page.tsx      # Sidebar + section routing (AdminSection type)
  (public)/
    outlet/[slug]/producto/ # Product detail (async RSC). generateMetadata with real product OG image +
                  #   Product/BreadcrumbList JSON-LD. Shares fetch with the page via React cache().
                  #   NO loading.tsx on purpose — see "Estados de carga"
    pedido/
      page.tsx    # /pedido — token-less entry (OrderLookupForm), linked from Footer. noindex
      [token]/    # /pedido/<token> — public order tracking. Path is fixed by the backend's
                  #   publicOrderUrl (payment.service.ts) for the confirmation email. noindex
                  #   (the token IS the credential). No loading.tsx needed (query owns its own state)
    terminos/ privacidad/ envios/ nosotros/  # static legal/about pages
  login/ forgot-password/  # AuthShell + LoginForm / ForgotPasswordForm
components/
  home/           # NavHeader, Hero, Footer, CategoryCard. Hero fetches real per-category piece
                  #   counts via getProducts({ categoria, perPage: 1 }) — only reads `total`
  outlet/         # OutletView (catalog listing) + OutletCard + EmptyState + OutletSkeleton (Suspense
                  #   fallback, see "Estados de carga"). OutletFilters (search + categoría + talla +
                  #   orden + price range): the backend resolves everything in SQL — front NEVER
                  #   filters/sorts/trims client-side (would break pagination). URL is the source of
                  #   truth, sanitized via lib/domain/catalogFilters.ts. Search + price fields share
                  #   one local draft (300ms debounce) committed via `replace: true` (not `push`, or
                  #   every keystroke would pollute history); inputs show the raw URL text, not the
                  #   sanitized value (sanitizing mid-type would erase what's being typed — garbage in
                  #   the URL is harmless, the backend silently ignores it). Draft re-seeding on URL
                  #   change happens in render, not a useEffect (avoids a cascading-render lint warning).
                  #   Empty state splits in two: no filters → "Agotado"; with filters → "No encontramos
                  #   nada" + clear-filters button (keeps category on /botas /sombreros /ropa).
                  #   `precioMin > precioMax` intentionally yields zero results (matches backend)
  seo/            # JsonLd — schema.org <script> block, escapes `<` to avoid closing the tag early
  product/        # ProductInfo — detail panel (ImageCarousel gallery + size picker + add-to-cart).
                  #   Gallery from product.images (Cloudinary, up to 3) → imageSrc → placeholder.
                  #   hasSizes:false skips the size picker, adds with the sentinel size 0 (see
                  #   "Productos sin tallas")
  ui/             # Cart, CartProvider (drawer, mounted in root layout), FormControls
                  #   (TextField/SelectField, shared by checkout/ + auth/), ImageCarousel
                  #   (framer-motion + next/image, respects reduced-motion)
  checkout/       # 4-step flow (see "Checkout flow"). ShippingOptions (step 3, live quote via
                  #   lib/api/shipping.ts). CouponField (step 0) — a useMutation, not useQuery:
                  #   applying a coupon is a deliberate click, and the route is rate-limited to
                  #   20/min. Never computes the discount itself — always reads it from /validate,
                  #   which shares the discount function with checkout (duplicating it would drift).
                  #   Backend `message` shown verbatim (distinguishes: doesn't exist · expired ·
                  #   exhausted · under minimum). checkoutErrors.ts — pure module (specs) mapping the
                  #   FOUR 409s of POST /api/orders: no stock · quote expired · idempotency key reused
                  #   · coupon (isCouponError — expired/reused/pushes total under Stripe's minimum).
                  #   Coupon errors are the only ones mentioning "cupón". A rejected coupon is never
                  #   auto-removed (would silently change the accepted price) — the UI offers a button
  order/          # Public order tracking (buyer-facing, not owner). OrderTracking owns the query
                  #   (orderKeys.lookup(token), manual refresh only — no refetchInterval; backend caps
                  #   this route at 30 req/min; retry:false since a 404 is definitive). OrderStatusTimeline,
                  #   TrackedOrderItems, OrderLookupForm. Form asks for the tracking CODE (not the link,
                  #   Fase 21) — matches the email's copy. extractPublicOrderToken still accepts both
                  #   forms (old emails only carry the link). Neither buyer-facing screen shows
                  #   "Pedido #<id>" (Order.id is the store's global sequence, not the buyer's
                  #   reference — enumerable, hence the token-based lookup); admin panel still shows it.
                  #   orderTimeline.ts — pure module (specs) deriving the 4-step timeline; `pending`
                  #   and `cancelled` don't fit the 4 steps and are handled separately (cancelled ≠
                  #   refunded — don't promise a refund that may not exist). Named differently from
                  #   OrderStatusTimeline.tsx to avoid case-insensitive-FS (macOS) import ambiguity.
                  #   TrackedOrderItems does NOT reuse checkout/OrderItems — it gets nameSnapshot +
                  #   frozen prices, not a live Product (product may have changed/vanished since).
                  #   Totals DO reuse checkout/OrderTotals (gained an optional `discount` prop, Fase 19)
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static
  about/          # AboutUs — static "Sobre nosotros", linked from footer
  auth/           # AuthShell + LoginForm (RHF + zod + TanStack mutation, connected). AdminGuard
                  #   protects /admin, validates token via GET /auth/me. ForgotPasswordForm — 3-step
                  #   wizard (email → 5-digit code → new password), local state, not persisted.
                  #   Subcomponents: CodeInput (5-box OTP), ResetCodeForm, NewPasswordForm
  providers/      # QueryProvider (TanStack root), BrandProvider (hydrates brand from public
                  #   GET /api/admin/brand, exposes useBrand(); BRAND in lib/domain/brand.ts is SSR fallback)
  admin/          # Sidebar + types.ts (AdminSection) + sections/ (8 tabs) + per-tab subcomponent
                  #   folders (config/, coupons/, data/, orders/, products/, reports/, expenses/, import/):
                  #
                  #   BrandSection — brand identity editor. Connected (autosave debounce). Logo is a
                  #     local blob: preview only, not persisted (upload = future work)
                  #   ProductSection — catalog CRUD, connected via lib/api/adminProducts. Subcomponents:
                  #     ProductForm, ProductCategoryView, ProductDetailModal, notices.ts. ProductForm
                  #     manages a gallery of up to 3 images (create/update product as JSON, then
                  #     deleteProductImage/addProductImages per changed image, Cloudinary). Its
                  #     `onBack(notice?)` reports save/delete outcomes back up to the list's banner —
                  #     never navigates silently. "Maneja tallas" toggle (Fase 24) swaps the sizes
                  #     input for a numeric "Cantidad en existencia" (stockQuantity) — see "Productos
                  #     sin tallas"
                  #   ImportSection — Excel bulk import/restock (Fase 13), own Sidebar entry because
                  #     the review table needs full width. See "Importación por Excel" — invariants
                  #     there exist specifically to avoid duplicating real stock
                  #   OrdersSection — paginated order list (server-paginated `date` filter, unlike
                  #     SalesTable's client-side one). Page size 20 desktop / 5 mobile via matchMedia.
                  #     Subcomponents in components/admin/orders/: OrdersTable, OrdersPagination,
                  #     OrderDetailModal, StatusBadges (status/paymentStatus are INDEPENDENT fields
                  #     with DISJUNT color ramps — they're shown side by side, so sharing hues would
                  #     force reading the text to tell them apart). Modal shows unitCost + margin
                  #     (admin-only). Coupon row sits above Shipping (discount never touches shipping)
                  #     and only appears with couponDiscount > 0; total margin subtracts it. DropoffBadge
                  #     flags `shippingRequiresDropoff` (Skydropx doesn't pick up — owner must drop off).
                  #     Skydropx label/tracking fields (Fase 11) populated by the webhook. Polling every
                  #     30 min + manual refresh; a per-row signature (status|paymentStatus|shipmentStatus|
                  #     labelUrl|trackingNumber) drives a Sileo toast ONLY when the automatic refetch
                  #     (not manual, not first load) finds something changed.
                  #     Cancel/refund (Fase 12): button visible on pending/paid only (backend 409s
                  #     otherwise); inline confirm + optional reason; invalidates order+product keys
                  #     (restock affects catalog too) and syncs the open modal via onOrderUpdated,
                  #     flagged as manual so it doesn't also fire the polling toast.
                  #     Manual ship/deliver (Fase 14): flat-rate orders never touch Skydropx (no
                  #     webhook), so this covers advancing them by hand. Tracking number/carrier
                  #     optional; forward-only (409 to go backward or on cancelled/unpaid); repeating
                  #     the current status is allowed (lets you add a late tracking number). Omitted
                  #     keys mean "don't touch this field" (empty string would 400). Does NOT capture
                  #     "URL de rastreo" (removed Fase 21) — that's the carrier's own link and only the
                  #     Skydropx webhook should set it; the buyer's own tracking already goes out in
                  #     every email.
                  #     Skydropx label retry (Fase 16): sits above "Estado del envío" (label must
                  #     exist before marking shipped). All branching comes from shipmentLabel.ts (pure,
                  #     specs) — see below. `force: true` is the only place in the app that can create
                  #     a second (paid) label; has its own extra confirmation.
                  #   orders/shipmentLabel.ts — pure module. `skydropxShipmentId` isn't "an id or
                  #     null": it can also be "creating" (in flight / orphaned), "unreconciled:<id>"
                  #     (Skydropx charged but didn't persist), "unreconciled:desconocido" (may have
                  #     charged with no trace). shipmentLabelState() classifies all 5 states;
                  #     canRetryShipment() mirrors the backend's 4 guards to avoid offering a button
                  #     that can only 409
                  #   CouponsSection — connected via lib/api/adminCoupons. "Cancelar" is PUT
                  #     { active: false }, not a delete (history/reactivation preserved). DELETE
                  #     outcome (`deactivated: true` = already has redemptions, soft-deactivated
                  #     instead) is reported from what the backend actually did.
                  #     coupons/couponStatus.ts — pure module (specs): couponState() precedence is
                  #     cancelled → agotado → vencido → programado → activo (deliberately NOT date-first
                  #     — "agotado" is a more useful message than "expired"). Uses `<=` for expiry to
                  #     mirror the backend guard exactly. **storeDayISO() is mandatory for seeding
                  #     `<input type="date">`** — coupon expiry is stored as end-of-day in the store's
                  #     timezone, so a naive `iso.slice(0,10)` would roll the date forward a day on
                  #     every re-save. Named couponStatus.ts (not CouponStatus.tsx) to dodge
                  #     case-insensitive-FS bundler ambiguity next to CouponStatusBadge.tsx.
                  #   DataSection — dashboard (KpiGrid, RevenueChart, InventoryTable, SalesTable),
                  #     connected via lib/api/dashboard. 7/30/90-day selector indexes precomputed
                  #     kpisByPeriod/profitKpisByPeriod. SalesTable paginates 5/page + filters by day.
                  #     Fase 22: shipping is a COST OF SALE — row profit = total − shipping − costoTotal
                  #     (previously shipping was omitted from margin, overstating profit on high-shipping
                  #     orders). New KPI `COSTO DE ENVÍO` needed zero code (KpiGrid renders generically by label)
                  #   ReportsSection — Ventas / Reposición tabs + month selector, see "Reportes"
                  #   ExpensesSection — expenses & subscriptions (Fase 20), connected. Feeds the
                  #     KPI GASTOS/GANANCIA OPERATIVA (previously a hardcoded $2,000). "Dar de baja" is
                  #     PUT { active: false }, not delete — same deactivate-vs-delete contract as coupons.
                  #     expenses/expenseStatus.ts — pure module (specs): precedence is inactivo →
                  #     terminado → programado → **cobrado** (a past-dated `once` charge — separated from
                  #     "activo" because its monthlyRunRate is 0) → activo. **Dates read in UTC**
                  #     (opposite of coupons — expense dates are DATEONLY, no time component; do NOT
                  #     reuse storeDayISO() here). priceChangeDelta()/Label() are the ONLY client-side
                  #     math — everything else (currentAmount, monthlyRunRate) comes precomputed from
                  #     the same service that feeds the dashboard KPI, to avoid two screens diverging.
                  #     ExpenseAmountForm is separate from ExpenseForm on purpose: amount is a
                  #     dated VERSION, not a column — editing the concept must never reprice history.
                  #     ShippingCostNote — shared component (not copy-pasted) showing the derived
                  #     `shippingCost` line in both summary and history: no Expense row behind it, not
                  #     editable, and **never summed into totals/charts/categories** (already subtracted
                  #     in GANANCIA BRUTA — summing it here would double-count)
                  #   ConfigSection — admin users + own account, connected (Fase 6). "Mi cuenta" card
                  #     requires current password for any change; "Administradores" card (list + add/remove)
                  #   import/ — ImportSection subcomponents. Pure modules (tested): types.ts
                  #     (Cell/RowEdit/ImportState + EDITABLE_FIELDS whitelist protected by `satisfies`),
                  #     rowInput.ts (ingest/serialize/coerce/validate, mirrors backend parsing),
                  #     importReducer.ts, dependencies.ts, labels.ts. See "Importación por Excel"
                  #   data/ — chart/table subcomponents (recharts) + types.ts (shared admin data contracts)
                  #   reports/ — SalesReport + ReplenishmentReport, connected via lib/api/reports
lib/
  api/
    client.ts     # single axios instance, baseURL = NEXT_PUBLIC_API_URL ?? /api. Request interceptor
                  #   attaches Bearer from authStore; response interceptor logs out + redirects on 401.
                  #   Flags: skipAuth (public route, no Bearer, no redirect) / skipAuthRedirect
                  #   (authenticated, but this 401 means something else — e.g. wrong password —
                  #   handled inline instead of logging out)
    auth.ts       # Zod contracts + login/forgotPassword/verifyResetCode/resetPassword/getMe + authKeys.
                  #   Source of truth for AuthUser type
    orders.ts     # Checkout contract. buildOrderPayload sends { items, customer, couponCode?,
                  #   quotationId?, rateId? } — never amounts (backend recalculates + re-quotes
                  #   Skydropx if a quotation was passed). createOrder(payload, idempotencyKey?) sends
                  #   the `Idempotency-Key` header and reads `Idempotency-Replayed` off the response
                  #   header (not the body). PublicOrderSchema is a distinct, smaller projection (no
                  #   unitCost/paymentIntentId/refundId/labelUrl/Skydropx ids/publicToken/buyer contact
                  #   info — this link gets shared over WhatsApp). `packageCount` (Fase 23, nullable —
                  #   null = flat-rate) is informational only, never sent back in buildOrderPayload
    coupons.ts    # Public coupon contract (Fase 19). validateCoupon() — validates WITHOUT redeeming
                  #   (querying repeatedly doesn't burn a use), returns the exact amount that will be
                  #   charged (shares computeCouponDiscount with the backend checkout — front never
                  #   computes it itself). isCouponRejection separates a real rejection (4xx) from
                  #   "couldn't ask" (network/5xx/429) — only the former blocks payment
    adminCoupons.ts # CRUD contract. `code`/`redeemedCount` are not editable; `active: false` cancels.
                  #   Omitted keys in PUT mean "don't touch". Dates travel as raw YYYY-MM-DD — backend
                  #   interprets in store timezone (start-of-day for startsAt, END-of-day for expiresAt)
    adminExpenses.ts # Amount is NOT a field on the expense — it's versioned by date in `amounts`.
                  #   Sending `amount` in a PUT ADDS a new version (or corrects one already at that
                  #   date); it never overwrites past history. `amountEffectiveFrom` without `amount`
                  #   is 400. Filters are 400-on-invalid here (unlike the public catalog) since the
                  #   owner is reading their own numbers. Fase 22: DerivedShippingCostSchema +
                  #   required `shippingCost` (derived from orders, no Expense row, excluded from
                  #   every total/chart — the dashboard already subtracts it in GANANCIA BRUTA)
    shipping.ts   # getShippingRates(items, customer) → POST /api/shipping/rates, public, ALWAYS 200
                  #   (backend falls back to its own flat rate if Skydropx fails). `packageCount`
                  #   (Fase 23) required, not optional — old backends should fail loud, not silently
                  #   show "one box" on a 4-box order
    adminProducts.ts # AdminProductSchema carries unitCost + images + hasSizes. Sizes travel as CSV
                  #   where a repeated size = extra stock. Fase 24: `hasSizes` decides whether `sizes`
                  #   or `stockQuantity` is sent — never both (backend 400s on the wrong one)
    adminProductImport.ts # Excel import contract. Preview uses strict `.parse()` (read-only, safe to
                  #   retry); commit uses safeParse + warn (already wrote — turning a weird body into
                  #   a thrown error would invite a retry that DUPLICATES stock)
    adminOrders.ts # Paginated admin order list + guía/rastreo fields (Fase 11) + refund (Fase 12,
                  #   POST /:id/cancel) + manual status advance (Fase 14, PATCH /:id/status,
                  #   forward-only) + shipment retry (Fase 16, POST /:id/shipment/retry — 200 = label
                  #   exists, 502 = Skydropx failed again, 409 on any ambiguity)
    dashboard.ts  # DashboardSchema, GET /api/admin/dashboard. kpisByPeriod/profitKpisByPeriod precompute
                  #   all 3 windows (7/30/90) in one response. Fase 22: recentSales[].shipping. The new
                  #   COSTO DE ENVÍO KPI's `trend` is INVERTED on purpose (positive: true = cost went
                  #   down) — KpiCard just renders by `positive`, so without the inversion a rising
                  #   shipping cost would show green
    reports.ts    # MonthlyReport[] / ReplenishmentRow[] — both fully derived/ordered by the backend
    brand.ts      # BrandSettingsSchema is a SUBSET of BRAND (namePrimary/nameAccent/email/instagram
                  #   don't exist on the backend, stay client-only)
    adminUsers.ts # AdminUserSchema (role owner|admin). Backend 409s on duplicate email, 400 on
                  #   deleting your own account or the sole owner
    account.ts    # updateOwnAccount — currentPassword required for any change. skipAuthRedirect (a
                  #   401 here means wrong password, shown inline, doesn't log out)
    products.ts   # Public catalog fetcher (getProducts/getProductById), 404 → null. No unitCost.
                  #   Carries images[]/imageSrc/hasSizes. Fase 18: q/orden/precioMin/precioMax added
                  #   to filters — response shape unchanged
  domain/         # pure business logic (no React, no I/O)
    catalogFilters.ts # parse*Param + hasActiveFilters + isInvertedPriceRange (Fase 18, specs). Mirrors
                  #   the backend's "silently ignore invalid values, never 400" rule — exists so
                  #   `?orden=garbage` doesn't fragment the TanStack Query cache
    cart.ts       # computeTotals(items) — subtotal/savings only. **Does NOT compute shipping**
                  #   (Fase 23, `shipping: null`) — the old flat-rate copy (computeShipping/
                  #   SHIPPING_BY_TYPE) was removed because it undercharged vs. the backend's per-box
                  #   pricing. **Do not reintroduce local shipping math** — see "Shipping"
    idempotency.ts # newIdempotencyKey() (Fase 15, specs) — crypto.randomUUID() + two fallbacks,
                  #   since randomUUID only exists in secure contexts (would break checkout over
                  #   plain http://192.168.x.x)
    publicOrderToken.ts # PUBLIC_TOKEN_PATTERN/isPublicOrderToken/extractPublicOrderToken (Fase 17,
                  #   specs) — accepts either the bare token or a full pasted URL. Only decides
                  #   "does this look like a code" — existence is the backend's 404 to report.
                  #   isOwnOrderTrackingUrl(url) detects the opposite bug: a /pedido/<token> link
                  #   accidentally saved as Order.trackingUrl (pre-Fase-21 manual form) — used to
                  #   suppress the "Rastrear" button so it doesn't point back at itself
    shipmentStatus.ts # shipmentStatusLabel — translates Skydropx's raw (non-enum) status string.
                  #   Lives in domain/ (not admin/) because BOTH the admin badge and the public
                  #   tracking page need the same mapping
    brand.ts      # BRAND — SSR fallback brand copy; resolveBrand(settings) merges backend BrandSettings ← BRAND
    categories.ts # CATEGORIES + labels (single source, was duplicated ~10 places) + DEFAULT_DIMENSIONS
  seo/
    site.ts       # SITE_URL (NEXT_PUBLIC_SITE_URL ?? localhost) + absoluteUrl() — single source for
                  #   metadataBase, canonicals, sitemap.ts, robots.ts
    metadata.ts   # pageMetadata() — use for every new public page (see "SEO" for why)
    jsonLd.ts     # storeJsonLd/productJsonLd/breadcrumbJsonLd — only describe what the page actually shows
  stripe/client.ts # getStripe() — module-level loadStripe() singleton. null if key missing → UI degrades
  ui/motion.ts    # shared framer-motion variants (fadeUp, fadeIn, staggerContainer, EASE_LUXE)
  utils/index.ts  # formatPrice(amount) — es-MX locale
schemas/
  checkout.ts     # shippingSchema + MEXICAN_STATES
  auth.ts         # loginSchema + forgotPasswordSchema
  users.ts        # createUserSchema + updateAccountSchema (+ shared passwordComplexity)
  coupons.ts      # couponFormSchema + couponInputFromForm (Fase 19) — mirrors backend cross-field
                  #   rules (percent ≤ 100, cap only on percent-type, end > start) so bad input is
                  #   caught before submit, not after
  expenses.ts     # expenseFormSchema (a FUNCTION of `isNew`, not a hidden field) + amountChangeFormSchema.
                  #   expenseUpdateFromForm never sends amount/amountEffectiveFrom — that's a separate
                  #   form (amountChangeFromForm) since those keys version-bump the price
store/
  cartStore.ts    # Zustand + persist — cart items, stock-aware addItem
  importStore.ts  # Zustand, NO persist (section unmounts on tab switch; a half-reviewed import must not survive that)
  authStore.ts    # Zustand + persist (key botas-don-chuy-auth) — token + user, source of truth for the axios interceptor + AdminGuard
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/botas`, `/sombreros`, `/ropa`, `/checkout`, `/pedido`, `/pedido/[token]`, `/terminos`, `/privacidad`, `/envios`, `/nosotros`, `/admin`, `/login`, `/forgot-password` (the 3 category routes reuse `OutletView` with `defaultCategoria`)

**Planned, not built**: `/carrito`, `/devoluciones`

## State Management

Cart: `store/cartStore.ts` (Zustand + persist, key `botas-don-chuy-cart`). `Cart` drawer renders globally via `CartProvider` (dynamic import, SSR disabled) in root layout.

Auth/session: `store/authStore.ts` (Zustand + persist, key `botas-don-chuy-auth`) — see "Auth & data fetching".

## Auth & data fetching

Stack: **TanStack Query + Axios + Zod**. `QueryProvider` mounts `QueryClientProvider` in root layout.

- **`lib/api/client.ts`** — single axios instance. Request interceptor attaches `Authorization: Bearer`; response interceptor logs out + redirects to `/login` on 401. All backend calls go through this instance.
- **Login** — `useMutation({ mutationFn: login })`. Maps 401→credentials, 429→rate-limit.
- **Password recovery (Fase 10)** — 3-step wizard, local state: email → 5-digit code (`CodeInput` OTP) → new password → `/login`. Recovery endpoints are public.
- **`/admin` protection** — `AdminGuard` reads the token hydration-safely (`useSyncExternalStore`), redirects if absent, and validates against `GET /api/auth/me`. A **non-401** error (500/network) does NOT block access — the panel renders anyway so a transient backend outage doesn't lock out the admin. 401 → interceptor logs out.

> Security model: token in localStorage + client guard is correct for this axios/SPA stage. `unitCost`/margins must only ever be exposed via authenticated `/api/admin/*` routes.

Env: `NEXT_PUBLIC_API_URL` (→ `/api` if unset). `NEXT_PUBLIC_SITE_URL` (→ `localhost:3000` if unset, see "SEO"). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key only, same account as backend's `STRIPE_SECRET_KEY`, never a secret/restricted key. `NEXT_PUBLIC_*` values are baked in at build time — restart `pnpm dev` after changing them.

## SEO

Global metadata lives in the root layout (`metadataBase`, `title.template`, OG/Twitter, `formatDetection` off, `robots` with `max-image-preview: large`).

**Every new public page must build its metadata with `pageMetadata()` (`lib/seo/metadata.ts`)**, because of two Next.js metadata-inheritance traps (verified against build HTML, not just docs):

1. **`alternates` is INHERITED** if a page doesn't define it — so the root layout deliberately has no `canonical`, or every page that forgot its own would self-declare as a duplicate of the home page (happened to `/terminos`, `/privacidad`, `/envios`, `/nosotros`).
2. **`openGraph` is REPLACED wholly**, not merged — a page that only wanted a custom title lost `siteName`/`locale`/`type`/OG image. The helper always emits the full block.

Only the **home** (declares just `alternates`) and **producto** (builds its own `generateMetadata` — real product photo) skip the helper.

- `lib/seo/site.ts` is the single source of the public URL — **must be set in Vercel Production** or canonicals/sitemap point at localhost.
- Listing canonicals strip query params: `/outlet?categoria=bota&pagina=2` → `/outlet`.
- Private routes (`/admin/*`, `/login`, `/forgot-password`, `/checkout`, `/pedido*`) carry both `robots: noindex` **and** a robots.txt disallow — the meta stops indexing, robots.txt stops crawling; neither alone is enough since `/pedido` is linked from the Footer.
- Structured data only describes what the page actually shows (Google policy). `image` omitted entirely if the product has no photos (`image: []` is invalid, not "no image"). `brand` omitted (schema.org brand = manufacturer, not the store; not in the backend's Product model).
- `opengraph-image.tsx` is only inherited by routes without their own `openGraph` (today: home only); producto uses it as a fallback when the piece has no photo.

## Estados de carga (loading.tsx vs Suspense)

Two different reasons to suspend → two different answers. **Don't unify without reading this:**

- **Listings** (`/outlet`, `/botas`, `/sombreros`, `/ropa`) are NOT async RSCs — `OutletView` is a client component fetching via TanStack Query. What suspends during prerender is its `useSearchParams`, caught by the page's own `<Suspense fallback={<OutletSkeleton />}>` — **a `loading.tsx` here would never be reached**.
- **Producto** (`/outlet/[slug]/producto`) IS an async RSC and deliberately has **no loading.tsx**. Any streaming boundary forces Next to send the shell before knowing whether the product exists → status stays 200 and `notFound()` becomes a **soft 404** (measured: with loading.tsx, `/outlet/999999/producto` → 200; without, → 404). Outlet pieces get discontinued and their indexed URLs get crawled often, so correct status won out over a skeleton — the accepted cost is no click feedback until the backend responds.

`loadProduct` validates the slug (`Number.isInteger(id) && id > 0`) before calling the backend — otherwise `/outlet/abc/producto` → `Number("abc")` → `NaN` → 400 from the backend → an unhandled 500 instead of a clean 404.

## Checkout flow

`/checkout` is a 4-step wizard. State lives in `components/checkout/CheckoutContext.tsx` (not persisted — a refresh restarts at step 0). Steps render conditionally, so **navigating unmounts the step** — anything that must survive back/forward lives in the context, not the step component: `acceptedTerms`, the unvalidated shipping draft (ref), `confirmedCustomer` (state — validated address, what gets quoted), the chosen shipping rate (state, cached by cart+customer signature), the applied coupon (state, cached by a deliberately **looser** signature — just `cartLineSignature(items)`, since the discount only depends on merchandise and shouldn't be dropped by an address/carrier change), Stripe's pending order (ref), and the idempotency key (ref).

The `Stepper` allows jumping to any **already-visited** step (never an unvisited one, never after order confirmation), and renders 3 states per step (done / visited-but-not-current / pending) — without the middle state, going back made a filled step look untouched.

1. **Resumen** (`OrderSummary`) — read-only review + required terms checkbox. `computeTotals(items)` no longer estimates shipping (Fase 23) — shown as "Se calcula con tu dirección", never $0 or hidden (an unnamed shipping line reads as free shipping). `CouponField` lives here. **App-wide totals invariant: `total = subtotal − savings − couponDiscount + shipping`** — `savings` (outlet discount) and `couponDiscount` are distinct and never merged; the coupon never touches shipping.
2. **Dirección** (`UserDetails`) — RHF + zod (`schemas/checkout.ts`, Mexico-only via `MEXICAN_STATES`). On submit, `confirmShipping(data)` unconditionally invalidates any previously chosen rate (a new address may quote differently) and advances. No order/Stripe interaction yet.
3. **Envío** (`ShippingOptions`) — live Skydropx quote. **Coupon revalidation** (Fase 19): if applied and not yet checked against the confirmed email, re-queries `/validate` with the email — the only point in checkout where "one use per customer" can actually be verified. A rejection (`isCouponRejection`, 4xx) blocks "Pagar y confirmar"; a network error/429 does not. `POST /api/shipping/rates` **always returns 200** (falls back to flat rate on Skydropx failure). A single rate auto-selects; 2+ requires a choice. **packageCount** (Fase 23) is shown above the rate list and in the sidebar when >1 box, from a **single derivation** shared by both (they describe the same shipment, so two calculations could contradict each other on screen): the chosen rate's own count once one is selected — that's what gets charged — and before that the **max** across `data.rates`, never `rates[0]`. Payment: `usePlaceOrder` — (1) `createOrder()` posts `buildOrderPayload(...)` with **no amounts** (backend recalculates, re-quoting Skydropx by `quotationId` if present) → `{ order, clientSecret }`; (2) `stripe.confirmCardPayment(clientSecret, { payment_method: "pm_card_visa" })` — **hardcoded test card**, sandbox only. The pending order is cached in context by an `orderSignature` (cart + customer + rate + coupon) to avoid re-creating it on retry; invalidated if any of those change. **`Idempotency-Key`** (Fase 15) protects against the retry path that *doesn't* go through the cache (double-click, browser auto-retry) — keyed by the same signature, generated lazily on submit (never in render — `crypto.randomUUID()` doesn't exist in SSR), cleared by `completeOrder()`. If the backend replays (`Idempotency-Replayed` header), `usePlaceOrder` checks `stripe.retrievePaymentIntent()` before re-confirming, since re-confirming an already-`succeeded` payment throws a false failure. Errors mapped in `checkoutErrors.ts` (see components/checkout above). Only on `paymentIntent.status === "succeeded"` does `completeOrder()` freeze the snapshot (with server-authoritative totals), empty the cart, and advance — the real `paid` state is reconciled async by the webhook.
4. **Confirmación** (`Success`) — renders the frozen snapshot. No `#<id>` (Fase 21); CTA is "Ver el estado de mi pedido" → `/pedido/<token>` when `publicToken` is present in the snapshot (not persisted to localStorage — that would move a credential to the browser just to save a click).

Shared pieces: `Stepper`, `OrderItems`, `OrderTotals`, `FormControls`.

## Shipping — cotización en vivo (Skydropx, Fase 8.4)

Backend (`backend/src/controllers/shipping.controller.ts` + `skydropx.service.ts`) is the authority: packs the cart into boxes (`packOrder`), quotes **one shipment per box** against Skydropx, returns `{ quotationId, rates: [{ rateId, carrier, service, amount, total, days, packageCount }] }`. Fixed origin: Celaya, Guanajuato.

`lib/api/shipping.ts` posts `POST /api/shipping/rates` with `{ customer, items }` (shared mapping via `mapCartItemsToOrderItems`).

**Charged per box** (Fase 23) — a single-item order still ships in the small box (majority case unaffected); the price jump only appears once the order genuinely needs more than one box. **The frontend never recalculates `packageCount`** — purely informational, never sent back in `POST /api/orders`.

**Flat-rate fallback**: if Skydropx fails/times out/a product has a zero dimension/the order exceeds live-quotable bulk, backend still returns 200 with `quotationId: null` and one synthetic rate (`SHIPPING_BY_TYPE = { bota: 160, sombrero: 130, ropa: 100 }` MXN, summed per box). Comes from the same `packOrder`, so `packageCount` is identical either way.

> ⚠️ **`lib/domain/cart.ts` no longer computes shipping.** A local copy (`computeShipping`) was removed in Fase 23 — it charged one flat guía per order regardless of box count, undercharging vs. the backend. **Do not reintroduce it** — `CartTotals.shipping` is `number | null`, and `null` means "not yet quoted."

**Shown amount = charged amount**: the rate chosen in `ShippingOptions` is sent to `POST /api/orders`; the backend re-queries Skydropx by that exact quotation and uses its `total` — never trusts a client-supplied amount. Expired quotations (24h TTL) → 409 → front clears the selected rate to force a re-quote.

## Importación por Excel (Fase 13)

`ImportSection` uploads an `.xlsx` for new stock + restock, in two backend steps: `POST /import/preview` (multipart, writes nothing) and `POST /import` (JSON, applies reviewed rows).

**Governing principle: restock ADDS stock and there's no undo from the app.** A misread row isn't fixed with a button — it's fixed by hand, product by product. Hence the invariants below are not preferences.

### Invariantes

- **A successfully applied row never re-enters the payload.** After each commit, `created`/`updated` indices lock for the rest of the session (structural, in the reducer) — this is what makes "fix the errors and retry" safe. An `unchanged` row is not locked but IS deselected.
- **"Volver a analizar" disappears once rows are applied** (`canReanalyze`) — a fresh preview would run against the already-updated catalog while the file still says the same thing, making the just-applied restock look like another pending update.
- **Everything keys by the row's array INDEX, never the Excel folio `row`** (external, optional, possibly duplicated). Commit-result merge is positional with folio fallback.
- **`serializeRowEdit` emits only a whitelist** (`EDITABLE_FIELDS ... satisfies`) — the commit body is `.strict()` server-side; one stray key would 400 the **entire batch**. The `satisfies` makes that a build-time failure.
- **Counts are derived from `rows`, never from the backend's `summary`** (used only for a `console.warn` cross-check) — the table is what the owner can actually audit.
- **Preview → strict `.parse()`; commit → `safeParse` + warn + raw data.** Commit already wrote — throwing on a weird body would invite a retry that DUPLICATES stock.
- **Post-commit invalidation also runs on partial failure** and on a failed Zod parse (a partial success still wrote). Invalidates both admin and public product keys.

### "Ausente" vs. "vacío"

A missing key means "don't touch this column"; `null` == absent; but `description: ""` DOES clear it. Since an `<input>`'s value is always a string, each cell (`Cell` in `import/types.ts`) carries `presence: "absent" | "present"` separate from its text. Numbers use `type="text" inputMode="decimal"` (not `type="number"` — swallows commas, scroll changes the value) and `parseNumberText` mirrors the backend's parser; **never silently degrades to 0** — an unparseable row is marked invalid and deselected instead.

`sizes` is excluded from "seed from current value" (`NOT_SEEDED`) — sizes are additive, so seeding today's count would double it on apply.

### Two contract limits the UI can't paper over

1. **Can't re-preview an edited row** — `/import/preview` only accepts a file, so re-uploading ignores edits. The UI suppresses diff lines whose inputs changed (`stalenessOf`) instead of pretending they're still accurate; shows a local "what you're about to send" diff in their place.
2. **Preview resolves against a virtual catalog** (DB + what earlier rows in the same file already project) — deselecting an earlier row can invalidate a later one's result. `dependencies.ts` detects this (`action === "update" && productId === null`) and warns without blocking.

### Other details

- Zustand store (`store/importStore.ts`), no persist — the section unmounts on tab switch and a half-reviewed import shouldn't survive that.
- **Duplicate-submission 409**: backend rejects the same payload hash within 60s. `isSameBatchAsLast` pre-detects and explains it client-side before wasting the request.
- Table stays mounted (only disabled) during commit — a failure doesn't lose edits/selection.
- `reactivated: true` (discontinued product returning to the public catalog) gets its own badge — it's exactly the kind of side effect that surprises silently.
- Rows render collapsed; the editor mounts only on expand (500 rows × 13 fields would be 6,500 inputs). No `staggerContainer` on the list (would take 35s at 500 rows).
- Template: `public/product-import-template.xlsx` (served under that English URL; `ImportDropzone`'s `download` attribute still saves it as `plantilla-importacion-productos.xlsx` for the owner), generated by `scripts/generate-import-template.mjs` using the **backend's** `exceljs` (avoids a ~1MB frontend dependency for a static download). One-off script; regenerate + recommit if the canonical header changes.
- Importer does **not** support sizeless products yet — assumes `hasSizes: true` for every row; those are created directly via `ProductForm`.

## Productos sin tallas (Fase 24)

`Product.hasSizes: boolean` (default `true`) distinguishes sized merchandise from loose pieces (a corbatín, a hebilla) where only the count matters. The backend stores that count as a row with a **sentinel size (`0`)** — `product.stock`/`product.sizes` read the same either way, so most of the front is already transparent to this.

Two places that do need to know the mode:

- **`ProductForm.tsx`** — "Maneja tallas" toggle swaps the sizes input for a numeric "Cantidad en existencia" (`stockQuantity`). `AdminProductInput` declares both fields optional; the submit sends only the one matching the toggle (backend 400s on the wrong one).
- **`ProductInfo.tsx`** — with `hasSizes: false`, no size `<fieldset>` renders; `effectiveSize` is fixed at `0` and "Agregar al carrito" is gated only on `stock > 0`.

**The sentinel must never render as a real size.** Since a captured size is always `> 0` (`parseSizes` filters), `item.size === 0` unambiguously means sizeless in any order-row rendering context — `hasSizes` doesn't need to be threaded through. `Cart.tsx`, `checkout/OrderItems.tsx`, `order/TrackedOrderItems.tsx`, and `OrderDetailModal.tsx`'s "Talla" column all gate that row on `size > 0`; `ProductDetailModal.tsx` (admin) has `product.hasSizes` directly available and hides the whole "Tallas" block with it. The public catalog's `availableSizes` never includes `0` — guaranteed by the backend.

## Reportes, forecast y reposición

`ReportsSection` has two linked tabs: sales history feeds the replenishment forecast. **Both are fully backend-derived** — the front only renders rows.

```
Órdenes pagadas (backend)
  ├─► GET /reports/monthly ──► SalesReport        (histórico: qué se vendió)
  └─► GET /reports/replenishment ──► ReplenishmentReport  (futuro: qué comprar,
        computeForecast over complete months per product)
```

`ReportsSection` owns the monthly query (month selector, default = latest non-partial month) and passes `reports` down to both tabs; the replenishment query mounts lazily on tab open.

**Forecast** (`backend/src/services/forecast.ts`, `computeForecast(monthlySales)`), scaled by history length:

| Meses | Algoritmo | Confianza |
|---|---|---|
| 1–2 | Promedio simple | baja |
| 3 | Promedio ponderado + tendencia (±15%) | media |
| 4+ | Suavización exponencial de Holt (α=0.4, β=0.3) | alta |

**Replenishment ordering**: coverage urgency first (`urgente` <15 días · `pronto` <45 · `ok` ≥45), `margenMensual` desc as tie-breaker only — never the primary driver.

**CSV export**: `csvField()` (RFC 4180 escaping) + BOM for Excel accents. Ventas → `ventas-<YYYY-MM>.csv`; Reposición → `reposicion-<YYYY-MM>.csv`. Different documents, different columns.

## Backend (Express.js) — contrato base

Express, `http://localhost:4000`, Swagger at `/api/docs`. **Fully connected — no mocks remain, no pending phases.** `unitCost`/margins only ever travel through authenticated `/api/admin/*` routes. Business logic (forecast, replenishment, cart totals, shipping) lives server-side as pure functions over numbers; the frontend only renders derived rows. See `ROADMAP-BACKEND-INTEGRATION.md` for the historical phase-by-phase log if needed — this file is the current source of truth for how each piece works.

### Modelos mínimos

| Modelo | Campos clave | Sirve a |
|---|---|---|
| `Product` | `id, name, salePrice, unitCost, stock, type, weightKg/lengthCm/widthCm/heightCm, sizes` | catálogo, inventario, forecast, envío |
| `Sale`/`OrderItem` | `productId, unitsSold, revenue, unitCost, date` | ventas, KPIs |
| `Order` | snapshot de carrito + ShippingData + totales + envío elegido | checkout |

### Endpoints principales

```
POST /api/auth/login                     → { token, user }
GET  /api/products | /api/products/:id   → Product[] | Product          (público)
POST/PUT/DELETE /api/admin/products[/:id]
POST /api/admin/products/import/preview | /import
GET  /api/admin/dashboard
GET  /api/admin/reports/monthly | /replenishment
POST /api/orders                         → crea pedido
POST /api/shipping/rates                 → cotización Skydropx
```

## Design System

Luxury dark aesthetic — follow these for all new UI:

- **Background**: `bg-tobacco-950` (body, storefront, admin, auth — never `bg-stone-950` for a page background)
- **Surfaces** (cards/drawers/dropdowns): `bg-stone-900` / `bg-stone-900/60`
- **Text**: primary `text-amber-50`, muted `text-amber-100/50`
- **Accent**: `text-amber-400` / `border-amber-400/70`
- **Fonts**: `font-serif` (Playfair, headings) / `font-sans` (Jost, body). Labels: `uppercase tracking-[0.25em]`
- All copy in **Spanish** (Mexican market)

### Animaciones, accesibilidad e imágenes

- **framer-motion** for entries/exits (no ad-hoc CSS transitions). Shared variants in `lib/ui/motion.ts`. Respect `useReducedMotion()`.
- Global `:focus-visible` amber ring in `globals.css` — never `focus:outline-none` without a replacement.
- `prefers-reduced-motion: reduce` is neutralized globally.
- `next/image` for real product photos (register remote hosts in `next.config.ts`); raw `<img>` only for local `blob:` previews.
