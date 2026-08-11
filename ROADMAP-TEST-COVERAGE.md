# Roadmap — cobertura de tests (Jest + RTL)

Bitácora de qué falta probar y en qué orden. La cobertura hoy es angosta: 24 specs, casi todas en
`lib/domain/`, un puñado de módulos puros (`checkoutErrors`, `orderTimeline`, `shipmentLabel`,
`couponStatus`, `expenseStatus`) y el pipeline completo de `components/admin/import/__tests__/`
(el único rincón con specs de componente). Todo lo demás — checkout, seguimiento de pedido,
outlet, auth, y casi todo `admin/` — no tiene un solo test.

**Criterio de orden: riesgo de negocio, no orden alfabético ni facilidad.** Checkout mueve dinero
real; el catálogo público es lo primero que ve un comprador; el panel admin es donde el dueño
opera la tienda todos los días. Un bug ahí cuesta más que uno en `AboutUs.tsx`.

Cada fase es su propio PR: specs nuevos + (si la carpeta lo amerita, como `import/`) un
`__tests__/README.md` corto explicando el criterio de esa carpeta. Marca cada casilla al mergear.

## Meta de cobertura

**Objetivo: >80% en las cuatro métricas de `--coverage`, con especial atención a branch %.**
Statements y lines se inflan solo con el happy path — es fácil llegar a 80% ahí sin haber probado
un solo `if`. Branch % es el que de verdad delata cobertura superficial, porque exige que **cada
rama se haya ejecutado al menos una vez**: el `if`/`else`, el `?:`, el `&&`/`||` de short-circuit,
cada `case`, cada default de un `switch`, cada parámetro opcional con y sin valor.

Consecuencias concretas para cada fase de este roadmap:

- **Un archivo no se da por cubierto solo porque tiene un test.** Cada módulo de la lista necesita
  al menos un caso de happy path **y** un caso por cada rama/guard/branch documentada en su
  descripción (los `Ojo:`, `nunca`, `solo si`, `a propósito` de cada bullet son justo las branches
  a cubrir — no son notas decorativas).
- Ejemplos ya presentes en las descripciones de fase que son branches obligatorias, no opcionales:
  `shipping: null` vs. número en `cart.ts`; fallback de `shipmentStatusLabel` ante un status
  desconocido; 4xx vs. red/429 en la revalidación de cupón; `packageCount` con 1 vs. varias rates;
  cupón rechazado que NO se autoremueve; `size === 0` vs. `size > 0` en cada componente que oculta
  la fila de talla; `couponDiscount > 0` vs. `= 0` en `OrderDetailModal`; forward-only del avance
  de estado (permitir el mismo estado, rechazar ir hacia atrás); `hasSizes: true` vs. `false`;
  error 401 vs. no-401 en `AdminGuard`; `Idempotency-Replayed` presente vs. ausente en
  `usePlaceOrder`.
- Errores de red/backend (4xx, 5xx, timeout) se prueban explícitamente, no se asumen cubiertos por
  el caso feliz — sobre todo en checkout y en cualquier mutation.
- Estados vacíos/límite: listas vacías, un solo elemento, el máximo (3 imágenes, 5 cajas OTP),
  paginación en el primer/último extremo.
- Si un módulo llega a 100% de statements pero su reporte de branches muestra líneas sin cubrir,
  la fase **no** se considera terminada — faltan casos, no es un umbral que se pueda redondear.
- Correr `pnpm test -- --coverage` (o configurar el script) antes de marcar una fase como
  completa, y revisar el reporte por archivo, no solo el resumen global.

**El branch % de este proyecto es un piso, no una garantía.** La instrumentación de cobertura de
`next/jest` (SWC, no el Istanbul clásico) **no registra todos los `&&` que viven como hijos de
JSX**: se detectó en Fase 3 leyendo el `branchMap` crudo de `coverage/coverage-final.json` —
`OrderTracking.tsx` marcaba 100% de branches mientras la rama
`{order.shippingAddress.references && …}` no se había ejecutado ni una vez, porque ni siquiera
existía como entrada en el mapa. Un `&&` de render condicional puede estar sin probar y no aparecer
como línea descubierta. Consecuencia para las fases 4–10: **hay que leer el componente y listar sus
ramas a mano**, no dar por cubierto lo que el reporte no señala. Si una rama no se ve reflejada,
`coverage/coverage-final.json` (`branchMap` + `b`) dice qué se instrumentó de verdad.

**Y un test verde tampoco garantiza que la rama se probó.** En Fase 4 salieron dos casos así, ambos
detectados mutando el fuente a propósito y comprobando que la prueba efectivamente fallara:

- `isError && !result` en `OutletView` aparece como **una sola** entrada del `branchMap` (SWC no
  separa los dos operandos), así que el caso "error con datos previos en pantalla" salía 100%
  cubierto sin haberse ejecutado nunca.
- Una aserción de **ausencia** hecha justo después de un cambio de estado de TanStack Query se
  evalúa contra el DOM viejo: la librería notifica a sus suscriptores en un **macrotask**, así que
  `await act(async () => { await queryClient.refetchQueries(); })` no alcanza — hace falta un
  `await new Promise((r) => setTimeout(r, 0))` dentro del mismo `act`. Sin él la prueba pasa igual
  con y sin el guard, que es exactamente el test que no sirve de nada.

Regla práctica: ante una rama que "ya está cubierta", romperla en el fuente y correr la suite. Si
sigue verde, el test es decorativo.

## Convenciones (ya establecidas, no reinventar)

- Stack: Jest + React Testing Library + `@testing-library/user-event`, vía `next/jest`.
- `testMatch` está acotado a `**/*.test.{ts,tsx}` — fixtures/helpers pueden vivir junto a los specs
  dentro de `__tests__/` (ver `import/__tests__/helpers/`) sin volverse suites.
- Sin snapshots — cambian con cualquier ajuste de Tailwind sin decir nada útil.
- Sin Playwright/e2e — no reintroducir sin que se pida explícitamente.
- Queries por rol y texto visible (es-MX) — ejercita accesibilidad de paso.
- Fixtures compartidas van a un `helpers/factories` de la carpeta, no objetos locales inventados.
- Antes de escribir specs de un módulo con lógica no obvia, un comentario de una línea arriba del
  archivo explicando **por qué** ese módulo es delicado (mismo criterio que `import/__tests__/`).
- `lib/api/*` (contratos Zod + axios) queda **fuera de este roadmap**: son delgados y su parsing ya
  se ejercita indirectamente por los tests de componentes que los consumen.

---

## Fase 1 — Módulos de dominio puros restantes

Sin React, sin I/O — el tipo de test más barato y de mayor señal por línea. Cierra el hueco que
deja hoy `lib/domain/__tests__/` (que ya cubre `catalogFilters`, `idempotency`, `publicOrderToken`).

- [x] `lib/domain/cart.ts` — `computeTotals`. Ojo: **no calcula shipping** (Fase 23 del proyecto,
      `shipping: null` a propósito) — un test que espere un número ahí está mal.
- [x] `lib/domain/categories.ts` — `CATEGORIES`, labels, `DEFAULT_DIMENSIONS`.
- [x] `lib/domain/brand.ts` — `resolveBrand(settings)` merge contra `BRAND` fallback.
- [x] `lib/domain/shipmentStatus.ts` — `shipmentStatusLabel` sobre strings crudos de Skydropx (no
      es un enum cerrado — probar el fallback para status desconocidos).

## Fase 2 — Checkout (dinero real)

La zona de mayor riesgo: un bug aquí cobra de más, cobra de menos, o duplica un cargo.
`checkoutErrors.ts` ya tiene specs; falta todo lo que consume ese resultado y el estado del wizard.

- [x] `components/checkout/usePlaceOrder.ts` — el hook completo: creación de orden, confirmación
      Stripe, manejo de `Idempotency-Replayed` (no debe re-confirmar un PaymentIntent ya
      `succeeded`), mapeo de errores vía `checkoutErrors`.
- [x] `components/checkout/CheckoutContext.tsx` — supervivencia de estado entre pasos (cada paso
      se desmonta al navegar): `confirmedCustomer`, rate cacheada por firma cart+customer, cupón
      cacheado por firma **más laxa** (solo `cartLineSignature`), invalidación cruzada al cambiar
      dirección/carrito.
- [x] `components/checkout/OrderTotals.tsx` — invariante `total = subtotal − savings −
      couponDiscount + shipping`; shipping `null` se muestra como "se calcula", nunca como $0.
- [x] `components/checkout/CouponField.tsx` — es una mutation, no una query; nunca calcula el
      descuento localmente (siempre lo lee de `/validate`); mensajes de backend verbatim; un cupón
      rechazado no se autoremueve.
- [x] `components/checkout/ShippingOptions.tsx` — revalidación de cupón contra el email confirmado
      (4xx bloquea "Pagar y confirmar", red/429 no); auto-selección con una sola tarifa;
      `packageCount` tomado del **máximo** entre `data.rates`, no `rates[0]`.
- [x] `components/checkout/UserDetails.tsx` — validación RHF+zod contra `MEXICAN_STATES`;
      `confirmShipping` invalida cualquier rate previamente elegida.
- [x] `components/checkout/Stepper.tsx` — solo permite saltar a pasos **ya visitados**, nunca a uno
      no visitado ni después de confirmar; los 3 estados visuales por paso (done / visitado-no-actual
      / pendiente).

## Fase 3 — Seguimiento público de pedido

Buyer-facing, sin autenticación — el token en la URL es la única credencial.

- [x] `components/order/OrderLookupForm.tsx` — pide el código de rastreo (no el link, Fase 21);
      `extractPublicOrderToken` debe aceptar ambas formas (emails viejos solo traen el link).
- [x] `components/order/OrderStatusTimeline.tsx` — usa `orderTimeline.ts` (ya con specs); casos
      `pending` y `cancelled` se manejan fuera de los 4 pasos.
- [x] `components/order/TrackedOrderItems.tsx` — usa `nameSnapshot` + precios congelados, NO un
      `Product` en vivo; oculta la fila si `size === 0` (producto sin tallas).
- [x] `components/order/OrderTracking.tsx` — sin `refetchInterval` (refresh manual únicamente);
      `retry: false` porque un 404 es definitivo.

## Fase 4 — Outlet / catálogo público

Lo primero que ve un comprador. `OutletFilters` es la pieza más intrincada fuera de checkout.

- [x] `components/outlet/OutletFilters.tsx` — URL como fuente de verdad; draft local con debounce
      de 300ms committeado con `replace: true` (no `push`); inputs muestran el texto crudo de la
      URL, no el valor saneado; `precioMin > precioMax` da cero resultados a propósito.
- [x] `components/outlet/OutletView.tsx` — que el listado nunca filtra/ordena client-side (ni
      siquiera cuando la respuesta contradice el `orden` de la URL); cambiar cualquier filtro
      vuelve a la página 1; un refetch fallido con datos ya en pantalla NO muestra el estado de
      error (`isError && !result`). El `<Suspense fallback={<OutletSkeleton />}>` vive en las
      páginas de `app/`, no en este componente: fuera de alcance de un test de componente.
- [x] `components/outlet/EmptyState.tsx` — dos variantes: sin filtros → "Agotado"; con filtros → "No
      encontramos nada" + botón de limpiar filtros que conserva la categoría.
- [x] `components/outlet/OutletCard.tsx` — render de precio y descuento; las tres ramas de `stock`
      (agotado / última pieza / N disponibles) y el fallback cuando la pieza no tiene foto. **No
      pinta talla** — eso es del detalle de producto.
- [x] `components/outlet/OutletPagination.tsx` — no se renderiza con una sola página (ni con cero);
      un botón por página, el actual resaltado. **No hay prev/next ni estado `disabled`**: no hay
      "extremos" que deshabilitar.

## Fase 5 — Auth

- [ ] `components/auth/LoginForm.tsx` — mapeo de errores (401 → credenciales, 429 → rate-limit).
- [ ] `components/auth/ForgotPasswordForm.tsx` — wizard de 3 pasos, estado local no persistido:
      email → código de 5 dígitos → nueva contraseña → `/login`.
- [ ] `components/auth/CodeInput.tsx` — el OTP de 5 cajas: foco automático, pegar código completo,
      backspace entre cajas.
- [ ] `components/auth/AdminGuard.tsx` — un error **no-401** (500/red) no bloquea acceso (outage
      transitorio no debe encerrar al admin); 401 sí redirige (vía interceptor).

## Fase 6 — Admin: Órdenes

Donde el dueño opera pedidos reales — cancelaciones y reembolsos son operaciones sensibles.

- [ ] `components/admin/orders/StatusBadges.tsx` — `status` y `paymentStatus` son campos
      independientes con rampas de color disjuntas (no deben compartir tono).
- [ ] `components/admin/orders/OrdersTable.tsx` — paginación server-side (page size 20
      desktop / 5 mobile vía `matchMedia`), a diferencia de `SalesTable` (client-side).
- [ ] `components/admin/orders/OrderDetailModal.tsx` — fila de cupón solo aparece con
      `couponDiscount > 0` y va sobre Shipping; columna "Talla" oculta si `size === 0`;
      cancelar/reembolsar visible solo en pending/paid; avance manual de estado
      forward-only (409 al ir hacia atrás o en cancelled/unpaid); reintento de guía Skydropx
      (`force: true` es la única vía para una segunda etiqueta pagada, con confirmación extra).
- [ ] `components/admin/orders/OrdersPagination.tsx` — análogo a outlet pero server-driven.

## Fase 7 — Admin: Productos

- [ ] `components/admin/products/ProductForm.tsx` — toggle "Maneja tallas" intercambia el input de
      tallas por "Cantidad en existencia" (`stockQuantity`); el submit manda solo el campo que
      corresponde al toggle, nunca ambos; galería de hasta 3 imágenes.
- [ ] `components/admin/products/ProductCategoryView.tsx` — listado + filtros de categoría.
- [ ] `components/admin/products/ProductDetailModal.tsx` — oculta el bloque "Tallas" completo
      cuando `product.hasSizes === false`.

## Fase 8 — Admin: Cupones y Gastos

- [ ] `components/admin/coupons/CouponForm.tsx` — reglas cruzadas del formulario (porcentaje ≤
      100%, tope solo en tipo porcentaje, fin > inicio) espejo del backend.
- [ ] `components/admin/coupons/CouponsTable.tsx` — "Cancelar" es `PUT { active:false }`, no
      delete; usa `couponStatus.ts` (ya con specs) para el badge de estado.
- [ ] `components/admin/expenses/ExpenseForm.tsx` — nunca manda `amount`/`amountEffectiveFrom`
      (eso vive en `ExpenseAmountForm`, formulario separado a propósito).
- [ ] `components/admin/expenses/ExpenseAmountForm.tsx` — cada envío agrega una **versión** con
      fecha, nunca sobreescribe historial.
- [ ] `components/admin/expenses/ExpenseHistory.tsx` + `ShippingCostNote.tsx` — el costo de envío
      derivado se muestra pero nunca se suma a totales/categorías (ya restado en GANANCIA BRUTA).

## Fase 9 — Admin: Dashboard, Reportes, Config

- [ ] `components/admin/data/KpiGrid.tsx` — render genérico por label (el KPI "COSTO DE ENVÍO" con
      `trend.positive` invertido a propósito — verificar que el signo se lea bien, no el número).
- [ ] `components/admin/data/SalesTable.tsx` — paginación 5/página + filtro por día, client-side.
- [ ] `components/admin/data/InventoryTable.tsx`, `RevenueChart.tsx` — render básico con datos
      precomputados del backend (nada de matemática local salvo lo ya cubierto en specs puros).
- [ ] `components/admin/reports/SalesReport.tsx` / `ReplenishmentReport.tsx` — selector de mes,
      export CSV (`csvField` con BOM — verificar que el nombre de archivo sea
      `ventas-<YYYY-MM>.csv` / `reposicion-<YYYY-MM>.csv`).
- [ ] `components/admin/config/AccountCard.tsx` — requiere `currentPassword` para cualquier cambio.
- [ ] `components/admin/config/AdminsCard.tsx` — listar/agregar/quitar admins.

## Fase 10 — UI compartida y home (baja prioridad)

Mayormente presentacional; útil pero de menor riesgo que lo anterior.

- [ ] `components/ui/Cart.tsx` — fila oculta si `item.size === 0`.
- [ ] `components/ui/ImageCarousel.tsx` — respeta `useReducedMotion()`.
- [ ] `components/ui/FormControls.tsx` — `TextField`/`SelectField` compartidos por checkout/auth.
- [ ] `components/home/Hero.tsx` — conteo de piezas por categoría vía `getProducts({ categoria,
      perPage: 1 })`, solo lee `total`.
- [ ] `components/home/NavHeader.tsx`, `Footer.tsx`, `CategoryCard.tsx` — smoke tests de render y
      links.

---

## Fuera de alcance (por ahora)

- `lib/api/*` — contratos delgados, cubiertos indirectamente.
- `components/legal/*`, `components/about/AboutUs.tsx` — copy estático, bajísimo riesgo de romperse.
- E2E/Playwright — no reintroducir sin pedirlo explícitamente.
