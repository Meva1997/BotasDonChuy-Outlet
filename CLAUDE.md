# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standing rules

Before every git commit, proactively check if `README.md` and `CLAUDE.md` are up to date with the changes being committed. Update them if needed — do not wait for the user to ask.

## Commands

```bash
pnpm dev        # Start dev server (localhost:3000)
pnpm build      # Production build
pnpm lint       # ESLint
pnpm test       # Jest (--passWithNoTests; no specs yet)
```

Package manager is **pnpm** (not npm/yarn). Use `pnpm add` to install dependencies.

## Stack

- **Next.js 16** with App Router (all pages in `app/`)
- **React 19**, **TypeScript**
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in `globals.css`, not a `tailwind.config.*` file. Custom theme tokens (fonts, `tobacco-*` color scale) live in a `@theme {}` block in `globals.css`.
- **Testing** — **Jest + React Testing Library + @testing-library/user-event** (`jest.config.ts` usa `next/jest`; `jest.setup.ts` carga `@testing-library/jest-dom` **y stubea `window.matchMedia`**, que jsdom no implementa y framer-motion llama desde `useReducedMotion()`). `jest.config.ts` acota `testMatch` a `**/*.test.{ts,tsx}` en vez del default de Jest —que trata como suite **cualquier** archivo bajo un `__tests__/`— para poder tener fixtures y helpers compartidos ahí dentro. Las únicas specs hoy son las de la importación por Excel (`components/admin/import/__tests__/`), que cubren tanto los módulos **puros** como **todos** los componentes de esa pantalla. Están agrupadas por fase del flujo (`pure/`, `intake/`, `review/`, `editing/`, `presentation/`, `commit/`) + `helpers/` (fixtures del contrato y utilidades de montaje, **no** son suites); un archivo por módulo, con su mismo nombre. El mapa completo y las convenciones están en `components/admin/import/__tests__/README.md` — leerlo antes de agregar specs ahí. Sin snapshots a propósito (cambiarían con cada ajuste de Tailwind sin decir nada). Playwright se eliminó (nunca tuvo config ni specs); no reintroducir e2e sin pedirlo.
- **Sileo** — librería de toasts (physics-based). Solo se usa en `/admin` (`<Toaster />` montado en `app/admin/layout.tsx`, no en el root layout, para no cargarla en el storefront público). Hoy su único consumidor es el polling de `OrdersSection` (ver abajo). `theme="light"` + `position="top-center"` + `options={{ fill: "#000000" }}` (píldora negra; `theme="light"` es lo que hace que Sileo pinte el texto claro — su CSS interno asume pill oscura en ese theme) + `styles: { description: "text-white/75!" }` (sube la opacidad del texto de descripción sobre el default blanco/50%). Tamaño de píldora y tipografía agrandados, y acento "info" ajustado al ámbar de marca — en `globals.css` con `!important` (necesario: `sileo/styles.css` se importa después y empata en especificidad con nuestros overrides).

## Architecture

```
app/              # Next.js App Router
  layout.tsx      # Root layout: fonts, base classes, QueryProvider + CartProvider + la metadata
                  #   global de SEO (metadataBase, title.template, OG/Twitter, robots) — ver "SEO"
  page.tsx        # Home page — composes NavHeader + Hero + Footer (+ JSON-LD de ClothingStore)
  sitemap.ts      # /sitemap.xml — rutas estáticas + un <url> por producto (recorre el catálogo
                  #   paginado). `revalidate = 3600`. Si el backend no responde, loguea y emite
                  #   solo las estáticas (no revienta el deploy)
  robots.ts       # /robots.txt — disallow de /admin, /login, /forgot-password, /checkout, /api/
  opengraph-image.tsx # Imagen de compartir 1200x630 generada con next/og en build. Al vivir en la
                  #   raíz la heredan todas las rutas que no definan la suya. Playfair se baja de
                  #   Google Fonts con fallback a serif del sistema (una fuente fea > un build roto)
  global-error.tsx # Boundary de último recurso: el ÚNICO que atrapa errores del layout raíz (el
                  #   hueco que error.tsx no cubre). Trae su propio <html>/<body> porque el layout
                  #   que heredaría es justo el que falló → aquí NO existen QueryProvider/
                  #   BrandProvider/CartProvider. Por eso NO reusa NavHeader/Footer: pintaría un
                  #   botón de carrito cuyo drawer no está montado. Todo sale de BRAND (estático).
                  #   Solo se ve en producción (en dev gana el overlay de Next)
  not-found.tsx   # 404 a la medida (root, cubre toda la app) — importa NavHeader/Footer directo
                  #   (no los hereda del layout raíz, igual que page.tsx), reusa el patrón de
                  #   stamp de EmptyState + links a categorías vía CATEGORIES
  error.tsx       # Frontera de error raíz (client component) — cubre cualquier throw de un RSC
                  #   (p. ej. backend caído → ECONNREFUSED en getProductById) y reemplaza el
                  #   overlay crudo de Next con la estética del sitio. "Reintentar" NO usa el prop
                  #   de retry de Next: lo recompone con API estable — startTransition(() => {
                  #   router.refresh(); reset(); }) — porque el nombre del prop es inestable
                  #   (`unstable_retry` en 16.2, `retry` en canary). Es equivalente exacto al
                  #   built-in (error-boundary.js hace lo mismo sobre AppRouterContext, el mismo
                  #   contexto que lee useRouter). `reset()` solo NO basta: limpia el estado sin
                  #   re-fetchear → no recupera errores de Server Component; el refresh() previo
                  #   es lo que pide datos nuevos. Muestra `error.digest` como referencia de log.
                  #   No cubre errores del layout raíz: de eso se encarga global-error.tsx (arriba).
  admin/
    layout.tsx    # Admin layout: AdminGuard (route protection) + full-height tobacco-950 shell +
                  #   `robots: noindex` para TODO /admin/* (va en el layout, no por página, para que
                  #   cualquier sección futura lo herede sin acordarse)
    page.tsx      # Admin dashboard — Sidebar + section routing (AdminSection type)
  (public)/
    outlet/
      [slug]/
        producto/ # Product detail page (async RSC → ProductInfo client component).
                  #   generateMetadata: título/description/canonical + OG con la FOTO REAL del
                  #   producto, y JSON-LD de Product + BreadcrumbList. Comparte el producto con la
                  #   página vía React `cache()` (si no, serían 2 GET idénticos: axios no deduplica
                  #   como fetch()). SIN loading.tsx a propósito (soft 404) — ver "Estados de carga"
    terminos/     # Terms & Conditions page → TermsConditions component
    privacidad/   # Privacy Policy page → PrivacyPolicy component
    envios/       # Shipping Policy page → ShippingInfo component
    nosotros/     # About Us page → AboutUs component (components/nosotros/)
  login/          # Login page → AuthShell + LoginForm
  forgot-password/ # Forgot password page → AuthShell + ForgotPasswordForm
components/
  home/           # Page-level sections (NavHeader, Hero, Footer) + CategoryCard (tile usado por Hero). Hero pide el conteo real de piezas por categoría vía getProducts({ categoria, perPage: 1 }) (lib/api/products) — solo usa el total, no la lista
  outlet/         # OutletView — product listing with category filters; OutletCard + EmptyState (single consumer: OutletView).
                  #   OutletSkeleton — fallback del <Suspense> de las 4 rutas de listado (ver "Estados de carga")
  seo/            # JsonLd — pinta un bloque schema.org como <script type="application/ld+json">.
                  #   Escapa `<` (un `</script>` en una cadena cerraría la etiqueta antes de tiempo)
  product/        # ProductInfo — panel de detalle de producto (galería vía ImageCarousel + size picker + add-to-cart), consumido por la página de producto. La galería sale de product.images (Cloudinary, hasta 3), con fallback a imageSrc o placeholder
  ui/             # Primitivas realmente globales: Cart, CartProvider (drawer montado en root layout), FormControls (TextField/SelectField, compartido por checkout/ y auth/), ImageCarousel (carousel reutilizable: flechas + puntos, framer-motion + next/image, respeta reduced-motion; consumido por ProductInfo)
  checkout/       # Checkout flow de 4 pasos (see "Checkout flow" below). ShippingOptions —
                  #   paso 3, cotización de envío en vivo vía lib/api/shipping.ts
  legal/          # TermsConditions, PrivacyPolicy, ShippingInfo — static legal content pages
  nosotros/       # AboutUs — página estática "Sobre nosotros" (historia, marcas, qué es el outlet). Enlazada desde el footer ("Sobre nosotros")
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
                  #   sections/ProductSection — gestión de catálogo. YA conectado al backend vía lib/api/adminProducts (useQuery lista + useMutation CRUD). Subcomponentes en components/admin/products/: ProductForm, ProductCategoryView, ProductDetailModal, notices.ts. ProductForm gestiona una galería de hasta 3 imágenes (preview + quitar por imagen): al guardar corre createProduct/updateProduct (JSON, sin imágenes) y luego, con el id, deleteProductImage() por cada quitada + addProductImages() con los nuevos File (Cloudinary). Confirmaciones: ProductForm no navega en silencio — su prop `onBack(notice?)` devuelve a ProductCategoryView el aviso de lo que pasó (guardar/eliminar), que la lista pinta en su banner `role="status"`; salir sin aviso (cancelar) lo limpia. La copy vive en notices.ts (deleteNotice/saveNotice) porque el borrado se dispara desde dos lugares (la tabla y el form) y ambos deben decir lo mismo
                  #   sections/ImportSection — importación/restock masivo por Excel (Fase 13).
                  #     YA conectado vía lib/api/adminProductImport (dos useMutation: preview + commit).
                  #     Es una SECCIÓN propia del Sidebar ("Importar") porque la tabla de revisión
                  #     necesita todo el ancho; ProductSection tiene además un botón "Importar Excel"
                  #     que navega a ?seccion=importar. Ver "Importación por Excel" abajo — tiene
                  #     invariantes que no se pueden romper sin duplicar stock del catálogo real
                  #   sections/OrdersSection — listado de pedidos (Fase 7). YA conectado vía lib/api/adminOrders
                  #     (useQuery paginado, GET /api/admin/orders). Lectura + una acción (Fase 12,
                  #     cancelación/reembolso — ver OrderDetailModal abajo): tabla (desktop) / cards
                  #     (mobile) + OrderDetailModal (diálogo con trampa de foco). Dueño de un filtro de
                  #     fecha (`<input type="date">`, mismo patrón que SalesTable) — a diferencia de
                  #     SalesTable (filtra en cliente sobre datos ya cargados), aquí el filtro viaja al
                  #     backend (`date` en getAdminOrders/adminGetOrders) porque los pedidos están
                  #     paginados en servidor: filtrar solo la página cargada daría resultados
                  #     incompletos. También decide el tamaño de página según viewport
                  #     (`useSyncExternalStore` sobre `matchMedia("(min-width: 1280px)")`, mismo corte
                  #     que OrdersTable): 20 en desktop, 5 en mobile (menos scroll en las cards).
                  #     Subcomponentes en components/admin/orders/: OrdersTable, OrdersPagination (ventana + elipsis),
                  #     OrderDetailModal, StatusBadges (fuente única de color de status/paymentStatus —
                  #     campos INDEPENDIENTES — más DropoffBadge y ShipmentStatusBadge). El modal muestra
                  #     unitCost + margen (dato sensible, solo /admin/*). `shippingRequiresDropoff` (bandera
                  #     operativa de Skydropx, ver "Shipping" — el dueño debe llevar el paquete a la
                  #     sucursal, esa paquetería no recoge a domicilio) se pinta como DropoffBadge en la
                  #     tabla (columna "Envío", desktop y mobile) y como aviso ⚠️ en el modal junto a
                  #     "Paquetería": es dato admin-only (excluido de la respuesta pública del checkout) y
                  #     de perderse de vista significa que el pedido nunca sale de la tienda. Guía/rastreo
                  #     Skydropx (Fase 11, poblados por el webhook `POST /api/webhooks/skydropx`, nacen
                  #     `null`): la misma columna "Envío" enlaza "Descargar guía" cuando `labelUrl` existe
                  #     (si no, "Guía en proceso" — solo para pedidos ya pagados, vía `canHaveLabel`); el
                  #     modal agrega los campos "Guía" / "Rastreo" (enlazado a `trackingUrl`) / "Estado del
                  #     envío" junto a "Paquetería". `shipmentStatus` es el string crudo del carrier (no un
                  #     enum cerrado) — `ShipmentStatusBadge`/`SHIPMENT_STATUS_META` lo traduce con
                  #     fallback legible para valores no mapeados. `order.status` (`shipped`/`delivered`)
                  #     ya lo pinta `OrderStatusBadge` sin cambios: el backend lo avanza vía el mismo webhook.
                  #     Polling cada 30 min (`refetchInterval`, TanStack Query) para enterarse de cambios del
                  #     webhook sin recargar la pestaña, más un botón de refresh manual (ícono `RefreshCw` de
                  #     lucide-react, gira mientras `isFetching`) para no depender del intervalo. Un
                  #     `useEffect` guarda por vista (página+perPage+día) una firma `status|paymentStatus|
                  #     shipmentStatus|labelUrl|trackingNumber` por pedido; si el refetch automático (no el
                  #     manual, ni la primera carga de una vista nueva) trae una firma distinta para algún
                  #     pedido ya visto, dispara un toast de Sileo (`sileo.info`, ver "Stack") — así no avisa
                  #     al cambiar de página/filtro ni al usar el botón manual, solo cuando el polling
                  #     realmente trajo algo nuevo. Cancelación/reembolso manual (Fase 12): OrderDetailModal
                  #     tiene un botón "Cancelar / reembolsar pedido" (visible solo si status es pending/paid
                  #     — el backend rechaza shipped/delivered/cancelled con 409) que abre una confirmación
                  #     inline (irreversible) con un textarea opcional de motivo (reason, máx. 200) y llama
                  #     cancelAdminOrder() (lib/api/adminOrders.ts, POST /:id/cancel) vía useMutation. Al
                  #     éxito invalida adminOrderKeys.all + adminProductKeys.all + productKeys.all (el
                  #     restock cambia el stock del catálogo admin y del outlet público) y notifica a
                  #     OrdersSection vía la prop onCancelled para que sincronice su `viewing` (el modal no
                  #     se cierra solo — sigue mostrando el pedido ya cancelado/reembolsado) marcando el
                  #     refresh como manual (isManualRefreshRef) para no disparar el toast de polling de
                  #     arriba. refundId/refundedAt (nuevos en el contrato) se muestran en el modal cuando
                  #     existen. 409 (estado no cancelable) y 502 (falló el reembolso en Stripe) se
                  #     muestran inline con el message del backend; StatusBadges ya pinta
                  #     paymentStatus: "refunded" ("Reembolsado", acento violeta)
                  #   sections/DataSection — métricas y estadísticas (KpiGrid, RevenueChart, InventoryTable, SalesTable). YA conectado vía lib/api/dashboard (GET /api/admin/dashboard). Dueño de un selector 7/30/90 días (mismo Period que RevenueChart) que indexa kpisByPeriod/profitKpisByPeriod antes de pasarlos a los dos KpiGrid (Ventas / Rentabilidad); KpiGrid sigue siendo puramente presentacional (recibe kpis: KpiData[] ya resuelto). SalesTable es stateful: pagina las ventas de 5 en 5 (reutiliza orders/OrdersPagination) y filtra por día vía un `<input type="date">` (sin día = todas; con día = solo ese, paginado). El date picker se acota al rango [minDay, maxDay] presente en los datos; un día sin ventas muestra un estado vacío con buen UX ("Ver todas las ventas"). Filtra por SaleRow.day (clave ISO UTC)
                  #   sections/ReportesSection — análisis mensual con pestañas Ventas / Reposición + selector de mes
                  #   sections/ConfigSection — usuarios del panel + cuenta propia. YA conectado (Fase 6):
                  #     tarjeta "Mi cuenta" (react-hook-form + updateAccountSchema, un solo form que
                  #     exige contraseña actual) vía lib/api/account; tarjeta "Administradores"
                  #     (lista useQuery + alta/baja useMutation, confirmación inline) vía
                  #     lib/api/adminUsers. Gestión de usuarios visible a todos los admins. Logout
                  #     desde el botón "Cerrar Sesión". ConfigSection es solo el shell; las tarjetas
                  #     viven en components/admin/config/ (AccountCard, AdminsCard, formUi = estilos/FieldError compartidos)
                  #   import/ — subcomponentes de ImportSection. Módulos PUROS (sin React, testeados):
                  #     types.ts (Cell/RowEdit/ImportState + EDITABLE_FIELDS con el `satisfies` que
                  #     protege del .strict() del backend), rowInput.ts (ingest/serialize/coerce/
                  #     validate + parseSizesSpec espejo del backend), importReducer.ts (reducer +
                  #     selectores), dependencies.ts (dependencias entre filas), labels.ts (copy es-MX).
                  #     Componentes: ImportDropzone, ImportFormatHelp, ImportWarnings, ImportToolbar,
                  #     ImportRowList, ImportRow, ImportRowDetail, ImportDiff, ImportSizeDiff,
                  #     ImportRowEditor, EditableCell, ImportActionBadge, ImportConfirmBar, ImportResults.
                  #     __tests__/ — TODO lo de esta carpeta (puros y componentes) tiene specs, agrupadas
                  #     por fase del flujo; ver su README.md y el bullet "Testing" del Stack
                  #   data/ — subcomponentes de gráficas y tablas (recharts) + types.ts (contratos de datos del admin, también consumidos por lib/api/dashboard.ts, lib/api/reports.ts y reportes/)
                  #   reportes/ — SalesReport (histórico por mes) y ReplenishmentReport (forecast + pedido sugerido). YA conectados vía lib/api/reports (GET /api/admin/reports/*)
lib/
  api/
    client.ts     # instancia axios (baseURL NEXT_PUBLIC_API_URL ?? /api) + interceptors: request adjunta Bearer del authStore, response cierra sesión y va a /login en 401. Flags de config: skipAuth (pública: sin Bearer, 401 no redirige) y skipAuthRedirect (autenticada, pero 401 con otro significado —p. ej. contraseña incorrecta— NO cierra sesión: lo maneja la UI inline)
    auth.ts       # contratos de auth (patrón getProducts): schemas Zod + login()/forgotPassword()/verifyResetCode()/resetPassword()/getMe() + authKeys. Fuente única del tipo AuthUser ({ id, name, email, role }). YA conectado al backend (POST /auth/login, POST /auth/forgot-password, POST /auth/verify-reset-code, POST /auth/reset-password, GET /auth/me). Los endpoints de recuperación son públicos y solo devuelven { ok: true }
    orders.ts     # contrato del checkout (patrón getProducts): OrderResponseSchema + CreateOrderResponseSchema ({ order, clientSecret }) (Zod, items SIN unitCost) + buildOrderPayload(items, customer, selectedRate?) + createOrder() + orderKeys. YA conectado (POST /api/orders): envía { items, customer, quotationId?, rateId? } sin montos; el backend recalcula totales (re-consultando Skydropx por esa cotización si vino) y devuelve el clientSecret del PaymentIntent de Stripe (Fase 8). quotationId/rateId van juntos o ninguno (both-or-neither, igual que createOrderSchema en el backend) — vienen de la tarifa elegida en ShippingOptions (lib/api/shipping.ts, Fase 8.4)
    shipping.ts   # contrato de cotización de envío en vivo (patrón getProducts): ShippingRateSchema/ShippingRatesResponseSchema (Zod) + SelectedShippingRate (= ShippingRate + quotationId, la forma que viaja por CheckoutContext/usePlaceOrder) + shippingKeys + getShippingRates(items, customer). YA conectado (POST /api/shipping/rates, pública). SIEMPRE responde 200 (el backend cae a su propia tarifa plana si Skydropx falla); usa `.parse` simple (no hay OrderResponseParseError aquí — es de solo lectura, un parse fallido es reintentable sin riesgo de duplicar nada)
    adminProducts.ts # contrato del catálogo admin (patrón getProducts): AdminProductSchema (SÍ trae unitCost + images: { url, publicId }[]) + adminProductKeys + getAdminProducts()/createProduct()/updateProduct()/deleteProduct() + addProductImages()/deleteProductImage(). YA conectado (GET/POST/PUT/DELETE /api/admin/products + POST/DELETE /api/admin/products/:id/images). AdminProductInput manda sizes como CSV donde repetir talla = unidades de stock (el backend agrupa en filas ProductSize) y YA NO incluye imageSrc (las imágenes se gestionan solo por los endpoints dedicados: addProductImages sube multipart `images` 1-3 File, tope 3 total; deleteProductImage borra por publicId)
    adminProductImport.ts # contrato de la importación masiva por Excel (Fase 13): schemas Zod
                  #   (ImportRowPlan/ProductSnapshot/FieldChange/SizeChange/ImportRowInput) +
                  #   previewProductImport(file) (multipart, campo `file`) y commitProductImport(rows)
                  #   (JSON) + importPreviewErrorMessage/importCommitErrorMessage. Preview con
                  #   `.parse()` estricto (es de solo lectura, un parse fallido es reintentable);
                  #   commit con safeParse + console.warn + dato crudo (razonamiento de acceptWrite,
                  #   pero más fuerte: reintentar un commit DUPLICA stock). ImportRowInputSchema usa
                  #   z.looseObject para que una clave extra sobreviva al parse y se pueda avisar
    adminOrders.ts # contrato de pedidos admin (patrón getProducts): AdminOrderSchema/AdminOrderItemSchema (Zod, item SÍ trae unitCost) + adminOrderKeys + getAdminOrders(page, perPage, date?). YA conectado (GET /api/admin/orders?page=&perPage=&date=, PAGINADO en servidor → { orders, total, page, perPage, totalPages }). `date` (YYYY-MM-DD, opcional) acota a los pedidos creados ese día UTC — filtro real de servidor, no de cliente (ver OrdersSection). status y paymentStatus son campos INDEPENDIENTES; paymentStatus incluye "refunded" (Fase 12). AdminOrderSchema también trae los campos de guía/rastreo Skydropx (Fase 11): skydropxShipmentId/trackingNumber/trackingUrl/labelUrl/shipmentStatus, todos nullable — el backend ya los manda en la misma respuesta, pero Zod los descartaba por no estar declarados. Fase 12 agrega refundId/refundedAt (nullable) + cancelAdminOrder(id, reason?) (POST /:id/cancel, valida `{ order }` con AdminOrderSchema) — cancela un pedido pending (libera stock) o paid (reembolso total en Stripe + restock); el backend rechaza shipped/delivered/cancelled con 409
    dashboard.ts  # contrato de métricas admin (patrón getProducts): DashboardSchema (Zod, valida la forma de components/admin/data/types.ts) + dashboardKeys + getAdminDashboard(). YA conectado (GET /api/admin/dashboard). kpisByPeriod/profitKpisByPeriod llegan igual que revenueByPeriod — las tres ventanas (7/30/90) precalculadas en un solo response, sin query params; DataSection alterna en cliente. recentSales[].day es una clave ISO UTC ("2026-07-13") junto al display date ("3 jul · 14:30"), para que SalesTable filtre por día de forma fiable
    reports.ts    # contrato de reportes admin (patrón getProducts): MonthlyReportSchema/ReplenishmentRowSchema (Zod, reflejan components/admin/data/types.ts) + reportKeys + getMonthlyReport()/getReplenishmentReport(). YA conectado (GET /api/admin/reports/monthly, GET /api/admin/reports/replenishment). Ambos endpoints devuelven un array plano ya derivado/ordenado por el backend
    brand.ts      # contrato de marca (patrón getProducts): BrandSettingsSchema (Zod) + brandKeys + getBrandSettings()/updateBrandSettings(). YA conectado (GET público /api/admin/brand, PUT protegido). BrandSettings es un SUBCONJUNTO de BRAND (brandName/heroText/tagline/cartNotice/footerNote/logoUrl); namePrimary/nameAccent/email/instagram NO existen en el backend. updateBrandSettings usa safeParse (un 2xx ya persistió)
    adminUsers.ts # contrato de usuarios del panel (patrón getProducts): AdminUserSchema (Zod, sin passwordHash, role owner|admin) + adminUserKeys + getAdminUsers()/createAdminUser()/deleteAdminUser(). YA conectado (GET/POST/DELETE /api/admin/users). createAdminUser usa acceptWrite (safeParse); el backend valida 409 correo en uso y 400 al borrar la propia cuenta / al único propietario
    account.ts    # contrato de cuenta propia: AccountUpdateResponseSchema + updateOwnAccount(). YA conectado (PUT /api/admin/account). currentPassword es obligatoria para cualquier cambio; email va sembrado con el actual (el backend solo lo cambia si difiere). El PUT va con skipAuthRedirect (el 401 = contraseña incorrecta, se muestra inline sin cerrar sesión). No devuelve el user → la UI rehidrata con authStore.setUser + invalidación de authKeys.me
    products.ts   # getProducts(filters), getProductById(id) — fetcher público del catálogo (patrón hermano de adminProducts.ts). YA conectados al backend real (GET /api/products, GET /api/products/{id}) vía axios (lib/api/client). Product/ProductsResult son tipos Zod (ProductSchema/ProductListResponseSchema) validados en runtime. Product público NO trae unitCost (dato sensible) pero SÍ trae images: { url }[] (galería Cloudinary, hasta 3, sin publicId) + imageSrc (primera imagen, compat). 404 → null. El storefront ya no usa mocks (db/ eliminado en la Fase 4).
  domain/         # datos/lógica de negocio puros (sin React, sin I/O)
    cart.ts       # computeTotals(items) — pure subtotal/savings/total helper (tarifa plana, usada
                  #   como estimado pre-dirección en OrderSummary y como fallback si Skydropx cae).
                  #   mapCartItemsToOrderItems(items) y cartLineSignature(items) — compartidos por
                  #   lib/api/orders.ts y lib/api/shipping.ts para no duplicar el mapeo carrito→renglón
                  #   ni las firmas de caché (pendingOrder/selectedRate) que usa CheckoutContext
    brand.ts      # BRAND — defaults/fallback de identidad/copy de marca (nombre, email, hero, tagline, cartNotice…). El storefront se hidrata desde el backend vía BrandProvider/useBrand; BRAND es el fallback SSR. resolveBrand(settings) mergea BrandSettings (backend) ← BRAND: mapea tagline (string \n) → taglineLines[] y conserva namePrimary/nameAccent/email/instagram (que el backend no tiene). ResolvedBrand = forma que consume el storefront
    categories.ts # CATEGORIES + CategoryInfo/ProductType + categoryPlural()/categorySingular() — fuente única de categorías y etiquetas (antes duplicadas en ~10 archivos). DEFAULT_DIMENSIONS: defaults de empaque (peso/dimensiones) por categoría, usados por ProductForm para pre-llenar al crear (editables)
  seo/            # metadata y datos estructurados (sin React)
    site.ts       # SITE_URL (NEXT_PUBLIC_SITE_URL ?? localhost:3000, sin barra final) +
                  #   absoluteUrl(path) + SITE_KEYWORDS. Fuente única de la URL pública: la
                  #   consumen metadataBase, los canonicals, sitemap.ts y robots.ts
    metadata.ts   # pageMetadata({ title, description, path, ogDescription }) — constructor de
                  #   la metadata de una página pública (canonical + bloque OG/Twitter completo).
                  #   Úsalo SIEMPRE en páginas nuevas: existe porque `alternates` se hereda y
                  #   `openGraph` se reemplaza entero — ver "SEO"
    jsonLd.ts     # builders de schema.org: storeJsonLd() (ClothingStore, home), productJsonLd()
                  #   (Product + offers en salePrice, stock → InStock/SoldOut — el outlet no repone)
                  #   y breadcrumbJsonLd(). Regla: solo describir lo que la página realmente muestra
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
  importStore.ts  # Zustand store (SIN persist) — estado de la importación por Excel sobre el
                  #   reducer puro de components/admin/import. Fuera del árbol de componentes
                  #   porque app/admin/page.tsx desmonta la sección al cambiar de pestaña del
                  #   Sidebar y una revisión a medias se perdería. Sin persist a propósito (ver
                  #   "Importación por Excel"). usePendingImportCount() alimenta el badge del Sidebar
  authStore.ts    # Zustand store (persist, key botas-don-chuy-auth) — token + user ({ id, name, email, role }) de sesión admin, login()/setUser()/logout()/isAuthenticated(). Fuente única del token (axios client + AdminGuard). El tipo AuthUser vive en lib/api/auth.ts
```

**Implemented routes**: `/`, `/outlet`, `/outlet/[id]/producto`, `/botas`, `/sombreros`, `/ropa`, `/checkout`, `/terminos`, `/privacidad`, `/envios`, `/nosotros`, `/admin`, `/login`, `/forgot-password` (las 3 de categoría reutilizan `OutletView` con `defaultCategoria`)

**Planned routes** (not yet built): `/carrito`, `/devoluciones`

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

Env: `NEXT_PUBLIC_API_URL` apunta al backend (sin definir → `/api`). `NEXT_PUBLIC_SITE_URL` = origen público del sitio, base de canonicals/sitemap/OG (sin definir → `http://localhost:3000`; ver "SEO"). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = llave **publicable** de Stripe (`pk_test_…` en sandbox), de la **misma cuenta** que la `STRIPE_SECRET_KEY` del backend; es una llave pública (segura para el bundle), nunca poner una llave secreta/restringida (`sk_`/`rk_`) en un `NEXT_PUBLIC_`. Las `NEXT_PUBLIC_*` se inyectan en build → tras cambiarlas hay que reiniciar `pnpm dev`. No commitear secretos.

## SEO

La metadata global vive en el root layout (`app/layout.tsx`): `metadataBase`, `title.template` (`%s | Botas Don Chuy Outlet`), description, keywords, OG/Twitter, `formatDetection` (Safari convierte precios/CPs en enlaces de teléfono si no se apaga) y `robots` con `max-image-preview: large` (lo que permite que la foto salga grande en el resultado de búsqueda). Cada página solo define lo suyo.

**Toda página pública nueva arma su metadata con `pageMetadata()` (`lib/seo/metadata.ts`)** — no a mano. El helper existe por dos trampas de la herencia de metadata de Next, las dos verificadas contra el HTML del build (no en teoría):

1. **`alternates` se HEREDA** si la página no lo define. Por eso el root layout **no** declara `canonical` (el del home vive en `app/page.tsx`): con un `canonical: "/"` arriba, toda página que se olvidara del suyo se declaraba duplicada del home — le pasó a `/terminos`, `/privacidad`, `/envios` y `/nosotros`, que además están en el sitemap.
2. **`openGraph` se REEMPLAZA entero** al declararlo, no se mezcla. Una página que solo quería su título perdía `siteName`, `locale`, `type` y la imagen de `opengraph-image.tsx` (enlace pelón en WhatsApp). Por eso el helper siempre emite el bloque completo, imagen y medidas incluidas.

Las únicas dos páginas públicas que no pasan por el helper lo hacen por una razón: el **home** solo declara `alternates` (su título/OG ya son los defaults del layout y tocarlos reemplazaría el bloque heredado), y **producto** arma el suyo en `generateMetadata` porque su imagen es la foto real de la pieza.

- **`lib/seo/site.ts` es la fuente única de la URL pública.** `NEXT_PUBLIC_SITE_URL` se inyecta en build; sin definir cae a `http://localhost:3000`. **Hay que definirla en Vercel (Production)** con el origen real y sin barra final, o los canonicals y el `sitemap.xml` publicados apuntarán a localhost.
- **Canonicals de listado sin query**: `/outlet?categoria=bota&pagina=2` canonicaliza a `/outlet`. Sin esto, cada combinación de filtros se indexa como duplicado y se reparte la autoridad entre todas.
- **Rutas privadas**: `/admin/*`, `/login`, `/forgot-password` y `/checkout` llevan `robots: noindex` **y** están en el disallow de `robots.txt`. No es redundante: robots.txt impide el *crawl*, el meta impide el *índice* — una URL bloqueada en robots.txt pero enlazada desde fuera puede indexarse igual. `unitCost`/márgenes nunca deben acabar en un índice.
- **Datos estructurados** (`lib/seo/jsonLd.ts` + `components/seo/JsonLd.tsx`): `ClothingStore` en el home, `Product` + `BreadcrumbList` en producto. Regla dura: **solo describir lo que la página realmente muestra** — marcar datos que el usuario no ve viola las políticas de Google y puede costar los rich results de todo el dominio. `image` se **omite** si el producto no tiene fotos (`image: []` no es "sin imagen": es propiedad inválida y arrastra al bloque entero). `brand` también se omite: en schema.org es el **fabricante** (Cuadra…), no la tienda —esa va en `offers.seller`—, y el `Product` del backend no guarda la marca; es recomendada, no obligatoria.
- **Imagen OG**: `app/opengraph-image.tsx` (generada). Solo la heredan las rutas que **no** declaran `openGraph` (hoy: el home). Las demás la referencian explícitamente vía `pageMetadata()`; producto la usa como fallback cuando la pieza no tiene foto — si no, se quedaría sin ninguna `og:image` (enlace pelón en WhatsApp), que hoy es el caso más común del catálogo.
- Al tocar el catálogo, recordar que `sitemap.ts` tiene `MAX_PAGES` como tope de seguridad del recorrido paginado.

## Estados de carga (loading.tsx vs Suspense)

Las rutas de catálogo suspenden por motivos distintos, y por eso el skeleton va en lugares distintos — o no va. **No unificar sin leer esto**, las dos decisiones tienen una razón medida detrás:

- **Listados** (`/outlet`, `/botas`, `/sombreros`, `/ropa`) **NO son RSC async**: `OutletView` es un client component que hace su propio fetch con TanStack Query. Lo que suspende en el prerender es su `useSearchParams`, y ese bailout lo atrapa **el boundary más cercano**, que es el `<Suspense>` que la página ya tenía dentro. Por eso el skeleton va como `fallback={<OutletSkeleton />}` de ese Suspense: **un `loading.tsx` en esas rutas nunca se alcanzaría**. Ya hidratado, manda el spinner propio de OutletView. `OutletSkeleton` replica la rejilla real (mismas columnas, mismo `aspect-square`) para que al llegar los productos no salte el layout.

- **Producto** (`/outlet/[slug]/producto`) **sí es un RSC async** y aun así **NO lleva loading.tsx, a propósito**. Cualquier boundary que streamee obliga a Next a mandar el shell antes de saber si el producto existe → el status queda en 200 y el `notFound()` posterior pinta el 404 con status 200 (**soft 404**). Medido: con `loading.tsx`, `/outlet/999999/producto` → 200; sin él → 404. En un outlet las piezas se agotan y se retiran, y sus URLs (indexadas y en el sitemap) se crawlean seguido, así que se priorizó el status correcto sobre el skeleton — el costo aceptado es que al hacer clic en una tarjeta no hay feedback hasta que responde el backend. `generateStaticParams` + `dynamicParams: false` daría ambas, pero cualquier producto creado tras el build daría 404 hasta el siguiente deploy: peor. El razonamiento está también en un comentario al inicio de `page.tsx`.

`loadProduct` valida el slug (`Number.isInteger(id) && id > 0`) antes de llamar al backend: `/outlet/abc/producto` daba `Number("abc")` → `NaN` → `GET /products/NaN` → **400**, que `getProductById` no atrapa (solo mapea 404 → null) → la ruta reventaba con un 500 en vez del 404 limpio. Los crawlers y los enlaces viejos pegan a URLs basura de forma rutinaria.

## Checkout flow

`/checkout` is a 4-step wizard. Step state is held in a React context (`components/checkout/CheckoutContext.tsx`, scoped via `CheckoutProvider` in the page — not persisted, so a refresh restarts at step 0).

`CheckoutFlow` renderiza los pasos condicionalmente (`{step === 1 && <UserDetails />}`), así que **navegar desmonta el paso**. Todo lo que deba sobrevivir a ir y volver vive en el contexto, no en los componentes de paso: `acceptedTerms` (state, controla el checkbox del resumen), el **borrador de envío** (`shippingDraftRef` + `getShippingDraft`/`setShippingDraft`, sin validar — resiembra el form de `UserDetails`), la **dirección confirmada** (`confirmedCustomer`, state — validada al enviar el paso 1, es lo que `ShippingOptions` cotiza), la **tarifa de envío elegida** (`selectedRateEntry`/`getSelectedRate`/`setSelectedRate`, cacheada por firma carrito+cliente igual que la orden pendiente) y la orden pendiente de Stripe (`pendingOrderRef`). `shippingDraftRef`/`pendingOrderRef` son **refs**, no state: solo se leen al montar / al hacer submit, así que re-renderizar con ellos sería ruido; `confirmedCustomer`/`selectedRateEntry` sí son state porque otro componente (paso 3) debe re-renderizar en cuanto existen o cambian. `UserDetails` siembra `useForm({ defaultValues: getShippingDraft() ?? undefined })` y guarda `getValues()` en el cleanup de un `useEffect` (es decir, al desmontarse) — sin validar, el borrador puede ir a medias. `completeOrder` lo limpia junto con el carrito. El `Stepper` recibe `maxVisited={maxVisitedStep}` y deja saltar a **cualquier paso ya visitado** (atrás o adelante), nunca a uno sin visitar ni una vez confirmado el pedido; `maxVisitedStep` lo sube el helper `visit()` del contexto. Pinta **tres niveles** por paso, no dos: `isDone` (`index < current`, palomita ámbar), `isVisited` (`index > current && index <= maxVisited` — se estuvo ahí y se retrocedió: número en ámbar tenue, ni completado ni intacto) y pendiente (apagado). Sin el nivel intermedio, retroceder hacía que el paso ya lleno se viera idéntico a uno nunca tocado.

1. **Resumen** (`OrderSummary`) — read-only cart review + **required** terms & privacy checkbox; "Continuar" is disabled until accepted. Muestra `computeTotals(items)` como estimado de envío (tarifa plana) porque todavía no hay dirección — nunca se cobra este número.
2. **Dirección** (`UserDetails`) — solo captura y valida la dirección con `react-hook-form` + `zodResolver` contra `schemas/checkout.ts` (restringida a México vía `MEXICAN_STATES`). Al enviarse, `confirmShipping(data)` (`CheckoutContext`) guarda la dirección validada, **invalida sin condición** cualquier tarifa elegida antes (una dirección nueva puede cotizar distinto) y avanza al paso 3. No crea orden ni toca Stripe; el sidebar solo muestra el subtotal outlet, con nota de que el envío se calcula en el siguiente paso.
3. **Envío** (`ShippingOptions`) — cotización de envío **en vivo** contra Skydropx (Fase 8.4). `useQuery({ queryKey: shippingKeys.rates(items, confirmedCustomer), queryFn: () => getShippingRates(...) })` llama a `POST /api/shipping/rates` (`lib/api/shipping.ts`), que SIEMPRE responde 200 — si Skydropx falla/hace timeout, el backend cae a su propia tarifa plana (`rateId`/`quotationId` null, `carrier: "Estándar"`). Con una sola opción se preselecciona sola (nada que decidir); con 2+ no se preselecciona nada — elegir es el punto de este paso. Los totales del sidebar (`OrderTotals`) se arman localmente: `computeTotals(items)` da `subtotal`/`savings`, y `.shipping`/`.total` se sobreescriben con la tarifa elegida — así el monto que se ve aquí es el mismo que se cobra. **Pago con Stripe conectado (Fase 8, test/sandbox)**: "Pagar y confirmar" corre `usePlaceOrder` (`components/checkout/usePlaceOrder.ts`), un flujo de **dos fases** — (1) `createOrder()` (`lib/api/orders.ts`) postea `buildOrderPayload(items, customer, selectedRate)` = `{ items, customer, quotationId?, rateId? }` **sin montos** (el backend re-consulta Skydropx por esa cotización —o cae a su tarifa plana si no vinieron— y devuelve `{ order, clientSecret }`); (2) `stripe.confirmCardPayment(clientSecret, { payment_method: "pm_card_visa" })` con Stripe.js (`lib/stripe/client.ts` = singleton `loadStripe`). La **tarjeta de prueba está hardcodeada** (`pm_card_visa` = `4242 4242 4242 4242`) porque todo corre en sandbox; `PaymentSection` (movido aquí desde el paso de dirección — el pago no puede confirmarse sin una tarifa elegida) es un panel de tarjeta de prueba de solo lectura. La orden creada se **cachea en el `CheckoutContext`** (`orderSignature` = `productId+talla+cantidad` del carrito **+ los datos del cliente + la tarifa elegida**) para no duplicarla en un reintento; se invalida sola si cambió el carrito, el cliente, o la tarifa. Errores mapeados: `409` "sin stock" muestra el mensaje del backend inline; `409` de **cotización expirada** (quotations duran 24 h — se detecta por el texto "cotizaciones expiran" en el mensaje) además limpia la tarifa elegida (`setSelectedRate(..., null)`) para forzar una nueva cotización en vez de reintentar en bucle contra un `quotationId`/`rateId` caducado; `400` datos; `clientSecret` nulo / Stripe no cargado → mensaje de config; `error.message` de Stripe. El usuario permanece en el paso. **Solo tras `paymentIntent.status === "succeeded"`** se llama `completeOrder(customer, order)`, que congela el snapshot (con `orderId` + los **totales autoritativos del servidor**), vacía el carrito y avanza. El estado `paid` real lo concilia el **webhook** del backend de forma asíncrona.
4. **Confirmación** (`Success`) — renders the frozen order snapshot (con "Pedido #<id>") + shipping address.

Shared, prop-driven pieces: `Stepper` (wizard indicator — genérico, escala solo con `CHECKOUT_STEPS` sin cambios de código), `OrderItems`, `OrderTotals`, and `FormControls` (`TextField`/`SelectField` — `forwardRef` inputs that take RHF `register()` spread + an `error` string).

## Shipping — cotización en vivo (Skydropx, Fase 8.4)

El checkout cotiza envío **en vivo** contra Skydropx desde el paso 3 (`ShippingOptions`, ver "Checkout flow"). El backend (`backend/src/controllers/shipping.controller.ts` + `services/skydropx.service.ts`) ya está construido y es la autoridad: arma un solo parcel apilado a partir de las dimensiones del producto (`weightKg`/`lengthCm`/`widthCm`/`heightCm`), cotiza contra Skydropx, y responde `{ quotationId, rates: [{ rateId, carrier, service, amount, total, days }] }`. Origen fijo: Celaya, Guanajuato, CP 38000.

**Frontend → backend**: `lib/api/shipping.ts` (`getShippingRates(items, customer)`) postea `POST /api/shipping/rates` con `{ customer, items: [{ productId, size, quantity }] }` (mapeo compartido con `orders.ts` vía `mapCartItemsToOrderItems`). `ShippingData` (schemas/checkout.ts) mapea directo a los campos de dirección de Skydropx: `postalCode`→`postal_code`, `state`→`area_level1`, `city`→`area_level2`, `neighborhood`→`area_level3`.

**Fallback de tarifa plana**: si Skydropx falla, hace timeout, o el producto tiene alguna dimensión en 0, el backend responde 200 igual con `quotationId: null` y una sola tarifa sintética (`rateId: null`, `carrier: "Estándar"`) calculada con su propia copia de la tarifa plana:

```
SHIPPING_BY_TYPE = { bota: 160, sombrero: 130, ropa: 100 }  // MXN — el más caro del carrito domina
```

`lib/domain/cart.ts`'s `computeShipping`/`SHIPPING_BY_TYPE` es la copia **frontend** de esa misma tabla — se mantiene (no se eliminó) porque `OrderSummary` (paso 1, antes de tener dirección) la usa como estimado pre-cotización, y porque ambas copias deben seguir coincidiendo con el fallback del backend. `CartTotals.shipping` sigue fluyendo igual por `OrderTotals`/`Success`/`CheckoutContext.completeOrder()` — solo cambió de dónde viene el valor en el paso 3.

**Monto mostrado = monto cobrado**: la tarifa que el comprador elige en `ShippingOptions` (`quotationId`+`rateId`, o `null`+`null` en el fallback) se manda en `POST /api/orders`. El backend **re-consulta Skydropx** por esa cotización exacta y usa su `total` como `order.shipping` — nunca confía en un monto del cliente. Si la cotización expiró (duran 24 h), el backend responde 409 y el frontend limpia la tarifa elegida para forzar una nueva cotización (ver "Checkout flow", paso 3). Esto es lo que cierra la brecha que existía antes de la Fase 8.4: el frontend ya no calcula el envío por su cuenta para mostrarlo — lo cotiza y lo cobra con el mismo número.

## Importación por Excel (Fase 13)

La sección **Importar** (`components/admin/sections/ImportSection.tsx` + `components/admin/import/`) sube un `.xlsx` con mercancía nueva y restock. Son **dos pasos** contra el backend: `POST /api/admin/products/import/preview` (multipart, **no escribe nada**) y `POST /api/admin/products/import` (JSON, aplica las filas ya revisadas).

**El principio que ordena todo el diseño:** el restock **SUMA** stock y **no hay forma de deshacerlo desde la app**. Una fila mal leída no se corrige con un botón: se corrige a mano, producto por producto. Por eso la pantalla de revisión no es cosmética y por eso las reglas de abajo son invariantes, no preferencias.

### Invariantes (no romper sin leer el porqué)

- **Una fila aplicada con éxito NUNCA vuelve al payload.** Tras cada commit, los índices que **escribieron** (`created`/`updated`) entran en `applied` y quedan con candado el resto de la sesión, aunque se editen. Es estructural (en el reducer), no una convención de quien arme el siguiente lote — es lo que hace segura la iteración "corrige los errores y reintenta". Un `unchanged` del commit **no** lleva candado (no tocó nada, y bloquearlo impediría corregirlo y reenviarlo) pero **sí** se deselecciona, para que no viaje sin que el dueño lo vuelva a elegir.
- **Con filas ya aplicadas, "Volver a analizar" desaparece** (`canReanalyze`). El preview recalcula contra el catálogo YA actualizado mientras el archivo sigue diciendo lo mismo ("suma 3 piezas"), así que el restock recién aplicado reaparecería como `update`; y `previewLoaded` no puede conservar el candado, porque el `.xlsx` pudo editarse entre un análisis y otro y los índices del plan nuevo no tienen por qué ser los mismos. El candado se protege en la **entrada**, no intentando migrarlo. La salida en ese estado es "Empezar de nuevo".
- **Todo se clavea por el ÍNDICE de `plan.rows`, nunca por el folio `row`.** `row` es el número de fila del Excel: dato externo, opcional en el contrato y potencialmente repetido. El índice es único por construcción y estable (nunca se reordena ni se empalma el array; el filtrado ocurre al pintar), así que el caso borde de folios duplicados desaparece en vez de tener que cubrirse. El merge del resultado del commit es **posicional** (`response.rows[k]` ↔ `sentIndices[k]`, que viajan como variable de la mutation), con fallback por folio y, si tampoco cuadra, lista sin merge.
- **`serializeRowEdit` emite solo una whitelist** (`EDITABLE_FIELDS ... as const satisfies readonly (keyof ImportRowInput)[]`), **también para las filas no editadas**. El body del commit es `.strict()` en el backend: una clave que el preview devuelva y el commit no acepte mataría el **lote entero** con un 400. El `satisfies` hace que eso falle en el build, no en producción.
- **Los conteos se derivan de `rows`, no del `summary`** del backend (que solo se usa como verificación cruzada con `console.warn`). Un toolbar que dice "5 actualizaciones" sobre una tabla que muestra 4 destruye la confianza en toda la pantalla, y es la tabla lo que el dueño puede auditar.
- **Preview → `.parse()` estricto; commit → `safeParse` + `console.warn` + dato crudo.** El preview es de solo lectura (un parse fallido es reintentable sin riesgo, y una forma inesperada significa que no podemos pintar el diff con honestidad); el commit ya escribió, y convertir un cuerpo raro en error invitaría a un reintento que **duplica el stock**.
- **La invalidación tras el commit corre también** con `summary.failed > 0` (un éxito parcial sí escribió) y también si el Zod del cuerpo falló. Toca `adminProductKeys.all` **y** `productKeys.all` (el import crea productos y cambia stock: lo ve el catálogo admin y el outlet público).

### "Ausente" vs. "vacío" — el modelo de presencia

En el contrato, una **clave ausente** significa "no toques esa columna del producto", `null` equivale a ausente, pero **`description: ""` SÍ borra la descripción**. Como el valor de un `<input>` siempre es un string, inferir "ausente" de un string vacío haría imposible expresar el segundo caso. Por eso cada celda (`Cell` en `import/types.ts`) lleva `presence: "absent" | "present"` **aparte** del texto:

```
teclear y borrar   →  ""        (en `description` limpia; en el resto es error de captura)
botón "No tocar"   →  ausente   (la clave no viaja)
```

El `text` se conserva al pasar a `absent`, para que alternar no pierda lo tecleado. `visible` es un tri-estado (`No tocar` / `Sí` / `No`) por el mismo motivo: para un booleano, "ausente" ≠ "No" — y es su **único** control de presencia (no lleva el botón "Establecer / ✕ No tocar" del resto de las celdas: dos mandos sobre lo mismo desincronizaban el valor sembrado, texto de presentación, con el que compara el tri-estado).

"Establecer" siembra el valor guardado del producto para que el dueño lo haga explícito de un clic, pero **`sizes` está excluido del sembrado** (`NOT_SEEDED`, junto a `description`): las tallas se **suman**, así que sembrar lo que el producto tiene hoy no lo hace explícito — lo duplica al aplicar, y encima la celda queda "editada", lo que suprime el `ImportSizeDiff` que habría hecho visible la suma. La celda de tallas se deja vacía a propósito: lo que se escribe ahí son las piezas que **entran**.

Los números se capturan con `type="text" inputMode="decimal"`, **no** `type="number"` (éste devuelve `""` ante basura —ni siquiera se puede leer lo que se tecleó—, se traga la coma decimal y cambia el valor al hacer scroll). `parseNumberText` espeja `readCellNumber` del backend (miles, símbolo de moneda, coma decimal). **Nunca degrada a 0**: la fila se marca inválida y se deselecciona, pero el resto del lote sigue aplicable.

### Dos límites del contrato que la UI no puede tapar

1. **No se puede re-previsualizar una fila editada.** `/import/preview` solo acepta un archivo, así que re-subirlo devuelve el mismo plan e ignora las ediciones. En vez de fingirlo, la UI **suprime el diff que dejó de ser cierto** (`stalenessOf`): editar `code`/`name` invalida **todo** (la fila puede emparejar ahora con otro producto), editar otro campo suprime solo lo afectado, y en su lugar se muestra un **diff local de la instrucción** ("Cambios que hiciste a la fila" — un diff de lo que se va a mandar, no del producto), que es lo único que sí se puede afirmar. Regla: nunca pintar una línea de diff cuyos insumos el usuario cambió.
2. **El preview resuelve contra un catálogo virtual** (la BD más lo que las filas anteriores del archivo ya proyectaron), así que la fila 2 puede crear `BTA-9` y la fila 5 restockearlo. Deseleccionar la fila 2 cambia el resultado de la 5, y el preview no puede saberlo porque se calculó antes. `dependencies.ts` lo detecta con una señal exacta y barata —`action === "update" && productId === null` significa que empareja con algo que aún no existe en la BD—, lo avisa por fila y en el toolbar, y ofrece "Seleccionar las filas faltantes". **No bloquea**: pide una confirmación inline extra. Cuando el `before` es una proyección, el panel se etiqueta "Estado proyectado", no "Actual en el catálogo".

### Otros detalles

- **Estado en `store/importStore.ts` (Zustand, sin `persist`)** — ver el porqué en la sección de `store/`.
- **409 de doble envío**: el backend rechaza el mismo lote dos veces en menos de 60 s (hash del payload **sin** `row`). Reintentar solo las filas fallidas es un subconjunto → otro hash → no se bloquea; pero reintentar *todas* cuando *todas* fallaron da un 409 sin haberse escrito nada. `isSameBatchAsLast` lo pre-detecta en cliente y lo explica antes de gastar la petición, más una cuenta regresiva.
- **La tabla no se desmonta durante el commit**, solo se deshabilita: si falla, no se pierden ediciones ni selección.
- **`reactivated: true`** (un producto descontinuado vuelve al catálogo **público**) no aparece en `changes`, así que lleva badge propio, línea en el detalle y conteo en el resumen previo — es justo la clase de efecto que sorprende al dueño en silencio.
- **Accesibilidad**: `<table>` real con `<caption class="sr-only">`/`<th scope>`; el grupo "N filas sin cambios" usa `<button aria-expanded>` + filas condicionales dentro de su propio `<tbody>` (`<details>` **no** puede envolver un `<tbody>`). Con el filtro "Todas", las `unchanged` viven **siempre** en ese grupo y nunca en el `<tbody>` principal: así el botón sigue montado abierto y cerrado — derivarlo de "las que están ocultas" lo desmontaba al expandir y el grupo ya no se podía volver a colapsar; el select-all pone `indeterminate` por ref (no es prop de React) y se acota al filtro activo; los filtros anuncian el conteo en un `aria-live`.
- **Rendimiento**: las filas nacen colapsadas y el editor se monta solo al expandir (500 filas × 13 campos serían 6 500 inputs). **Sin `staggerContainer` en la lista** — 0.07 s × 500 filas = 35 s.
- **Plantilla**: `public/plantilla-importacion-productos.xlsx`, generada por `scripts/generate-plantilla-importacion.mjs` con el `exceljs` **del backend** (`NODE_PATH=../backend/node_modules node scripts/generate-plantilla-importacion.mjs`) para no meter ~1 MB de dependencia en el frontend por una descarga estática. Es un script **one-off** y su salida está versionada: al cambiar el encabezado canónico hay que regenerarla y volver a commitearla.

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

El backend (Express, `http://localhost:4000`, Swagger en `/api/docs`) ya está construido. **El storefront y todo el admin ya están conectados al backend real** (Fases 1-4): `lib/api/products.ts` consume `GET /api/products` y `GET /api/products/{id}`; `lib/api/adminProducts.ts` cubre el CRUD de `/api/admin/products` (`ProductSection`/`ProductForm`/`ProductCategoryView`); `lib/api/dashboard.ts` sirve `GET /api/admin/dashboard` (`DataSection`); y `lib/api/reports.ts` sirve `GET /api/admin/reports/monthly` + `/replenishment` (`ReportesSection`/`SalesReport`/`ReplenishmentReport`). **Ya no quedan mocks en el frontend**: el directorio `db/` (mockProducts + mockData) y `lib/forecast.ts` se eliminaron al cerrar la Fase 4. El backend expone **las mismas formas de datos** que los tipos del front (`components/admin/data/types.ts`, `ProductSchema`); mientras los contratos se respeten, los componentes no cambian. Marca (Fase 5), usuarios/cuenta (Fase 6), pedidos del admin (Fase 7, `GET /api/admin/orders` → `OrdersSection`), pagos (Fase 8, Stripe en **test/sandbox**: `usePlaceOrder` + `confirmCardPayment` con `pm_card_visa`), cotización de envío en vivo (Fase 8.4, Skydropx: `lib/api/shipping.ts` + `ShippingOptions`, ver "Shipping") cancelación/reembolso manual de pedidos (Fase 12, `POST /api/admin/orders/:id/cancel` → `OrderDetailModal`) e importación/restock masivo por Excel (Fase 13, `POST /api/admin/products/import/preview` + `/import` → `ImportSection`, ver "Importación por Excel") YA están conectados. Ya no quedan fases pendientes del roadmap de integración.

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
POST /api/admin/products/import/preview → plan del .xlsx sin escribir nada (ImportSection)
POST /api/admin/products/import    → aplica las filas revisadas (JSON, ver "Importación por Excel")

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
