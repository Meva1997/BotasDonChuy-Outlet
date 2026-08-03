import { z } from "zod";
import { api } from "@/lib/api/client";

// Renglón de pedido para el admin (GET /api/admin/orders). A diferencia de
// `OrderItemResponseSchema` (lib/api/orders.ts, dominio público del checkout)
// SÍ incluye `unitCost` — costo interno solo visible en rutas /api/admin/*.
export const AdminOrderItemSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  productId: z.number(),
  nameSnapshot: z.string(),
  size: z.number(),
  quantity: z.number(),
  unitOriginalPrice: z.number(),
  unitSalePrice: z.number(),
  unitCost: z.number(),
});

export type AdminOrderItem = z.infer<typeof AdminOrderItemSchema>;

// Pedido completo tal como lo arma el admin (../backend/src/controllers/order.controller.ts
// → adminGetOrders). `status` y `paymentStatus` son campos independientes.
// `shippingCarrier` es null hasta que se cotice/asigne un envío (Skydropx, ver CLAUDE.md).
// `paymentIntentId` queda sin usarse en la UI — pertenece a la Fase 8 (Stripe).
export const AdminOrderSchema = z.object({
  id: z.number(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]),
  paymentStatus: z.enum(["unpaid", "processing", "paid", "failed", "refunded"]),
  subtotal: z.number(),
  savings: z.number(),
  shipping: z.number(),
  // Cupón canjeado (Fase 19), congelado en el pedido: editar o borrar el cupón
  // después NO altera lo que se vendió. Vienen en la respuesta desde que existe
  // la columna —adminGetOrders serializa el modelo Order completo— pero Zod los
  // descartaba por no estar declarados (mismo bug que arreglaron las Fases 11 y
  // 16). Sin ellos el modal mostraría `Subtotal − Ahorro + Envío ≠ Total` y el
  // faltante no tendría explicación: el invariante ahora es
  // `total = subtotal − savings − couponDiscount + shipping`.
  couponCode: z.string().nullable().optional(),
  couponDiscount: z.number().optional(),
  total: z.number(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  street: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  references: z.string().nullable().optional(),
  shippingCarrier: z.string().nullable().optional(),
  // Bandera operativa (Skydropx, ver CLAUDE.md "Shipping"): true cuando la paquetería
  // no recoge a domicilio y el dueño debe llevar el paquete a su sucursal. Viene del
  // rate re-consultado en createOrder; null en el fallback de tarifa plana (nunca vino
  // de Skydropx). Excluida de la respuesta pública del checkout — solo /admin/orders.
  shippingRequiresDropoff: z.boolean().nullable().optional(),
  paymentIntentId: z.string().nullable().optional(),
  // Guía/rastreo Skydropx (Fase 11): la creación de la guía es asíncrona — nacen `null` y las
  // puebla el webhook `POST /api/webhooks/skydropx` cuando la paquetería procesa el envío.
  // `shipmentStatus` es el string crudo del carrier (no un enum cerrado), ver StatusBadges.tsx.
  // `skydropxShipmentId` NO es siempre un id: puede traer los centinelas
  // "creating" y "unreconciled:<id>" que decide el backend. Clasificarlo es
  // trabajo de components/admin/orders/shipmentLabel.ts (Fase 16).
  skydropxShipmentId: z.string().nullable().optional(),
  // Tarifa de Skydropx con la que se cobró el pedido (Fase 16). Vienen en la
  // respuesta del listado desde siempre —adminGetOrders serializa el modelo
  // Order completo—, pero Zod las descartaba por no estar declaradas. Sin las
  // dos no hay tarifa que convertir en guía: ese pedido se cobró con la tarifa
  // plana de respaldo y el reintento de guía responde 409.
  skydropxQuotationId: z.string().nullable().optional(),
  skydropxRateId: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  trackingUrl: z.string().nullable().optional(),
  labelUrl: z.string().nullable().optional(),
  shipmentStatus: z.string().nullable().optional(),
  // Cancelación/reembolso manual (Fase 12, POST /:id/cancel): pobladas solo
  // cuando un pedido `paid` se cancela y el backend emite el reembolso total
  // en Stripe. Un pedido `pending` cancelado no pasa por Stripe → quedan null.
  refundId: z.string().nullable().optional(),
  refundedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  items: z.array(AdminOrderItemSchema),
});

export type AdminOrder = z.infer<typeof AdminOrderSchema>;

// GET /api/admin/orders — paginado en servidor (a diferencia de /admin/products,
// que devuelve un array plano). Mismo envoltorio que ProductListResponseSchema.
export const AdminOrderListResponseSchema = z.object({
  orders: z.array(AdminOrderSchema),
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
});

export type AdminOrderListResponse = z.infer<typeof AdminOrderListResponseSchema>;

const DEFAULT_PER_PAGE = 20;

// Query key factory (mismo patrón que adminProductKeys / productKeys). El listado
// es paginado, así que la key incluye page/perPage/date para que TanStack Query
// cachee y refetchee por página y por filtro de fecha.
export const adminOrderKeys = {
  all: ["adminOrders"] as const,
  list: (page: number, perPage: number, date?: string) =>
    ["adminOrders", "list", page, perPage, date ?? null] as const,
};

// GET /api/admin/orders?page=&perPage=&date= — `date` (YYYY-MM-DD, opcional)
// acota a los pedidos de ese día. Sin filtro por status: el listado siempre
// trae todo lo del día/página y el estado se avanza desde el detalle
// (`updateAdminOrderStatus`, abajo).
export async function getAdminOrders(
  page = 1,
  perPage = DEFAULT_PER_PAGE,
  date?: string
): Promise<AdminOrderListResponse> {
  const { data } = await api.get("/admin/orders", {
    params: { page, perPage, date },
  });
  return AdminOrderListResponseSchema.parse(data);
}

// POST /api/admin/orders/:id/cancel — cancelación/reembolso manual (Fase 12,
// fuera del flujo de Stripe). Solo `pending`/`paid` son cancelables; el
// backend rechaza `shipped`/`delivered`/`cancelled` con 409 (ver
// ROADMAP-BACKEND-INTEGRATION.md). `reason` es una nota opcional para el log,
// no cambia el resultado.
export async function cancelAdminOrder(
  id: number,
  reason?: string
): Promise<AdminOrder> {
  const { data } = await api.post(`/admin/orders/${id}/cancel`, { reason });
  return AdminOrderSchema.parse(data.order);
}

// Avance manual del estado de envío (Fase 14). Los tres datos de la guía son
// opcionales: se captura a mano lo que la paquetería haya dado.
export interface AdminOrderStatusUpdate {
  status: "shipped" | "delivered";
  trackingNumber?: string;
  trackingUrl?: string;
  shippingCarrier?: string;
}

// PATCH /api/admin/orders/:id/status — mueve el pedido a `shipped`/`delivered`
// sin depender del webhook de Skydropx (un pedido cobrado con la tarifa plana
// nunca genera guía, así que se quedaría en `paid` para siempre).
//
// Solo hacia adelante: el backend responde 409 si el estado retrocede, si el
// pedido está cancelado o si todavía no está pagado. **Repetir el estado actual
// sí se permite** — es como se agrega una guía tardía a un pedido ya enviado.
//
// Los campos de guía son "último gana" y solo se escriben los que viajen: por
// eso las claves vacías se OMITEN en vez de mandarse como "". El backend las
// valida con `.trim().min(1)` (un "" sería un 400) y una clave ausente
// significa "no toques ese campo", que es justo lo que hace falta para avanzar
// el estado sin borrar la guía ya guardada.
export async function updateAdminOrderStatus(
  id: number,
  input: AdminOrderStatusUpdate
): Promise<AdminOrder> {
  const body: AdminOrderStatusUpdate = { status: input.status };
  const trackingNumber = input.trackingNumber?.trim();
  const trackingUrl = input.trackingUrl?.trim();
  const shippingCarrier = input.shippingCarrier?.trim();
  if (trackingNumber) body.trackingNumber = trackingNumber;
  if (trackingUrl) body.trackingUrl = trackingUrl;
  if (shippingCarrier) body.shippingCarrier = shippingCarrier;

  const { data } = await api.patch(`/admin/orders/${id}/status`, body);
  return AdminOrderSchema.parse(data.order);
}

// POST /api/admin/orders/:id/shipment/retry — reintento manual de la guía de
// Skydropx (Fase 16). La guía se genera sola al confirmarse el pago; si esa
// única llamada falla, el pedido queda pagado y sin guía y no hay webhook que
// llegue por una guía que nunca se creó. El backend corre además un barrido
// automático: este endpoint adelanta ese reintento y, sobre todo, **espera el
// resultado** para poder decir por qué no se pudo.
//
// 200 → la guía existe (`order.skydropxShipmentId` trae su id).
// 502 → Skydropx volvió a fallar; se puede reintentar de inmediato.
// 409 → cualquier duda: ya tiene guía (real o cobrada sin persistir), otra
//       solicitud la está generando, el pedido no está pagado, está cancelado,
//       ya se marcó como enviado/entregado, o se cobró con la tarifa plana.
//       Cada guía se cobra, así que ante la duda el backend no genera otra.
//
// `force` solo viaja cuando es true (el reintento normal manda `{}`): es la
// confirmación de "ya revisé el panel de Skydropx y no existe ninguna guía", y
// el backend solo la acepta para el marcador "unreconciled:desconocido". Un id
// real nunca se fuerza — esa guía existe y ya está cobrada.
export async function retryAdminOrderShipment(
  id: number,
  opts?: { force?: boolean }
): Promise<AdminOrder> {
  const body = opts?.force ? { force: true } : {};
  const { data } = await api.post(`/admin/orders/${id}/shipment/retry`, body);
  return AdminOrderSchema.parse(data.order);
}
