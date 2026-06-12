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
          className="text-xs tracking-[0.2em] uppercase border border-amber-400/40 text-amber-400 px-8 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          Ver outlet
        </button>
      </div>
    );
  }

  const totals = computeTotals(items);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="border border-amber-900/40 bg-stone-900/30 p-6 sm:p-8 space-y-6">
        <header className="space-y-1">
          <h3 className="font-serif text-xl text-amber-50">Resumen de compra</h3>
          <p className="text-amber-100/40 text-xs tracking-wide">
            Revisa tus piezas antes de continuar.
          </p>
        </header>

        <OrderItems items={items} />

        <div className="border-t border-amber-900/30 pt-5">
          <OrderTotals totals={totals} />
        </div>

        {/* Términos y condiciones — obligatorio */}
        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400 cursor-pointer"
          />
          <span className="text-xs leading-relaxed text-amber-100/60">
            He leído y acepto los{" "}
            <a href="/terminos" className="text-amber-400 hover:underline">
              términos y condiciones
            </a>{" "}
            y la{" "}
            <a href="/privacidad" className="text-amber-400 hover:underline">
              política de privacidad
            </a>
            . Entiendo que estas piezas no tienen cambios ni devoluciones.
          </span>
        </label>

        <button
          type="button"
          disabled={!acceptedTerms}
          onClick={goToDetails}
          className="w-full bg-amber-400 text-stone-950 text-xs tracking-[0.25em] uppercase py-3.5 font-medium hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continuar a datos de envío
        </button>
      </div>
    </div>
  );
}
