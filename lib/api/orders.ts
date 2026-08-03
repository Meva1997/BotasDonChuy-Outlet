import axios from "axios";
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
  // Credencial de la consulta pública (Fase 17): el backend la genera junto con la
  // orden y la devuelve aquí, así que el checkout puede mandar al comprador a
  // /pedido/<token> sin esperar el correo. `nullable` por los pedidos anteriores a
  // la columna. Estaba llegando desde el principio y Zod la descartaba por no
  // declararla — el mismo bug que arreglaron las Fases 11 y 16 con otros campos.
  publicToken: z.string().nullable().optional(),
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

// ── Consulta pública del pedido (Fase 17) ────────────────────────────────────

// Renglón tal como lo ve el comprador en /pedido/<token>: solo el nombre
// CONGELADO al comprar (no el producto vivo, que pudo cambiar de precio o
// desaparecer del catálogo) y los precios de ese momento.
export const PublicOrderItemSchema = z.object({
  nameSnapshot: z.string(),
  size: z.number(),
  quantity: z.number(),
  unitOriginalPrice: z.number(),
  unitSalePrice: z.number(),
});

export type PublicOrderItem = z.infer<typeof PublicOrderItemSchema>;

/**
 * `GET /api/orders/lookup/:token` → `{ order }`.
 *
 * NO reutiliza `OrderResponseSchema` ni `AdminOrderSchema`: el backend devuelve una
 * **proyección explícita** (`PublicOrderView` en `orders.service.ts`), distinta y más
 * chica a propósito, porque este enlace se comparte por WhatsApp con facilidad.
 * Quedan fuera `unitCost`, `paymentIntentId`, `refundId`, `labelUrl`, los ids de
 * Skydropx, `shippingRequiresDropoff`, el propio `publicToken` (el cliente ya lo
 * tiene) y el correo/teléfono del comprador.
 *
 * `couponCode`/`couponDiscount` SÍ vienen aunque el cupón sea trabajo de la Fase 19:
 * sin ellos esta página mostraría un total que no cuadra con
 * `subtotal − savings + shipping` y el faltante no tendría explicación visible —
 * justo la llamada de soporte que esta fase vino a evitar. Hoy llegan `null`/`0`.
 */
export const PublicOrderSchema = z.object({
  id: z.number(),
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]),
  // A diferencia de `OrderResponseSchema` (un pedido recién creado nunca puede
  // estarlo), aquí "refunded" es alcanzable: la cancelación del admin (Fase 12).
  paymentStatus: z.enum([
    "unpaid",
    "processing",
    "paid",
    "failed",
    "refunded",
  ]),
  createdAt: z.string(),
  subtotal: z.number(),
  savings: z.number(),
  shipping: z.number(),
  couponCode: z.string().nullable().optional(),
  couponDiscount: z.number().optional(),
  total: z.number(),
  customerName: z.string(),
  shippingAddress: z.object({
    street: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    references: z.string().nullable(),
  }),
  shippingCarrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shipmentStatus: z.string().nullable(),
  refundedAt: z.string().nullable(),
  items: z.array(PublicOrderItemSchema),
});

export type PublicOrder = z.infer<typeof PublicOrderSchema>;

const PublicOrderResponseSchema = z.object({ order: PublicOrderSchema });

// Query key factory (mismo patrón que productKeys / authKeys). `lookup` se clavea
// con el token porque es lo único que identifica al pedido en la ruta pública.
export const orderKeys = {
  all: ["orders"] as const,
  lookup: (token: string) => ["orders", "lookup", token] as const,
};

/**
 * Consulta pública del pedido por su token opaco (Fase 17).
 *
 * `skipAuth` (ver lib/api/client.ts): la ruta es pública, así que no debe llevar
 * Bearer —un token de admin viejo en localStorage no tiene nada que hacer aquí— y
 * un 401 no debe arrastrar a un comprador hacia /login.
 *
 * `.parse()` estricto, no `safeParse`: es de solo lectura, un parse fallido es
 * reintentable sin riesgo de duplicar nada (mismo criterio que `shipping.ts` y el
 * preview de la importación), y una forma inesperada significa que no podemos
 * pintar el estado del pedido con honestidad.
 */
export async function lookupOrder(token: string): Promise<PublicOrder> {
  const res = await api.get(`/orders/lookup/${encodeURIComponent(token)}`, {
    skipAuth: true,
  });
  return PublicOrderResponseSchema.parse(res.data).order;
}

/**
 * Traduce un error de `lookupOrder` en copia para el comprador.
 *
 * Prefiere SIEMPRE el `message` del backend (mismo criterio que
 * `retryShipmentErrorMessage`): el 404 de esta ruta es deliberadamente el mismo
 * para un token inexistente, alterado o mal formado —no revela cuál fue— y su
 * texto ya dice qué hacer ("revisa que esté completo o busca el correo"). Un
 * "token inválido" inventado aquí sería a la vez menos útil y una filtración.
 */
export function lookupOrderErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Sin `response`: la petición nunca llegó (backend caído, red del usuario).
    // Es el único caso donde el backend no tiene una copia que ofrecer.
    if (!error.response)
      return "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
    const message = error.response.data?.message as string | undefined;
    if (message) return message;
    if (error.response.status === 404)
      return "No encontramos ningún pedido con ese enlace. Revisa que esté completo o busca el correo de confirmación que te enviamos.";
    if (error.response.status === 429)
      return "Demasiadas consultas seguidas. Espera un momento y vuelve a intentar.";
  }
  return "No pudimos consultar tu pedido. Inténtalo de nuevo en unos minutos.";
}

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
