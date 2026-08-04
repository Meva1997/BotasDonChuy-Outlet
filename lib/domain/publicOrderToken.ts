/**
 * El `publicToken` de un pedido (Fase 17): el UUID opaco que **es** la credencial
 * de `GET /api/orders/lookup/:token`. Módulo puro, con specs.
 *
 * Existe por el formulario de `/pedido`, donde el comprador pega lo que le llegó
 * por correo. Ese endpoint tiene un límite de 30 consultas por minuto por IP, y
 * gastar una en algo que ni siquiera tiene forma de UUID es desperdiciarla justo
 * cuando el comprador está recargando la página esperando su pedido.
 *
 * Ojo con la frontera: aquí SOLO se decide si lo pegado **tiene forma** de enlace.
 * Si el pedido existe o no lo dice el 404 del backend, con su propia copia — el
 * front nunca inventa un "token inválido" (ver `lookupOrderErrorMessage`).
 */

/**
 * Espejo exacto de `PUBLIC_TOKEN_PATTERN` en
 * `../backend/src/services/orders.service.ts`: un token que no es UUID no puede
 * existir en la BD, así que allá ni siquiera se consulta.
 */
export const PUBLIC_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True si `value` tiene la forma del token público de un pedido. */
export function isPublicOrderToken(value: string): boolean {
  return PUBLIC_TOKEN_PATTERN.test(value.trim());
}

// Sin anclas y con `g` implícito por `.match`: la misma expresión de arriba pero
// para encontrar el UUID dentro de una URL completa.
const EMBEDDED_TOKEN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Saca el token de lo que el comprador pegó. Acepta el token pelón **o la URL
 * completa** (`https://…/pedido/<token>`, con o sin barra final, query o hash),
 * porque lo que la gente copia del correo es el enlace entero, no el UUID.
 *
 * Devuelve `null` si no hay nada con forma de token.
 */
export function extractPublicOrderToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (PUBLIC_TOKEN_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  const match = trimmed.match(EMBEDDED_TOKEN);
  return match ? match[0].toLowerCase() : null;
}

// `/pedido/<token>` (con o sin barra final, query o hash) o un `/pedido` pelón.
// Exige el UUID justo para NO cazar el `/pedido/12345` que bien podría tener una
// paquetería mexicana: lo que se descarta tiene que ser inequívocamente nuestro.
// Sin host: en desarrollo el enlace es `localhost:3000` y en producción el dominio
// real, y el dato pudo guardarse desde cualquiera de los dos.
const OWN_TRACKING_URL =
  /\/pedido(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\/?([?#]|$)/i;

/**
 * True si `value` apunta a **nuestra propia** página de seguimiento en vez de a
 * la de la paquetería.
 *
 * `Order.trackingUrl` es el `tracking_url_provider` que manda el webhook de
 * Skydropx — el sitio del carrier— pero hasta la Fase 21 el formulario manual del
 * panel dejaba capturarlo a mano, y ahí se pegó el enlace de `/pedido/<token>`.
 * Con ese dato guardado, el botón "Rastrear" de la página pública manda al
 * comprador a la misma página en la que ya está, y encima disfrazado de enlace
 * externo. El formulario ya no captura el campo, así que esto solo cubre lo que
 * quedó en la BD (o lo que alguien vuelva a meter a mano).
 */
export function isOwnOrderTrackingUrl(value: string): boolean {
  return OWN_TRACKING_URL.test(value.trim());
}
