/**
 * `isStripeTestMode()` decide si el checkout se anuncia como entorno de prueba.
 * Es una función de una línea con una consecuencia grande en las dos
 * direcciones: si devolviera `true` en producción, el comprador leería "no se
 * cobra dinero real" justo antes de un cargo real; si devolviera `false` en
 * desarrollo, se perdería la única señal en pantalla de que no se está cobrando.
 *
 * La llave se lee UNA vez al cargar el módulo (el singleton de `loadStripe` lo
 * exige), así que cada caso necesita su propio `isolateModules` con la variable
 * de entorno ya puesta — reasignarla después no cambiaría nada.
 */

// `loadStripe` haría una petición real al script de Stripe al importar el módulo
// con una llave presente. Aquí solo interesa la lectura de la variable.
jest.mock("@stripe/stripe-js", () => ({ loadStripe: jest.fn(() => null) }));

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

async function loadWithKey(key: string | undefined) {
  if (key === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = key;

  jest.resetModules();
  return import("../client");
}

afterEach(() => {
  if (ORIGINAL_KEY === undefined)
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ORIGINAL_KEY;
});

describe("isStripeTestMode", () => {
  it("con una llave de prueba (pk_test_) reporta modo de prueba", async () => {
    const mod = await loadWithKey("pk_test_123");
    expect(mod.isStripeTestMode()).toBe(true);
  });

  it("con una llave viva (pk_live_) NO reporta modo de prueba", async () => {
    const mod = await loadWithKey("pk_live_123");
    expect(mod.isStripeTestMode()).toBe(false);
  });

  // Sin llave no hay pasarela que cargar: `getStripe()` devuelve null y la UI
  // avisa que los pagos no están disponibles. Anunciar ahí un "modo de prueba"
  // sería describir un entorno de pruebas que tampoco existe.
  it("sin llave configurada, ni modo de prueba ni instancia de Stripe", async () => {
    const mod = await loadWithKey(undefined);
    expect(mod.isStripeTestMode()).toBe(false);
    expect(mod.getStripe()).toBeNull();
  });
});
