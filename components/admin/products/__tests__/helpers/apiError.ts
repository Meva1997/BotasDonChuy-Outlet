import { AxiosError, AxiosHeaders } from "axios";

// Construye un AxiosError con status y cuerpo `{ message }`, como los emite el
// backend. Duplicado del helper homónimo de checkout/auth/orders a propósito —
// un `__tests__/` no importa entre carpetas hermanas (ver CLAUDE.md).
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
