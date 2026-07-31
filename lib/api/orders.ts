import { z } from "zod";
import { api } from "@/lib/api/client";
import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";
import type { SelectedShippingRate } from "@/lib/api/shipping";
import { mapCartItemsToOrderItems } from "@/lib/domain/cart";

// Renglón de la orden que devuelve el backend (POST /api/orders). Refleja
// `OrderItem` de ../backend/src/models/OrderItem.ts pero SIN `unitCost`: la ruta
// pública lo excluye (costo interno / margen solo va en /api/admin/*).
export const OrderItemResponseSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  productId: z.number(),
  nameSnapshot: z.string(),
  size: z.number(),
  quantity: z.number(),
  unitOriginalPrice: z.number(),
  unitSalePrice: z.number(),
});

// Orden persistida que devuelve el backend. Totales recalculados en el servidor
// (autoridad de precios). El backend crea un PaymentIntent y devuelve su
// `clientSecret` junto a la orden (ver CreateOrderResponseSchema); el cliente lo
// confirma con Stripe.js (Fase 8, ver components/checkout/usePlaceOrder.ts).
export const OrderResponseSchema = z.object({
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
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  items: z.array(OrderItemResponseSchema),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

// POST /api/orders → { order, clientSecret }. `clientSecret` es el del
// PaymentIntent de Stripe; puede ser null si la pasarela no está configurada.
export const CreateOrderResponseSchema = z.object({
  order: OrderResponseSchema,
  clientSecret: z.string().nullable(),
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

/**
 * Lo que devuelve `createOrder()`: el cuerpo validado más `replayed`, que NO
 * viene en el cuerpo sino del header `Idempotency-Replayed` (Fase 15).
 *
 * El backend devuelve un reenvío byte a byte idéntico al original —esa es la
 * garantía de la idempotencia—, así que el header es la única forma de saber
 * que este `201` no creó nada: es el pedido que ya existía. Importa porque su
 * PaymentIntent puede estar YA cobrado, y confirmarlo otra vez le diría al
 * comprador que su pago falló cuando en realidad ya se hizo (ver usePlaceOrder).
 */
export interface CreateOrderResult extends CreateOrderResponse {
  replayed: boolean;
}

// Payload del checkout: identificadores + cliente, NUNCA montos. El backend
// recalcula totales y descuenta stock por talla de forma atómica.
// `quotationId`/`rateId` identifican la cotización de envío en vivo elegida en
// ShippingOptions (Fase 8.4): van juntos o ninguno (igual que
// createOrderSchema.refine() en el backend). Cuando vienen, el servidor
// RE-CONSULTA Skydropx por el total autoritativo de esa tarifa; si no, cae a
// su propia tarifa plana (computeShipping).
export interface CreateOrderPayload {
  items: Array<{ productId: number; size: number; quantity: number }>;
  customer: ShippingData;
  shippingCarrier?: string;
  quotationId?: string;
  rateId?: string;
}

// Query key factory (mismo patrón que productKeys / authKeys). Sin consumo
// público todavía; la vista de pedidos del admin llega en la Fase 7.
export const orderKeys = {
  all: ["orders"] as const,
};

// Convierte el carrito local en los renglones que espera el backend, y adjunta
// la tarifa de envío elegida en ShippingOptions (si la hubo). `selectedRate` es
// null en la tarifa plana de respaldo (rateId/quotationId null): en ese caso
// solo se manda el `carrier` ("Estándar") y NUNCA quotationId/rateId, para
// respetar el both-or-neither del backend.
export function buildOrderPayload(
  items: CartItem[],
  customer: ShippingData,
  selectedRate?: SelectedShippingRate | null
): CreateOrderPayload {
  const liveRate =
    selectedRate?.quotationId && selectedRate?.rateId ? selectedRate : null;
  return {
    items: mapCartItemsToOrderItems(items),
    customer,
    ...(selectedRate?.carrier ? { shippingCarrier: selectedRate.carrier } : {}),
    ...(liveRate
      ? { quotationId: liveRate.quotationId!, rateId: liveRate.rateId! }
      : {}),
  };
}

// El backend respondió 2xx (pedido creado y stock descontado) pero el body no
// calza con el esquema. Distinto de un fallo de red/validación: NO se debe
// reintentar, o se crearía un pedido duplicado. La UI muestra un mensaje aparte.
export class OrderResponseParseError extends Error {
  constructor() {
    super("La orden se creó pero la respuesta del servidor no pudo validarse.");
    this.name = "OrderResponseParseError";
  }
}

// POST /api/orders — 409 sin stock / producto no disponible / cotización
// expirada / clave de idempotencia reusada, 400 carrito vacío o datos de cliente
// inválidos. Los errores propagan a la mutación (no se capturan).
//
// `idempotencyKey` (Fase 15, opcional): un valor NUEVO por cada intento de
// compra distinto, el MISMO en cada reintento del mismo intento. Tiene prioridad
// sobre la huella automática que el backend calcula del carrito, así que es lo
// que evita que un doble clic cree dos pedidos con sus dos cobros y su stock
// descontado dos veces. Máximo 200 caracteres (más largo → 400). Quién decide
// cuándo rota: components/checkout/CheckoutContext.tsx.
export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey?: string
): Promise<CreateOrderResult> {
  const res = await api.post("/orders", payload, {
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
  });
  // safeParse (no parse): si el pedido ya se creó (2xx) pero la forma derivó,
  // señalamos un error específico en vez de invitar a reintentar → sin duplicados.
  const parsed = CreateOrderResponseSchema.safeParse(res.data);
  if (!parsed.success) throw new OrderResponseParseError();
  // El header solo está presente en la respuesta REPETIDA (ausente en el pedido
  // original). El backend lo publica en `exposedHeaders` del CORS; sin eso el
  // navegador lo recibiría pero no dejaría leerlo.
  return { ...parsed.data, replayed: res.headers?.["idempotency-replayed"] === "true" };
}
