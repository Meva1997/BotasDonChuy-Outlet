"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { computeTotals } from "@/lib/cart";
import { useCheckout } from "./CheckoutContext";
import OrderItems from "./OrderItems";
import OrderTotals from "./OrderTotals";

export default function OrderSummary() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const { acceptedTerms, setAcceptedTerms, goToDetails } = useCheckout();

  if (items.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-5 py-16">
        <p className="font-serif text-xl text-amber-50/80">
          Tu carrito está vacío
        </p>
        <p className="text-amber-100/40 text-sm">
          Agrega piezas desde el outlet para continuar con tu compra.
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

  const totals = computeTotals(items);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 space-y-6 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
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
          <div>
            <h3 className="font-serif text-lg text-amber-50">Resumen de compra</h3>
            <p className="text-amber-100/40 text-xs tracking-wide mt-1">
              Revisa tus piezas antes de continuar.
            </p>
          </div>
        </div>

        <OrderItems items={items} />

        <div className="border-t border-amber-600/30 pt-5">
          <OrderTotals totals={totals} />
        </div>

        <div className="rounded-md border border-amber-600/30 bg-amber-600/5 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-100/70">
            Estas piezas son modelos descontinuados de outlet, por eso su
            precio especial.{" "}
            <span className="text-amber-200/90 font-medium">
              No tienen cambios ni devoluciones.
            </span>
          </p>
        </div>

        {/* Términos y condiciones — obligatorio */}
        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500 cursor-pointer"
          />
          <span className="text-xs leading-relaxed text-amber-100/60">
            He leído y acepto los{" "}
            <a
              href="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:underline"
            >
              términos y condiciones
            </a>{" "}
            y la{" "}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500 hover:underline"
            >
              política de privacidad
            </a>
            .
          </span>
        </label>

        <button
          type="button"
          disabled={!acceptedTerms}
          onClick={goToDetails}
          className="btn-shimmer w-full rounded-md bg-linear-to-r from-amber-400 to-amber-600 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:brightness-110 transition-all shadow-[0_8px_24px_-8px_rgba(217,119,6,0.6)] cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Continuar a datos de envío
        </button>
      </div>
    </div>
  );
}
