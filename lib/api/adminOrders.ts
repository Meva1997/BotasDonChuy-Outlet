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
  paymentStatus: z.enum(["unpaid", "processing", "paid", "failed"]),
  subtotal: z.number(),
  savings: z.number(),
  shipping: z.number(),
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
  skydropxShipmentId: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  trackingUrl: z.string().nullable().optional(),
  labelUrl: z.string().nullable().optional(),
  shipmentStatus: z.string().nullable().optional(),
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
// acota a los pedidos de ese día; sin filtro de status todavía (el backend no
// expone PATCH/PUT para eso; ver ROADMAP-BACKEND-INTEGRATION.md).
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
