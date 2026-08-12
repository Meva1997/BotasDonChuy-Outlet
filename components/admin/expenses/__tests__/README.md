# Tests de Admin: Gastos

Gastos y suscripciones, y el envío derivado que comparten con el dashboard. Un archivo de test
por módulo, mismo nombre que el módulo que prueba:

| Archivo | Cubre |
|---|---|
| `ExpenseForm.test.tsx` | Alta/edición: el monto solo existe en el alta (en edición vive en `ExpenseAmountForm`, formulario aparte), el toggle "única vez" esconde la fecha de término, y las reglas cruzadas de `schemas/expenses.ts` |
| `ExpenseAmountForm.test.tsx` | Cada envío agrega una **versión** fechada, nunca sobreescribe: el historial se prueba en sus dos direcciones (sube/baja) y en el caso sin "anterior" (la versión más vieja) |
| `ExpenseHistory.test.tsx` | Carga/error/vacío de su propia query lazy, el selector de mes, el aviso de mes en curso (`partial`), los cambios de precio del mes en sus tres direcciones, y los dos estados vacíos independientes ("Por categoría" / "Por gasto") |
| `ExpensesTable.test.tsx` | "Dar de baja" es `PUT { active:false }`, no delete (y "Reactivar" toma su lugar); "Cambiar precio" es su propia acción, separada de editar; el flujo de confirmación de borrado; `RunRateCell` pintando "—" en vez de "$0.00" |
| `ExpenseSummaryCard.test.tsx` | Los dos números grandes como cifras independientes, la nota de los `once` que no entran al run-rate, el tope de cuatro categorías, el timeline agrupado por fecha y el recorte "ver más" |
| `ShippingCostNote.test.tsx` | La línea derivada de envío: sin controles, con las dos advertencias de "no la sumes/captures dos veces" |
| `ExpenseStateBadge.test.tsx` | La etiqueta de cada uno de los cinco estados y la invariante de tonos disjuntos |
| `helpers/` | **No son suites**: `factories` (`makeExpense`, `makeExpenseAmountVersion`, `makeExpenseMonth`, `makeDerivedShippingCost`, `makeExpenseSummary`, `makeUpcomingCharge`), `render` (QueryClientProvider, solo lo usa `ExpenseHistory`) |

Ni `ExpenseForm` ni `ExpenseAmountForm` hacen la llamada HTTP de escritura ellos mismos (reciben
`onSubmit` como prop, igual que `CouponForm` — ver `coupons/__tests__/README.md`), así que tampoco
tienen `helpers/apiError.ts`: no hay `AxiosError` que simular en estas suites.

## Bug real encontrado y corregido durante esta fase

`ExpenseForm.tsx` fallaba en silencio al guardar. El campo "Fecha de término" solo existe en el
DOM cuando `frequency !== "once"` (`{!isOnce && (<div>…<FieldError message={errors.endsAt?.message}
/>…</div>)}`) — pero react-hook-form no desregistra un input al desmontarlo por default
(`shouldUnregister: false`), así que un valor tecleado en "mensual" sobrevivía el cambio a "única
vez". `superRefine` seguía rechazando ese valor fantasma al enviar, pero el mensaje de error vivía
dentro del mismo bloque condicional que el input ya invisible — el dueño hacía clic en "Crear
gasto" y no pasaba nada, sin ninguna pista de por qué. Se arregló con un `useEffect` que limpia
`endsAt` en cuanto `frequency` se vuelve `"once"`, en vez de solo esconder el campo. Se verificó
rompiéndolo de nuevo (quitando el `useEffect`) y confirmando que
`cambiar a única vez limpia una fecha de término ya tecleada` fallaba — mismo criterio que los
bugs de closure obsoleta de `CodeInput` (Fase 5) y `ProductForm` (Fase 7), aunque de naturaleza
distinta (aquí el problema es que RHF *conserva* el valor de un campo desmontado, no que lo
pierde).

## Qué ordena estas suites

La separación **monto vs. edición** es la regla que gobierna `ExpenseForm`/`ExpenseAmountForm`: en
el backend el monto no es una columna del gasto, es una versión fechada (`expense_amounts`).
Mezclar los dos formularios haría que corregir un typo en el concepto repreciara el gasto sin
querer. Por eso `ExpenseForm.test.tsx` verifica que los campos de monto **desaparecen por
completo** en edición (no solo se deshabilitan) y que el payload de edición nunca lleva
`amount`/`amountEffectiveFrom`; `ExpenseAmountForm.test.tsx` verifica lo contrario: que cada envío
es una versión nueva, nunca una sobreescritura, leyendo el historial que el propio formulario
pinta.

`ExpenseHistory.tsx` monta su query lazy (mismo precedente que `ReplenishmentReport`) y depende
de `ResponsiveContainer` de recharts, que en jsdom nunca recibe dimensiones reales — sus hijos
(`BarChart`, `XAxis`, `YAxis`) no llegan a pintarse con contenido medible, así que estas suites no
intentan ejercitar la gráfica en sí (clics sobre una barra, ticks del eje Y): se limitan al
selector de mes y al detalle, que son HTML plano. La ambigüedad de texto es la trampa recurrente
de esta pantalla: el total del mes activo y el monto de un `byExpense` con un solo renglón
coinciden casi siempre en las fixtures de prueba (mismo número, dos elementos), así que las
aserciones de total se acotan al hermano directo del `<h3>` del mes (`heading.nextElementSibling`)
en vez de buscar el texto suelto.

La misma ambigüedad reaparece en las otras dos pantallas y se resuelve igual, acotando en vez de
buscar texto suelto:

- `ExpensesTable` — "Monto vigente" y "Carga mensual" son el mismo número en un gasto **mensual**,
  así que el caso que prueba las dos columnas usa un gasto **semanal** ($290 semanales → $1,256.67
  al mes). Con un mensual la aserción no distinguiría una columna de la otra.
- `ExpenseSummaryCard` — el `upcomingTotal` del encabezado coincide con el total del día cuando la
  ventana trae un solo bloque. Los casos que necesitan unicidad reparten los cargos en dos fechas
  distintas, o acotan al bloque del timeline vía `within(fecha.parentElement)`.

`priceChangeDelta`/`priceChangeLabel` ya tienen specs puros en `expenseStatus.test.ts` — aquí solo
se verifica que el color de cada cambio de precio siga la dirección correcta, en sus tres ramas
(sube/baja/sin variación), porque el reporte de cobertura por statements/líneas no distingue "vi
un cambio" de "vi los tres colores posibles". Mismo criterio en `ExpensesTable`/`ExpenseSummaryCard`:
`expenseState`, `countsTowardRunRate`, `dayLabelShort`, `groupUpcomingChargesByDate` y
`upcomingWindowRangeLabel` ya están probados como módulo puro — estas suites solo verifican que los
componentes los **usen**, no vuelven a probar su lógica.

**`ShippingCostNote` se prueba en sus dos consumidores, no solo en uno.** El componente existe
compartido precisamente porque la advertencia se pinta en dos pantallas y las dos tienen que decir
lo mismo; probarlo únicamente desde el historial dejaría fuera la mitad de la razón por la que no
está copiado y pegado. `ExpenseSummaryCard.test.tsx` además fija la invariante que ordena la Fase
22 desde el lado de la tarjeta: el monto del envío **no** entra en `monthlyRunRate` ni en
`upcomingTotal` (ya está restado en GANANCIA BRUTA; sumarlo aquí lo restaría dos veces).

`ExpensesTable` es la gemela de `CouponsTable` y se prueba con el mismo criterio, porque comparte
el contrato que más fácil se rompe sin querer: **"Dar de baja" es `PUT { active: false }`, no un
delete** — el histórico de los meses en que sí se pagó se conserva y el gasto se puede reactivar.
El otro caso propio de esta tabla es que "Cambiar precio" sea un botón aparte de "Editar": en el
backend el monto es una versión fechada, así que repreciar y corregir un typo en el concepto no
pueden salir del mismo formulario.

El estado clock-dependiente se evita en vez de congelarse: las fixtures usan solo los estados
estables contra el reloj real (`activo` con `startsAt` pasado, `inactivo` con `active: false`), y
las cinco ramas de precedencia de `expenseState` viven en `expenseStatus.test.ts`, que sí inyecta
`today`. `ExpenseSummaryCard` calcula el rótulo esperado de la ventana llamando a
`upcomingWindowRangeLabel(60)` en vez de hardcodear fechas, por el mismo motivo.

## Gap aceptado (documentado, no un olvido)

`formatY` (el formateador del eje Y de la gráfica: `"$1.2k"` vs. `"$340"`) queda sin cubrir. **No
es una rama sin ejercitar sino una función entera**: el branch % de `ExpenseHistory.tsx` es 100%, y
lo que el reporte marca en rojo son sus statements (y el 57% de `% Funcs` de ese archivo). No está
exportada y solo la invoca `<YAxis tickFormatter={formatY}>` — sin dimensiones reales,
`ResponsiveContainer` no renderiza el eje en jsdom, así que no hay forma de ejercitarla desde una
suite de componente sin depender de detalles internos de recharts. Mismo criterio que los gaps de
`reduceMotion`/`step` ya aceptados en `orders/`/`products/__tests__/README.md`.

Las tres ramas restantes de `ExpenseForm.tsx` (90.32% de branches) sí son ramas, y son los
`errors.<campo>?.message` de tres controles que no pueden fallar su propia validación desde la UI
real: `category` y `frequency` son `<select>` acotados a un enum, y `amountEffectiveFrom` es un
`<input type="date">`, que normaliza cualquier texto fuera de formato antes de que React lo vea.

## Convenciones

- Toda fixture sale de `helpers/factories` (`makeExpense`, `makeExpenseAmountVersion`,
  `makeExpenseMonth`, `makeDerivedShippingCost`, `makeExpenseSummary`, `makeUpcomingCharge` —
  mismo criterio que `coupons/orders/products/__tests__/helpers/factories.ts`: defaults mínimos
  válidos + `overrides`). El default de `makeExpense` es un gasto mensual activo, sin fecha de
  término, con una sola versión de monto — el estado con más ramas disponibles a la vez. El de
  `makeExpenseSummary` es el estado más "callado" de la tarjeta (un cargo próximo, ningún `once`),
  para que cada aviso condicional aparezca solo cuando el caso lo pide en sus `overrides`.
- `jest.mock("../../../../lib/api/adminExpenses", ...)` usa ruta relativa, no `@/lib/api/...` — el
  alias de Next no lo resuelve dentro de `jest.mock()` (ver `CLAUDE.md`).
- Cada invariante de esta tabla se verificó rompiendo el fuente a propósito y confirmando que la
  suite fallara: el bug de `endsAt` fantasma descrito arriba, las tres direcciones del color de un
  cambio de precio, el "Dar de baja" que llama a `onToggleActive` y no a un delete, el `RunRateCell`
  que pinta "—" y no "$0.00", el `PriceHistoryHint` que no aparece sin cambios, el tope de cuatro
  categorías, el monto por cargo que no se repite cuando el día trae uno solo, el envío derivado
  que no se suma a los totales de la tarjeta, y los tonos disjuntos de `cobrado`/`terminado`.
