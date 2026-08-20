# Roadmap — Conexión del frontend con el backend real

Migración completa **mocks → endpoints reales** del backend Express (`../backend`,
`http://localhost:4000`, Swagger en `/api/docs`). Todas las llamadas pasan por la instancia
axios única `lib/api/client.ts` (adjunta `Bearer` del `authStore` + maneja el `401`), con
contratos Zod centralizados en `lib/api/*.ts` — el patrón de referencia es `lib/api/products.ts`
(axios + validación Zod en runtime + query-key factory para TanStack Query).

**Estado: las 27 fases están cerradas. No queda trabajo pendiente de esta migración.** El
detalle de arquitectura resultante (qué componente consume qué endpoint, invariantes, decisiones
de diseño) vive en `CLAUDE.md` — ese es el documento activo. Este roadmap queda solo como
bitácora histórica de cómo se llegó ahí.

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

Detalle de diseño de las fases 26 y 27 (por qué existen, decisiones deliberadas, invariantes) ya
vive en `CLAUDE.md` bajo `admin/orders/` y `legal/` respectivamente — no se repite aquí.

## Notas que siguen vigentes

- **Base URL:** `NEXT_PUBLIC_API_URL` (sin definir cae a `/api`). No commitear secretos.
- **Datos sensibles:** `unitCost` y márgenes solo viajan por rutas `/api/admin/*` autenticadas.
- **Envío:** se cotiza y cobra **por caja** (Fase 23); el front no debe volver a estimarlo
  localmente — la copia vieja en `lib/domain/cart.ts` se eliminó a propósito.
- Para cualquier endpoint nuevo, seguir el patrón de `lib/api/products.ts`.
