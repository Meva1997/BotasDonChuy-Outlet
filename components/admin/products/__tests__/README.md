# Tests de Admin: Productos

El catálogo real — lo que un comprador ve en `/outlet` sale de aquí. Un producto mal guardado
(precio invertido, tallas duplicadas por error, la galería sin borrar la imagen vieja) se nota
en la tienda pública de inmediato. Un archivo de test por módulo, mismo nombre que el módulo:

| Archivo | Cubre |
|---|---|
| `ProductForm.test.tsx` | Crear/editar/eliminar un producto completo: el toggle "Maneja tallas" (nunca manda `sizes` y `stockQuantity` a la vez), la galería de hasta 3 imágenes (tipo/tamaño/cupo, quitar existente vs. nueva, revocar blobs), el orden borrar→subir y el reintento tras un fallo de imágenes (actualiza en vez de recrear, y no re-borra lo ya borrado), el reseteo de dimensiones por categoría (solo si el campo no fue editado a mano, y nunca en edición), y el mapeo de errores 400/404/502 |
| `ProductCategoryView.test.tsx` | El listado por categoría: paginación "Cargar más" de 10 en 10, navegar a ver/editar, y el borrado inline (confirmar/cancelar/pendiente/error/éxito) sin `window.confirm` |
| `ProductDetailModal.test.tsx` | La vista de solo lectura: agrupación de tallas, el bloque "Tallas" ausente por completo con `hasSizes: false` (no vacío — Fase 24), margen negativo, cierre por X/footer/backdrop/Escape |
| `notices.test.ts` | Las cuatro frases de aviso (`deleteNotice`/`saveNotice`), compartidas por los dos lugares que borran/guardan un producto — incluida la rama `name` ausente |
| `helpers/` | **No son suites**: `factories` (`makeAdminProduct`, `makeImageFile`), `apiError`, `render` (QueryClientProvider) |

## Bug real encontrado durante esta fase

`ProductForm.tsx` tenía una fuga de memoria: el `useEffect` que revoca los `blob:` previews al
desmontar declaraba deps `[]`, así que su cleanup cerraba sobre el `newImages` del **montaje**
(siempre vacío) y nunca sobre el estado real al desmontar — ninguna imagen agregada durante la
sesión se revocaba jamás. Mismo patrón de closure obsoleta que el bug de `CodeInput` (Fase 5).
Se arregló con un ref sincronizado por un segundo efecto (`newImagesRef`), que la cleanup sí lee
al vuelo. Se verificó rompiéndolo de nuevo (volviendo a `[]` sin el ref) y confirmando que
`al desmontar, revoca los previews...` fallaba.

## Qué ordena estas suites

Lo mismo que arriesga dinero real de inventario: **una restock/edición mal mandada no tiene
deshacer sencillo** (mismo espíritu que `import/__tests__/`, aunque aquí el volumen es de a un
producto a la vez). Por eso `ProductForm.test.tsx` prueba el payload exacto que viaja en cada
mutation (`createProductMock.mock.calls[0][0]`), no solo que "algo se llamó" — mandar
`stockQuantity` junto con `sizes` sería un 400 silencioso del backend que el dueño no vería hasta
revisar el catálogo.

## El reintento de imágenes: dos invariantes que el reporte no delata

Guardar un producto son **varias llamadas encadenadas** (crear/editar → borrar imágenes quitadas →
subir nuevas), y solo la primera es idempotente por sí sola. Dos cosas sostienen el reintento y
ninguna aparece como rama en el reporte de cobertura (son orden y bookkeeping dentro del
`mutationFn`, no `if`s), así que estuvieron un rato en verde sin estar probadas — se descubrió
rompiendo el fuente y viendo que la suite no se inmutaba:

- **Borrar va antes de subir** — libera cupo dentro del tope de 3. Al revés, cambiar una imagen
  por otra en una galería llena fallaría. Se fija comparando `mock.invocationCallOrder` de
  `deleteProductImage` contra el de `addProductImages`, no solo comprobando que ambas se llamaron.
- **Un `publicId` ya borrado sale de `removedPublicIds`** en cuanto su `DELETE` responde, así que
  un reintento (la subida falló después) no vuelve a pegarle a una imagen fantasma. Lo cubre
  `un reintento no vuelve a borrar una imagen que ya se borró`, que falla la subida una vez y
  afirma `deleteProductImage` llamado **una** sola vez en los dos intentos.

## Trampas encontradas escribiendo estas suites

- **Un `<input type="number" step={1}>` bloquea el submit del lado del navegador** antes de que
  React lo vea, si el valor no calza con el step (p. ej. `"2.5"` en un campo de enteros): el
  evento `submit` nunca se dispara. Probar la validación de **zod** para ese caso (branch
  `.int()` de `stockQuantity`) necesita `fireEvent.submit(container.querySelector("form"))` en vez
  de un clic normal en el botón — un clic real ejercitaría la validación NATIVA del navegador, no
  la de la app.
- **El thumbnail (`ProductCategoryView`) usa `alt=""` a propósito** (decorativo) — sin rol `img`
  accesible, así que se busca con `row.querySelector("img")`, no `getByRole`.
- **Dos botones distintos comparten el nombre accesible "Cerrar"** en `ProductDetailModal` (la X
  del encabezado y el del footer) — se distinguen por índice con `getAllByRole`, no por nombre.
- **El botón del nombre de un producto hace `stopPropagation()`** sobre el `onClick` del propio
  `<tr>` — cubrir la rama del `<tr>` (clic en cualquier otra celda) necesita un test aparte, uno
  que el reporte de cobertura por líneas no señala como faltante (es la misma familia de huecos
  de `&&`/handlers propios que ya documentó `orders/__tests__/README.md`).

## Convenciones

- Toda fixture sale de `helpers/factories` (`makeAdminProduct`, `makeImageFile` — mismo criterio
  que `orders/__tests__/helpers/factories.ts`: defaults mínimos válidos + `overrides`). El
  default maneja tallas (`hasSizes: true`) con dos tallas capturadas, para que el toggle a
  "Cantidad en existencia" sea la rama que cada test activa explícitamente, no la que arranca ya
  puesta.
- `helpers/apiError.ts` está duplicado del homónimo en `checkout/`/`auth/`/`orders/` a propósito —
  un `__tests__/` no importa entre carpetas hermanas (ver `CLAUDE.md`).
- `jest.mock("../../../../lib/api/adminProducts", ...)` usa ruta relativa, no `@/lib/api/...` — el
  alias de Next no lo resuelve dentro de `jest.mock()`.
- **Rama inalcanzable desde la UI, dejada a propósito**: `ProductCategoryView.tsx` acota el
  "Eliminando…" al renglón en curso (`deleteMutation.variables === product.id`). Sustituir esa
  condición por `deleteMutation.isPending` a secas no rompe ningún test, y no se puede: `isDeleting`
  solo se lee dentro de la rama `isConfirming` y `confirmingId` guarda **un** id, así que nunca hay
  dos renglones confirmando a la vez. La comparación se conserva porque es el patrón idiomático de
  TanStack para estado pendiente por renglón (y lo correcto el día que la confirmación deje de ser
  única), no porque falte un test que la cubra.
- **Gap de branch coverage aceptado, no un olvido**: `ProductDetailModal.tsx` línea 129
  (`reduceMotion ? 0 : 16`, el desplazamiento de entrada de framer-motion) queda sin cubrir —
  mismo caso que `reduceMotion: true` en `OrderDetailModal` (Fase 6): mockear `useReducedMotion`
  solo para observar un valor interno de animación no verificable de forma estable en jsdom no
  vale la complejidad que añade.
