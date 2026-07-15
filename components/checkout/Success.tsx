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
          className="text-xs tracking-[0.2em] uppercase rounded-md border border-amber-500/40 text-amber-400 px-8 py-3 hover:bg-amber-500/10 transition-colors cursor-pointer"
        >
          Ver outlet
        </button>
      </div>
    );
  }

  const { orderId, items, totals, customer } = order;

  return (
    <div className="w-full max-w-lg mx-auto space-y-10 animate-fade-in-up">
      <div className="relative text-center space-y-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-amber-500/20 blur-3xl"
        />

        <div className="relative mx-auto w-20 h-20">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-amber-500/30 blur-md animate-glow-pulse"
          />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-400 to-amber-600 text-stone-950 shadow-[0_8px_32px_-8px_rgba(217,119,6,0.7)] animate-ring-pop">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path
                d="M7 14.5 12 19.5 21 8.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-check-draw"
              />
            </svg>
          </div>
        </div>

        <h2 className="relative font-serif text-3xl text-amber-50">
          ¡Pago completado!
        </h2>
        <p className="relative text-[11px] tracking-[0.25em] uppercase text-amber-400/90">
          Pedido #{orderId}
        </p>
        <p className="relative text-amber-100/60 text-sm leading-relaxed max-w-sm mx-auto break-words">
          Gracias por tu compra, {customer.fullName.split(" ")[0]}. Tu pedido ya
          está en preparación y enviaremos la confirmación a{" "}
          <span className="text-amber-400/90 break-all">{customer.email}</span>.
        </p>
      </div>

      <div className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 space-y-6 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)]">
        <div className="flex items-center gap-3 pb-4 border-b border-amber-600/30">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 7h12l-1 13H7L6 7Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M9 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <h3 className="font-serif text-lg text-amber-50">Resumen de tu pedido</h3>
        </div>

        <OrderItems items={items} />

        <div className="border-t border-amber-600/30 pt-5">
          <OrderTotals totals={totals} />
        </div>

        <div className="border-t border-amber-600/30 pt-5">
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-2">
            Enviar a
          </p>
          <address className="not-italic text-sm text-amber-100/70 leading-relaxed break-words">
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
          className="btn-shimmer text-xs tracking-[0.25em] uppercase rounded-md bg-linear-to-r from-amber-400 to-amber-600 text-stone-950 px-10 py-3.5 font-medium hover:brightness-110 transition-all shadow-[0_8px_24px_-8px_rgba(217,119,6,0.6)] cursor-pointer"
        >
          Seguir comprando
        </button>
      </div>
    </div>
  );
}
