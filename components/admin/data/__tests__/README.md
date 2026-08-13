# Tests de Admin: Dashboard (pestaña "Datos")

Los cuatro componentes de `components/admin/data/`. Un archivo por módulo, mismo nombre que el
módulo que prueba:

| Archivo | Cubre |
|---|---|
| `KpiGrid.test.tsx` | Render genérico por label; el signo de la tendencia sale de `trend.positive`, **nunca** del número (el KPI `COSTO DE ENVÍO` llega con `positive` invertido a propósito); `trend`/`subtitle` presentes y ausentes |
| `SalesTable.test.tsx` | Paginación 5/página y filtro por día **client-side**; la ganancia por fila resta el envío; el estado vacío de un día sin ventas; la ventana `min`/`max` del date picker |
| `InventoryTable.test.tsx` | Los tres tramos de `StockBadge`; `TypeBadge` con tipos conocidos y desconocidos; el total sobre TODAS las filas, no sobre la página; la paginación de cards y sus placeholders de altura |
| `RevenueChart.test.tsx` | Selector de periodo (7/30/90) y que el gráfico repinte la serie correcta; las dos ramas de `formatY` en el eje Y |
| `helpers/` | **No es una suite**: `factories` (`makeKpi`, `makeSaleRow(s)`, `makeInventoryRow(s)`, `makeRevenuePoints`) |

No hay `helpers/render.tsx` ni `helpers/apiError.ts`: ninguno de los cuatro componentes hace una
llamada HTTP ni monta una query — todos reciben datos ya derivados por el backend como props, y es
`DataSection` quien los pide. Ese contenedor tiene sus propios specs en
`components/admin/sections/__tests__/DataSection.test.tsx`, junto a las demás secciones.

## Qué ordena estas suites

**El signo de un KPI no es el signo de su número.** `KpiCard` colorea por `trend.positive`, y el
backend manda ese campo INVERTIDO para `COSTO DE ENVÍO` (`positive: true` = el costo bajó). Dos
casos fijan esa lectura en ambos sentidos, para que nadie "arregle" el componente deduciendo el
color del texto de la etiqueta y pinte de verde un envío más caro.

**La ganancia de una venta resta el envío** (`total − shipping − costoTotal`, Fase 22). La fixture
usa $2,000 de total, $160 de guía y $840 de costo: con el término de envío da $1,000.00 / 50%, sin
él daría $1,160.00 / 58% — la aserción falla si alguien lo quita. La card móvil calcula lo suyo por
separado, así que tiene su propio caso: no es la misma línea de código.

**`SalesTable` es la única tabla del panel que pagina y filtra en el cliente.** Su gemela de
pedidos, `OrdersSection`, pide cada página y cada día al backend. Las dos suites no son
intercambiables, y por eso aquí se prueba que elegir o limpiar un día **vuelve a la página 1**:
sin ese reset, filtrar desde la página 3 dejaría `page` fuera de rango.

El orden de las fixtures de días tampoco es decorativo. Los dos `reduce` que calculan `minDay` y
`maxDay` solo ejecutan su rama "quédate con el segundo" si los días llegan desordenados; con la
lista ya ordenada, media condición de cada comparador nunca corre y el reporte lo marca igual.

**`InventoryTable` pagina solo las cards.** La tabla de escritorio pinta todas las filas, y su
total suma sobre `rows` completo — el caso lo comprueba cambiando de página y verificando que el
total no se mueva. Los placeholders invisibles de la última página corta (que evitan el salto de
altura) se cuentan por `[aria-hidden="true"].invisible`: 3 huecos con 2 filas reales, 0 cuando solo
hay una página.

jsdom no aplica media queries: cards (`xl:hidden`) y tabla (`hidden xl:block`) coexisten en el DOM,
mismo patrón que `OrdersTable`/`CouponsTable`. Las aserciones que necesitan unicidad se acotan con
`within`. En `InventoryTable` se acotan al **`<tbody>`**, no a la tabla: el `<tfoot>` repite los
mismos formatos y un inventario de una sola pieza tiene el mismo total que su renglón.

## `ResponsiveContainer` en jsdom

`RevenueChart.test.tsx` mockea `recharts.ResponsiveContainer` para clonar a su hijo con
dimensiones fijas (800×260). Sin eso, recharts mide 0×0 y no pinta ni un eje — que es justo por lo
que `ExpenseHistory.test.tsx` dio `formatY` por incubrible. **Aquí sí se cubre**: con el mock, los
ticks del eje Y se renderizan y las dos ramas del formateador (`$0` sin abreviar, `$2.0k` en miles)
se leen del DOM. Si algún día se toca `ExpenseHistory`, ese hueco se puede cerrar igual.

## Ramas aceptadas sin cubrir (gap documentado, no un olvido)

- **El `formatter` del `<Tooltip>` de `RevenueChart`** (líneas 103–108). El tooltip se monta —hay un
  caso que lo comprueba— pero vacío y oculto: recharts 3 decide el punto activo en un pipeline de
  eventos punteros que jsdom no reproduce. Se intentó `mouseMove` y `pointerMove` sobre el wrapper
  y sobre `.recharts-surface`, con `offsetX/offsetY` y con `getBoundingClientRect` parchado; el
  `.recharts-tooltip-wrapper` sigue en `visibility: hidden` y sin punto activo. Es un formateador
  de moneda para el hover, sin lógica de negocio detrás. Mismo criterio que los gaps de
  `reduceMotion` aceptados en `orders/`/`products/__tests__/README.md`.
