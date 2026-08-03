import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/api/client";
import type { CartItem } from "@/store/cartStore";
import { mapCartItemsToOrderItems } from "@/lib/domain/cart";

/**
 * Contrato público del cupón de descuento (Fase 19).
 *
 * Refleja `CouponPreview` de ../backend/src/services/coupon.service.ts, que es lo
 * que devuelve `POST /api/coupons/validate`. La ruta **valida sin canjear**: no
 * mueve el contador de usos ni escribe una fila de canje, así que consultarla las
 * veces que haga falta no gasta la promoción.
 *
 * `discount` sale del MISMO `computeCouponDiscount` que usa el checkout al cobrar,
 * por eso el front nunca calcula el descuento: duplicar la fórmula garantiza que un
 * día diverja del cobro. Se aplica sobre la mercancía neta (`subtotal − savings`) y
 * **nunca sobre el envío**.
 */
export const CouponPreviewSchema = z.object({
  // Normalizado por el backend (trim + MAYÚSCULAS): mandar " verano25 " devuelve
  // "VERANO25", y es ese valor el que se muestra y el que viaja a POST /api/orders.
  code: z.string(),
  type: z.enum(["percent", "fixed"]),
  value: z.number(),
  description: z.string().nullable(),
  /** Descuento en pesos ya calculado por el servidor. Nunca se recalcula aquí. */
  discount: z.number(),
  netMerchandise: z.number(),
  /**
   * Usos que quedan del tope global, o `null` si es ilimitado. **NO es una
   * reserva**: el cupón puede agotarse entre esta consulta y el pago, y
   * `POST /api/orders` lo re-decide de forma atómica (409). Es informativo.
   */
  remainingRedemptions: z.number().nullable(),
  oncePerCustomer: z.boolean(),
  /**
   * `false` cuando la consulta no llevó correo: el "un uso por cliente" todavía no
   * se verificó. Pasa siempre en el paso 0 del checkout, donde el cupón se captura
   * ANTES de los datos de envío — por eso ShippingOptions revalida con el correo ya
   * confirmado (ver components/checkout/ShippingOptions.tsx).
   */
  perCustomerChecked: z.boolean(),
  expiresAt: z.string().nullable(),
});

export type CouponPreview = z.infer<typeof CouponPreviewSchema>;

const CouponValidateResponseSchema = z.object({ coupon: CouponPreviewSchema });

export interface ValidateCouponInput {
  code: string;
  items: CartItem[];
  /** Opcional a propósito: sin él la respuesta trae `perCustomerChecked: false`. */
  email?: string;
}

// Query key factory (mismo patrón que shippingKeys.rates): el descuento depende
// del código y del carrito, y el correo cambia el resultado (habilita el "un uso
// por cliente"), así que los tres entran en la clave.
export const couponKeys = {
  all: ["coupons"] as const,
  validate: (code: string, items: CartItem[], email?: string) =>
    [
      "coupons",
      "validate",
      code,
      mapCartItemsToOrderItems(items),
      email ?? null,
    ] as const,
};

/**
 * `POST /api/coupons/validate` — valida el cupón para el carrito actual.
 *
 * `skipAuth` (ver lib/api/client.ts): la ruta es pública, así que no debe llevar
 * Bearer —un token de admin viejo en localStorage no tiene nada que hacer aquí— y
 * un 401 no debe arrastrar a un comprador hacia /login. Mismo criterio que
 * `lookupOrder`.
 *
 * `.parse()` estricto: no escribe nada, así que un parse fallido es reintentable
 * sin riesgo de duplicar ni de gastar la promoción.
 */
export async function validateCoupon({
  code,
  items,
  email,
}: ValidateCouponInput): Promise<CouponPreview> {
  const { data } = await api.post(
    "/coupons/validate",
    {
      code,
      items: mapCartItemsToOrderItems(items),
      ...(email ? { email } : {}),
    },
    { skipAuth: true }
  );
  return CouponValidateResponseSchema.parse(data).coupon;
}

/**
 * Traduce un error de `validateCoupon` en copia para el comprador.
 *
 * Prefiere SIEMPRE el `message` del backend (mismo criterio que
 * `lookupOrderErrorMessage` / `retryShipmentErrorMessage`). Aquí no es solo una
 * preferencia de estilo: los mensajes de esta ruta son deliberadamente específicos
 * —cuánto falta para el mínimo, cuándo venció, que ya se agotó— porque un cupón
 * existe para que un humano lo teclee y un "no es válido" opaco volvería la
 * función inusable. Reescribirlos aquí perdería justo esa información.
 */
export function validateCouponErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Sin `response`: la petición nunca llegó (backend caído, red del usuario).
    // Es el único caso donde el backend no tiene una copia que ofrecer.
    if (!error.response)
      return "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
    const message = error.response.data?.message as string | undefined;
    if (message) return message;
    if (error.response.status === 429)
      return "Demasiados intentos con cupones. Espera un momento y vuelve a intentar.";
  }
  return "No pudimos validar el cupón. Inténtalo de nuevo.";
}
