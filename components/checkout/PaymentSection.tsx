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
  "w-full bg-stone-900/60 border border-amber-900/40 px-4 py-3 text-sm text-amber-50 placeholder:text-amber-100/25 outline-none focus:border-amber-400/70 transition-colors";

const labelBase =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/50 mb-2";

export default function PaymentSection() {
  return (
    <fieldset className="space-y-4">
      <div className="flex items-center justify-between">
        <legend className="font-serif text-lg text-amber-50">
          Datos de pago
        </legend>
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

      <p className="text-[11px] text-amber-100/30 leading-relaxed">
        Los pagos se procesarán de forma segura con Stripe. Esta sección es una
        vista previa y se habilitará al integrar la pasarela.
      </p>
    </fieldset>
  );
}
