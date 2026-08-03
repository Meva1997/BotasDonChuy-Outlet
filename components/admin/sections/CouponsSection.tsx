"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCouponKeys,
  createCoupon,
  couponWriteErrorMessage,
  deleteCoupon,
  getAdminCoupons,
  updateCoupon,
  type AdminCoupon,
} from "@/lib/api/adminCoupons";
import { couponInputFromForm, type CouponFormData } from "@/schemas/coupons";
import CouponForm from "../coupons/CouponForm";
import CouponsTable from "../coupons/CouponsTable";

/**
 * Sección "Cupones" del panel (Fase 19).
 *
 * Un cupón es la única forma de lanzar una promoción sin repreciar producto por
 * producto (lo cual es permanente y toca el catálogo). El backend hace todo el
 * trabajo delicado —validar, calcular el descuento y canjearlo de forma atómica—;
 * aquí solo se crean, se cancelan y se ven.
 */
export default function CouponsSection() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: coupons, isPending, isError } = useQuery({
    queryKey: adminCouponKeys.all,
    queryFn: getAdminCoupons,
    staleTime: 60 * 1000,
  });

  // Un cupón no toca stock ni pedidos: la única caché que se invalida es la suya.
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: adminCouponKeys.all });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: (data: CouponFormData) => {
      const { code, ...rest } = couponInputFromForm(data);
      // El `code` solo viaja en el alta: el PUT lo ignora, y mandarlo ahí
      // sugeriría que se puede cambiar.
      if (!editing) return createCoupon({ code, ...rest });
      return updateCoupon(editing.id, rest);
    },
    onSuccess: (coupon) => {
      setNotice(
        editing
          ? `Cupón ${coupon.code} actualizado.`
          : `Cupón ${coupon.code} creado.`
      );
      closeForm();
      refreshList();
    },
  });

  // Cancelar/reactivar es un PUT con una sola clave: en este contrato una clave
  // ausente significa "no toques ese campo", así que no hace falta reenviar el
  // resto del cupón (ni arriesgarse a pisar algo).
  const toggleMutation = useMutation({
    mutationFn: (coupon: AdminCoupon) =>
      updateCoupon(coupon.id, { active: !coupon.active }),
    onSuccess: (coupon) => {
      setNotice(
        coupon.active
          ? `Cupón ${coupon.code} reactivado.`
          : `Cupón ${coupon.code} cancelado: deja de canjearse, y lo que ya se vendió con él se conserva.`
      );
      refreshList();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (coupon: AdminCoupon) => deleteCoupon(coupon.id),
    onSuccess: (result, coupon) => {
      // El backend decide entre borrar y desactivar según haya pedidos que lo
      // usaron. Decir cuál de las dos pasó importa: "eliminado" sobre un cupón
      // que sigue en la lista (desactivado) parecería un error de la app.
      setNotice(
        result.deactivated
          ? `El cupón ${coupon.code} no se pudo borrar porque ya hay pedidos que lo usaron: se desactivó para no romper ese histórico.`
          : `Cupón ${coupon.code} eliminado.`
      );
      setConfirmingId(null);
      // Si estaba abierto en el formulario, ese cupón ya no existe.
      if (editing?.id === coupon.id) closeForm();
      refreshList();
    },
  });

  const busyId = toggleMutation.isPending
    ? toggleMutation.variables?.id ?? null
    : deleteMutation.isPending
      ? deleteMutation.variables?.id ?? null
      : null;

  const rowError =
    (toggleMutation.isError && couponWriteErrorMessage(toggleMutation.error)) ||
    (deleteMutation.isError && couponWriteErrorMessage(deleteMutation.error)) ||
    null;

  return (
    <div className="max-w-6xl">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h2 className="font-serif text-amber-50 text-2xl sm:text-3xl tracking-wide">
          Cupones
        </h2>
        {!formOpen && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setNotice(null);
              saveMutation.reset();
              setFormOpen(true);
            }}
            className="border border-amber-400 text-amber-400 uppercase tracking-[0.25em] text-[10px] px-6 py-3 hover:bg-amber-400/10 active:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer"
          >
            Nuevo cupón
          </button>
        )}
      </div>
      <p className="text-amber-100/40 text-sm mb-8 max-w-2xl leading-relaxed">
        Una promoción sin tocar los precios del catálogo. El descuento lo calcula
        y lo canjea el servidor, así que lo que el comprador ve es lo que se
        cobra.
      </p>

      {notice && (
        <p
          role="status"
          className="mb-6 text-[12px] leading-relaxed text-amber-300/80 border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          {notice}
        </p>
      )}

      {formOpen && (
        <div className="mb-8">
          <CouponForm
            // Remontar el formulario al cambiar de cupón: sin la key, los
            // defaultValues del anterior se quedarían pegados.
            key={editing?.id ?? "nuevo"}
            editing={editing}
            isSaving={saveMutation.isPending}
            errorMessage={
              saveMutation.isError
                ? couponWriteErrorMessage(saveMutation.error)
                : null
            }
            onSubmit={(data) => saveMutation.mutate(data)}
            onCancel={closeForm}
          />
        </div>
      )}

      <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
        {isPending && (
          <p className="text-amber-100/40 text-sm py-4">Cargando…</p>
        )}
        {isError && (
          <p role="alert" className="text-red-400/90 text-sm py-4">
            No pudimos cargar los cupones.
          </p>
        )}

        {coupons && coupons.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <p className="font-serif text-amber-50/80 text-lg">
              Todavía no hay cupones
            </p>
            <p className="text-amber-100/40 text-sm">
              Crea uno para lanzar una promoción sin repreciar el catálogo.
            </p>
          </div>
        )}

        {coupons && coupons.length > 0 && (
          <CouponsTable
            coupons={coupons}
            confirmingId={confirmingId}
            busyId={busyId}
            onEdit={(coupon) => {
              setEditing(coupon);
              setNotice(null);
              saveMutation.reset();
              setFormOpen(true);
            }}
            onToggleActive={(coupon) => {
              setNotice(null);
              toggleMutation.mutate(coupon);
            }}
            onAskDelete={(id) => {
              deleteMutation.reset();
              setConfirmingId(id);
            }}
            onConfirmDelete={(coupon) => deleteMutation.mutate(coupon)}
          />
        )}

        {rowError && (
          <p role="alert" className="mt-4 text-[12px] text-red-400/90">
            {rowError}
          </p>
        )}
      </div>
    </div>
  );
}
