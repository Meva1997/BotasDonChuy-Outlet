import { formatPrice } from "@/lib/utils";
import type { CartTotals } from "@/lib/domain/cart";

interface OrderTotalsProps {
  totals: CartTotals;
  /**
   * Descuento por cupón ya aplicado por el servidor. Opcional: hoy solo lo pasa la
   * página pública de seguimiento (`GET /api/orders/lookup/:token` devuelve
   * `couponCode`/`couponDiscount`). Sin él, un pedido con cupón mostraría un total
   * menor que `subtotal − savings + shipping` sin explicación visible.
   */
  discount?: { code: string | null; amount: number };
}

export default function OrderTotals({ totals, discount }: OrderTotalsProps) {
  const outletPrice = totals.subtotal - totals.savings;
  const hasDiscount = !!discount && discount.amount > 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-amber-100/30">
        <span className="tracking-wide">Precio original</span>
        <s className="not-italic">{formatPrice(totals.subtotal)}</s>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="tracking-wide text-amber-400">Precio outlet</span>
        <span className="text-amber-400">{formatPrice(outletPrice)}</span>
      </div>
      {totals.savings > 0 && (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] tracking-wide px-2.5 py-1">
            Ahorras {formatPrice(totals.savings)}
          </span>
        </div>
      )}
      {hasDiscount && (
        <div className="flex justify-between text-xs text-emerald-400">
          <span className="tracking-wide">
            Cupón{discount.code ? ` ${discount.code}` : ""}
          </span>
          <span>−{formatPrice(discount.amount)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs text-amber-50/70">
        <span className="tracking-wide">Envío</span>
        <span className="text-amber-50/70">{formatPrice(totals.shipping)}</span>
      </div>
      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-amber-600/30">
        <span className="font-serif text-2xl text-amber-50">Total</span>
        <span className="font-medium text-lg bg-linear-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          {formatPrice(totals.total)}
        </span>
      </div>
    </div>
  );
}
