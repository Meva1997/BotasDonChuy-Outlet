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
  /**
   * En cuántos bultos va el pedido (Fase 23). Con más de uno se dice explícitamente:
   * la paquetería cobra una guía POR CAJA, así que sin esta línea el comprador que
   * agrega la cuarta bota ve el envío duplicarse sin motivo aparente.
   */
  packageCount?: number | null;
}

export default function OrderTotals({
  totals,
  discount,
  packageCount,
}: OrderTotalsProps) {
  const outletPrice = totals.subtotal - totals.savings;
  const hasDiscount = !!discount && discount.amount > 0;
  // `null` = todavía no se cotiza (paso 0, antes de la dirección). Ni $0 ni esconder
  // la fila: un envío que no se nombra se lee como envío gratis, y el total de aquí
  // no es el que se va a cobrar.
  const shipping = totals.shipping;
  const multiBox = typeof packageCount === "number" && packageCount > 1;

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
      <div className="flex justify-between gap-3 text-xs text-amber-50/70">
        <span className="tracking-wide shrink-0">Envío</span>
        {shipping !== null ? (
          <span className="text-amber-50/70">{formatPrice(shipping)}</span>
        ) : (
          <span className="text-amber-100/45 text-right">
            Se calcula con tu dirección
          </span>
        )}
      </div>
      {multiBox && (
        <p className="text-[11px] leading-relaxed text-amber-100/40">
          Tu pedido va en {packageCount} cajas
          {shipping !== null ? " · cada caja paga su propia guía" : ""}.
        </p>
      )}
      <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-amber-600/30">
        <span className="font-serif text-2xl text-amber-50">
          {shipping !== null ? "Total" : "Total sin envío"}
        </span>
        <span className="font-medium text-lg bg-linear-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          {formatPrice(totals.total)}
        </span>
      </div>
    </div>
  );
}
