# Tests de Admin: Órdenes

Donde el dueño opera pedidos reales — cancela, reembolsa, avanza el estado de envío y decide
cuándo generar una guía de Skydropx que **se cobra**. Un archivo de test por módulo, mismo
nombre que el módulo que prueba:

| Archivo | Cubre |
|---|---|
| `StatusBadges.test.tsx` | Las cinco píldoras (status/pago/dropoff/envío/disputa) + el invariante de color: `STATUS_META` y `PAYMENT_META` no comparten ningún hue, porque se pintan una junto a la otra |
| `OrdersPagination.test.tsx` | Ventana + elipsis, flechas con `disabled` en los extremos (a diferencia de `OutletPagination`, que no tiene extremos que deshabilitar) |
| `OrdersTable.test.tsx` | Selección de renglón (clic/teclado) **y de card**, suma de piezas, las cuatro ramas de `labelNote` en la columna "Envío", y el badge de disputa en **las dos** estructuras |
| `OrderDetailModal.test.tsx` | El detalle completo: fila de cupón antes de Envío, talla `0` como guion, cancelar/reembolsar solo en pending/paid, el bloque de reembolso ya emitido, el aviso de dropoff, avance de estado forward-only, las cinco ramas de `shipmentLabel.ts` en el flujo de reintento de guía (incluido el `force`), la rotación del código de rastreo (Fase 26) y el bloque de disputa con su segundo clic (Fase 28) |
| `PrintPendingOrders.test.tsx` | La hoja de empaque: fetch sin paginar, el `code` cruzado contra el catálogo, y la **exclusión de los pedidos disputados** con su aviso nombrándolos |
| `shipmentLabel.test.ts` | Ya existía — clasificación pura de `skydropxShipmentId` y mapeo de errores del reintento |
| `disputeStatus.test.ts` | Clasificación pura de `disputeStatus` (Fase 28): los cuatro estados, el default «abierta» ante lo desconocido y las dos direcciones de `disputeBlocksShipping` |
| `helpers/` | **No son suites**: `factories` (`makeAdminOrder`/`makeAdminOrderItem`), `apiError`, `render` (QueryClientProvider) |

## Qué ordena estas suites

Lo mismo que ordena la pantalla: **cada guía de Skydropx se cobra** y **el avance de estado es
forward-only** (el backend responde 409 al retroceder). Clasificar de más el estado de una guía
cuesta dinero (genera una segunda); clasificar de menos deja un pedido atorado sin botón que
lo saque. Por eso `OrderDetailModal.test.tsx` prueba los 5 estados de `shipmentLabelState`
(`none`/`creating`/`real`/`unreconciled`/`unreconciled-unknown`) uno por uno, con su propio botón
y su propia confirmación — `force: true` solo se manda tras el segundo clic.

`OrdersTable.tsx` pinta dos estructuras a la vez (cards `xl:hidden` + `<table> hidden xl:block`,
mismo corte de breakpoint que usa `OrdersSection` para elegir 20 vs. 5 por página) — jsdom no
aplica media queries, así que **ambas coexisten en el DOM** y el mismo texto aparece dos veces.
Las aserciones que necesitan unicidad se acotan con `within(screen.getByRole("table"))`; el
`aria-label` de cada `<tr>` ("Ver pedido #N") también es exclusivo del renglón de escritorio.
Cuidado con la otra cara de eso: **la card se renderiza en cada test, pero sus handlers son
propios** (no reusa los del `<tr>`), así que cubrir solo la tabla la deja sin probar aunque el
reporte no marque nada. La card se ataca por `name: /^Pedido #N/` (el `<tr>` se llama "Ver pedido
#N", minúscula) y su link de guía dice "Guía", no "Descargar guía".
`OrderDetailModal` tiene su propia trampa: **dos** elementos con el texto "Estado del envío" — el
`Field` que muestra el badge de Skydropx (siempre presente) y el encabezado de la sección de
acciones (solo si `hasShippingActions`). Contar ocurrencias (`getAllByText`) distingue el caso.

La rotación del código de rastreo (Fase 26) va al revés de todo lo demás en este archivo: es la
única acción **sin 409**, así que la suite afirma que el botón se ofrece en los **cinco** estados
del pedido — un código filtrado hay que poder apagarlo aunque ya se haya entregado o cancelado, y
el reflejo de esconder acciones por estado dejaría al dueño sin forma de cumplir lo que el Aviso
de Privacidad le promete al comprador. La otra aserción que parece de más y no lo es: que **no**
invalide `adminOrderKeys` ni llame a `onOrderUpdated`. `onOrderUpdated` arma de paso el
`isManualRefreshRef` de `OrdersSection` —el que suprime el toast del polling— y rotar no toca un
solo campo de `orderSignature`, así que usarlo ahí se comería el aviso del *siguiente* cambio real
del webhook. El token nuevo tampoco se pinta: lo entrega el correo automático del backend.

Las disputas (Fase 28) tienen su propia asimetría: `disputeState` trata como **abierta** cualquier
estado que Stripe reporte y no conozca, y `disputeBlocksShipping` bloquea también la disputa
**perdida**. Las dos parecen exageradas y las dos están probadas a propósito, porque los errores no
cuestan lo mismo: equivocarse hacia "abierta" saca un pedido de la hoja de empaque (recuperable con
un clic), y equivocarse hacia "resuelta" manda mercancía cuyo cobro ya se revirtió. Por lo mismo
`PrintPendingOrders.test.tsx` afirma que el pedido excluido **sí aparece nombrado** en la hoja:
sacarlo en silencio dejaría al dueño buscando un pedido que la pantalla sí muestra.

## Convenciones

- Toda fixture sale de `helpers/factories` (`makeAdminOrder`, mismo criterio que
  `checkout/__tests__/helpers/factories.ts`: defaults mínimos válidos + `overrides`). El default
  es un pedido `paid` con tarifa de Skydropx y sin guía — el estado con más ramas disponibles a
  la vez (cancelable, marcable como enviado, reintentable la guía).
- `helpers/apiError.ts` está duplicado del homónimo en `checkout/`/`auth/` a propósito — un
  `__tests__/` no importa entre carpetas hermanas.
- `jest.mock("../../../../lib/api/adminOrders", ...)` usa ruta relativa, no `@/lib/api/adminOrders`
  — el alias de Next no lo resuelve dentro de `jest.mock()` (ver CLAUDE.md).
- Cada invariante de esta tabla se verificó rompiendo el fuente a propósito y confirmando que la
  suite fallara (regla del roadmap): el invariante de color de `StatusBadges`, el orden
  Cupón-antes-de-Envío, el guion de la talla `0`, el rango de `canCancel`, el `force` del reintento
  de guía, el bloque de reembolso, el aviso de dropoff, el `?? 0` de `couponDiscount` y los dos
  handlers de la card móvil.
- Dos mutaciones que **no** hay que perseguir, por equivalentes: invertir el orden de
  `needsShipmentReview`/`canRetryShipment` dentro de `labelNote` (sus estados son disjuntos por
  construcción — `none|creating` vs. `unreconciled*` — así que el orden no puede importar), y
  cambiar `||` por `??` en los campos de reembolso (solo difieren ante `""`, que el backend no
  emite).
