# Tests de Admin: Reportes

Las dos pestañas de la sección "Reportes". Un archivo por módulo:

| Archivo | Cubre |
|---|---|
| `SalesReport.test.tsx` | Utilidad bruta y margen del mes; la utilidad **neta** y su cruce con `getExpenseHistory` (los tres "no se sabe": en vuelo, error con reintento, y mes sin match — nunca $0.00); el aviso de ventanas desiguales del mes en curso; que el envío derivado **no** se resta; la comparación contra el mes anterior y sus **dos** formas de no existir; el mes parcial; "Productos más vendidos" (orden por unidades vendidas, utilidad por producto en pesos además del % de margen, y los productos sin ventas ese mes excluidos de la tabla); el documento imprimible (mismos productos filtrados que la pantalla, KPIs + precio unitario promedio + categorías + aviso de mes en curso, botón gateado por la query de gastos, reimpresión sin `afterprint`, y limpieza por `afterprint`) |
| `ReplenishmentReport.test.tsx` | Su query propia (pending/error/reintento); los "—" que evitan leer un cero o el centinela 999 como un dato; los tres tramos de cobertura y las tres prioridades; el banner de método y el rango de historial; el CSV |
| `helpers/` | **No son suites**: `factories` (`makeMonthlyReport`, `makeExpenseMonth`, `makeReplenishmentRow`), `render` (QueryClientProvider), `download` (intercepta el `<a download>` de la exportación) |

El selector de mes **no se prueba aquí**: vive en `ReportsSection`, que es quien decide el mes por
defecto (el último completo, no el parcial) y lo reconcilia contra los datos. Ver
`components/admin/sections/__tests__/ReportsSection.test.tsx`.

## Qué ordena estas suites

**Un cero y un centinela no son datos.** `ReplenishmentReport` pinta "—" en cuatro lugares
distintos —cobertura 999, margen 0, sugerido 0, costo 0— y cada uno tiene su caso, incluido el
negativo (`queryByText("$0.00")` ausente). Un "$0.00" en la columna de inversión sugerida se lee
como "reponerlo sale gratis"; un "999d" de cobertura se lee como tres años de inventario cuando en
realidad significa que el producto no se vende. En el CSV el mismo centinela viaja como texto
(`sin ventas`) para que nadie lo promedie con los días reales de las otras filas.

**Comparar contra el mes anterior tiene dos huecos, no uno.** `trendVsPrev` devuelve `null` tanto
en el primer mes del historial (no hay contra qué comparar) como cuando el mes previo facturó $0
(la división daría `Infinity`). Son dos `return null` distintos, con un caso cada uno. El mes plano
(`diff === 0`) cuenta como positivo — es el borde de `diff >= 0`.

**El CSV de `ReplenishmentReport` es el entregable, no un adorno.** `helpers/download.ts`
intercepta `URL.createObjectURL` y el `click()` del `<a>` sintético, así que las aserciones se hacen
sobre el Blob real:

- El nombre del archivo (`reposicion-<YYYY-MM>.csv` con el mes en curso).
- El **BOM**, que se lee decodificando el ArrayBuffer a mano: `FileReader.readAsText` sí existe en
  jsdom pero se come el BOM (lo trata como marca de codificación, no como contenido), que es
  justamente lo que hay que poder afirmar. Sin BOM, Excel abre el archivo en Latin-1 y
  "Suavización" llega como "SuavizaciÃ³n".
- El escapado RFC 4180 de `csvField`, con un nombre que trae **coma y comillas** a la vez y otro con
  un salto de línea: sin comillas, una coma en el nombre corre todas las columnas siguientes una
  posición y el archivo llega mal sin que la pantalla se vea mal.

Los renglones del CSV se comparan **completos** (`toBe`, no `toContain`), que es la única forma de
detectar una columna corrida.

**El documento imprimible de `SalesReport` es el entregable, no un adorno.** El botón "Imprimir
reporte" solo monta el bloque `#print-reporte-ventas` (tema claro, `hidden print:block`) mientras se
imprime — se gatea por estado en vez de dejarlo siempre en el DOM porque `app/globals.css` (donde
vive el `@media print` que lo aísla del resto de la app) no se carga en jsdom, así que un bloque
duplicado siempre montado chocaría con casi todas las aserciones `getByText`/`getByRole("table")`
que ya existen para la vista en pantalla. Un listener de `afterprint` lo desmonta de nuevo, igual
que `PrintPendingOrders.tsx`. Las pruebas afirman que el bloque reúne lo que el CSV anterior dejaba
fuera: el resumen de KPIs (incluidos los casos "—" de gastos/utilidad neta sin match), la tabla de
productos con el precio unitario promedio (`revenue/unitsSold`) y el desglose por categoría.

Dos detalles del botón tienen caso propio porque en papel el error ya no se puede notar:

- **Deshabilitado mientras la query de gastos está en vuelo.** Imprimir en ese instante saca una
  hoja con "—" en Gastos operativos y Utilidad neta, idéntica a la de un mes sin gastos
  registrados. Por eso las pruebas de impresión pasan por el helper `clickPrint`, que espera a que
  el botón se habilite: un `click` sobre un botón deshabilitado no dispara nada y el test fallaría
  por la razón equivocada.
- **La reimpresión no depende de `afterprint`.** El estado es un **contador**, no un booleano: con
  un booleano, un segundo clic con el bloque ya montado era un `setState` sin cambio → sin
  re-render → sin `window.print()`, así que en cualquier navegador que no despache `afterprint`
  (webviews embebidos, diálogos cerrados por caminos raros) el botón quedaba muerto hasta remontar
  la sección. El caso se verificó rompiendo la fuente y confirmando que el test falla.

**La utilidad neta cruza dos fuentes y las dos pueden mentir en silencio.** `SalesReport` dueña su
propia query `getExpenseHistory` (mismo `queryKey`/`queryFn`/`staleTime` que `ExpenseHistory.tsx`,
para compartir caché de verdad y no solo la clave) y busca el mes por `isoMonth === report.key`.
Tres situaciones distintas terminaban pintando el mismo "—" y hay caso para cada una: query en
vuelo, query fallida (que ahora además ofrece "Reintentar" — sin eso un 500 y "este mes no tiene
gastos" son indistinguibles) y mes sin match en el historial (ventas anteriores a que se empezara a
registrar gastos). El cuarto caso, `total: 0`, sí es un dato y se pinta "$0.00".

**Dos cosas que parecen bugs y son decisiones, cada una con su spec:**

- **El envío derivado del mes NO se resta.** `MonthlyReport.totalRevenue` es `unidades ×
  salePrice`: mercancía sola, sin el envío cobrado al cliente. El dashboard sí resta la guía porque
  su base es `order.total`, que sí lo incluye. Restarla aquí castigaría el mismo peso dos veces. El
  test fija 6,300 − 2,000 = **4,300** con un `shippingCost.amount` de 1,500 encima, y afirma dentro
  de la tarjeta (`within`) que no aparece 2,800 — que es justo lo que daría la resta de más, y de
  paso la utilidad del sombrero en la tabla de productos: la coincidencia es la que obliga al
  `within`.
- **El mes en curso compara ventanas desiguales y lo dice.** Los ingresos llegan hasta hoy, pero
  `ExpenseMonth.total` trae el mes completo (el backend genera también los cargos futuros del mes),
  así que la resta se lee como una caída que no ocurrió — negativa los primeros días. La cifra se
  sigue mostrando, rotulada, mismo criterio que `shippingWindowLabel` en Gastos: rotular la ventana
  parcial, nunca esconderla. El caso negativo (mes cerrado, sin nota) espera primero a que la
  utilidad neta exista, o afirmaría contra el DOM previo a la query y pasaría de cualquier forma.

**"Productos más vendidos" solo lista productos que sí vendieron algo ese mes.** `sortedProducts`
filtra por `unitsSold > 0` antes de ordenar — un producto sin ventas no aporta nada a un ranking de
"más vendidos" y solo agrega ruido tanto en pantalla como en el documento impreso, que reutiliza la
misma lista ya filtrada (de ahí que ya no haga falta un "—" de precio unitario por división entre
cero: esa fila nunca llega a renderizarse). La utilidad de cada producto se muestra en pesos
(`fmtMXN`) junto al % de margen en la tabla de pantalla — antes solo estaba el porcentaje, que
obligaba a calcular el monto a mano; el documento impreso ya traía ambos en columnas separadas.

**El banner de método sale del primer renglón** (`rows[0]?.forecastMethod ?? "promedio-simple"`),
porque todos los productos comparten el mismo historial de meses. Los tres niveles tienen caso, y
también la lista vacía, que es la que ejercita el `??`.

**El fallback de `TREND_ICON` se prueba con un cast deliberado.** `trend` está acotado por Zod al
enum de tres valores, así que ese `??` solo puede dispararse si el backend agrega un cuarto. Es
código defensivo y vale cubrirlo: sin él, un valor nuevo pintaría una celda en blanco en vez de la
flecha neutra.

## Cobertura

100% en statements, branches, funciones y líneas para los dos archivos. No hay ramas aceptadas sin
cubrir en esta carpeta.
