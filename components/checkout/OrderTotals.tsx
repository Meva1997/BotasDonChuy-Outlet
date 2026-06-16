import { formatPrice } from "@/lib/utils";
import type { CartTotals } from "@/lib/cart";

export default function OrderTotals({ totals }: { totals: CartTotals }) {
  const outletPrice = totals.subtotal - totals.savings;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-amber-100/30">
        <span className="tracking-wide">Precio original</span>
        <s className="not-italic">{formatPrice(totals.subtotal)}</s>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="tracking-wide text-yellow-400">Precio outlet</span>
        <span className="text-yellow-400">{formatPrice(outletPrice)}</span>
      </div>
      {totals.savings > 0 && (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] tracking-wide px-2.5 py-1">
            Ahorras {formatPrice(totals.savings)}
          </span>
        </div>
      )}
      <div className="flex justify-between text-xs text-amber-50/70">
        <span className="tracking-wide">Envío</span>
        <span className="text-amber-50/70">{formatPrice(totals.shipping)}</span>
      </div>
      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-yellow-600/30">
        <span className="font-serif text-2xl text-amber-50">Total</span>
        <span className="font-medium text-lg bg-linear-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
          {formatPrice(totals.total)}
        </span>
      </div>
    </div>
  );
}
