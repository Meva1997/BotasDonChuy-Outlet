import { AxiosError, AxiosHeaders } from "axios";

// Construye un AxiosError con status y cuerpo `{ message }`, como los emite el
// backend. Mismo shape que components/checkout/__tests__/helpers/apiError.ts —
// duplicado aquí porque los tests de un `__tests__/` no importan a través de
// carpetas hermanas.
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
