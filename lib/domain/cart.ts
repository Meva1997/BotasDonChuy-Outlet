import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";

export interface CartTotals {
  subtotal: number;
  savings: number;
  shipping: number;
  total: number;
}

// Tarifa fija por tipo de producto (el tipo más caro del carrito determina el costo).
// Bota: caja grande y pesada. Sombrero: voluminoso. Ropa: ligera.
// ⚠️ Duplicado a propósito con backend/src/services/cart.ts (el backend es la
// autoridad de precios). Si cambias una tarifa, cámbiala también allí o el
// formulario mostrará un envío y la confirmación otro.
const SHIPPING_BY_TYPE: Record<string, number> = {
  bota: 160,
  sombrero: 130,
  ropa: 100,
};
const SHIPPING_FALLBACK = 150;

export function computeShipping(items: CartItem[]): number {
  if (items.length === 0) return 0;
  return Math.max(
    ...items.map((item) => SHIPPING_BY_TYPE[item.product.type] ?? SHIPPING_FALLBACK)
  );
}

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
  const shipping = computeShipping(items);

  return { subtotal, savings, shipping, total: subtotal - savings + shipping };
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
