import { formatPrice } from "@/lib/utils";
import type { PublicOrderItem } from "@/lib/api/orders";

/**
 * Renglones del pedido en la página pública de seguimiento.
 *
 * No reutiliza `components/checkout/OrderItems.tsx` porque ése recibe `CartItem[]`
 * —con el `Product` vivo dentro: imagen, tipo, precios actuales— y aquí solo llega
 * lo que el backend congeló al comprar (`nameSnapshot` y los precios de ese
 * momento). Es lo correcto: el producto pudo cambiar de precio o salir del
 * catálogo, y esta página tiene que seguir mostrando lo que la persona pagó.
 */
export default function TrackedOrderItems({
  items,
}: {
  items: PublicOrderItem[];
}) {
  return (
    <ul className="divide-y divide-amber-900/20 list-none">
      {items.map((item, i) => {
        const paid = item.unitSalePrice * item.quantity;
        const listed = item.unitOriginalPrice * item.quantity;
        const hadDiscount = listed > paid;

        return (
          // Índice como key: la proyección pública no trae el id del OrderItem y la
          // lista es estática (nunca se reordena ni se filtra).
          <li key={i} className="flex gap-4 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-amber-50 text-sm leading-snug wrap-break-word">
                {item.nameSnapshot}
              </p>
              <p className="text-amber-100/40 text-xs mt-0.5">
                {item.size > 0 && <>Talla: {item.size} &middot; </>}
                Cant: {item.quantity}
              </p>
            </div>

            <div className="text-right shrink-0">
              {hadDiscount && (
                <s className="block text-amber-100/25 text-[10px] not-italic">
                  {formatPrice(listed)}
                </s>
              )}
              <span className="text-amber-400 text-sm font-medium">
                {formatPrice(paid)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
