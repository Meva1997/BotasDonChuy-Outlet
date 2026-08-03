import { COUPON_STATE_LABEL, type CouponState } from "./couponStatus";

// Paleta propia, no la de `orders/StatusBadges.tsx`: son vocabularios distintos
// (un pedido "entregado" y un cupón "agotado" no significan lo mismo) y nunca se
// pintan uno junto al otro, así que no hay riesgo de confundirlos por color.
const STATE_CLASS: Record<CouponState, string> = {
  activo: "border-emerald-400/40 text-emerald-300 bg-emerald-500/10",
  programado: "border-sky-400/40 text-sky-300 bg-sky-500/10",
  agotado: "border-amber-400/40 text-amber-300 bg-amber-500/10",
  vencido: "border-stone-400/30 text-stone-300 bg-stone-500/10",
  cancelado: "border-red-400/40 text-red-300 bg-red-500/10",
};

export default function CouponStatusBadge({ state }: { state: CouponState }) {
  return (
    <span
      className={`inline-flex items-center border uppercase tracking-[0.18em] text-[9px] px-2.5 py-1 leading-none ${STATE_CLASS[state]}`}
    >
      {COUPON_STATE_LABEL[state]}
    </span>
  );
}
