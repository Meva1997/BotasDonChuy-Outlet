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
  home/           # Page-level sections (NavHeader, Hero, Footer) + CategoryCard (tile usado por Hero). Hero pide el conteo real de piezas por categoría vía getProducts({ categoria, perPage: 1 }) (lib/api/products) — solo usa el total, no la lista
  outlet/         # OutletView — product listing with category filters; OutletCard + EmptyState (single consumer: OutletView)
  product/        # ProductInfo — panel de detalle de producto (galería vía ImageCarousel + size picker + add-to-cart), consumido por la página de producto. La galería sale de product.images (Cloudinary, hasta 3), con fallback a imageSrc o placeholder
  ui/             # Primitivas realmente globales: Cart, CartProvider (drawer montado en root layout), FormControls (TextField/SelectField, compartido por checkout/ y auth/), ImageCarousel (carousel reutilizable: flechas + puntos, framer-motion + next/image, respeta reduced-motion; consumido por ProductInfo)
  checkout/       # Multi-step checkout flow (see "Checkout flow" below)
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal content pages
  auth/           # AuthShell (split-panel layout) + LoginForm — react-hook-form + zod (schemas/auth.ts) + TanStack Query (useMutation), YA conectados al backend vía lib/api/auth. AdminGuard — protege /admin y valida el token contra GET /auth/me (ver "Auth & data fetching"). ForgotPasswordForm es un wizard de 3 pasos (Fase 10): email → código de 5 dígitos → nueva contraseña → /login. Estado local (no persistido). Subcomponentes: CodeInput (primitivo OTP de 5 casillas: auto-avance, backspace, pegar; estética de FormControls), ResetCodeForm (verifyResetCode + enlace "Reenviar código" que rellama forgotPassword) y NewPasswordForm (resetPassword + redirect a /login)
  providers/      # QueryProvider — QueryClientProvider de TanStack Query (montado en root layout)
                  # BrandProvider — hidrata la marca desde GET /api/admin/brand (público) y la
                  #   expone vía useBrand(); BRAND (lib/domain/brand.ts) es el fallback SSR (montado en root layout)
  admin/          # Panel de administración — Sidebar (nav) + types.ts (AdminSection, fuente única del tipo,
                  #   ambos en la raíz por ser transversales a todo el panel) + sections/ (las 6 pestañas
                  #   que app/admin/page.tsx renderiza por AdminSection) + una carpeta de subcomponentes
                  #   por pestaña (config/, data/, orders/, products/, reportes/):
                  #   sections/MarcaSection — editor de identidad de marca (logo + copy). YA conectado vía
                  #     lib/api/brand (useQuery carga + useMutation autosave con debounce). El logo es
                  #     preview local (blob:), no se persiste — subida real = trabajo futuro
                  #   sections/ProductSection — gestión de catálogo. YA conectado al backend vía lib/api/adminProducts (useQuery lista + useMutation CRUD). Subcomponentes en components/admin/products/: ProductForm, ProductCategoryView, ProductDetailModal. ProductForm gestiona una galería de hasta 3 imágenes (preview + quitar por imagen): al guardar corre createProduct/updateProduct (JSON, sin imágenes) y luego, con el id, deleteProductImage() por cada quitada + addProductImages() con los nuevos File (Cloudinary)
                  #   sections/OrdersSection — listado de pedidos (Fase 7). YA conectado vía lib/api/adminOrders
                  #     (useQuery paginado, GET /api/admin/orders). Solo lectura: tabla (desktop) / cards
                  #     (mobile) + OrderDetailModal (diálogo con trampa de foco). Subcomponentes en
                  #     components/admin/orders/: OrdersTable, OrdersPagination (ventana + elipsis),
                  #     OrderDetailModal, StatusBadges (fuente única de color de status/paymentStatus —
                  #     campos INDEPENDIENTES). El modal muestra unitCost + margen (dato sensible, solo /admin/*)
                  #   sections/DataSection — métricas y estadísticas (KpiGrid, RevenueChart, InventoryTable, SalesTable). YA conectado vía lib/api/dashboard (GET /api/admin/dashboard). Dueño de un selector 7/30/90 días (mismo Period que RevenueChart) que indexa kpisByPeriod/profitKpisByPeriod antes de pasarlos a los dos KpiGrid (Ventas / Rentabilidad); KpiGrid sigue siendo puramente presentacional (recibe kpis: KpiData[] ya resuelto). SalesTable es stateful: pagina las ventas de 5 en 5 (reutiliza orders/OrdersPagination) y filtra por día vía un `<input type="date">` (sin día = todas; con día = solo ese, paginado). El date picker se acota al rango [minDay, maxDay] presente en los datos; un día sin ventas muestra un estado vacío con buen UX ("Ver todas las ventas"). Filtra por SaleRow.day (clave ISO UTC)
                  #   sections/ReportesSection — análisis mensual con pestañas Ventas / Reposición + selector de mes
                  #   sections/ConfigSection — usuarios del panel + cuenta propia. YA conectado (Fase 6):
                  #     tarjeta "Mi cuenta" (react-hook-form + updateAccountSchema, un solo form que
                  #     exige contraseña actual) vía lib/api/account; tarjeta "Administradores"
                  #     (lista useQuery + alta/baja useMutation, confirmación inline) vía
                  #     lib/api/adminUsers. Gestión de usuarios visible a todos los admins. Logout
                  #     desde el botón "Cerrar Sesión". ConfigSection es solo el shell; las tarjetas
                  #     viven en components/admin/config/ (AccountCard, AdminsCard, formUi = estilos/FieldError compartidos)
                  #   data/ — subcomponentes de gráficas y tablas (recharts) + types.ts (contratos de datos del admin, también consumidos por lib/api/dashboard.ts, lib/api/reports.ts y reportes/)
                  #   reportes/ — SalesReport (histórico por mes) y ReplenishmentReport (forecast + pedido sugerido). YA conectados vía lib/api/reports (GET /api/admin/reports/*)
lib/
  api/
    client.ts     # instancia axios (baseURL NEXT_PUBLIC_API_URL ?? /api) + interceptors: request adjunta Bearer del authStore, response cierra sesión y va a /login en 401. Flags de config: skipAuth (pública: sin Bearer, 401 no redirige) y skipAuthRedirect (autenticada, pero 401 con otro significado —p. ej. contraseña incorrecta— NO cierra sesión: lo maneja la UI inline)
    auth.ts       # contratos de auth (patrón getProducts): schemas Zod + login()/forgotPassword()/verifyResetCode()/resetPassword()/getMe() + authKeys. Fuente única del tipo AuthUser ({ id, name, email, role }). YA conectado al backend (POST /auth/login, POST /auth/forgot-password, POST /auth/verify-reset-code, POST /auth/reset-password, GET /auth/me). Los endpoints de recuperación son públicos y solo devuelven { ok: true }
    orders.ts     # contrato del checkout (patrón getProducts): OrderResponseSchema + CreateOrderResponseSchema ({ order, clientSecret }) (Zod, items SIN unitCost) + buildOrderPayload(items, customer) + createOrder() + orderKeys. YA conectado (POST /api/orders): envía { items, customer } sin montos; el backend recalcula totales, descuenta stock por talla y devuelve el clientSecret del PaymentIntent de Stripe (Fase 8)
    adminProducts.ts # contrato del catálogo admin (patrón getProducts): AdminProductSchema (SÍ trae unitCost + images: { url, publicId }[]) + adminProductKeys + getAdminProducts()/createProduct()/updateProduct()/deleteProduct() + addProductImages()/deleteProductImage(). YA conectado (GET/POST/PUT/DELETE /api/admin/products + POST/DELETE /api/admin/products/:id/images). AdminProductInput manda sizes como CSV donde repetir talla = unidades de stock (el backend agrupa en filas ProductSize) y YA NO incluye imageSrc (las imágenes se gestionan solo por los endpoints dedicados: addProductImages sube multipart `images` 1-3 File, tope 3 total; deleteProductImage borra por publicId)
    adminOrders.ts # contrato de pedidos admin (patrón getProducts): AdminOrderSchema/AdminOrderItemSchema (Zod, item SÍ trae unitCost) + adminOrderKeys + getAdminOrders(page, perPage). YA conectado (GET /api/admin/orders, PAGINADO en servidor → { orders, total, page, perPage, totalPages }). status y paymentStatus son campos INDEPENDIENTES. Solo lectura (no hay mutación de estado todavía)
    dashboard.ts  # contrato de métricas admin (patrón getProducts): DashboardSchema (Zod, valida la forma de components/admin/data/types.ts) + dashboardKeys + getAdminDashboard(). YA conectado (GET /api/admin/dashboard). kpisByPeriod/profitKpisByPeriod llegan igual que revenueByPeriod — las tres ventanas (7/30/90) precalculadas en un solo response, sin query params; DataSection alterna en cliente. recentSales[].day es una clave ISO UTC ("2026-07-13") junto al display date ("3 jul · 14:30"), para que SalesTable filtre por día de forma fiable
    reports.ts    # contrato de reportes admin (patrón getProducts): MonthlyReportSchema/ReplenishmentRowSchema (Zod, reflejan components/admin/data/types.ts) + reportKeys + getMonthlyReport()/getReplenishmentReport(). YA conectado (GET /api/admin/reports/monthly, GET /api/admin/reports/replenishment). Ambos endpoints devuelven un array plano ya derivado/ordenado por el backend
    brand.ts      # contrato de marca (patrón getProducts): BrandSettingsSchema (Zod) + brandKeys + getBrandSettings()/updateBrandSettings(). YA conectado (GET público /api/admin/brand, PUT protegido). BrandSettings es un SUBCONJUNTO de BRAND (brandName/heroText/tagline/cartNotice/footerNote/logoUrl); namePrimary/nameAccent/email/instagram NO existen en el backend. updateBrandSettings usa safeParse (un 2xx ya persistió)
    adminUsers.ts # contrato de usuarios del panel (patrón getProducts): AdminUserSchema (Zod, sin passwordHash, role owner|admin) + adminUserKeys + getAdminUsers()/createAdminUser()/deleteAdminUser(). YA conectado (GET/POST/DELETE /api/admin/users). createAdminUser usa acceptWrite (safeParse); el backend valida 409 correo en uso y 400 al borrar la propia cuenta / al único propietario
    account.ts    # contrato de cuenta propia: AccountUpdateResponseSchema + updateOwnAccount(). YA conectado (PUT /api/admin/account). currentPassword es obligatoria para cualquier cambio; email va sembrado con el actual (el backend solo lo cambia si difiere). El PUT va con skipAuthRedirect (el 401 = contraseña incorrecta, se muestra inline sin cerrar sesión). No devuelve el user → la UI rehidrata con authStore.setUser + invalidación de authKeys.me
    products.ts   # getProducts(filters), getProductById(id) — fetcher público del catálogo (patrón hermano de adminProducts.ts). YA conectados al backend real (GET /api/products, GET /api/products/{id}) vía axios (lib/api/client). Product/ProductsResult son tipos Zod (ProductSchema/ProductListResponseSchema) validados en runtime. Product público NO trae unitCost (dato sensible) pero SÍ trae images: { url }[] (galería Cloudinary, hasta 3, sin publicId) + imageSrc (primera imagen, compat). 404 → null. El storefront ya no usa mocks (db/ eliminado en la Fase 4).
  domain/         # datos/lógica de negocio puros (sin React, sin I/O)
    cart.ts       # computeTotals(items) — pure subtotal/savings/total helper
    brand.ts      # BRAND — defaults/fallback de identidad/copy de marca (nombre, email, hero, tagline, cartNotice…). El storefront se hidrata desde el backend vía BrandProvider/useBrand; BRAND es el fallback SSR. resolveBrand(settings) mergea BrandSettings (backend) ← BRAND: mapea tagline (string \n) → taglineLines[] y conserva namePrimary/nameAccent/email/instagram (que el backend no tiene). ResolvedBrand = forma que consume el storefront
    categories.ts # CATEGORIES + CategoryInfo/ProductType + categoryPlural()/categorySingular() — fuente única de categorías y etiquetas (antes duplicadas en ~10 archivos). DEFAULT_DIMENSIONS: defaults de empaque (peso/dimensiones) por categoría, usados por ProductForm para pre-llenar al crear (editables)
  stripe/         # pasarela de pago
    client.ts     # getStripe() — singleton loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) a nivel de módulo (una sola vez, no por render). Devuelve null si falta la llave → la UI degrada con mensaje de config. Solo lo consume components/checkout/usePlaceOrder.ts
  ui/             # helpers de presentación
    motion.ts     # variantes framer-motion compartidas (fadeUp, fadeIn, staggerContainer, EASE_LUXE)
  utils/
    index.ts      # formatPrice(amount) — es-MX locale formatting (incluye el símbolo $)
schemas/
  checkout.ts     # zod shippingSchema + ShippingData type + MEXICAN_STATES list
  auth.ts         # zod loginSchema + forgotPasswordSchema + LoginData/ForgotPasswordData types
  users.ts        # zod createUserSchema + updateAccountSchema (+ passwordComplexity reutilizable, refleja las reglas del backend) — validación de los forms de ConfigSection
store/
  cartStore.ts    # Zustand store (persist) — cart items, open/close, totals, stock-aware addItem
  authStore.ts    # Zustand store (persist, key botas-don-chuy-auth) — token + user ({ id, name, email, role }) de sesión admin, login()/setUser()/logout()/isAuthenticated(). Fuente única del token (axios client + AdminGuard). El tipo AuthUser vive en lib/api/auth.ts
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/botas`, `/sombreros`, `/ropa`, `/checkout`, `/terminos`, `/privacidad`, `/envios`, `/admin`, `/login`, `/forgot-password` (las 3 de categoría reutilizan `OutletView` con `defaultCategoria`)

**Planned routes** (not yet built): `/carrito`, `/nosotros`, `/devoluciones`

## State Management

Cart state lives in a Zustand store (`store/cartStore.ts`) with `persist` middleware (localStorage key: `botas-don-chuy-cart`). The `Cart` drawer is rendered globally via `CartProvider` (dynamic import, SSR disabled) mounted in the root layout. `NavHeader` reads `totalItems()` and calls `toggleCart()`. `ProductInfo` calls `addItem()` + `openCart()` with per-size stock validation.

Auth/session state lives in `store/authStore.ts` (Zustand + `persist`, key `botas-don-chuy-auth`) — ver "Auth & data fetching".

## Auth & data fetching

Stack de datos: **TanStack Query + Axios + Zod**. `QueryProvider` (`components/providers/QueryProvider.tsx`) monta el `QueryClientProvider` en el root layout.

- **`lib/api/client.ts`** — instancia axios única. `baseURL = process.env.NEXT_PUBLIC_API_URL ?? "/api"`. El **request interceptor** adjunta `Authorization: Bearer <token>` leyendo `useAuthStore.getState().token`; el **response interceptor** en `401` llama `logout()` y redirige a `/login` (vía `window.location`, para poder usarse fuera de componentes). Toda llamada al backend debe pasar por esta instancia.
- **`lib/api/auth.ts`** — contratos de auth centralizados (patrón `getProducts.ts`): schemas Zod (`AuthUserSchema`, `LoginResponseSchema`, `MeResponseSchema`) + `login()`, `forgotPassword()`, `getMe()` + `authKeys`. Toda respuesta se valida con Zod en runtime. `AuthUser` = `{ id, name, email, role: "owner"|"admin" }` — fuente única del tipo (el `authStore` lo reimporta).
- **Sesión** — `store/authStore.ts` guarda `{ token, user }` en localStorage. Es la fuente única que leen el interceptor y el guard. `setUser()` rehidrata el usuario tras validar el token.
- **Login** — `components/auth/LoginForm.tsx` usa `useMutation({ mutationFn: login })` (**conectado al backend real**). Mapea `401`→credenciales, `429`→rate-limit. En `onSuccess` guarda la sesión y navega a `/admin`.
- **Recuperación de contraseña (Fase 10)** — `components/auth/ForgotPasswordForm.tsx` es un wizard de 3 pasos con estado local: (1) email → `forgotPassword()` (el backend siempre responde `{ ok: true }` sin enumerar usuarios y envía un código de 5 dígitos por correo vía Resend); (2) `ResetCodeForm` captura el código en `CodeInput` (OTP de 5 casillas) y lo valida con `verifyResetCode()` (`400` → "Código inválido o expirado"; tras 5 intentos el backend quema el código) + enlace "Reenviar código"; (3) `NewPasswordForm` define la nueva contraseña con `resetPasswordSchema` (misma complejidad que `passwordComplexity`) → `resetPassword()` → redirige a `/login`. `429` en cualquier paso → mensaje de rate-limit. Los tres endpoints son públicos (usuario deslogueado, sin Bearer).
- **Protección de `/admin`** — `components/auth/AdminGuard.tsx` (en `app/admin/layout.tsx`) lee el token con un patrón hidratación-safe (`useSyncExternalStore`); sin token redirige a `/login`. Además valida el token contra `GET /api/auth/me` (`useQuery`, `staleTime` 5 min) y rehidrata `user`. Mientras la validación está en vuelo (`isPending`) muestra "Verificando sesión…". Token inválido → `401` → el interceptor cierra sesión y redirige. Un error **no-401** (500/red/parseo) **no bloquea** el acceso: se renderiza el panel igual que el guard previo solo-token, para no dejar al admin atrapado por una caída transitoria del backend. **Logout** desde el botón "Cerrar Sesión" de `ConfigSection`.

> Modelo de seguridad: token en localStorage + guard cliente es lo correcto para el approach axios/SPA en esta etapa sin backend. En producción (con backend) conviene cookie `httpOnly` + middleware de Next; el interceptor 401 ya deja listo el camino. `unitCost`/márgenes solo deben exponerse en rutas `/api/admin/*` autenticadas.

Env: `NEXT_PUBLIC_API_URL` apunta al backend (sin definir → `/api`). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = llave **publicable** de Stripe (`pk_test_…` en sandbox), de la **misma cuenta** que la `STRIPE_SECRET_KEY` del backend; es una llave pública (segura para el bundle), nunca poner una llave secreta/restringida (`sk_`/`rk_`) en un `NEXT_PUBLIC_`. Las `NEXT_PUBLIC_*` se inyectan en build → tras cambiarlas hay que reiniciar `pnpm dev`. No commitear secretos.

## Checkout flow

`/checkout` is a 3-step wizard. Step state is held in a React context (`components/checkout/CheckoutContext.tsx`, scoped via `CheckoutProvider` in the page — not persisted, so a refresh restarts at step 0):

1. **Resumen** (`OrderSummary`) — read-only cart review + **required** terms & privacy checkbox; "Continuar" is disabled until accepted.
2. **Datos de envío + pago** (`UserDetails`) — shipping form validated with `react-hook-form` + `zodResolver` against `schemas/checkout.ts`. Shipping is restricted to Mexico via the `MEXICAN_STATES` enum. **Pago con Stripe conectado (Fase 8, test/sandbox)**: el submit corre `usePlaceOrder` (`components/checkout/usePlaceOrder.ts`), un flujo de **dos fases** — (1) `createOrder()` (`lib/api/orders.ts`) postea `buildOrderPayload()` = `{ items: [{ productId, size, quantity }], customer }` **sin montos** (el backend recalcula totales, descuenta stock por talla atómicamente y devuelve `{ order, clientSecret }`); (2) `stripe.confirmCardPayment(clientSecret, { payment_method: "pm_card_visa" })` con Stripe.js (`lib/stripe/client.ts` = singleton `loadStripe`). La **tarjeta de prueba está hardcodeada** (`pm_card_visa` = `4242 4242 4242 4242`) porque todo corre en sandbox; `PaymentSection` es un panel de tarjeta de prueba de solo lectura. La orden creada se **cachea en el `CheckoutContext`** (firmada con `productId+talla+cantidad`) para no duplicarla en un reintento; al vivir en el contexto sobrevive a "Volver al resumen" (que remonta `UserDetails`), y se invalida sola si el carrito cambió. Errores mapeados: `409` (sin stock) muestra el mensaje del backend inline, `400` datos, `clientSecret` nulo / Stripe no cargado → mensaje de config, y el `error.message` de Stripe; el usuario permanece en el formulario. **Solo tras `paymentIntent.status === "succeeded"`** se llama `completeOrder(customer, order)`, que congela el snapshot (con `orderId` + los **totales autoritativos del servidor**), vacía el carrito y avanza. El estado `paid` real lo concilia el **webhook** del backend de forma asíncrona.
3. **Confirmación** (`Success`) — renders the frozen order snapshot (con "Pedido #<id>") + shipping address.

Shared, prop-driven pieces: `Stepper` (wizard indicator), `OrderItems`, `OrderTotals`, and `FormControls` (`TextField`/`SelectField` — `forwardRef` inputs that take RHF `register()` spread + an `error` string).

## Shipping — estado actual y hoja de ruta

### Estado actual: tarifa plana por categoría

`lib/domain/cart.ts` contiene toda la lógica de envío. El campo `CartTotals.shipping` fluye por todo el sistema — `OrderTotals`, `OrderSummary`, `Success`, y la snapshot en `CheckoutContext.completeOrder()`. No hay más lugares que actualizar.

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

`computeShipping(items)` en `lib/domain/cart.ts` se elimina o queda como fallback. El costo de envío pasa a venir del context (opción elegida por el cliente). `CartTotals.shipping` no cambia — solo cambia de dónde viene el valor.

**Nada más cambia.** `OrderTotals`, `OrderSummary`, `Success`, y `CheckoutContext` consumen `CartTotals.shipping` de forma genérica y no necesitan modificaciones.

## Reportes, forecast y reposición

La sección **Reportes** (`components/admin/ReportesSection.tsx`) tiene dos pestañas encadenadas: el reporte de ventas (histórico) alimenta al de reposición (forecast). **Ambas consumen el backend real** vía `lib/api/reports.ts` (Fase 4); el frontend ya no deriva nada — el backend hace todo el cálculo y devuelve las filas listas.

### Flujo de datos (todo derivado en el backend)

```
Órdenes pagadas (backend)                          ← fuente real: ventas por mes por producto
        │
        ├──► GET /api/admin/reports/monthly ──► getMonthlyReport() ──► ReportesSection ──► SalesReport
        │        (MonthlyReport[]: byProduct + byCategory, mes en curso con partial=true)   (histórico: qué se vendió)
        │
        └──► GET /api/admin/reports/replenishment ──► getReplenishmentReport() ──► ReplenishmentReport
                 (ReplenishmentRow[] ya ordenado por urgencia → margen; el backend corre       (futuro: qué comprar)
                  computeForecast sobre los meses completos por producto)
```

`ReportesSection` es dueño de la query mensual (`reportKeys.monthly()`): con ella pinta el selector de mes, el mes por defecto (último no parcial) y la nota de mes parcial, y pasa el array `reports` como prop a `SalesReport` (que lo usa para el lookup + `trendVsPrev`) y a `ReplenishmentReport` (solo para el banner de rango de historial). `ReplenishmentReport` tiene su propia query (`reportKeys.replenishment()`), que se monta lazy al abrir la pestaña.

### Forecast auto-escalado (ahora en el backend)

El pronóstico vive en `backend/src/services/forecast.ts` (`computeForecast(monthlySales: number[])`) — el frontend ya no lo calcula. Elige el algoritmo según cuántos meses de historial completo reciba:

| Meses | Nivel | Algoritmo | Confianza |
|---|---|---|---|
| 1–2 | 1 | Promedio simple | baja |
| 3 | 2 | Promedio ponderado + detector de tendencia (±15%) | media |
| 4+ | 3 | Suavización exponencial de Holt (α=0.4, β=0.3) | alta |

Devuelve `{ forecastNextMonth, method, methodLabel, trend, confidence }` — los campos que `ReplenishmentRow` refleja tal cual.

### Reposición — cobertura primero, margen como desempate

El backend (`reports.service.ts`) calcula por producto: `diasCobertura`, `suggestedOrder = max(0, forecast × 2 − stock)` (~60 días de cobertura), `costoEstimadoPedido`, `ingresoMensual`, `margenMensual` y `priority` (`urgente` <15 días · `pronto` <45 · `ok` ≥45). **Orden de la tabla**: urgencia de cobertura primero (un stock-out no se entierra), y **dentro de cada nivel, por `margenMensual` desc** — el margen es tie-breaker, no el driver de urgencia. El front solo pinta las filas ya ordenadas.

### Exportación CSV

Ambos reportes exportan CSV con un helper `csvField()` (escapado RFC 4180: envuelve en comillas y duplica las internas si hay `,`/`"`/salto de línea) y BOM `﻿` para que Excel respete acentos. Son **documentos distintos**:
- **Ventas** → `ventas-<YYYY-MM>.csv` (mes seleccionado): Pos, Producto, Tipo, Unidades, Ingresos, % del total, Utilidad, Margen %.
- **Reposición** → `reposicion-<YYYY-MM>.csv` (mes actual): Producto, Tipo, Stock, Forecast, Tendencia, Método, Días Cobertura, Ingreso Mensual, Margen Mensual, Prioridad, Sugerido Comprar, Costo Est.

## Backend (Express.js) — contrato base

El backend (Express, `http://localhost:4000`, Swagger en `/api/docs`) ya está construido. **El storefront y todo el admin ya están conectados al backend real** (Fases 1-4): `lib/api/products.ts` consume `GET /api/products` y `GET /api/products/{id}`; `lib/api/adminProducts.ts` cubre el CRUD de `/api/admin/products` (`ProductSection`/`ProductForm`/`ProductCategoryView`); `lib/api/dashboard.ts` sirve `GET /api/admin/dashboard` (`DataSection`); y `lib/api/reports.ts` sirve `GET /api/admin/reports/monthly` + `/replenishment` (`ReportesSection`/`SalesReport`/`ReplenishmentReport`). **Ya no quedan mocks en el frontend**: el directorio `db/` (mockProducts + mockData) y `lib/forecast.ts` se eliminaron al cerrar la Fase 4. El backend expone **las mismas formas de datos** que los tipos del front (`components/admin/data/types.ts`, `ProductSchema`); mientras los contratos se respeten, los componentes no cambian. Marca (Fase 5), usuarios/cuenta (Fase 6), pedidos del admin (Fase 7, `GET /api/admin/orders` → `OrdersSection`) y pagos (Fase 8, Stripe en **test/sandbox**: `usePlaceOrder` + `confirmCardPayment` con `pm_card_visa`) YA están conectados. Ya no quedan fases pendientes del roadmap de integración (Skydropx sigue diferido).

> **Principio:** la lógica de negocio (forecast, reposición, totales de carrito, envío) es de funciones puras que reciben números. Forecast y reposición ya viven en el backend (`backend/src/services/`); el frontend solo pinta las filas ya calculadas. La única matriz "fuente de verdad" es ventas-por-mes-por-producto (las órdenes pagadas).

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

- **`MonthlyReport`** se calcula agrupando ventas por mes; marcar `partial: true` el mes en curso. La reposición **excluye los meses parciales** del historial que pasa a `computeForecast` (`reports.service.ts` filtra `!r.partial`).
- **`ReplenishmentRow`** no es persistente: se computa on-the-fly desde ventas históricas + stock actual + costo (cobertura, suggestedOrder, margen, priority y el orden con margen como tie-breaker) — ya implementado en `backend/src/services/reports.service.ts`.
- **`unitCost` y márgenes son datos sensibles** del negocio: exponerlos solo en rutas `/api/admin/*` autenticadas, nunca en las públicas de catálogo.
- **Forecast en el servidor**: `backend/src/services/forecast.ts` es la fuente única del pronóstico (el frontend ya no lo calcula). El contrato `ForecastResult` = los campos `forecast*`/`trend`/`confidence` de `ReplenishmentRow`.
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

- **Animaciones**: usar **framer-motion** (no transiciones CSS ad-hoc para entradas/salidas). Variantes compartidas en `lib/ui/motion.ts` (`fadeUp`, `fadeIn`, `staggerContainer`, `EASE_LUXE`). Los drawers (`Cart`, `Sidebar`) usan `AnimatePresence` + `motion`. Respetar `useReducedMotion()` para desactivar slides.
- **Foco / teclado**: `globals.css` define un anillo `:focus-visible` ámbar global para todos los controles. No usar `focus:outline-none` sin un `focus-visible` de reemplazo.
- **Movimiento reducido**: `globals.css` neutraliza animaciones/transiciones bajo `prefers-reduced-motion: reduce`.
- **Imágenes**: `next/image` para imágenes reales de producto (URL remota — registrar el host en `images.remotePatterns` de `next.config.ts`). `<img>` crudo **solo** para previews locales `blob:` (next/image no las optimiza), con `eslint-disable @next/next/no-img-element`. Todo `<img>` de contenido lleva `alt` descriptivo; los previews de subida pueden ir `alt=""` (decorativos).
