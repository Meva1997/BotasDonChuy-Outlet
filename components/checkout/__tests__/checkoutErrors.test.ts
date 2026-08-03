import { AxiosError, AxiosHeaders } from "axios";
import { OrderResponseParseError } from "@/lib/api/orders";
import {
  isCouponError,
  isIdempotencyKeyConflict,
  isRateExpiredError,
  placeOrderErrorMessage,
} from "../checkoutErrors";

// `POST /api/orders` devuelve CUATRO 409 distintos y cada uno pide una
// recuperación diferente: sin stock (el usuario corrige el carrito), cotización
// expirada (hay que re-cotizar), clave de idempotencia reusada (hay que rotar
// la clave) y cupón rechazado (hay que quitarlo). El status no los distingue —
// solo el `message` — así que confundir dos de ellos deja al comprador
// reintentando en bucle contra el mismo error.

/** Error de axios con status y cuerpo `{ message }`, como los emite el backend. */
function apiError(status: number, message?: string): AxiosError {
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

/** Mensajes reales del backend (no paráfrasis: si allá cambian, esto debe fallar). */
const OUT_OF_STOCK =
  'Solo quedan 2 piezas de "Bota Cuadra" en talla 27. Ajusta tu carrito.';
const RATE_EXPIRED =
  "La cotización de envío ya no está disponible. Las cotizaciones expiran a las 24 horas: vuelve a elegir el método de envío.";
const KEY_REUSED =
  "Esa clave de idempotencia ya se usó para otro pedido. Vuelve a cargar el checkout para generar una nueva y reintenta.";
// Los cuatro rechazos de cupón que puede devolver el checkout (coupon.service.ts).
// El del mínimo cobrable solo nombra el cupón cuando hubo descuento — que es
// justo cuando hay un cupón que quitar.
const COUPON_SOLD_OUT =
  'El cupón "VERANO25" se agotó justo antes de que confirmaras. Quítalo del checkout para continuar con tu compra.';
const COUPON_ALREADY_USED =
  'El cupón "VERANO25" es de un solo uso por cliente y ya lo usaste con el correo ana@ejemplo.com. Quítalo del checkout para continuar con tu compra.';
const COUPON_PENDING_ORDER =
  'Ya tienes un pedido sin pagar que usa el cupón "VERANO25". Termina de pagarlo, o espera unos minutos y vuelve a intentar.';
const COUPON_BELOW_MINIMUM =
  "Este cupón deja el total en $8.00, por debajo del mínimo de $10.00 que acepta el pago en línea. Agrega otro artículo o quita el cupón para continuar.";

describe("los cuatro 409 no se confunden entre sí", () => {
  it("reconoce la cotización expirada y solo esa", () => {
    expect(isRateExpiredError(apiError(409, RATE_EXPIRED))).toBe(true);
    expect(isRateExpiredError(apiError(409, KEY_REUSED))).toBe(false);
    expect(isRateExpiredError(apiError(409, OUT_OF_STOCK))).toBe(false);
  });

  it("reconoce la clave de idempotencia reusada y solo esa", () => {
    expect(isIdempotencyKeyConflict(apiError(409, KEY_REUSED))).toBe(true);
    expect(isIdempotencyKeyConflict(apiError(409, RATE_EXPIRED))).toBe(false);
    expect(isIdempotencyKeyConflict(apiError(409, OUT_OF_STOCK))).toBe(false);
  });

  it("reconoce los rechazos de cupón, incluido el del mínimo cobrable", () => {
    for (const message of [
      COUPON_SOLD_OUT,
      COUPON_ALREADY_USED,
      COUPON_PENDING_ORDER,
      COUPON_BELOW_MINIMUM,
    ]) {
      expect(isCouponError(apiError(409, message))).toBe(true);
    }
  });

  it("no confunde un rechazo de cupón con los otros tres 409", () => {
    // Es lo que decide si se ofrece "quitar el cupón": ofrecerlo ante un
    // problema de stock no arreglaría nada, y no ofrecerlo ante un cupón
    // agotado deja al comprador reintentando contra el mismo error.
    expect(isCouponError(apiError(409, OUT_OF_STOCK))).toBe(false);
    expect(isCouponError(apiError(409, RATE_EXPIRED))).toBe(false);
    expect(isCouponError(apiError(409, KEY_REUSED))).toBe(false);
    expect(isRateExpiredError(apiError(409, COUPON_SOLD_OUT))).toBe(false);
    expect(isIdempotencyKeyConflict(apiError(409, COUPON_SOLD_OUT))).toBe(false);
  });

  it("no reacciona a un 409 sin cuerpo ni a un error que no es de axios", () => {
    for (const detector of [
      isRateExpiredError,
      isIdempotencyKeyConflict,
      isCouponError,
    ]) {
      expect(detector(apiError(409))).toBe(false);
      expect(detector(new Error(KEY_REUSED))).toBe(false);
      expect(detector(null)).toBe(false);
    }
  });

  // El texto de la pista se busca dentro del message; un mismo texto con otro
  // status no es el error que se está detectando (400 de validación, p. ej.).
  it("exige que el status sea 409", () => {
    expect(isIdempotencyKeyConflict(apiError(400, KEY_REUSED))).toBe(false);
    expect(isRateExpiredError(apiError(500, RATE_EXPIRED))).toBe(false);
    // El 400 del cupón (código con caracteres inválidos) no es un rechazo de
    // disponibilidad: no hay nada que "quitar y reintentar", el código está mal.
    expect(isCouponError(apiError(400, "El cupón solo lleva letras y números."))).toBe(
      false
    );
  });
});

describe("placeOrderErrorMessage", () => {
  it("en un 409 muestra el mensaje del backend tal cual", () => {
    // Es lo que hace que el comprador sepa QUÉ artículo ajustar, o que su clave
    // se reusó — la copia genérica no lo diría.
    expect(placeOrderErrorMessage(apiError(409, OUT_OF_STOCK))).toBe(
      OUT_OF_STOCK
    );
    expect(placeOrderErrorMessage(apiError(409, KEY_REUSED))).toBe(KEY_REUSED);
  });

  it("cae a la copia de stock cuando el 409 no trae mensaje", () => {
    expect(placeOrderErrorMessage(apiError(409))).toMatch(/sin stock/i);
  });

  it("pide no reenviar cuando el pedido se creó pero la respuesta no validó", () => {
    // El caso más delicado: reintentar aquí duplicaría el pedido.
    expect(placeOrderErrorMessage(new OrderResponseParseError())).toMatch(
      /No vuelvas a enviarlo/
    );
  });

  it("distingue una petición que nunca llegó de un rechazo del servidor", () => {
    const offline = new AxiosError("Network Error");
    expect(placeOrderErrorMessage(offline)).toMatch(/conectar con el servidor/i);
    expect(placeOrderErrorMessage(apiError(500))).toMatch(/en el servidor/i);
  });

  it("no filtra el mensaje del backend en un 400", () => {
    // Los 400 de esta ruta describen fallos de validación del payload, no algo
    // que el comprador pueda leer y accionar.
    expect(placeOrderErrorMessage(apiError(400, "items[0].size: Required"))).toBe(
      "Revisa los datos del pedido e inténtalo de nuevo."
    );
  });

  it("tiene una copia de último recurso para cualquier otra cosa", () => {
    expect(placeOrderErrorMessage(new Error("boom"))).toBe(
      "No pudimos completar tu pedido. Inténtalo de nuevo."
    );
  });
});
