import axios from "axios";
import { OrderResponseParseError } from "@/lib/api/orders";

/**
 * Traducción de los errores de `POST /api/orders` (+ Stripe) a mensajes y a
 * decisiones de recuperación. Vive aparte de `usePlaceOrder` porque es lógica
 * pura —sin React, sin I/O— y es donde se decide qué hacer ante los TRES 409
 * distintos que puede devolver esta ruta, que no se pueden distinguir por el
 * status: hay que mirar el `message`.
 */

// El backend re-consulta la cotización de Skydropx al crear la orden; si
// expiró (duran 24 h) responde 409 con un mensaje que contiene esta frase.
// A diferencia del 409 genérico de "sin stock", aquí la tarifa elegida ya no
// sirve: hay que limpiarla para que el usuario no reintente contra la misma
// quotationId/rateId caducada.
export const RATE_EXPIRED_HINT = "cotizaciones expiran";

// Tercer 409 de esta ruta (Fase 15): la `Idempotency-Key` que mandamos ya se
// usó para un pedido con OTRO carrito. Mensaje del backend: "Esa clave de
// idempotencia ya se usó para otro pedido. Vuelve a cargar el checkout para
// generar una nueva y reintenta." No debería ocurrir —la clave se deriva de la
// misma firma que decide si el pedido es el mismo—, pero si ocurre, reintentar
// con la misma clave da el mismo 409 para siempre: hay que rotarla.
export const IDEMPOTENCY_CONFLICT_HINT = "clave de idempotencia";

// Cuarto 409 de esta ruta (Fase 19): el cupón dejó de aplicar entre el visto
// bueno de `/coupons/validate` y el pago. `/validate` NO reserva nada —el tope
// global y el "un uso por cliente" se re-deciden atómicamente al crear el
// pedido—, así que este caso es esperado, no un bug: el cupón se agotó, lo usó
// otro carrito del mismo correo, o el descuento deja el total bajo el mínimo
// cobrable de Stripe.
//
// La palabra basta para distinguirlo: ninguno de los otros tres 409 de
// `POST /api/orders` (sin stock, cotización expirada, clave de idempotencia)
// menciona el cupón, mientras que TODOS los mensajes de cupón lo hacen —
// incluido el del mínimo cobrable, que solo lo nombra cuando hubo descuento.
//
// Reintentar sin quitarlo da el mismo 409 para siempre, pero quitarlo NO se hace
// solo: cambiaría en silencio el precio que el comprador aceptó en pantalla. Se
// pinta el mensaje del backend (que literalmente dice "quítalo del checkout") y
// se le ofrece el botón.
export const COUPON_HINT = "cupón";

/** True si `error` es un 409 de axios cuyo `message` contiene `hint`. */
function isConflictWithHint(error: unknown, hint: string): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 409 &&
    typeof error.response.data?.message === "string" &&
    error.response.data.message.includes(hint)
  );
}

export function isRateExpiredError(error: unknown): boolean {
  return isConflictWithHint(error, RATE_EXPIRED_HINT);
}

export function isIdempotencyKeyConflict(error: unknown): boolean {
  return isConflictWithHint(error, IDEMPOTENCY_CONFLICT_HINT);
}

export function isCouponError(error: unknown): boolean {
  return isConflictWithHint(error, COUPON_HINT);
}

/** Traduce un error del flujo de pedido/pago en un mensaje para el usuario. */
export function placeOrderErrorMessage(error: unknown): string {
  // El pedido SÍ se creó (2xx) pero la respuesta no validó: reintentar lo
  // duplicaría. Se le indica explícitamente que no lo reenvíe.
  if (error instanceof OrderResponseParseError)
    return "Tu pedido se registró correctamente, pero no pudimos mostrar la confirmación. No vuelvas a enviarlo; te contactaremos para confirmar los detalles.";
  if (axios.isAxiosError(error)) {
    // Sin `response`: la petición nunca llegó a buen puerto (backend caído,
    // red del usuario, timeout) — no es un error de los datos que capturó.
    if (!error.response)
      return "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
    const message = error.response.data?.message as string | undefined;
    if (error.response.status === 409)
      return (
        message ??
        "Uno o más artículos se quedaron sin stock. Revisa tu carrito."
      );
    if (error.response.status === 400)
      return "Revisa los datos del pedido e inténtalo de nuevo.";
    if (error.response.status >= 500)
      return "Tuvimos un problema en el servidor. Inténtalo de nuevo en unos minutos.";
  }
  return "No pudimos completar tu pedido. Inténtalo de nuevo.";
}
