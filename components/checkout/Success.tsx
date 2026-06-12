"use client";

import { useRouter } from "next/navigation";
import { useCheckout } from "./CheckoutContext";
import OrderItems from "./OrderItems";
import OrderTotals from "./OrderTotals";

export default function Success() {
  const router = useRouter();
  const { order } = useCheckout();

  if (!order) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-5 py-16">
        <p className="font-serif text-xl text-amber-50/80">
          No hay un pedido reciente
        </p>
        <button
          type="button"
          onClick={() => router.push("/outlet")}
          className="text-xs tracking-[0.2em] uppercase border border-amber-400/40 text-amber-400 px-8 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          Ver outlet
        </button>
      </div>
    );
  }

  const { items, totals, customer } = order;

  return (
    <div className="w-full max-w-lg mx-auto space-y-10">
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full border border-amber-400/60 text-amber-400">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path
              d="M7 14.5 12 19.5 21 8.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="font-serif text-2xl text-amber-50">Pago completado</h2>
        <p className="text-amber-100/50 text-sm leading-relaxed">
          Gracias por tu compra, {customer.fullName.split(" ")[0]}. Tu pedido ya
          está en preparación y enviaremos la confirmación a{" "}
          <span className="text-amber-100/80">{customer.email}</span>.
        </p>
      </div>

      <div className="border border-amber-900/40 bg-stone-900/30 p-6 sm:p-8 space-y-6">
        <h3 className="font-serif text-lg text-amber-50">Resumen de tu pedido</h3>

        <OrderItems items={items} />

        <div className="border-t border-amber-900/30 pt-5">
          <OrderTotals totals={totals} />
        </div>

        <div className="border-t border-amber-900/30 pt-5">
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-2">
            Enviar a
          </p>
          <address className="not-italic text-sm text-amber-100/70 leading-relaxed">
            {customer.fullName}
            <br />
            {customer.street}, {customer.neighborhood}
            <br />
            {customer.city}, {customer.state}, C.P. {customer.postalCode}
            <br />
            Tel. {customer.phone}
          </address>
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push("/outlet")}
          className="text-xs tracking-[0.25em] uppercase border border-amber-400/40 text-amber-400 px-10 py-3.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          Seguir comprando
        </button>
      </div>
    </div>
  );
}
