# Tests de Admin: Reportes

Las dos pestañas de la sección "Reportes". Un archivo por módulo:

| Archivo | Cubre |
|---|---|
| `SalesReport.test.tsx` | Utilidad y margen del mes; la comparación contra el mes anterior y sus **dos** formas de no existir; el mes parcial; el orden por unidades vendidas; el CSV completo (nombre, BOM, escapado) |
| `ReplenishmentReport.test.tsx` | Su query propia (pending/error/reintento); los "—" que evitan leer un cero o el centinela 999 como un dato; los tres tramos de cobertura y las tres prioridades; el banner de método y el rango de historial; el CSV |
| `helpers/` | **No son suites**: `factories` (`makeMonthlyReport`, `makeReplenishmentRow`), `render` (QueryClientProvider), `download` (intercepta el `<a download>` de la exportación) |

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

**El CSV es el entregable, no un adorno.** `helpers/download.ts` intercepta `URL.createObjectURL` y
el `click()` del `<a>` sintético, así que las aserciones se hacen sobre el Blob real:

- El nombre del archivo (`ventas-<YYYY-MM>.csv` con la clave del mes exportado;
  `reposicion-<YYYY-MM>.csv` con el mes en curso).
- El **BOM**, que se lee decodificando el ArrayBuffer a mano: `FileReader.readAsText` sí existe en
  jsdom pero se come el BOM (lo trata como marca de codificación, no como contenido), que es
  justamente lo que hay que poder afirmar. Sin BOM, Excel abre el archivo en Latin-1 y
  "Suavización" llega como "SuavizaciÃ³n".
- El escapado RFC 4180 de `csvField`, con un nombre que trae **coma y comillas** a la vez y otro con
  un salto de línea: sin comillas, una coma en el nombre corre todas las columnas siguientes una
  posición y el archivo llega mal sin que la pantalla se vea mal.

Los renglones del CSV se comparan **completos** (`toBe`, no `toContain`), que es la única forma de
detectar una columna corrida.

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
