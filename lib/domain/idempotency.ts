/**
 * Clave de idempotencia del checkout (Fase 15).
 *
 * Viaja como header `Idempotency-Key` en `POST /api/orders` y le dice al backend
 * "este es el MISMO intento de compra" en vez de dejar que lo infiera de una
 * huella del carrito. Ver `components/checkout/CheckoutContext.tsx` para cuándo
 * se genera y cuándo rota.
 *
 * No necesita ser criptográficamente fuerte: solo irrepetible dentro de la
 * ventana de deduplicación del backend (60 s). Lo que NO puede hacer es lanzar:
 * `crypto.randomUUID()` solo existe en contexto seguro (https o localhost), así
 * que abrir el sitio desde el teléfono en `http://192.168.x.x:3000` —cosa que se
 * hace para probar— reventaría el checkout entero con un TypeError. De ahí los
 * dos fallbacks.
 *
 * El backend rechaza con 400 una clave de más de 200 caracteres; los tres
 * caminos de abajo producen 36 o menos.
 */
export function newIdempotencyKey(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;

  if (typeof c?.randomUUID === "function") return c.randomUUID();

  // Contexto no seguro: `getRandomValues` sí está disponible (no requiere
  // secure context, a diferencia de randomUUID).
  if (typeof c?.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Último recurso (navegador muy viejo / entorno sin WebCrypto): el timestamp
  // hace irrepetible la clave entre intentos y el random la desambigua dentro
  // del mismo milisegundo.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
