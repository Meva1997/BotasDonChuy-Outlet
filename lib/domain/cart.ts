import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";

export interface CartTotals {
  subtotal: number;
  savings: number;
  /**
   * `null` = todavía no hay cotización (paso 0 del checkout, antes de la dirección).
   * El único envío legítimo es el que devuelve el backend: POST /api/shipping/rates
   * en el paso 3, o el `order.shipping` que ya cobró.
   */
  shipping: number | null;
  /**
   * Con `shipping: null` esto es la **mercancía neta** (`subtotal − savings`), no el
   * total a pagar: falta el envío. Quien lo pinte tiene que decirlo (ver OrderTotals).
   */
  total: number;
}

/**
 * Subtotal y ahorro outlet del carrito. **No calcula envío a propósito** (Fase 23).
 *
 * Antes había aquí una copia de la tarifa plana del backend (`SHIPPING_BY_TYPE` +
 * `Math.max`) que cobraba UNA guía por pedido. Desde que el backend acomoda el
 * carrito en cajas reales y cotiza un bulto por caja, esa copia le prometía al
 * comprador un envío más barato del que se le iba a cobrar: 3 botas + 1 sombrero
 * mostraban $160, lo mismo que una sola bota. Portar el acomodo de cajas al front
 * habría dejado dos implementaciones que se desincronizan a la primera vez que el
 * dueño mida sus cajas de nuevo, así que se eliminó: **el backend es la autoridad**,
 * igual que con precios y cupones.
 */
export function computeTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce(
    (acc, item) => acc + item.product.originalPrice * item.quantity,
    0
  );
  const savings = items.reduce(
    (acc, item) =>
      acc + (item.product.originalPrice - item.product.salePrice) * item.quantity,
    0
  );

  return { subtotal, savings, shipping: null, total: subtotal - savings };
}

export interface OrderItemPayload {
  productId: number;
  size: number;
  quantity: number;
}

// Compartido por lib/api/orders.ts (buildOrderPayload) y lib/api/shipping.ts
// (getShippingRates): ambos mandan el mismo renglón al backend a partir del carrito.
export function mapCartItemsToOrderItems(items: CartItem[]): OrderItemPayload[] {
  return items.map((item) => ({
    productId: item.product.id,
    size: item.size,
    quantity: item.quantity,
  }));
}

// Firma sobre el carrito (producto+talla+cantidad, sin el cliente). La usan
// orderSignature() en usePlaceOrder y las signatures de tarifa elegida en
// CheckoutContext/ShippingOptions para saber si siguen correspondiendo al carrito actual.
export function cartLineSignature(items: CartItem[]): string {
  return items
    .map((item) => `${item.product.id}:${item.size}:${item.quantity}`)
    .join("|");
}

// Firma sobre carrito + cliente (sin la tarifa de envío). Fuente única de la
// clave con la que CheckoutContext/ShippingOptions cachean la tarifa elegida y
// con la que usePlaceOrder la limpia al expirar: ambas DEBEN producir la misma
// cadena, así que viven en un solo helper para no divergir en silencio.
export function shippingSignature(
  items: CartItem[],
  customer: ShippingData
): string {
  return `${cartLineSignature(items)}#${JSON.stringify(customer)}`;
}
