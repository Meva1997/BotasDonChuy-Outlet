import { AxiosError, AxiosHeaders } from "axios";

// Construye un AxiosError con status y cuerpo `{ message }`, como los emite el
// backend. Compartido por las suites que necesitan simular un 4xx/5xx real de
// axios (usePlaceOrder, CouponField, ShippingOptions) — mismo shape que usa
// checkoutErrors.test.ts, para que un mock no diverja en forma del error real.
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
