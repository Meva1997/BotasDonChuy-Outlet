"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCartStore } from "@/store/cartStore";
import { computeTotals } from "@/lib/cart";
import {
  shippingSchema,
  MEXICAN_STATES,
  type ShippingData,
} from "@/schemas/checkout";
import { useCheckout } from "./CheckoutContext";
import { TextField, SelectField } from "./FormControls";
import PaymentSection from "./PaymentSection";
import OrderTotals from "./OrderTotals";

export default function UserDetails() {
  const items = useCartStore((s) => s.items);
  const { goToReview, completeOrder } = useCheckout();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShippingData>({
    resolver: zodResolver(shippingSchema),
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (data) => {
    // El cobro real ocurrirá aquí con Stripe. Por ahora simulamos el proceso.
    await new Promise((resolve) => setTimeout(resolve, 600));
    completeOrder(data);
  });

  const totals = computeTotals(items);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1fr_20rem] gap-8 items-start"
    >
      {/* Columna principal: envío + pago */}
      <div className="space-y-10">
        <fieldset className="space-y-4">
          <legend className="font-serif text-lg text-amber-50 mb-1">
            Datos de envío
          </legend>
          <p className="text-amber-100/40 text-xs tracking-wide mb-4">
            Los envíos solo están disponibles dentro de la República Mexicana.
          </p>

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

        <div className="border-t border-amber-900/30 pt-8">
          <PaymentSection />
        </div>
      </div>

      {/* Columna lateral: total + acciones */}
      <aside className="border border-amber-900/40 bg-stone-900/30 p-6 space-y-6 lg:sticky lg:top-6">
        <h3 className="font-serif text-lg text-amber-50">Tu pedido</h3>
        <OrderTotals totals={totals} />

        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting && (
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
          {isSubmitting ? "Procesando…" : "Pagar y confirmar"}
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
