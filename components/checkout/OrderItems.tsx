import { formatPrice } from "@/lib/utils";
import type { CartItem } from "@/store/cartStore";

function Placeholder({ type }: { type: string }) {
  return (
    <div className="w-16 h-16 shrink-0 bg-stone-800 border border-amber-900/30 flex items-center justify-center">
      <span className="text-amber-100/20 text-xs uppercase tracking-widest">
        {type === "bota" ? "B" : type === "sombrero" ? "S" : "R"}
      </span>
    </div>
  );
}

/** Lista de solo lectura de los productos del pedido. Reutilizada en el resumen y la confirmación. */
export default function OrderItems({ items }: { items: CartItem[] }) {
  return (
    <ul className="divide-y divide-amber-900/20">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4">
          {item.product.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product.imageSrc}
              alt={item.product.name}
              className="w-16 h-16 shrink-0 object-cover border border-amber-900/30"
            />
          ) : (
            <Placeholder type={item.product.type} />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-amber-50 text-sm leading-snug truncate pr-2">
              {item.product.name}
            </p>
            <p className="text-amber-100/40 text-xs mt-0.5 capitalize">
              Talla: {item.size} &middot; {item.product.type} &middot; Cant:{" "}
              {item.quantity}
            </p>
          </div>

          <div className="text-right shrink-0">
            <s className="block text-amber-100/25 text-[10px] not-italic">
              {formatPrice(item.product.originalPrice * item.quantity)}
            </s>
            <span className="text-amber-400 text-sm font-medium">
              {formatPrice(item.product.salePrice * item.quantity)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
