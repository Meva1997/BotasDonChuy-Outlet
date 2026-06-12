import { formatPrice } from "@/lib/utils";
import type { CartTotals } from "@/lib/cart";

/** Desglose de totales del pedido. Compartido entre el resumen y la confirmación. */
export default function OrderTotals({ totals }: { totals: CartTotals }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-amber-100/30">
        <span className="tracking-wide">Precio original</span>
        <s className="not-italic">{formatPrice(totals.subtotal)}</s>
      </div>
      <div className="flex justify-between text-xs">
        <span className="tracking-wide text-amber-400">Precio outlet</span>
        <span className="text-amber-400">{formatPrice(totals.total)}</span>
      </div>
      <div className="flex justify-between text-xs text-amber-50/70">
        <span className="tracking-wide">Envío</span>
        <span className="uppercase tracking-[0.2em] text-amber-400/80 text-[11px]">
          Gratis
        </span>
      </div>
      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-amber-900/30">
        <span className="font-serif text-2xl text-amber-50">Total</span>
        <span className="text-amber-50 font-medium text-lg">
          {formatPrice(totals.total)}
        </span>
      </div>
    </div>
  );
}
