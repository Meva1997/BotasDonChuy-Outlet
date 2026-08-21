import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Cargador único de Stripe.js. `loadStripe(pk)` se invoca UNA sola vez a nivel de
// módulo (no por render) para no recrear la instancia. Devuelve la MISMA promesa
// en cada llamada. Si falta la llave publicable, `stripePromise` es null y la UI
// muestra "pagos no disponibles" en vez de romper.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

export function getStripe(): Promise<Stripe | null> | null {
  return stripePromise;
}

/**
 * True si la llave publicable configurada es de modo prueba (`pk_test_…`).
 *
 * El modo se DERIVA de la llave en vez de vivir en su propia bandera: son la
 * misma verdad, y dos fuentes se contradicen tarde o temprano —justo el error
 * que dejaría el sello "Modo de prueba" pintado sobre un cobro real, o (peor)
 * lo quitaría en desarrollo—. Lo consume `PaymentSection` para mostrar el sello
 * y el número de la tarjeta de prueba solo cuando de verdad no se cobra dinero.
 *
 * Sin llave configurada devuelve `false`: no hay pagos que hacer, y anunciar un
 * "modo de prueba" en una pasarela que ni siquiera cargó sería mentir dos veces.
 */
export function isStripeTestMode(): boolean {
  return publishableKey?.startsWith("pk_test_") ?? false;
}
