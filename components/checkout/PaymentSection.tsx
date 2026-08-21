"use client";

import { PaymentElement } from "@stripe/react-stripe-js";
import { isStripeTestMode } from "@/lib/stripe/client";

/**
 * Sección de pago — captura real con el Payment Element de Stripe.
 *
 * El formulario vive dentro de un iframe de Stripe: los datos de la tarjeta
 * viajan directamente a ellos y este sitio NUNCA los ve. Eso no es un detalle
 * de implementación, es lo que hacen verdad el Aviso de Privacidad §4 y los
 * Términos §8, que ya lo afirman por escrito.
 *
 * Esa misma ceguera es la razón de que aquí NO haya adorno alrededor del
 * formulario: una tarjeta ilustrada al lado no podría reflejar ni la marca ni
 * los dígitos (el `change` del Element solo entrega banderas), así que solo
 * podría coreografiarse contra estados vagos. Se probó y se quitó. El Element
 * ya comunica su propio estado dentro del iframe, en español por `locale`.
 *
 * ── Métodos de pago habilitados: SOLO TARJETA ──────────────────────────────
 *
 * El PaymentIntent se crea con `automatic_payment_methods: { enabled: true }`
 * (backend/src/services/payment.service.ts) y NUNCA con `payment_method_types`.
 * Qué métodos se ofrecen se decide en el Dashboard de Stripe, que es
 * configuración INVISIBLE DESDE ESTE REPO — de ahí esta nota:
 *
 *   • **Link: DESACTIVADO.** Pide el correo dentro del propio Element y se lo
 *     manda a Stripe. El Aviso de Privacidad §4 dice literalmente que a Stripe
 *     "nunca les compartimos tu correo electrónico". Síntoma de que alguien lo
 *     reactivó: aparece un campo de correo arriba del formulario de tarjeta.
 *     Reactivarlo obliga a reescribir Privacidad §4 y a subir `LEGAL_VERSION`.
 *
 *   • **OXXO / SPEI: DESACTIVADOS.** Son asíncronos (el voucher vive días)
 *     contra un `PENDING_ORDER_TTL_MINUTES = 30`: el barrido de órdenes
 *     pendientes liberaría el stock con el voucher todavía vigente, y los
 *     Términos §8 prometen que el pedido se confirma "cuando el pago se
 *     acredita". Síntoma de que alguien los reactivó: pedidos clavados en
 *     `pending` y piezas de vuelta en el catálogo mientras el comprador aún
 *     podía pagarlas. Habilitarlos exige TTL por método y una UI de "pendiente
 *     de pago" — no es un cambio de configuración, es una fase.
 *
 * El corolario que sostiene Privacidad §4 vive del otro lado: el backend nunca
 * debe mandar `receipt_email` ni crear un `Customer` con el correo del
 * comprador. Hoy el PaymentIntent solo lleva `metadata.orderId`.
 */

/**
 * - `ready`: Stripe.js está configurado y el Element puede montarse.
 * - `unavailable`: falta la llave publicable (`getStripe()` devolvió null), así
 *   que no hay pasarela que mostrar. Se dice en pantalla en vez de dejar un
 *   hueco: un formulario de pago que no aparece parece un sitio roto.
 */
export type PaymentSectionState = "ready" | "unavailable";

export default function PaymentSection({
  state,
}: {
  state: PaymentSectionState;
}) {
  const testMode = isStripeTestMode();

  return (
    <fieldset className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-4 border-b border-amber-600/30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <legend className="font-serif text-lg text-amber-50">Datos de pago</legend>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase text-amber-100/40">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
            <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          Pago seguro
        </span>
      </div>

      {/* El sello sale del prefijo de la llave, no de una bandera aparte: en
          desarrollo sigue avisando que no se cobra nada, y en producción
          desaparece solo, sin que nadie tenga que acordarse de quitarlo. */}
      {testMode && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.22em] text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_1px_rgba(251,191,36,0.7)]" />
          Modo de prueba
        </span>
      )}

      {state === "ready" && <PaymentElement options={{ layout: "tabs" }} />}

      {state === "unavailable" && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-6 text-center text-[12px] leading-relaxed text-red-400/90"
        >
          Los pagos no están disponibles en este momento. Inténtalo más tarde.
        </p>
      )}

      {testMode && state === "ready" && (
        <p className="text-[11px] leading-relaxed text-amber-100/45">
          Estás en un entorno de{" "}
          <span className="text-amber-200/70">prueba de Stripe</span>: no se
          cobra dinero real. Usa la tarjeta{" "}
          <span className="tabular-nums">4242 4242 4242 4242</span>, cualquier
          fecha futura y cualquier CVC.
        </p>
      )}
    </fieldset>
  );
}
