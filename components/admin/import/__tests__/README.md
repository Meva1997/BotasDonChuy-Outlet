# Tests de la importación por Excel

Las suites están agrupadas por **fase del flujo**, no por tipo de archivo, y dentro de cada
carpeta hay **un archivo por módulo**, con su mismo nombre (`ImportToolbar.tsx` →
`review/ImportToolbar.test.tsx`). Buscar el test de algo es buscar su nombre; entender qué cubre
una carpeta es leer una línea de esta tabla.

| Carpeta | Cubre | Módulos |
|---|---|---|
| `pure/` | Lógica sin React: es donde vive el riesgo real de la pantalla | `rowInput`, `importReducer`, `dependencies`, `labels` |
| `intake/` | Elegir y entender el archivo, antes de gastar una petición | `ImportDropzone`, `ImportFormatHelp` |
| `review/` | La tabla de revisión y sus controles de lote | `ImportToolbar`, `ImportRowList`, `ImportRow` |
| `editing/` | El panel expandido de una fila y su editor inline | `ImportRowDetail`, `ImportRowEditor`, `EditableCell` |
| `presentation/` | Piezas de solo pintar, sin estado propio | `ImportActionBadge`, `ImportDiff`, `ImportSizeDiff`, `ImportWarnings` |
| `commit/` | Confirmar el lote y leer el resultado | `ImportConfirmBar`, `ImportResults` |
| `helpers/` | **No son suites**: fixtures y utilidades de montaje | `factories`, `render` |

`helpers/` puede vivir aquí dentro porque `jest.config.ts` acota `testMatch` a `*.test.ts(x)`; el
default de Jest trata como suite cualquier archivo bajo un `__tests__/`.

## Qué se prueba (y qué no)

Lo que ordena estas suites es el mismo principio que ordena la pantalla: **el restock SUMA stock
y no hay forma de deshacerlo desde el panel**. Por eso los tests apuntan a los invariantes que,
de romperse, duplican stock o borran datos en silencio — no a estilos ni a estructura de DOM:

- una fila aplicada nunca vuelve al payload (`pure/importReducer`);
- "ausente" ≠ "vacío" en cada celda (`pure/rowInput`, `editing/EditableCell`);
- nunca se pinta una línea de diff cuyos insumos el usuario editó (`editing/ImportRowDetail`);
- el conteo del toolbar sale de las filas, no del `summary` del backend (`review/ImportToolbar`);
- confirmar pide un segundo clic cuando hay motivo de alarma (`commit/ImportConfirmBar`).

Las consultas van por rol y por texto visible (es-MX), que es también lo que ejercita la
accesibilidad de la pantalla de paso. No hay snapshots: un snapshot de estas tablas cambiaría con
cada ajuste de Tailwind sin decir nada de lo que importa.

## Convenciones

- Toda fixture sale de `helpers/factories`. Si una suite necesita una forma nueva del contrato,
  se agrega ahí — no se inventa un objeto local (el contrato es grande y una fixture divergente
  hace pasar tests contra datos que el backend nunca manda).
- Los estados de revisión se construyen pasando por el reducer real (`loadedState`, `reduce`),
  nunca a mano: así ninguna suite prueba contra un estado imposible.
- Cada archivo de test abre con un comentario de **por qué** ese módulo es delicado, igual que el
  módulo que prueba.
