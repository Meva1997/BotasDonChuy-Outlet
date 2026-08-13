# Tests de Admin: Cupones

Formulario y tabla de la sección "Cupones". Un archivo de test por módulo, mismo nombre que el
módulo que prueba:

| Archivo | Cubre |
|---|---|
| `CouponForm.test.tsx` | Alta/edición completa: las reglas cruzadas del formulario (espejo de las del backend en `schemas/coupons.ts`), el código deshabilitado en edición, el aviso de campos "no se pueden vaciar", y el rango de precios del catálogo (solo cuenta productos visibles y con stock) |
| `CouponsTable.test.tsx` | "Cancelar" dispara `onToggleActive` (no un delete) y "Reactivar" aparece en su lugar en un cupón ya cancelado; el flujo de confirmación de borrado (pedir → confirmar/cancelar → `busyId`); la nota de divergencia de canjes |
| `helpers/` | **No son suites**: `factories` (`makeAdminCoupon`, `makeAdminProductForRange`), `render` (QueryClientProvider) |

`CouponsTable` no tiene `helpers/apiError.ts`: a diferencia de `orders/`/`products/`, ni
`CouponForm` ni `CouponsTable` hacen la llamada HTTP de escritura ellos mismos — reciben
`onSubmit`/`onToggleActive`/`onConfirmDelete` como props y es `CouponsSection` (fuera de esta
fase) quien decide qué mandar al backend. Por eso estas suites no ejercitan `couponWriteErrorMessage`
ni simulan un `AxiosError`: solo verifican que `errorMessage` se pinte cuando el padre lo pasa.

## Qué ordena estas suites

`CouponForm.tsx` espeja las reglas cruzadas del backend a propósito (ver el comentario de
`schemas/coupons.ts`): sin ellas el dueño llenaría el formulario completo para que se lo
rechazaran al guardar. Cada regla de `couponFormSchema.superRefine` tiene su propio caso: valor
≤ 0, porcentaje > 100, tope en pesos en un cupón fijo (incluida la trampa de que el campo queda
**deshabilitado pero no se limpia** al cambiar de tipo — el valor tecleado sigue viajando), tope
≤ 0, mínimo de compra negativo, límite de usos no entero o < 1, y vencimiento anterior al inicio.

El aviso de "vaciar un campo no lo borra" (`unclearable`) se prueba en sus tres estados: ausente
en un cupón nuevo, ausente si nada se vació, y presente con su pluralización correcta
("conservará" con un campo, "conservarán" con dos) — el reporte de cobertura por sí solo no
distingue "una vez visto en singular" de "el ternario de plural nunca se ejecutó".

`CouponsTable.tsx` pinta tabla de escritorio (`hidden lg:block`) y tarjetas móviles (`lg:hidden`)
a la vez (jsdom no aplica media queries), mismo patrón que `OrdersTable`/`ProductCategoryView` —
las aserciones que necesitan unicidad se acotan con `within(screen.getByRole("table"))`. La nota
de divergencia de canjes (`hasRedemptionDivergence`) se prueba en singular y plural: "1 canje
vigente" vs. "N canjes vigentes" son dos ternarios en la misma línea que el reporte de branches no
distingue entre sí.

## Ramas aceptadas sin cubrir (gap documentado, no un olvido)

Cuatro branches de `CouponForm.tsx` quedan fuera de alcance de la UI real, mismo criterio que los
gaps de `reduceMotion`/`step` ya aceptados en `orders/`/`products/__tests__/README.md`. **No son
las cuatro el mismo tipo de gap** — tres son errores de campo inalcanzables por tres razones
distintas, y la cuarta ni siquiera es un error de campo:

- `errors.type?.message` — el `<select>` de tipo está acotado al enum (`percent`/`fixed`); no hay
  forma de que el usuario le haga fallar la validación de zod.
- `errors.startsAt?.message` — ningún caso del formulario ata un error directamente a `startsAt`
  (la única regla que lo involucra, `startsAt >= expiresAt`, se lo asigna a `expiresAt`), y el
  `<input type="date">` normaliza cualquier texto que no calce el formato antes de que React lo
  vea.
- `errors.description?.message` — aquí la razón es otra: el error **sí existe** en el schema
  (`"Máximo 200 caracteres"`), pero el `maxLength={200}` nativo del input lo bloquea antes de que
  zod llegue a verlo, tecleando o pegando. Es el contraste con `vendor`/`notes` de `ExpenseForm`,
  que **no** llevan `maxLength` y por eso sus specs sí prueban el error de longitud (con
  `fireEvent.change`, que salta la restricción del DOM). Si algún día se le quita el `maxLength` a
  este input, esta rama pasa a ser alcanzable y hay que cubrirla.
- El `?? ""` de `current[field]` en el cálculo de `unclearable` — **no es un error de campo** sino
  código defensivo muerto: `current` sale de `useWatch({ control })` sobre un formulario cuyo
  `defaultValues` ya trae las cinco claves de `CLEARABLE_LABELS` como string, así que ese valor
  nunca es `undefined`/`null` en tiempo de ejecución real.

## Convenciones

- Toda fixture sale de `helpers/factories` (`makeAdminCoupon` — mismo criterio que
  `orders/products/__tests__/helpers/factories.ts`: defaults mínimos válidos + `overrides`). El
  default es un cupón de porcentaje activo, sin tope de usos ni ventana de vigencia.
- `jest.mock("../../../../lib/api/adminProducts", ...)` usa ruta relativa, no `@/lib/api/...` — el
  alias de Next no lo resuelve dentro de `jest.mock()` (ver `CLAUDE.md`).
- Cada invariante de esta tabla se verificó rompiendo el fuente a propósito y confirmando que la
  suite fallara: el tope deshabilitado-pero-no-limpiado al cambiar de tipo, la pluralización de
  "conservará"/"conservarán", y el "Cancelar" que llama a `onToggleActive` y no a un delete.
