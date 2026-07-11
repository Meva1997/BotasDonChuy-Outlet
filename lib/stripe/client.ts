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
