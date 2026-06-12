import type { CartItem } from "@/store/cartStore";

export interface CartTotals {
  subtotal: number;
  savings: number;
  total: number;
}

/**
 * Calcula los totales de una lista de items del carrito.
 * Se mantiene como función pura para reutilizarse tanto con el carrito activo
 * (Zustand) como con la copia congelada del pedido en la pantalla de éxito.
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

  return { subtotal, savings, total: subtotal - savings };
}
