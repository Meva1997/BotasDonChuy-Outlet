"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { AdminCoupon } from "@/lib/api/adminCoupons";
import { adminProductKeys, getAdminProducts } from "@/lib/api/adminProducts";
import {
  couponFormSchema,
  emptyCouponForm,
  type CouponFormData,
} from "@/schemas/coupons";
import { formatPrice } from "@/lib/utils";
import { LABEL_BASE, inputCls, FieldError } from "../config/formUi";
import { storeDayISO } from "./couponStatus";

/**
 * Alta y edición de un cupón. En edición hay dos campos que NO se pueden tocar
 * (el `PUT` los ignora, ver adminCoupons.ts): el `code`, porque ya pudo repartirse
 * y porque el valor congelado en los pedidos dejaría de empatar, y el
 * `redeemedCount`, que solo mueven el canje y la liberación.
 */
function toFormData(coupon: AdminCoupon): CouponFormData {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value),
    maxDiscount: coupon.maxDiscount == null ? "" : String(coupon.maxDiscount),
    minSubtotal: coupon.minSubtotal == null ? "" : String(coupon.minSubtotal),
    maxRedemptions:
      coupon.maxRedemptions == null ? "" : String(coupon.maxRedemptions),
    oncePerCustomer: coupon.oncePerCustomer,
    // storeDayISO y no `.slice(0, 10)`: ver el porqué en couponStatus.ts — un
    // recorte de la cadena correría la vigencia un día en cada guardado.
    startsAt: storeDayISO(coupon.startsAt),
    expiresAt: storeDayISO(coupon.expiresAt),
    active: coupon.active,
    description: coupon.description ?? "",
  };
}

/** Campos opcionales que el backend no sabe BORRAR (no aceptan `null`). */
const CLEARABLE_LABELS: Array<[keyof CouponFormData, string]> = [
  ["maxDiscount", "tope del descuento"],
  ["minSubtotal", "mínimo de compra"],
  ["maxRedemptions", "límite de usos"],
  ["startsAt", "fecha de inicio"],
  ["expiresAt", "fecha de fin"],
];

interface CouponFormProps {
  /** Cupón a editar, o `null` para dar de alta uno nuevo. */
  editing: AdminCoupon | null;
  isSaving: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CouponFormData) => void;
  onCancel: () => void;
}

export default function CouponForm({
  editing,
  isSaving,
  errorMessage,
  onSubmit,
  onCancel,
}: CouponFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    mode: "onBlur",
    defaultValues: editing ? toFormData(editing) : emptyCouponForm,
  });

  // useWatch y no watch() por el mismo motivo que ProductForm: `watch` devuelve
  // una función que el React Compiler no puede memoizar y deja de optimizar el
  // componente entero.
  const type = useWatch({ control, name: "type" });
  const current = useWatch({ control });

  // El contrato no acepta `null` en los campos opcionales, así que vaciar uno en
  // la edición no lo borra: la clave simplemente no viaja y el valor guardado se
  // queda. Decirlo es mejor que dejar que el dueño crea que lo quitó — la salida
  // es desactivar el cupón y crear otro, igual que con un código mal escrito.
  const saved = editing ? toFormData(editing) : null;
  const unclearable = saved
    ? CLEARABLE_LABELS.filter(
        ([field]) =>
          saved[field] !== "" && String(current[field] ?? "").trim() === ""
      ).map(([, label]) => label)
    : [];

  // Rango de precios del catálogo, para no adivinar el mínimo de compra a
  // ciegas: el dueño no memoriza el precio de cada pieza, y sin esta
  // referencia un "$500" es un tiro al aire (¿excluye la mitad del outlet o
  // casi nada?). Comparte cache con ProductSection (misma queryKey, sin
  // fetch extra si ya se visitó esa pestaña). Solo cuenta lo comprable
  // (visible + con stock): un producto agotado u oculto no es lo que el
  // cliente va a ver en el checkout.
  const { data: products } = useQuery({
    queryKey: adminProductKeys.all,
    queryFn: getAdminProducts,
  });
  const purchasablePrices = (products ?? [])
    .filter((p) => p.visible && p.stock > 0)
    .map((p) => p.salePrice);
  const priceRange =
    purchasablePrices.length > 0
      ? {
          min: Math.min(...purchasablePrices),
          max: Math.max(...purchasablePrices),
          avg:
            purchasablePrices.reduce((sum, price) => sum + price, 0) /
            purchasablePrices.length,
        }
      : null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-amber-50 text-xl">
          {editing ? `Editar ${editing.code}` : "Nuevo cupón"}
        </h3>
        {editing && (
          <span className="text-amber-100/40 text-xs">
            {editing.redeemedCount} uso{editing.redeemedCount === 1 ? "" : "s"}{" "}
            registrado{editing.redeemedCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-code">
            Código
          </label>
          <input
            id="coupon-form-code"
            type="text"
            autoCapitalize="characters"
            spellCheck={false}
            // En edición va deshabilitado: el PUT ignora el código, y un input
            // editable que no cambia nada es una mentira sobre lo que se puede
            // hacer.
            disabled={!!editing}
            className={`${inputCls(!!errors.code)} uppercase tracking-[0.15em] disabled:opacity-50 disabled:cursor-not-allowed`}
            {...register("code")}
          />
          <FieldError message={errors.code?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            {editing
              ? "El código no se puede cambiar: desactiva este cupón y crea otro."
              : "Se guarda en mayúsculas. Los códigos no son secretos: para una sola persona, usa uno largo y aleatorio."}
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-type">
            Tipo
          </label>
          <select
            id="coupon-form-type"
            className={`${inputCls(!!errors.type)} appearance-none cursor-pointer`}
            {...register("type")}
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
          <FieldError message={errors.type?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-value">
            {type === "percent" ? "Porcentaje (1–100)" : "Monto en pesos"}
          </label>
          {/* type="text" + inputMode="decimal", nunca type="number": ése
              devuelve "" ante basura, se traga la coma decimal y cambia el
              valor al hacer scroll. */}
          <input
            id="coupon-form-value"
            type="text"
            inputMode="decimal"
            className={inputCls(!!errors.value)}
            {...register("value")}
          />
          <FieldError message={errors.value?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-max-discount">
            Tope del descuento
          </label>
          <input
            id="coupon-form-max-discount"
            type="text"
            inputMode="decimal"
            // En un cupón de monto fijo el tope ES el valor; el backend lo
            // rechaza, así que aquí ni se ofrece.
            disabled={type === "fixed"}
            className={`${inputCls(!!errors.maxDiscount)} disabled:opacity-40 disabled:cursor-not-allowed`}
            {...register("maxDiscount")}
          />
          <FieldError message={errors.maxDiscount?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            {type === "fixed"
              ? "Solo aplica a los cupones de porcentaje."
              : "Opcional. Es lo que evita que un 50% sobre un carrito grande se lleve media tienda."}
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-min-subtotal">
            Mínimo de compra
          </label>
          <input
            id="coupon-form-min-subtotal"
            type="text"
            inputMode="decimal"
            className={inputCls(!!errors.minSubtotal)}
            {...register("minSubtotal")}
          />
          <FieldError message={errors.minSubtotal?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Opcional. Se compara contra el precio outlet, no contra el original.
          </p>
          {priceRange && (
            <p className="mt-1 text-[11px] text-amber-100/40">
              Catálogo hoy: de {formatPrice(priceRange.min)} a{" "}
              {formatPrice(priceRange.max)} (promedio{" "}
              {formatPrice(priceRange.avg)}).
            </p>
          )}
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-max-redemptions">
            Límite de usos
          </label>
          <input
            id="coupon-form-max-redemptions"
            type="text"
            inputMode="numeric"
            className={inputCls(!!errors.maxRedemptions)}
            {...register("maxRedemptions")}
          />
          <FieldError message={errors.maxRedemptions?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Opcional. Vacío = sin límite. Es lo que acota cuánto puede costarte
            esta promoción.
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-starts-at">
            Empieza
          </label>
          <input
            id="coupon-form-starts-at"
            type="date"
            className={inputCls(!!errors.startsAt)}
            {...register("startsAt")}
          />
          <FieldError message={errors.startsAt?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="coupon-form-expires-at">
            Vence
          </label>
          <input
            id="coupon-form-expires-at"
            type="date"
            className={inputCls(!!errors.expiresAt)}
            {...register("expiresAt")}
          />
          <FieldError message={errors.expiresAt?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            El día que elijas cuenta completo: vence a las 23:59 de ese día.
          </p>
        </div>
      </div>

      <div>
        <label className={LABEL_BASE} htmlFor="coupon-form-description">
          Nota
        </label>
        <input
          id="coupon-form-description"
          type="text"
          maxLength={200}
          placeholder="Para qué es este cupón (2x1 de agosto, influencer tal…)"
          className={inputCls(!!errors.description)}
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500 cursor-pointer"
            {...register("oncePerCustomer")}
          />
          <span className="text-xs leading-relaxed text-amber-100/60">
            Un solo uso por cliente
            <span className="block text-[11px] text-amber-100/30 mt-0.5">
              Se identifica por el correo del pedido. Apagarlo después no libera
              los usos que ya se registraron.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500 cursor-pointer"
            {...register("active")}
          />
          <span className="text-xs leading-relaxed text-amber-100/60">
            Activo
            <span className="block text-[11px] text-amber-100/30 mt-0.5">
              Desactivarlo es la forma de cancelar la promoción sin perder el
              histórico de lo que ya se vendió con ella.
            </span>
          </span>
        </label>
      </div>

      {unclearable.length > 0 && (
        <p className="text-[12px] leading-relaxed text-amber-300/80 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          Vaciar un campo no lo borra: {unclearable.join(", ")} conservará
          {unclearable.length === 1 ? "" : "n"} el valor guardado. Para quitarlo,
          desactiva este cupón y crea otro.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-[12px] text-red-400/90">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-amber-700/80 border border-amber-600/80 text-amber-50 uppercase tracking-[0.25em] text-[10px] px-8 py-3 hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cupón"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
