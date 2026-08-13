# Tests de Admin: Configuración

Las dos tarjetas de la sección "Configuración". Un archivo por módulo:

| Archivo | Cubre |
|---|---|
| `AccountCard.test.tsx` | `currentPassword` obligatoria para CUALQUIER cambio; el payload que se arma a mano (las claves nuevas viajan solo si se escribieron); el mapeo 401/409/400/genérico; el correo reflejado en el store y las contraseñas limpiadas al guardar |
| `AdminsCard.test.tsx` | La lista (carga/error/render); que la propia cuenta se marque "Tú" y **no** ofrezca borrarse; el flujo de confirmación en la fila; el motivo del backend verbatim; el alta con su validación y su mapeo de errores |
| `helpers/` | **No son suites**: `factories` (`makeAuthUser`, `makeAdminUser`), `render` (QueryClientProvider), `apiError` (duplicado a propósito, ver CLAUDE.md) |

`ConfigSection.tsx` (el contenedor: header + "Cerrar Sesión" + la rejilla de dos columnas) tiene sus
specs en `components/admin/sections/__tests__/ConfigSection.test.tsx`, junto a las demás secciones:
casi no decide nada —solo compone estas dos tarjetas— salvo que "Cerrar Sesión" limpie el store **y**
navegue.

## Qué ordena estas suites

**`currentPassword` es lo único que separa una sesión abierta y desatendida de una cuenta
secuestrada.** El backend la exige incluso para corregir una letra del correo, y por eso el
`onSubmit` arma el payload a mano en vez de mandar el formulario entero: `newPassword` y
`confirmPassword` viajan **solo** si se escribió una contraseña nueva. Mandarlas vacías sería
pedirle al backend que la cambie a `""`. Hay un caso por cada forma del payload, comparando el
primer argumento de la llamada (`mock.calls[0][0]`) y no con `toHaveBeenCalledWith`: TanStack Query
5 le pasa además su propio contexto de mutation, que no dice nada del payload.

**El 401 de esta ruta no es una sesión expirada.** `lib/api/account.ts` la marca con
`skipAuthRedirect` justamente porque aquí un 401 significa "contraseña actual incorrecta". El caso
lo comprueba en los dos sentidos: el mensaje inline **y** que el token siga en el store.

**En `AdminsCard` la comparación de identidad cruza dos tipos a propósito.** `AuthUser.id` es
*string* (sale del JWT) y `AdminUser.id` es *number* (sale de la tabla); sin el `String(u.id)` el
`===` sería siempre falso y el dueño vería un botón para borrarse a sí mismo que el backend
rechazaría con un 400. El caso verifica las dos filas a la vez —la propia con "Tú" y sin botón, la
ajena con botón y sin "Tú"— porque probar solo una pasaría igual con la comparación rota.

**El motivo de un borrado rechazado se muestra verbatim.** El backend explica por qué no se puede
(único propietario, cuenta propia…), y ese texto es más útil que cualquier genérico. Se prueba con
mensaje, sin mensaje, y con un error de red sin `response` — tres caminos distintos de
`deleteUserErrorMessage`.

Las aserciones sobre una fila se acotan con `within(rowOf(correo))`: "Propietario" y "Administrador"
también son las **opciones del `<select>` de rol** del formulario de alta, más abajo en la misma
tarjeta.

## Bug real encontrado y corregido durante esta fase

Ninguna de las dos tarjetas asociaba sus `<label>` con sus inputs: eran hermanos, sin `htmlFor` ni
anidamiento. Para un lector de pantalla los campos no tenían nombre —"Contraseña Actual" y
"Contraseña Temporal" quedaban indistinguibles de cualquier otro `<input type="password">`— y hacer
clic en la etiqueta no enfocaba el campo. Se detectó al escribir estos specs: `getByLabelText`
falla con *"Found a label with the text of: Correo, however no form control was found associated to
that label"*.

Corregido agregando `htmlFor`/`id` en los ocho campos, que es el patrón que ya seguían
`ExpenseForm`, `CouponForm` y `ProductForm` — las tarjetas de configuración eran las únicas del
panel sin él. Es el mismo tipo de hallazgo que persiguen las convenciones del roadmap al pedir
queries por rol y texto visible: ejercitar accesibilidad de paso.

## Ramas aceptadas sin cubrir (gap documentado, no un olvido)

Mismo criterio que los gaps ya aceptados en `coupons/`/`orders/`/`products/__tests__/README.md`.
Las dos son código defensivo inalcanzable desde la UI real:

- **`AccountCard.tsx:57`** — el `variables.email ?? user?.email ?? ""` del `reset()`. `onSubmit`
  siempre pone `email` en el payload (zod ya lo validó como correo no vacío), así que ese valor
  nunca es `undefined` en ejecución real. Es el gemelo exacto del `?? ""` de `current[field]` en
  `CouponForm`. El guard de la línea 50 (`variables.email && user && …`) **sí** está cubierto en
  sus tres ramas, incluida la de guardar sin sesión en el store — ahí `{...user}` sobre `null`
  reventaría el `onSuccess` entero, invalidaciones incluidas.
- **`AdminsCard.tsx:258`** — `errors.role?.message`. El `<select>` está acotado al enum
  `owner|admin`; no hay forma de que el usuario le haga fallar la validación de zod. Idéntico al
  `errors.type?.message` de `CouponForm`.
