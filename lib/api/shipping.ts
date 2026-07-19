import { z } from "zod";
import { api } from "@/lib/api/client";
import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";
import { mapCartItemsToOrderItems } from "@/lib/domain/cart";

// Un renglón de POST /api/shipping/rates. `rateId`/`days` son null en la tarifa
// plana de respaldo que el backend usa cuando Skydropx falla, hace timeout, o
// las dimensiones del producto son inválidas (ver
// backend/src/controllers/shipping.controller.ts).
export const ShippingRateSchema = z.object({
  rateId: z.string().nullable(),
  carrier: z.string(),
  service: z.string(),
  amount: z.number(),
  total: z.number(),
  days: z.number().nullable(),
});

export type ShippingRate = z.infer<typeof ShippingRateSchema>;

export const ShippingRatesResponseSchema = z.object({
  quotationId: z.string().nullable(),
  rates: z.array(ShippingRateSchema),
});

export type ShippingRatesResponse = z.infer<typeof ShippingRatesResponseSchema>;

// La tarifa que el usuario elige en ShippingOptions, junto con la
// `quotationId` de la respuesta (el rate por sí solo no la trae — vive a nivel
// de la respuesta, no por renglón). Es lo que viaja por CheckoutContext /
// usePlaceOrder / buildOrderPayload: ambos IDs identifican la cotización
// exacta que el backend re-consulta en Skydropx al crear la orden.
export interface SelectedShippingRate extends ShippingRate {
  quotationId: string | null;
}

export const shippingKeys = {
  all: ["shipping"] as const,
  rates: (items: CartItem[], customer: ShippingData) =>
    ["shipping", "rates", mapCartItemsToOrderItems(items), customer] as const,
};

// POST /api/shipping/rates — pública, cotización en vivo del carrito ya con
// dirección de envío. SIEMPRE responde 200 (el backend tiene su propio
// fallback de tarifa plana si Skydropx no está disponible); solo un fallo de
// red, un error de infraestructura, o un body que no calza con el esquema
// llegan aquí como excepción. A diferencia de createOrder (lib/api/orders.ts),
// esta ruta no crea ni cobra nada — es idempotente/de solo lectura — así que
// un parse fallido es seguro de tratar como un error reintentable normal
// (`.parse`, que lanza) en vez de la clase OrderResponseParseError dedicada
// que orders.ts usa para evitar reintentar un pedido que YA se creó.
export async function getShippingRates(
  items: CartItem[],
  customer: ShippingData
): Promise<ShippingRatesResponse> {
  const { data } = await api.post("/shipping/rates", {
    customer,
    items: mapCartItemsToOrderItems(items),
  });
  return ShippingRatesResponseSchema.parse(data);
}
