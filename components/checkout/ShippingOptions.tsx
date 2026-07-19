"use client";

import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/store/cartStore";
import { computeTotals, shippingSignature } from "@/lib/domain/cart";
import {
  getShippingRates,
  shippingKeys,
  type ShippingRatesResponse,
  type ShippingRate,
  type SelectedShippingRate,
} from "@/lib/api/shipping";
import { formatPrice } from "@/lib/utils";
import { useCheckout } from "./CheckoutContext";
import { usePlaceOrder } from "./usePlaceOrder";
import PaymentSection from "./PaymentSection";
import OrderTotals from "./OrderTotals";

function isSameRate(a: ShippingRate | null, b: ShippingRate): boolean {
  if (!a) return false;
  return a.rateId === b.rateId && a.service === b.service;
}

// Feedback de carga: en vez de barras vacías, comunica QUÉ está pasando
// ("buscando paqueterías" + comparando precios/tiempos) sobre esqueletos que
// replican la fila real, para que al llegar las tarifas no salte el layout.
function RatesLoadingState() {
  return (
    <div className="space-y-4">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-4 rounded-lg border border-amber-500/25 bg-linear-to-r from-amber-500/[0.07] to-transparent px-4 py-3.5"
      >
        <span className="relative flex items-center justify-center w-10 h-10 shrink-0">
          <span className="absolute inset-0 rounded-full border border-amber-400/40 animate-ping" />
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-900/70 border border-amber-500/40 text-amber-400 animate-glow-pulse">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="1" y="7" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M15 10h4l3 3v4h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="1.8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-amber-50 text-sm font-medium flex items-center">
            Buscando paqueterías
            <span className="inline-flex gap-0.5 ml-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-amber-400 animate-glow-pulse"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </span>
          </p>
          <p className="text-amber-100/45 text-xs mt-1 leading-relaxed">
            Comparando precios y tiempos de entrega para tu dirección…
          </p>
        </div>
      </div>

      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-amber-600/15 bg-stone-800/30 px-4 py-3.5 animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-600/15 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 rounded bg-amber-600/15" />
              <div className="h-2.5 w-40 rounded bg-amber-600/10" />
            </div>
            <div className="h-4 w-16 rounded bg-amber-600/15 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RateBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "value" | "speed";
}) {
  const styles =
    tone === "value"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90"
      : "border-amber-500/30 bg-amber-500/15 text-amber-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] leading-none shrink-0 ${styles}`}
    >
      {children}
    </span>
  );
}

function RateCard({
  rate,
  selected,
  onSelect,
  isCheapest,
  isFastest,
}: {
  rate: ShippingRate;
  selected: boolean;
  onSelect: () => void;
  isCheapest: boolean;
  isFastest: boolean;
}) {
  const monogram = rate.carrier.trim().charAt(0).toUpperCase() || "•";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group w-full flex items-center gap-4 rounded-lg border px-4 py-3.5 text-left transition-all cursor-pointer ${
        selected
          ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_10px_28px_-14px_rgba(217,119,6,0.6)]"
          : "border-amber-600/25 bg-stone-800/40 hover:border-amber-500/50 hover:bg-stone-800/60"
      }`}
    >
      {/* Monograma de la paquetería: ancla visual para escanear la lista */}
      <span
        aria-hidden="true"
        className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full font-serif text-base leading-none transition-colors ${
          selected
            ? "border border-amber-400/50 bg-amber-400/15 text-amber-200"
            : "border border-amber-600/25 bg-stone-900/60 text-amber-100/70 group-hover:text-amber-100"
        }`}
      >
        {monogram}
      </span>

      {/* Info de la paquetería */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-amber-50 text-sm font-medium truncate">
            {rate.carrier}
          </p>
          {isCheapest && <RateBadge tone="value">Más económico</RateBadge>}
          {isFastest && <RateBadge tone="speed">Más rápido</RateBadge>}
        </div>
        <div className="flex items-center gap-2.5 mt-1">
          <p className="text-amber-100/45 text-xs truncate">{rate.service}</p>
          {rate.days != null && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[11px] text-amber-100/60">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {rate.days} día{rate.days === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Precio + selector */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-amber-300 font-semibold text-sm tabular-nums">
          {formatPrice(rate.total)}
        </span>
        <span
          aria-hidden="true"
          className={`flex items-center justify-center w-5 h-5 rounded-full border shrink-0 transition-colors ${
            selected
              ? "border-amber-400 bg-amber-400"
              : "border-amber-600/40 group-hover:border-amber-500/60"
          }`}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-stone-950" />}
        </span>
      </div>
    </button>
  );
}

export default function ShippingOptions() {
  const items = useCartStore((s) => s.items);
  const {
    confirmedCustomer,
    goToDetails,
    getSelectedRate,
    setSelectedRate,
    completeOrder,
  } = useCheckout();
  const { status, error, placeOrder } = usePlaceOrder();
  const isProcessing = status === "processing";

  const canQuote = !!confirmedCustomer && items.length > 0;
  const signature = confirmedCustomer
    ? shippingSignature(items, confirmedCustomer)
    : "";
  const selected = confirmedCustomer ? getSelectedRate(signature) : null;

  // Los hooks se llaman siempre, sin condicionar por `confirmedCustomer`
  // (Rules of Hooks) — `enabled` es lo que evita el fetch cuando falta.
  const { data, isPending, isError, refetch } = useQuery<ShippingRatesResponse>(
    {
      queryKey: canQuote
        ? shippingKeys.rates(items, confirmedCustomer!)
        : ["shipping", "rates", "idle"],
      queryFn: () => getShippingRates(items, confirmedCustomer!),
      enabled: canQuote,
    }
  );

  // Reconcilia la selección con la cotización VIGENTE cada vez que llegan
  // tarifas nuevas (primer fetch, refetch tras expirar, o re-cotización por
  // cambio de carrito/dirección). Una cotización nueva trae `rateId`s y
  // `quotationId` nuevos, así que la tarifa guardada antes queda desincronizada
  // y cobraría contra una quotationId vieja:
  //   • una sola opción → se preselecciona (nada que decidir) o se resincroniza
  //     su quotationId al valor actual;
  //   • varias opciones → si la elegida sigue presente se resincroniza su
  //     quotationId; si ya no está (la nueva cotización no la incluye) se
  //     descarta para obligar a re-elegir sobre datos frescos.
  useEffect(() => {
    if (!canQuote || !data) return;
    if (data.rates.length === 1) {
      const only = data.rates[0];
      if (!isSameRate(selected, only) || selected?.quotationId !== data.quotationId) {
        setSelectedRate(signature, { ...only, quotationId: data.quotationId });
      }
      return;
    }
    if (selected) {
      const match = data.rates.find((rate) => isSameRate(selected, rate));
      if (!match) {
        setSelectedRate(signature, null);
      } else if (selected.quotationId !== data.quotationId) {
        setSelectedRate(signature, { ...match, quotationId: data.quotationId });
      }
    }
  }, [canQuote, data, selected, signature, setSelectedRate]);

  // Guarda: solo confirmShipping (paso 1) hace visit(2), así que esto no
  // debería alcanzarse sin dirección — se protege por si el árbol de contexto
  // se reinicia (hot reload en desarrollo, navegación directa a la URL).
  if (!confirmedCustomer || items.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-5 py-16">
        <p className="font-serif text-xl text-amber-50/80">
          Falta tu dirección de envío
        </p>
        <button
          type="button"
          onClick={goToDetails}
          className="text-xs tracking-[0.2em] uppercase rounded-md border border-amber-500/40 text-amber-400 px-8 py-3 hover:bg-amber-500/10 transition-colors cursor-pointer"
        >
          Volver a dirección
        </button>
      </div>
    );
  }

  const base = computeTotals(items); // solo se usan subtotal/savings de aquí
  const totals = selected
    ? {
        subtotal: base.subtotal,
        savings: base.savings,
        shipping: selected.total,
        total: base.subtotal - base.savings + selected.total,
      }
    : null;

  const onSubmit = () => {
    if (!selected) return;
    placeOrder(items, confirmedCustomer, selected, (order) =>
      completeOrder(confirmedCustomer, order)
    );
  };

  const handleSelect = (rate: ShippingRate) => {
    const withQuotation: SelectedShippingRate = {
      ...rate,
      quotationId: data?.quotationId ?? null,
    };
    setSelectedRate(signature, withQuotation);
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-[1fr_20rem] gap-8 items-start">
      {/* Columna principal: método de envío + pago */}
      <div className="space-y-8">
        <fieldset className="space-y-5 rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
          <div className="flex items-center gap-3 pb-4 border-b border-amber-600/30">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="7" width="20" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <div>
              <legend className="font-serif text-lg text-amber-50">
                Método de envío
              </legend>
              <p className="text-amber-100/40 text-xs tracking-wide mt-1">
                Elige la paquetería con la que quieres recibir tu pedido.
              </p>
            </div>
          </div>

          {isPending && <RatesLoadingState />}

          {isError && (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3"
            >
              <p className="text-[12px] leading-relaxed text-red-400/90">
                No pudimos calcular las opciones de envío.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-[11px] tracking-[0.2em] uppercase text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {data &&
            (() => {
              // Los distintivos solo tienen sentido comparando: con una sola
              // opción no hay nada más barato/rápido que resaltar.
              const canCompare = data.rates.length > 1;
              const cheapestTotal = canCompare
                ? Math.min(...data.rates.map((r) => r.total))
                : null;
              const deliveryDays = data.rates
                .map((r) => r.days)
                .filter((d): d is number => d != null);
              const fastestDays =
                canCompare && deliveryDays.length
                  ? Math.min(...deliveryDays)
                  : null;
              return (
                <div
                  role="radiogroup"
                  aria-label="Método de envío"
                  className="space-y-3"
                >
                  {data.rates.map((rate) => (
                    <RateCard
                      key={`${rate.rateId ?? "flat"}-${rate.service}`}
                      rate={rate}
                      selected={isSameRate(selected, rate)}
                      onSelect={() => handleSelect(rate)}
                      isCheapest={
                        cheapestTotal != null && rate.total === cheapestTotal
                      }
                      isFastest={
                        fastestDays != null && rate.days === fastestDays
                      }
                    />
                  ))}
                </div>
              );
            })()}
        </fieldset>

        <div className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
          <PaymentSection />
        </div>
      </div>

      {/* Columna lateral: total + acciones */}
      <aside className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/50 to-stone-900/20 p-6 space-y-6 lg:sticky lg:top-6 shadow-[0_0_40px_-15px_rgba(217,119,6,0.35)] animate-fade-in-up">
        <h3 className="font-serif text-lg text-amber-50">Tu pedido</h3>

        {totals ? (
          <OrderTotals totals={totals} />
        ) : (
          <p className="text-xs text-amber-100/50 leading-relaxed">
            Elige una opción de envío para ver el total.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!selected || isProcessing}
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
          onClick={goToDetails}
          className="w-full text-[11px] tracking-[0.2em] uppercase text-amber-100/40 hover:text-amber-100/80 transition-colors cursor-pointer"
        >
          ← Volver a dirección
        </button>
      </aside>
    </div>
  );
}
