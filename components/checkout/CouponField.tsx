"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tag, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { cartLineSignature } from "@/lib/domain/cart";
import { formatPrice } from "@/lib/utils";
import {
  validateCoupon,
  validateCouponErrorMessage,
  type CouponPreview,
} from "@/lib/api/coupons";
import { useCheckout } from "./CheckoutContext";

/**
 * Campo de cupón del paso 0 del checkout (Fase 19).
 *
 * Es un `useMutation` y no un `useQuery` a propósito: aplicar un cupón es una
 * acción deliberada del comprador, no un dato que la pantalla necesite tener. Con
 * una query, cada tecla mal escrita se volvería una petición contra el límite de
 * 20/min de la ruta. (La revalidación automática del paso 3 sí es una query: ahí
 * el dato SE necesita y el disparador no es un clic — ver ShippingOptions.)
 *
 * No calcula nada: el `discount` que se muestra sale siempre de
 * `POST /api/coupons/validate`, que comparte la función de descuento con el
 * checkout. Duplicar la fórmula aquí garantizaría que un día diverja del cobro.
 */
export default function CouponField() {
  const items = useCartStore((s) => s.items);
  const { getAppliedCoupon, setAppliedCoupon } = useCheckout();
  const signature = cartLineSignature(items);
  const applied = getAppliedCoupon(signature);
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: (value: string) => validateCoupon({ code: value, items }),
    onSuccess: (coupon: CouponPreview) => {
      setAppliedCoupon(signature, {
        code: coupon.code,
        discount: coupon.discount,
        description: coupon.description,
        oncePerCustomer: coupon.oncePerCustomer,
        perCustomerChecked: coupon.perCustomerChecked,
        // Se validó sin correo (el campo vive antes de los datos de envío), así
        // que el paso 3 tendrá que revalidar con el correo ya confirmado.
        checkedEmail: null,
      });
      setCode("");
    },
  });

  const submit = () => {
    const value = code.trim();
    if (!value || mutation.isPending) return;
    mutation.mutate(value);
  };

  const remove = () => {
    setAppliedCoupon(signature, null);
    mutation.reset();
  };

  if (applied) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Tag
              width={14}
              height={14}
              strokeWidth={1.8}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            <div className="min-w-0">
              <p className="text-sm text-emerald-300 font-medium break-all">
                {applied.code}
              </p>
              <p className="text-xs text-emerald-200/70 mt-0.5">
                Descuento de {formatPrice(applied.discount)} aplicado.
              </p>
              {applied.description && (
                <p className="text-[11px] text-amber-100/40 mt-1 wrap-break-word">
                  {applied.description}
                </p>
              )}
              {/* El "un uso por cliente" solo se puede verificar con correo, y
                  aquí todavía no lo hay. Decirlo evita que el 409 del pago
                  parezca un error de la tienda. */}
              {applied.oncePerCustomer && !applied.perCustomerChecked && (
                <p className="text-[11px] text-amber-100/40 mt-1 leading-relaxed">
                  Es de un solo uso por cliente: lo verificamos cuando nos des tu
                  correo.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label={`Quitar el cupón ${applied.code}`}
            className="shrink-0 flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-amber-100/40 hover:text-amber-100/80 transition-colors cursor-pointer"
          >
            <X width={12} height={12} strokeWidth={2} aria-hidden="true" />
            Quitar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="coupon-code"
        className="block text-[10px] tracking-[0.25em] uppercase text-amber-100/40"
      >
        ¿Tienes un cupón?
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          // El campo vive dentro del <div> del resumen, no de un <form>, así que
          // Enter no envía nada solo: se cablea a mano para no obligar a apuntar
          // al botón después de teclear.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="CÓDIGO"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          // Solo presentación: el backend recorta y sube a mayúsculas, así que
          // " verano25 " funciona igual. Transformar el valor del estado en su
          // lugar pelearía con quien escribe en minúsculas.
          className="flex-1 min-w-0 rounded-md border border-amber-600/30 bg-stone-900/60 px-3 py-2.5 text-sm text-amber-50 uppercase tracking-[0.15em] placeholder:text-amber-100/20 placeholder:tracking-[0.2em] focus:outline-none focus:border-amber-500/60 transition-colors"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!code.trim() || mutation.isPending}
          className="shrink-0 rounded-md border border-amber-500/40 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-5 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "…" : "Aplicar"}
        </button>
      </div>

      {/* El `message` del backend va VERBATIM: distingue la causa (no existe,
          venció, se agotó, cuánto falta para el mínimo) y ya viene redactado
          como copia accionable en español. Reescribirlo aquí perdería justo
          esa información. */}
      {mutation.isError && (
        <p
          role="alert"
          className="text-[12px] leading-relaxed text-red-400/90 wrap-break-word"
        >
          {validateCouponErrorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
