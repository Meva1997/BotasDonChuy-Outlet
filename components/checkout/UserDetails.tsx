"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCartStore } from "@/store/cartStore";
import { computeTotals } from "@/lib/domain/cart";
import {
  shippingSchema,
  MEXICAN_STATES,
  type ShippingData,
} from "@/schemas/checkout";
import { useCheckout } from "./CheckoutContext";
import { usePlaceOrder } from "./usePlaceOrder";
import { TextField, SelectField } from "@/components/ui/FormControls";
import PaymentSection from "./PaymentSection";
import OrderTotals from "./OrderTotals";

export default function UserDetails() {
  const items = useCartStore((s) => s.items);
  const { goToReview, completeOrder } = useCheckout();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
    mode: "onBlur",
  });

  // Flujo de dos fases: POST /api/orders (backend recalcula totales y descuenta
  // stock) → confirmar el pago con Stripe. Solo tras el `succeeded` se congela
  // el snapshot (completeOrder) y se avanza a la confirmación.
  const { status, error, placeOrder } = usePlaceOrder();
  const isProcessing = status === "processing";

  const onSubmit = handleSubmit((data) => {
    placeOrder(items, data, (order) => completeOrder(data, order));
  });

  const totals = computeTotals(items);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1fr_20rem] gap-8 items-start"
    >
      {/* Columna principal: envío + pago */}
      <div className="space-y-8">
        <fieldset className="space-y-5 rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
          <div className="flex items-center gap-3 pb-4 border-b border-amber-600/30">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <legend className="font-serif text-lg text-amber-50">
                Datos de envío
              </legend>
              <p className="text-amber-100/40 text-xs tracking-wide mt-1">
                Los envíos solo están disponibles dentro de la República Mexicana.
              </p>
            </div>
          </div>

          <TextField
            id="fullName"
            label="Nombre completo"
            placeholder="Nombre y apellidos"
            autoComplete="name"
            error={errors.fullName?.message}
            {...register("fullName")}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              id="email"
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              id="phone"
              label="Teléfono (10 dígitos)"
              inputMode="numeric"
              placeholder="5512345678"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>

          <TextField
            id="street"
            label="Calle y número"
            placeholder="Av. Hidalgo 123, Int. 4"
            autoComplete="address-line1"
            error={errors.street?.message}
            {...register("street")}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <TextField
              id="neighborhood"
              label="Colonia"
              placeholder="Centro"
              error={errors.neighborhood?.message}
              {...register("neighborhood")}
            />
            <TextField
              id="city"
              label="Ciudad / Municipio"
              placeholder="Saltillo"
              autoComplete="address-level2"
              error={errors.city?.message}
              {...register("city")}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField
              id="state"
              label="Estado"
              placeholder="Selecciona un estado"
              options={MEXICAN_STATES}
              error={errors.state?.message}
              {...register("state")}
            />
            <TextField
              id="postalCode"
              label="Código postal"
              inputMode="numeric"
              placeholder="25000"
              autoComplete="postal-code"
              error={errors.postalCode?.message}
              {...register("postalCode")}
            />
          </div>

          <TextField
            id="references"
            label="Referencias (opcional)"
            placeholder="Entre calles, color de fachada…"
            error={errors.references?.message}
            {...register("references")}
          />
        </fieldset>

        <div className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
          <PaymentSection />
        </div>
      </div>

      {/* Columna lateral: total + acciones */}
      <aside className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/50 to-stone-900/20 p-6 space-y-6 lg:sticky lg:top-6 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
        <h3 className="font-serif text-lg text-amber-50">Tu pedido</h3>
        <OrderTotals totals={totals} />

        {error && (
          <p
            role="alert"
            className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isProcessing || items.length === 0}
          className="btn-shimmer w-full rounded-md bg-linear-to-r from-amber-400 to-amber-600 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:brightness-110 transition-all shadow-[0_8px_24px_-8px_rgba(217,119,6,0.6)] cursor-pointer disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing && (
            <svg
              fill="none"
              aria-hidden="true"
              className="animate-spin w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4z"
                className="opacity-75"
              />
            </svg>
          )}
          {isProcessing ? "Procesando…" : "Pagar y confirmar"}
        </button>

        <button
          type="button"
          onClick={goToReview}
          className="w-full text-[11px] tracking-[0.2em] uppercase text-amber-100/40 hover:text-amber-100/80 transition-colors cursor-pointer"
        >
          ← Volver al resumen
        </button>
      </aside>
    </form>
  );
}
