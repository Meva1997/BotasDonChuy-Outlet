"use client";

/**
 * Sección de pago — tarjeta de prueba (sandbox).
 *
 * Todo corre en modo prueba de Stripe: NO se capturan datos de tarjeta. El pago
 * se confirma con el PaymentMethod de prueba `pm_card_visa` (equivale a la
 * tarjeta 4242 4242 4242 4242) en `usePlaceOrder`. Este panel es solo una
 * representación visual de solo lectura. Al pasar a producción se sustituye por
 * captura real con Stripe Elements (<PaymentElement>).
 */
export default function PaymentSection() {
  return (
    <fieldset className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-amber-600/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <legend className="font-serif text-lg text-amber-50">Datos de pago</legend>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-amber-100/40">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
            <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          Pago seguro
        </span>
      </div>

      {/* Tarjeta de prueba — representación visual de solo lectura */}
      <div className="relative mx-auto w-full max-w-sm">
        {/* Resplandor ambiental bajo la tarjeta */}
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-4xl bg-linear-to-br from-amber-500/15 via-transparent to-amber-700/15 blur-2xl"
        />

        <div className="relative aspect-[1.586/1] overflow-hidden rounded-2xl border border-amber-500/25 bg-linear-to-br from-stone-800 via-stone-900 to-tobacco-950 p-5 sm:p-6 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(251,191,36,0.12)]">
          {/* Textura decorativa: arcos concéntricos ámbar */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-amber-500/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-24 h-56 w-56 rounded-full border border-amber-500/10"
          />
          {/* Barrido de luz sutil */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-tr from-transparent via-amber-100/4 to-transparent"
          />

          <div className="relative flex h-full flex-col justify-between">
            {/* Fila superior: sello de prueba + marca */}
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.22em] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_1px_rgba(251,191,36,0.7)]" />
                Modo de prueba
              </span>
              <span className="font-serif text-lg italic tracking-wide text-amber-50/90">
                VISA
              </span>
            </div>

            {/* Chip + número */}
            <div className="space-y-3">
              <div
                aria-hidden="true"
                className="h-7 w-10 rounded-md bg-linear-to-br from-amber-300/80 to-amber-600/70 shadow-inner ring-1 ring-amber-200/30"
              />
              <p className="font-sans text-lg sm:text-xl tabular-nums tracking-[0.18em] text-amber-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                4242 4242 4242 4242
              </p>
            </div>

            {/* Fila inferior: titular / vencimiento / cvc */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="block text-[8px] uppercase tracking-[0.25em] text-amber-100/40">
                  Titular
                </span>
                <span className="font-sans text-xs tracking-[0.15em] text-amber-50/85">
                  BOTAS DON CHUY
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] uppercase tracking-[0.25em] text-amber-100/40">
                  Vence · CVC
                </span>
                <span className="font-sans text-xs tabular-nums tracking-[0.15em] text-amber-50/85">
                  12/34 · •••
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-amber-100/45">
        Estás en un entorno de{" "}
        <span className="text-amber-200/70">prueba de Stripe</span>. No se cobra
        dinero real: al confirmar, tu pago se procesa de forma segura con la
        tarjeta de prueba <span className="tabular-nums">4242 4242 4242 4242</span>.
      </p>
    </fieldset>
  );
}
