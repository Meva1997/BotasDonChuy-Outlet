"use client";

import type { AdminCoupon } from "@/lib/api/adminCoupons";
import CouponStatusBadge from "./CouponStatusBadge";
import {
  couponState,
  couponUsageLabel,
  couponValueLabel,
  couponWindowLabel,
  hasRedemptionDivergence,
} from "./couponStatus";

const th =
  "text-left text-[9px] uppercase tracking-[0.25em] text-amber-100/35 font-normal pb-3 px-3";
const td = "py-3.5 px-3 align-top text-sm text-amber-100/70";

interface CouponsTableProps {
  coupons: AdminCoupon[];
  /** Id con la confirmación de borrado abierta, o null. */
  confirmingId: number | null;
  busyId: number | null;
  onEdit: (coupon: AdminCoupon) => void;
  onToggleActive: (coupon: AdminCoupon) => void;
  onAskDelete: (id: number | null) => void;
  onConfirmDelete: (coupon: AdminCoupon) => void;
}

/** Acciones de una fila, compartidas por la tabla y las tarjetas móviles. */
function RowActions({
  coupon,
  confirmingId,
  busyId,
  onEdit,
  onToggleActive,
  onAskDelete,
  onConfirmDelete,
}: CouponsTableProps & { coupon: AdminCoupon }) {
  const isBusy = busyId === coupon.id;

  if (confirmingId === coupon.id) {
    return (
      <span className="flex items-center gap-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onConfirmDelete(coupon)}
          className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer"
        >
          {isBusy ? "…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => onAskDelete(null)}
          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 cursor-pointer"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button
        type="button"
        onClick={() => onEdit(coupon)}
        className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-400 transition-colors cursor-pointer"
      >
        Editar
      </button>
      {/* Cancelar = PUT { active: false }. No borra: el histórico de lo que se
          vendió con el cupón se conserva y se puede reactivar. */}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onToggleActive(coupon)}
        className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
      >
        {coupon.active ? "Cancelar" : "Reactivar"}
      </button>
      <button
        type="button"
        onClick={() => onAskDelete(coupon.id)}
        className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-red-400 transition-colors cursor-pointer"
      >
        Eliminar
      </button>
    </span>
  );
}

function UsageCell({ coupon }: { coupon: AdminCoupon }) {
  return (
    <>
      <span className="tabular-nums">{couponUsageLabel(coupon)}</span>
      {hasRedemptionDivergence(coupon) && (
        <span
          className="block text-[11px] text-amber-400/80 mt-1 leading-snug"
          title="El contador guardado no coincide con los canjes vigentes"
        >
          {coupon.activeRedemptions} canje
          {coupon.activeRedemptions === 1 ? "" : "s"} vigente
          {coupon.activeRedemptions === 1 ? "" : "s"}: revisa la base de datos.
        </span>
      )}
    </>
  );
}

export default function CouponsTable(props: CouponsTableProps) {
  const { coupons } = props;

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Cupones de descuento</caption>
          <thead>
            <tr className="border-b border-amber-400/10">
              <th scope="col" className={th}>
                Código
              </th>
              <th scope="col" className={th}>
                Descuento
              </th>
              <th scope="col" className={th}>
                Vigencia
              </th>
              <th scope="col" className={th}>
                Usos
              </th>
              <th scope="col" className={th}>
                Estado
              </th>
              <th scope="col" className={th}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-amber-400/10">
                <td className={td}>
                  <span className="text-amber-50 font-medium tracking-[0.1em]">
                    {coupon.code}
                  </span>
                  {coupon.description && (
                    <span className="block text-[11px] text-amber-100/35 mt-1 wrap-break-word max-w-xs">
                      {coupon.description}
                    </span>
                  )}
                  {coupon.oncePerCustomer && (
                    <span className="block text-[11px] text-amber-100/30 mt-1">
                      Un uso por cliente
                    </span>
                  )}
                </td>
                <td className={td}>
                  {couponValueLabel(coupon)}
                  {coupon.minSubtotal != null && (
                    <span className="block text-[11px] text-amber-100/35 mt-1">
                      Desde ${coupon.minSubtotal} de compra
                    </span>
                  )}
                </td>
                <td className={td}>{couponWindowLabel(coupon)}</td>
                <td className={td}>
                  <UsageCell coupon={coupon} />
                </td>
                <td className={td}>
                  <CouponStatusBadge state={couponState(coupon)} />
                </td>
                <td className={td}>
                  <RowActions {...props} coupon={coupon} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="lg:hidden space-y-3">
        {coupons.map((coupon) => (
          <li
            key={coupon.id}
            className="border border-amber-400/10 bg-stone-900/60 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-amber-50 font-medium tracking-[0.1em] break-all">
                  {coupon.code}
                </p>
                <p className="text-amber-100/50 text-xs mt-1">
                  {couponValueLabel(coupon)} · {couponWindowLabel(coupon)}
                </p>
                {coupon.description && (
                  <p className="text-[11px] text-amber-100/35 mt-1 wrap-break-word">
                    {coupon.description}
                  </p>
                )}
              </div>
              <CouponStatusBadge state={couponState(coupon)} />
            </div>
            <p className="text-xs text-amber-100/50">
              Usos: <UsageCell coupon={coupon} />
            </p>
            <RowActions {...props} coupon={coupon} />
          </li>
        ))}
      </ul>
    </>
  );
}
