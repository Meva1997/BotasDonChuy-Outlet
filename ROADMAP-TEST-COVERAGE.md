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
- Correr **`pnpm test:coverage`** antes de marcar una fase como completa, y revisar el reporte por
  archivo, no solo el resumen global. Ojo: `pnpm test -- --coverage` **no** funciona — el `--` deja
  las banderas del lado equivocado y Jest las interpreta como un patrón de tests (`Invalid
  testPattern … Running all tests instead`), corriendo la suite completa **sin** medir cobertura.

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

- [x] `components/auth/LoginForm.tsx` — mapeo de errores (401 → credenciales, 429 → rate-limit).
- [x] `components/auth/ForgotPasswordForm.tsx` — wizard de 3 pasos, estado local no persistido:
      email → código de 5 dígitos → nueva contraseña → `/login`. Se probó como flujo integrado
      junto con `ResetCodeForm`/`NewPasswordForm` (no tienen sentido aislados: el "código" depende
      del email del paso previo). **Única excepción**: `NewPasswordForm` se monta suelto para el
      caso `onExpired` ausente — el wizard siempre la pasa, así que la rama
      `codeExpired && onExpired` (hija de JSX, invisible para la instrumentación de SWC) solo se
      ejercita rompiendo el acoplamiento con el wizard.
- [x] `components/auth/CodeInput.tsx` — el OTP de 5 cajas: foco automático, pegar código completo,
      backspace entre cajas. **Bug real encontrado y corregido durante esta fase**: el auto-avance
      leía `value` de un closure obsoleto dentro del evento `focus` síncrono que él mismo disparaba
      (React no re-renderiza a mitad del mismo call stack), así que rebotaba a la MISMA casilla en
      vez de ir a la siguiente — tecleando un código dígito por dígito, cada segunda pulsación
      sobrescribía la anterior en vez de avanzar (confirmado tecleando "13579" → terminaba en
      "245"). Pegar no se veía afectado (el valor se fija antes del rebote). Arreglado con una ref
      (`latestValue`) que `setValue()` actualiza en el momento exacto del commit — no se puede
      mutar la ref durante el render (regla de lint `react-hooks/refs`), así que el `useEffect` que
      la sincroniza solo cubre cambios *externos* de `value`.
- [x] `components/auth/AdminGuard.tsx` — un error **no-401** (500/red) no bloquea acceso (outage
      transitorio no debe encerrar al admin); 401 sí redirige (vía interceptor).

## Fase 6 — Admin: Órdenes ✅

Donde el dueño opera pedidos reales — cancelaciones y reembolsos son operaciones sensibles.

- [x] `components/admin/orders/StatusBadges.tsx` — `status` y `paymentStatus` son campos
      independientes con rampas de color disjuntas (no deben compartir tono).
- [x] `components/admin/orders/OrdersTable.tsx` — selección de renglón, suma de piezas, las
      cuatro ramas de `labelNote` en la columna "Envío". La paginación server-side (page size 20
      desktop / 5 mobile vía `matchMedia`) en realidad vive en `OrdersSection` (fuera del alcance
      de esta fase), no en `OrdersTable` — el componente solo recibe `orders` ya paginado.
- [x] `components/admin/orders/OrderDetailModal.tsx` — fila de cupón solo aparece con
      `couponDiscount > 0` y va sobre Shipping; columna "Talla" oculta si `size === 0`;
      cancelar/reembolsar visible solo en pending/paid; avance manual de estado
      forward-only (409 al ir hacia atrás o en cancelled/unpaid); reintento de guía Skydropx
      (`force: true` es la única vía para una segunda etiqueta pagada, con confirmación extra).
- [x] `components/admin/orders/OrdersPagination.tsx` — análogo a outlet pero server-driven.

101 tests nuevos (`components/admin/orders/__tests__/` + `helpers/`); 112 en la carpeta contando los
11 de `shipmentLabel.test.ts`, que ya existían. Branch coverage 100% en `OrdersTable`,
`OrdersPagination`, `StatusBadges` y `shipmentLabel`; 97.72% en `OrderDetailModal` — las tres ramas
restantes son la trampa de foco (`?? []` y `items.length === 0`, inalcanzables con un panel que
siempre trae botones) y `reduceMotion: true` (solo el desplazamiento de entrada).

Las ramas que faltaban al cerrar la fase **no las señaló el reporte** — son `&&`/`||` hijos de JSX,
que la instrumentación de SWC no registra (ver la advertencia de arriba): el bloque de reembolso
(`refundId`/`refundedAt`), el aviso de `shippingRequiresDropoff` dentro del modal, `references` con
valor, la línea "· actualizado", y los handlers propios de la vista de cards de `OrdersTable`
(jsdom la pinta en cada test, así que se veía ejercitada sin haber recibido un solo clic). Se
encontraron leyendo el fuente a mano y se cerraron después; cada una se verificó rompiendo el
fuente. Ver el `__tests__/README.md` de la carpeta.

> `OrdersSection.tsx` (el contenedor) **sigue sin specs y no lo reclama ninguna fase**: el
> `perPage` 20/5 vía `matchMedia`, la firma por renglón que decide cuándo suena el toast de Sileo,
> y la distinción entre refetch automático y manual. Es lo más delicado que queda del módulo de
> pedidos — está anotado en la Fase 9.

## Fase 7 — Admin: Productos ✅

- [x] `components/admin/products/ProductForm.tsx` — toggle "Maneja tallas" intercambia el input de
      tallas por "Cantidad en existencia" (`stockQuantity`); el submit manda solo el campo que
      corresponde al toggle, nunca ambos; galería de hasta 3 imágenes.
- [x] `components/admin/products/ProductCategoryView.tsx` — listado + filtros de categoría.
- [x] `components/admin/products/ProductDetailModal.tsx` — oculta el bloque "Tallas" completo
      cuando `product.hasSizes === false`.

90 tests nuevos (`components/admin/products/__tests__/` + `helpers/`). Branch coverage 100% en
`ProductForm` y `ProductCategoryView`; 97.05% en `ProductDetailModal` — la única rama restante es
`reduceMotion ? 0 : 16` del desplazamiento de entrada (framer-motion), mismo tipo de gap aceptado
que `reduceMotion: true` en `OrderDetailModal` (Fase 6). Ver el `__tests__/README.md` de la
carpeta.

**Bug real encontrado y corregido durante esta fase**: `ProductForm.tsx` fugaba los `blob:`
previews de la galería. El `useEffect` de limpieza al desmontar tenía deps `[]`, así que su
cleanup cerraba sobre el `newImages` del momento del MONTAJE (siempre vacío) y nunca sobre el
estado real al desmontar — ninguna imagen agregada durante la sesión se revocaba. Mismo patrón de
closure obsoleta que el bug de `CodeInput` (Fase 5). Arreglado con un ref sincronizado por un
segundo efecto, que la cleanup sí lee al vuelo.

Dos invariantes del reintento de imágenes llegaron a estar **en verde sin estar probadas** (el
reporte marcaba 100% de branches en `ProductForm` de todos modos, porque no son ramas sino orden
y bookkeeping dentro del `mutationFn`): que el borrado de imágenes va **antes** de la subida
—libera cupo dentro del tope de 3— y que un `publicId` ya borrado se saca de `removedPublicIds`
para que un reintento no vuelva a pegarle a una imagen fantasma. Se detectaron rompiendo el
fuente (invertir el orden / quitar el `setRemovedPublicIds`) y comprobando que la suite seguía
verde; hoy cada una tiene su aserción y ambas mutaciones fallan.

Otra trampa (no un bug, una particularidad del entorno de test): un `<input type="number"
step={1}>` bloquea el `submit` del lado del **navegador** cuando el valor no calza con el step
(p. ej. `"2.5"` en `stockQuantity`) — el evento nunca llega a React. Probar la rama `.int()` de
zod para ese campo necesitó `fireEvent.submit(form)` en vez de un clic normal en el botón.

## Fase 8 — Admin: Cupones y Gastos ✅

- [x] `components/admin/coupons/CouponForm.tsx` — reglas cruzadas del formulario (porcentaje ≤
      100%, tope solo en tipo porcentaje, fin > inicio) espejo del backend.
- [x] `components/admin/coupons/CouponsTable.tsx` — "Cancelar" es `PUT { active:false }`, no
      delete; usa `couponStatus.ts` (ya con specs) para el badge de estado.
- [x] `components/admin/expenses/ExpenseForm.tsx` — nunca manda `amount`/`amountEffectiveFrom`
      (eso vive en `ExpenseAmountForm`, formulario separado a propósito).
- [x] `components/admin/expenses/ExpenseAmountForm.tsx` — cada envío agrega una **versión** con
      fecha, nunca sobreescribe historial.
- [x] `components/admin/expenses/ExpenseHistory.tsx` + `ShippingCostNote.tsx` — el costo de envío
      derivado se muestra pero nunca se suma a totales/categorías (ya restado en GANANCIA BRUTA).
      `ShippingCostNote` se prueba desde sus **dos** consumidores (historial y tarjeta de resumen):
      existe compartido justamente porque la advertencia se pinta en dos pantallas.
- [x] `components/admin/expenses/ExpensesTable.tsx` — la gemela de `CouponsTable`: "Dar de baja" es
      `PUT { active:false }`, no delete; "Cambiar precio" es su propia acción, separada de editar
      (el monto es una versión fechada, no una columna); `RunRateCell` pinta "—" y nunca "$0.00".
- [x] `components/admin/expenses/ExpenseSummaryCard.tsx` — `monthlyRunRate` y `upcomingTotal` son
      cifras independientes (sumarlas sería contar dos veces); la nota de los `once` que no entran
      al run-rate; el tope de cuatro categorías; el timeline agrupado por fecha y el recorte "ver
      más".
- [x] `components/admin/expenses/ExpenseStateBadge.tsx` — los cinco estados con tonos disjuntos
      (`cobrado` y `terminado` son los dos pasado y comparten familia, pero no tono).

40 tests nuevos en `components/admin/coupons/__tests__/` (`CouponForm` + `CouponsTable`) y 117 en
`components/admin/expenses/__tests__/` (`ExpenseForm` + `ExpenseAmountForm` + `ExpenseHistory` +
`ShippingCostNote` + `ExpensesTable` + `ExpenseSummaryCard` + `ExpenseStateBadge`). Branch coverage
100% en todo `expenses/` salvo `ExpenseForm` (90.32%), y 100% en `CouponsTable` — 92.3% en
`CouponForm`.

Las ramas que quedan fuera **no son todas el mismo tipo de gap**, y por eso se listan una por una
en el `__tests__/README.md` de cada carpeta en vez de agruparse bajo una sola justificación:

- **Controles que no pueden fallar su propia validación** (las 3 de `ExpenseForm` y 2 de
  `CouponForm`): un `<select>` acotado a un enum, y un `<input type="date">`, que normaliza
  cualquier texto fuera de formato antes de que React lo vea.
- **Un error bloqueado por el DOM antes de zod** (`errors.description` en `CouponForm`): el único
  mensaje posible es "Máximo 200 caracteres" y el `maxLength={200}` nativo del input ya impide
  teclear o pegar más allá de eso.
- **Código defensivo muerto** (el `?? ""` de `current[field]` en `CouponForm`): no es un error de
  campo — `useWatch` corre sobre un formulario cuyos `defaultValues` ya traen las cinco claves de
  `CLEARABLE_LABELS` como string, así que ese valor nunca es `undefined` en ejecución real.
- **`formatY` de `ExpenseHistory` no es una rama sin cubrir sino una función entera**: el branch %
  de ese archivo es 100%; lo que el reporte marca es su statement (y el 57% de `% Funcs`). Solo la
  invoca `<YAxis tickFormatter={formatY}>`, y sin dimensiones reales `ResponsiveContainer` no
  renderiza el eje en jsdom.

Mismo criterio, en los cuatro casos, que los gaps de `reduceMotion`/`step` ya aceptados en
`orders/`/`products/__tests__/README.md`.

**Bug real encontrado y corregido durante esta fase**: `ExpenseForm.tsx` fallaba en silencio al
guardar. El campo "Fecha de término" (y su `FieldError`) solo existen en el DOM cuando
`frequency !== "once"`, pero react-hook-form no desregistra un input al desmontarlo por default
(`shouldUnregister: false`) — un `endsAt` tecleado en mensual sobrevivía el cambio a "única vez" y
`superRefine` seguía rechazándolo al enviar, sin ningún mensaje visible que lo explicara (vivía
dentro del mismo bloque condicional ya invisible). Se arregló con un `useEffect` que limpia
`endsAt` en cuanto `frequency` se vuelve `"once"`, en vez de solo esconder el campo. Se verificó
rompiéndolo de nuevo y confirmando que la prueba correspondiente fallaba — mismo patrón de bug que
`CodeInput` (Fase 5) y `ProductForm` (Fase 7), aunque de naturaleza distinta (aquí RHF *conserva*
el valor de un campo desmontado en vez de perderlo).

La ambigüedad de texto es la trampa recurrente de este módulo y aparece en las tres pantallas
(documentada en `expenses/__tests__/README.md`): el total del mes activo de `ExpenseHistory`
coincide con el monto de un `byExpense` de un solo renglón; "Monto vigente" y "Carga mensual" son
el mismo número en un gasto mensual (los casos que prueban ambas columnas usan uno **semanal**); y
el `upcomingTotal` de `ExpenseSummaryCard` coincide con el total del día cuando la ventana trae un
solo bloque. En los tres casos las aserciones se acotan (`heading.nextElementSibling`,
`within(fecha.parentElement)`) o las fixtures se eligen para que los números difieran, en vez de
buscar el texto suelto.

Cada invariante nueva se verificó rompiendo el fuente: "Dar de baja" convertido en delete, el
`RunRateCell` pintando "$0.00", el `PriceHistoryHint` apareciendo sin cambios, el tope de
categorías subido a 5, el monto por cargo repetido con un solo cargo en el día, el envío derivado
sumado a la carga mensual, y `cobrado` compartiendo tono con `terminado` — las siete mutaciones
hacen fallar la suite.

> Quedan sin specs `CouponsSection.tsx` y `ExpensesSection.tsx` (los contenedores), que **no los
> reclama ninguna fase** — mismo caso que `OrdersSection` en la Fase 6. Son quienes deciden qué
> mandar al backend: el `couponWriteErrorMessage`, el `deactivated: true` del DELETE de cupones
> (soft-deactivate cuando ya hay canjes) y la invalidación de queries tras cada escritura. Es lo
> más delicado que sigue descubierto del módulo — anotado en la Fase 9 junto a `OrdersSection`.

## Fase 9 — Admin: Dashboard, Reportes, Config ✅

- [x] `components/admin/data/KpiGrid.tsx` — render genérico por label (el KPI "COSTO DE ENVÍO" con
      `trend.positive` invertido a propósito — verificar que el signo se lea bien, no el número).
- [x] `components/admin/data/SalesTable.tsx` — paginación 5/página + filtro por día, client-side.
- [x] `components/admin/data/InventoryTable.tsx`, `RevenueChart.tsx` — render básico con datos
      precomputados del backend (nada de matemática local salvo lo ya cubierto en specs puros).
- [x] `components/admin/reports/SalesReport.tsx` / `ReplenishmentReport.tsx` — selector de mes,
      export CSV (`csvField` con BOM — verificar que el nombre de archivo sea
      `ventas-<YYYY-MM>.csv` / `reposicion-<YYYY-MM>.csv`). El **selector de mes** resultó vivir en
      `ReportsSection`, no en los reportes, así que se probó ahí (mes por defecto = el último
      completo, y su reconciliación cuando el set de meses cambia bajo los pies).
- [x] `components/admin/config/AccountCard.tsx` — requiere `currentPassword` para cualquier cambio.
- [x] `components/admin/config/AdminsCard.tsx` — listar/agregar/quitar admins.
- [x] `components/admin/sections/OrdersSection.tsx` — quedó fuera de la Fase 6 (que cubrió los
      subcomponentes de `components/admin/orders/`) y es lo más delicado que sigue sin specs del
      módulo de pedidos: `perPage` 20 desktop / 5 mobile vía `matchMedia`; el toast de Sileo, que
      debe sonar **solo** cuando el refetch automático encuentra una firma de renglón distinta
      (`status|paymentStatus|shipmentStatus|labelUrl|trackingNumber`) — nunca en la primera carga,
      nunca tras un refresh manual, nunca tras cancelar desde el modal; y el filtro por día, que es
      server-side aquí (a diferencia de `SalesTable`).
- [x] `components/admin/sections/CouponsSection.tsx` + `ExpensesSection.tsx` — quedaron fuera de la
      Fase 8 (que cubrió los subcomponentes de `coupons/` y `expenses/`) por el mismo motivo que
      `OrdersSection` quedó fuera de la Fase 6: los subcomponentes reciben `onSubmit`/`onToggleActive`
      como props y son estas secciones las que deciden qué mandar al backend. Lo que falta probar es
      justo eso: `couponWriteErrorMessage`, el `deactivated: true` del DELETE de cupones (el backend
      hace soft-deactivate cuando el cupón ya tiene canjes, y la UI debe reportar lo que de verdad
      pasó, no lo que pidió), y que cada escritura invalide las queries correctas.
- [x] `components/admin/sections/DataSection.tsx` + `ConfigSection.tsx` — no estaban en la lista
      original, pero son los contenedores de las dos pantallas que sí nombra el título de la fase.
      `DataSection` decide **qué ventana de tiempo se mira**, y ese dato viaja por dos caminos que
      tienen que coincidir (el rótulo "últimos N días" y el índice de `kpisByPeriod`); `ConfigSection`
      tiene una sola decisión, pero importa: cerrar sesión limpia el store **y** navega.

210 tests nuevos: 43 en `components/admin/data/__tests__/`, 45 en `reports/__tests__/`, 40 en
`config/__tests__/` y 82 en `sections/__tests__/`. Branch coverage 100% en `KpiGrid`, `SalesTable`,
`InventoryTable`, `RevenueChart`, `SalesReport`, `ReplenishmentReport`, `formUi`, `OrdersSection`,
`DataSection` y `ConfigSection`; 96% en `ReportsSection`, 96.36% en `ExpensesSection`, 95.12% en
`CouponsSection`, 97.05% en `AdminsCard` y 92.85% en `AccountCard`. Cada carpeta tiene su
`__tests__/README.md` con las ramas que quedan fuera, una por una — todas son código defensivo
inalcanzable desde la UI real (`?? null` sobre un `variables` que TanStack Query siempre fija,
`?? ""` bajo un guard que ya garantiza el valor, un `<select>` acotado a un enum) más el `formatter`
del tooltip de recharts, que jsdom no llega a activar.

**Se verificaron 21 invariantes rompiendo el fuente** y comprobando que la suite falla: el color
invertido de la tendencia, el envío fuera de la ganancia por fila, el corte de `StockBadge`, el BOM
del CSV, el centinela 999 pintado como cobertura, la comparación de ids sin `String()`, la
contraseña nueva mandada siempre, "Cancelar"/"Dar de baja" convertidos en delete, el `code` en la
edición de un cupón, el `deactivated` ignorado, la invalidación del dashboard, el monto colado en la
edición de un gasto, el mes por defecto parcial, el mes elegido sin reconciliar, los KPIs de
rentabilidad clavados en 30 días, el logout sin navegación, y las cuatro supresiones del toast de
pedidos.

**Dos bugs reales encontrados y corregidos durante esta fase:**

1. **`OrdersSection.tsx` — el toast se apagaba solo.** `isManualRefreshRef` se limpia dentro del
   efecto que compara firmas, y ese efecto dependía de `[data, …]`; pero TanStack Query **comparte
   estructura**: si un refetch devuelve exactamente lo mismo, `data` conserva la misma referencia y
   el efecto no vuelve a correr. Un refresh manual que no encontraba nada nuevo —el caso más común,
   porque el dueño refresca justo para ver si cambió algo— dejaba la marca armada para siempre, y el
   **siguiente** refetch automático se comía su aviso en silencio. Arreglado agregando
   `dataUpdatedAt` a las dependencias. Es el tercer bug de esta familia (`CodeInput` Fase 5,
   `ProductForm` Fase 7, `ExpenseForm` Fase 8).
2. **`AccountCard.tsx` y `AdminsCard.tsx` — ocho campos sin etiqueta accesible.** Los `<label>` eran
   hermanos de sus inputs, sin `htmlFor` ni anidamiento: para un lector de pantalla los campos no
   tenían nombre (dos `<input type="password">` indistinguibles entre sí) y hacer clic en la
   etiqueta no enfocaba el campo. Salió a la luz porque `getByLabelText` falla con *"no form control
   was found associated to that label"*. Corregido con `htmlFor`/`id`, que es el patrón que ya
   seguían `ExpenseForm`, `CouponForm` y `ProductForm` — las tarjetas de configuración eran las
   únicas del panel sin él. (Del mismo tipo, pero **no** un bug —nada estaba roto para nadie— es el
   `role="group"` + `aria-label` que ganó el selector de periodo de `DataSection.tsx`: sus tres
   botones ya tenían nombre propio, el que faltaba era el del contenedor, y `RevenueChart` pinta
   otros tres con las mismas etiquetas. Es el único cambio de fuente de esta fase que no salió de
   un defecto; se documenta en `sections/__tests__/README.md`.)

`RevenueChart` cerró un hueco que la Fase 8 había dado por incubrible: mockeando
`recharts.ResponsiveContainer` para clonar a su hijo con dimensiones fijas, el gráfico sí renderiza
en jsdom y las dos ramas de `formatY` se leen del DOM. **El mismo truco sirve para el `formatY` de
`ExpenseHistory`**, anotado como gap en `expenses/__tests__/README.md`.

> Siguen sin specs, y no los reclama ninguna fase: `BrandSection.tsx` (autosave con debounce, logo
> como preview `blob:` no persistido) y `ProductSection.tsx` (contenedor de `ProductForm` +
> `ProductCategoryView`, ambos ya cubiertos en la Fase 7). `ImportSection.tsx` está en la misma
> situación desde la Fase 13, con sus subcomponentes cubiertos y el contenedor no.

## Fase 10 — UI compartida y home (baja prioridad) ✅

Mayormente presentacional; útil pero de menor riesgo que lo anterior.

- [x] `components/ui/Cart.tsx` — fila oculta si `item.size === 0`.
- [x] `components/ui/ImageCarousel.tsx` — respeta `useReducedMotion()`.
- [x] `components/ui/FormControls.tsx` — `TextField`/`SelectField` compartidos por checkout/auth.
- [x] `components/home/Hero.tsx` — conteo de piezas por categoría vía `getProducts({ categoria,
      perPage: 1 })`, solo lee `total`.
- [x] `components/home/NavHeader.tsx`, `Footer.tsx`, `CategoryCard.tsx` — smoke tests de render y
      links.

66 tests nuevos: 21 en `Cart.test.tsx`, 12 en `ImageCarousel.test.tsx`, 11 en
`FormControls.test.tsx` (`components/ui/__tests__/`), 6 en `Hero.test.tsx`, 8 en
`NavHeader.test.tsx`, 4 en `Footer.test.tsx`, 4 en `CategoryCard.test.tsx`
(`components/home/__tests__/`). Branch coverage 100% en `FormControls`, `Hero`, `Footer` y
`CategoryCard`; 95.23% en `NavHeader`; 92.3% en `Cart`; 91.17% en `ImageCarousel`. Statements/lines/
funcs 100% en los siete archivos. Cada carpeta tiene su `__tests__/README.md` y su propio
`helpers/factories.ts` (los de `home/` están duplicados de los de `ui/` a propósito: un `__tests__/`
no importa de una carpeta hermana, mismo criterio que el `apiError.ts` duplicado entre `checkout/` y
`auth/`).

**Bug de infraestructura encontrado y corregido**: `jest.setup.ts` stubeaba `matchMedia` (para
`useReducedMotion()`) pero no `IntersectionObserver`, que framer-motion necesita para
`whileInView` — nadie lo había notado porque ningún test anterior montaba un componente con esa
prop. `Hero.tsx` y `Footer.tsx` (ambos de esta fase) la usan, y sin el stub cualquier intento de
montarlos revienta con `ReferenceError: IntersectionObserver is not defined`. Se agregó un mock
mínimo (`observe`/`unobserve`/`disconnect` no-op), mismo patrón que el stub de `matchMedia` ya
existente.

**Hallazgo real, documentado pero no "arreglado"**: el estado `navigating` de `Cart.tsx` (el
"Cargando..." + spinner del botón de checkout) nunca es visible. `setNavigating(true)`,
`closeCart()` y `router.push()` viajan en el mismo handler síncrono; React los agrupa en un solo
render, así que `isOpen` ya es `false` en ese primer render posterior al clic —
`AnimatePresence` anima la salida usando el **último árbol que sí se pintó** (con
`navigating: false`, de antes del clic), no uno intermedio. Verificado con un test que hace clic y
confirma que el botón sigue diciendo "Proceder al checkout" y que "Cargando..." no aparece en el
DOM. No se tocó el componente: decidir si el carrito debe
permanecer abierto durante la navegación (para que el loading sí se vea) es una decisión de
producto fuera del alcance de este roadmap — ver `components/ui/__tests__/README.md`.

Las ramas que quedan fuera son, otra vez, el patrón `reduceMotion ? 0 : ...` de framer-motion (el
stub global de `matchMedia` fija `reduceMotion` en `false` siempre) más un guard defensivo muerto
en `ImageCarousel.paginate` (`if (count === 0) return`, inalcanzable porque las flechas que lo
llaman no se renderizan con `count === 0`) y la rama de hidratación SSR de `useSyncExternalStore`
en `NavHeader` (mismo gap ya aceptado en `AdminGuard`, Fase 5) — una por una en cada README, no
agrupadas.

Cada invariante de esta fase se verificó rompiendo el fuente y confirmando que la suite falla: la
fila de talla sin el guard `size > 0`, el `atMax` del botón `+` fijado en `false`, el `perPage: 1`
de `Hero` subido a 24, el listener de `mousedown` de `NavHeader` quitado, y el
`if (isOpen) setNavigating(false)` de `Cart` eliminado — esta última empezó **verde** con el test
original (que montaba el carrito ya cerrado, donde `navigating` nunca había sido `true`) y solo
falla desde que el test hace el viaje completo: clic en checkout → reabrir → aserción.

---

## Fuera de alcance (por ahora)

- `lib/api/*` — contratos delgados, cubiertos indirectamente.
- `components/legal/*`, `components/about/AboutUs.tsx` — copy estático, bajísimo riesgo de romperse.
- E2E/Playwright — no reintroducir sin pedirlo explícitamente.
