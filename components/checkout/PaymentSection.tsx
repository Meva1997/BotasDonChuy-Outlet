"use client";

/**
 * Sección de pago — placeholder visual.
 *
 * Los campos son decorativos y NO se validan ni se envían: la captura real de
 * la tarjeta se hará con Stripe Elements más adelante. Mantener este bloque
 * aislado permite sustituirlo por <PaymentElement /> sin tocar el formulario
 * de envío.
 */
const inputBase =
  "w-full bg-stone-800/60 border border-yellow-600/40 px-4 py-3 text-sm text-amber-50 placeholder:text-amber-100/40 rounded-md outline-none transition-all duration-200 hover:border-yellow-500/70 focus:border-yellow-400 focus:bg-stone-800/90 focus:shadow-[0_0_0_3px_rgba(202,138,4,0.2)]";

const labelBase =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/70 mb-2";

export default function PaymentSection() {
  return (
    <fieldset className="space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-yellow-600/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-yellow-500/20 to-yellow-600/5 border border-yellow-600/30 text-yellow-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <legend className="font-serif text-lg text-amber-50">
            Datos de pago
          </legend>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-amber-100/40">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect
              x="2.5"
              y="5.5"
              width="7"
              height="5"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M4 5.5V4a2 2 0 0 1 4 0v1.5"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
          Pago seguro
        </span>
      </div>

      <div>
        <label htmlFor="cardNumber" className={labelBase}>
          Número de tarjeta
        </label>
        <input
          id="cardNumber"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          autoComplete="off"
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="cardName" className={labelBase}>
          Nombre en la tarjeta
        </label>
        <input
          id="cardName"
          placeholder="Como aparece en la tarjeta"
          autoComplete="off"
          className={inputBase}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cardExpiry" className={labelBase}>
            Vencimiento
          </label>
          <input
            id="cardExpiry"
            inputMode="numeric"
            placeholder="MM / AA"
            autoComplete="off"
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="cardCvc" className={labelBase}>
            CVC
          </label>
          <input
            id="cardCvc"
            inputMode="numeric"
            placeholder="123"
            autoComplete="off"
            className={inputBase}
          />
        </div>
      </div>

      <p className="text-[11px] text-amber-100/40 leading-relaxed">
        Los pagos se procesarán de forma segura con Stripe. Esta sección es una
        vista previa y se habilitará al integrar la pasarela.
      </p>
    </fieldset>
  );
}
