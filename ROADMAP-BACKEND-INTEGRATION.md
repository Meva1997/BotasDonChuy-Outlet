# Roadmap — Conexión del frontend con el backend real

Migración completa **mocks → endpoints reales** del backend Express (`../backend`,
`http://localhost:4000`, Swagger en `/api/docs`). Todas las llamadas pasan por la instancia
axios única `lib/api/client.ts` (adjunta `Bearer` del `authStore` + maneja el `401`), con
contratos Zod centralizados en `lib/api/*.ts` — el patrón de referencia es `lib/api/products.ts`
(axios + validación Zod en runtime + query-key factory para TanStack Query).

**Estado: las 27 fases están cerradas.** El detalle de arquitectura resultante (qué componente
consume qué endpoint, invariantes, decisiones de diseño) vive en `CLAUDE.md` — este documento
queda como bitácora histórica de cómo se llegó ahí, no como referencia activa.

> ⚠️ **El número 26 está usado dos veces** y no es un error de este documento: el botón
> "Imprimir pendientes" (`PrintPendingOrders.tsx`) se commiteó como Fase 26 antes de que este
> roadmap asignara ese mismo número a la rotación del código de rastreo. Son trabajos
> independientes; al buscar "Fase 26" en el repo van a aparecer los dos.

## Fases (orden numérico, no de dependencia)

| # | Fase | Qué conectó |
|---|---|---|
| 1 | Autenticación | login, forgot-password, `/auth/me` — desbloquea todo el admin |
| 2 | Checkout público | `POST /api/orders` sin montos; totales autoritativos del servidor |
| 3 | Admin: catálogo y dashboard | CRUD de productos + imágenes Cloudinary + `GET /admin/dashboard` |
| 4 | Admin: reportes | ventas mensuales + reposición; forecast se calcula en el backend |
| 5 | Marca | `GET`/`PUT /admin/brand` (logo quedó fuera de alcance, decisión del dueño) |
| 6 | Admin: usuarios y cuenta | alta/baja de admins + cuenta propia |
| 7 | Admin: pedidos | listado paginado, solo lectura |
| 8 | Pagos con Stripe (sandbox) | `clientSecret` + `confirmCardPayment` con tarjeta de prueba |
| 9 | Outlet: sync en vivo con el admin | invalidación cruzada `productKeys` ↔ `adminProductKeys` |
| 10 | Recuperación de contraseña | wizard de 3 pasos (código de 5 dígitos vía Resend) |
| 11 | Admin: guía y rastreo Skydropx | descarga de guía + estado del envío en el modal de pedido |
| 12 | Admin: cancelación/reembolso manual | botón en `OrderDetailModal`; reembolso real en Stripe |
| 13 | Admin: importación/restock por Excel | preview → revisión en pantalla → commit (nunca a ciegas) |
| 14 | Admin: marcar enviado/entregado a mano | cubre pedidos que nunca pasaron por Skydropx |
| 15 | `Idempotency-Key` en el checkout | header explícito; protege contra doble clic/reintento |
| 16 | Admin: reintentar guía de Skydropx | botón + clasificación de los 5 estados de `skydropxShipmentId` |
| 17 | Seguimiento público del pedido | `/pedido/<token>` — única pantalla cara al comprador |
| 18 | Outlet: buscador/orden/rango de precio | filtros resueltos 100% en SQL por el backend |
| 19 | Cupones | campo en checkout + CRUD en panel; invariante de totales a 4 términos |
| 20 | Admin: gastos y suscripciones | reemplaza el KPI de gastos que estaba hardcodeado |
| 21 | Seguimiento: código en vez de enlace | solo copia — el correo ya imprime el código a la vista |
| 22 | Panel: envío como costo de venta | GANANCIA BRUTA resta el envío; `shippingCost` derivado, no editable |
| 23 | Checkout: envío por caja | `packageCount`; se eliminó el cálculo local de envío en `lib/domain/cart.ts` |
| 24 | Admin: productos sin tallas | `hasSizes`/`stockQuantity`; centinela `size: 0` |
| 25 | Admin: pedidos por pestañas | `?estado=` en `GET /admin/orders`; filtrado 100% en el backend |
| 26 | Admin: rotación de código de rastreo | `POST /api/admin/orders/:id/rotate-token` — invalida el código expuesto y manda uno nuevo por correo |
| 27 | Constancia de aceptación de términos | `acceptedTerms`/`termsVersion` en `POST /api/orders` (400 sin ellos); el pedido guarda fecha + versión + IP |

## Fase 26 — Admin: rotación de código de rastreo ✅ Cerrada

Se documenta aparte, con más detalle, porque fue la última en conectarse y quedó redactada
mientras todavía estaba pendiente.

**Por qué existe:** el Aviso de Privacidad le promete al comprador que, si su link/código de
rastreo quedó expuesto (lo reenvió, se lo hackearon el correo, etc.), la tienda puede
invalidarlo. Antes de esta fase esa promesa no tenía forma de cumplirse desde el panel.

**Lo que el backend ya hace (referencia — no tocar):**
- `POST /api/admin/orders/:id/rotate-token` `[auth]`. **Sin body.**
- Genera un `publicToken` (UUID) nuevo para el pedido; el código/link anterior deja de
  funcionar de inmediato — cualquiera que lo tuviera guardado ve un 404 al consultarlo en
  `/pedido/<token>`.
- Funciona **sin importar el estado del pedido** (`pending`/`paid`/`shipped`/`delivered`/
  `cancelled`) — a diferencia de cancelar o marcar enviado, aquí no hay ningún estado que lo
  bloquee.
- Responde `200 { order }` (el pedido completo, misma forma que `cancel`/`status`/
  `shipment/retry`), `404` si el id no existe, `400` si `:id` no es numérico, `401` sin sesión.
  **No hay `409`** — es la diferencia deliberada con sus rutas hermanas.
- El backend le manda automáticamente al comprador un correo con el código/link nuevos, con
  asunto distinto ("Actualizamos tu código de rastreo…") para que no se confunda con la
  confirmación de compra. **El frontend no necesita construir ni mostrar el token** — el correo
  ya resuelve la entrega al comprador.
- Detalle completo de diseño en `../backend/CLAUDE.md` → "Public order lookup (Fase O.4)" →
  apartado "Token rotation (Fase O.6)".

**Trabajo del frontend:**
- [x] `lib/api/adminOrders.ts`: agregar `rotateAdminOrderToken(id: number): Promise<AdminOrder>`
  siguiendo el patrón exacto de `retryAdminOrderShipment`/`cancelAdminOrder` (mismo archivo,
  líneas ~145-221): `api.post(\`/admin/orders/${id}/rotate-token\`)` sin body, parseado con
  `AdminOrderSchema.parse(data.order)`.
- [x] `AdminOrderSchema` (mismo archivo) **no declara `publicToken` hoy** — si la UI quiere leer
  el valor devuelto (aunque sea solo para un log/toast interno), agregarlo como
  `publicToken: z.string().nullable().optional()`, mismo patrón que ya tuvieron que resolver
  `couponCode`/`skydropxQuotationId` (Zod descarta silenciosamente cualquier campo no
  declarado, aunque el backend ya lo mande).
- [x] `components/admin/orders/OrderDetailModal.tsx`: agregar un botón "Regenerar código de
  rastreo" (visible sin importar el estado del pedido, a diferencia del botón de cancelar/guía).
  Seguir el mismo patrón de confirmación en dos pasos que ya usan `confirmingCancel`/
  `confirmingRetry` en este archivo (primer clic revela la confirmación, segundo clic dispara la
  mutación) — es una acción que rompe el acceso actual del comprador, así que un clic accidental
  no debe dispararla directo.
- [x] Envolver la llamada en un `useMutation` (mismo patrón que `cancelMutation`/`retryMutation`
  en este archivo) y, al éxito, mostrar un toast confirmando que se le mandó el código nuevo al
  comprador — no hace falta refrescar ni pintar el token en ningún lado, ya que hoy ninguna
  vista admin muestra `publicToken`.
- [x] Manejar `404`/errores de red con el mismo patrón que ya usan `cancelMutation`/
  `retryMutation` en este componente.
- [x] No hace falta invalidar queries de `adminOrderKeys` para reflejar el cambio: `publicToken`
  no se pinta en ninguna vista admin actual, así que no queda ningún estado visible
  desincronizado tras la rotación.

**Dos desviaciones respecto a lo planeado arriba, ambas deliberadas:**

1. **La confirmación de éxito va inline, no en un toast de Sileo.** El `<Toaster />` vive en
   `app/admin/layout.tsx`, empata en `z-index` con el modal (50) y se pinta antes en el DOM, así
   que el aviso habría quedado detrás del backdrop justo cuando hace falta leerlo.
2. **Tampoco se llama a `onOrderUpdated`**, no solo se omite la invalidación. Ese callback arma
   de paso el `isManualRefreshRef` de `OrdersSection` —el que suprime el toast del polling— y
   rotar no toca ningún campo de `orderSignature`, así que usarlo se habría comido el aviso del
   *siguiente* cambio real hecho por el webhook. El costo es que el "actualizado …" del modal
   queda con la marca de tiempo previa hasta el siguiente refetch; se prefirió eso a perder una
   notificación real.

## Fase 27 — Constancia de aceptación de términos ✅ Cerrada

**Por qué existe:** hasta esta fase, el "acepto los términos" del checkout vivía **solo** en el
estado de React. Nunca viajaba en `POST /api/orders` y no quedaba registrado. Eso dejaba dos
afirmaciones de los documentos legales sin respaldo en el sistema:

- Términos §8 decía "sin esa aceptación el proceso no avanza", cuando la casilla únicamente
  deshabilitaba un botón: cualquier POST directo creaba el pedido igual.
- Términos §15 y Privacidad §13 prometen que aplica "la versión vigente al momento de la
  transacción", pero esa versión solo existía implícita en el historial de git.

**Contrato nuevo de `POST /api/orders`:** dos campos obligatorios, `acceptedTerms`
(`z.literal(true)` — un `false` explícito 400ea igual que la ausencia, porque describen el mismo
hecho) y `termsVersion` (fecha ISO). Rompe compatibilidad a propósito: el único cliente es este
frontend, y es lo que hace verdadera la frase del §8.

**Quién estampa qué:** la versión la manda el frontend (`LEGAL_VERSION`, único que sabe qué texto
renderizó); la fecha y la IP las pone el servidor (`new Date()` y `req.ip` vía el
`CheckoutContext.clientIp` que ya existía para los cupones). Un reloj o una IP del cliente valen
menos como prueba que la marca de quien recibió la petición.

**Tres columnas nullable en `orders`**, sin backfill: `null` significa "no hay constancia", jamás
"aceptó". Un `NOT NULL` habría obligado a inventar un valor para los pedidos ya existentes, que es
la clase de afirmación falsa que esta fase eliminó.

**Decisiones de alcance que conviene no revertir sin pensarlo:**

1. **`termsAcceptedIp` se excluye de la respuesta 201 del checkout.** La lista `attributes.exclude`
   del reload en `orders.service.ts` es de EXCLUSIÓN, así que toda columna nueva se serializa sola
   mientras nadie la agregue. Hay un test que lo detecta.
2. **La constancia no aparece en `/pedido/<token>`.** Esa proyección es lista blanca, así que no se
   filtró sola; se dejó fuera porque el link se comparte por WhatsApp y la constancia es un dato del
   comercio, no del comprador.
3. **`checkoutFingerprint` no la incluye.** `acceptedTerms` no puede variar (el schema lo exige
   `true`), y dos intentos que solo difieran en `termsVersion` deben devolver el pedido original en
   vez de duplicar el cobro. Como la huella es lista blanca y no un hash del body crudo, agregar
   campos al payload no alteró ninguna huella ya emitida.
4. **`LEGAL_VERSION` versiona los tres documentos juntos**, porque el checkout los acepta en un solo
   acto: no hay forma de aceptar los Términos de agosto con el Aviso de julio.

**⚠️ Requisito de despliegue:** `backend/src/app.ts` solo llama a `app.set("trust proxy", …)` si la
env var `TRUST_PROXY` está definida (opt-in deliberado: `true` en un servidor expuesto directo deja
falsificar `X-Forwarded-For`). **Sin ella en producción, `req.ip` es la del proxy y la constancia
guarda el mismo valor para todos los pedidos** — peor que no guardarla, porque aparenta ser prueba.

**Hueco que se cerró de paso:** `ShippingOptions.onSubmit` no volvía a verificar `acceptedTerms`.
Como la casilla solo bloquea el paso 1 y su valor no se resetea al avanzar, quien regresara por el
`Stepper` y la desmarcara podía pagar igual. Ahora se verifica en `usePlaceOrder` (espejo del 400)
y en el botón de pago, con un aviso que remite al resumen.

## Notas que siguen vigentes

- **Base URL:** `NEXT_PUBLIC_API_URL` (sin definir cae a `/api`). No commitear secretos.
- **Datos sensibles:** `unitCost` y márgenes solo viajan por rutas `/api/admin/*` autenticadas.
- **Envío:** se cotiza y cobra **por caja** (Fase 23); el front no debe volver a estimarlo
  localmente — la copia vieja en `lib/domain/cart.ts` se eliminó a propósito.
- Para cualquier endpoint nuevo, seguir el patrón de `lib/api/products.ts`.
