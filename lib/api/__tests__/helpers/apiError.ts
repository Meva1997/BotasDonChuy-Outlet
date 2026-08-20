import { AxiosError, AxiosHeaders } from "axios";

/**
 * Construye un `AxiosError` con status y cuerpo `{ message }`, como los emite el
 * backend. Duplicado del helper homónimo de `checkout/`/`auth/`/`orders/` a
 * propósito — un `__tests__/` no importa entre carpetas hermanas (ver CLAUDE.md).
 *
 * `message: undefined` deja el cuerpo VACÍO (`{}`), que es el caso que ejercita
 * los textos de respaldo de cada `*ErrorMessage`: el backend puede responder un
 * status sin copia (un 502 de infraestructura, un proxy en medio), y ahí es donde
 * el genérico del front tiene que ser bueno.
 */
export function apiError(status: number, message?: string): AxiosError {
  const error = new AxiosError("Request failed");
  error.response = {
    status,
    statusText: "",
    data: message === undefined ? {} : { message },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

/** Fallo sin respuesta: la petición nunca llegó (backend caído, red del usuario). */
export function networkError(): AxiosError {
  return new AxiosError("Network Error", AxiosError.ERR_NETWORK);
}
