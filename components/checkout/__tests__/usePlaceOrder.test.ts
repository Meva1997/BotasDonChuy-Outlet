import { act, renderHook } from "@testing-library/react";
import { useCheckout } from "../CheckoutContext";
import { usePlaceOrder } from "../usePlaceOrder";
import { createOrder } from "@/lib/api/orders";
import { LEGAL_VERSION } from "@/components/legal/entity";
import { getStripe } from "@/lib/stripe/client";
import { shippingKeys } from "@/lib/api/shipping";
import { shippingSignature } from "@/lib/domain/cart";
import {
  RATE_EXPIRED_HINT,
  IDEMPOTENCY_CONFLICT_HINT,
  COUPON_HINT,
} from "../checkoutErrors";
import { apiError } from "./helpers/apiError";
import {
  makeCartItem,
  makeOrderResponse,
  makeSelectedRate,
  makeShippingData,
} from "./helpers/factories";
import { checkoutHookWrapper } from "./helpers/render";

// Orquesta dos fases (crear la orden, confirmar con Stripe) y cachea la orden creada
// en el contexto para que un reintento tras un pago fallido reconfirme la MISMA
// orden en vez de duplicarla. Esta suite es la de mayor riesgo del roadmap: un bug
// aquí cobra de más, cobra de menos, o duplica un cargo real.

// jest.mock() resuelve su primer argumento con el resolver de Jest, no con la
// transformación de alias de Next (esa solo reescribe especificadores de
// import/require reales) — así que aquí necesita una ruta relativa, aunque el resto
// del archivo importe con "@/" sin problema.
jest.mock("../../../lib/stripe/client", () => ({ getStripe: jest.fn() }));
jest.mock("../../../lib/api/orders", () => ({
  ...jest.requireActual("../../../lib/api/orders"),
  createOrder: jest.fn(),
}));

const createOrderMock = createOrder as jest.Mock;
const getStripeMock = getStripe as jest.Mock;

function makeStripeMock() {
  return {
    confirmCardPayment: jest.fn(),
    retrievePaymentIntent: jest.fn(),
  };
}

function renderPlaceOrder({ acceptedTerms = true } = {}) {
  const { Wrapper, queryClient } = checkoutHookWrapper();
  const utils = renderHook(
    () => ({ checkout: useCheckout(), place: usePlaceOrder() }),
    { wrapper: Wrapper }
  );
  // La casilla de términos se marca en el paso 1, mucho antes de llegar al pago,
  // así que el estado de partida de esta suite es "ya aceptó" — sin eso
  // `placeOrder` corta antes de crear nada (Fase 27). El caso contrario tiene su
  // propio test más abajo y pasa `acceptedTerms: false`.
  if (acceptedTerms) {
    act(() => {
      utils.result.current.checkout.setAcceptedTerms(true);
    });
  }
  return { ...utils, queryClient };
}

const items = [makeCartItem()];
const customer = makeShippingData();
const rate = makeSelectedRate();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("camino feliz", () => {
  it("crea la orden, confirma el pago y llama onSuccess sin resetear el estado", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: false });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    expect(onSuccess).toHaveBeenCalledWith(order);
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith("secret_1", {
      payment_method: "pm_card_visa",
    });
    // El formulario se desmonta al avanzar de paso: no hay "idle" que restaurar.
    expect(result.current.place.status).toBe("processing");
    expect(result.current.place.error).toBeNull();
  });

  it("reusa la orden pendiente cacheada en un reintento con la misma firma (no duplica la creación)", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: false });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ error: { message: "Tarjeta rechazada" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });
    expect(result.current.place.error).toBe("Tarjeta rechazada");
    expect(createOrderMock).toHaveBeenCalledTimes(1);

    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    // Misma firma (carrito+cliente+tarifa+cupón): la orden se reusa, no se crea otra.
    expect(createOrderMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(order);
  });

  it("con una firma distinta (cambió el cliente) crea una orden nueva", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValue({ order, clientSecret: "secret_1", replayed: false });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValue({ error: { message: "declinada" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });
    const otherCustomer = makeShippingData({ postalCode: "99999" });
    await act(async () => {
      await result.current.place.placeOrder(items, otherCustomer, rate, null, jest.fn());
    });

    expect(createOrderMock).toHaveBeenCalledTimes(2);
  });

  it("con la tarifa plana de respaldo (quotationId/rateId null) igual cachea y reusa la orden", async () => {
    // La firma interna cae a "flat" para ambos IDs cuando no hubo cotización viva
    // (Skydropx falló y el backend usó SHIPPING_BY_TYPE) — sin ese fallback dos
    // llamadas con la misma tarifa plana producirían firmas distintas y
    // duplicarían la orden.
    const flatRate = makeSelectedRate({ quotationId: null, rateId: null });
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: false });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ error: { message: "declinada" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, flatRate, null, jest.fn());
    });

    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    const onSuccess = jest.fn();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, flatRate, null, onSuccess);
    });

    expect(createOrderMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(order);
  });
});

describe("Idempotency-Replayed", () => {
  it("con el PaymentIntent ya succeeded, NO vuelve a confirmar y llama onSuccess directo", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: true });
    const stripe = makeStripeMock();
    stripe.retrievePaymentIntent.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    const onSuccess = jest.fn();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    expect(stripe.retrievePaymentIntent).toHaveBeenCalledWith("secret_1");
    expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(order);
  });

  it("con el PaymentIntent aún sin succeeded, sí procede a confirmarlo normalmente", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: true });
    const stripe = makeStripeMock();
    stripe.retrievePaymentIntent.mockResolvedValueOnce({
      paymentIntent: { status: "requires_payment_method" },
    });
    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    const onSuccess = jest.fn();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    expect(stripe.confirmCardPayment).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(order);
  });
});

describe("guardas antes de tocar Stripe", () => {
  it("sin clientSecret en la respuesta, avisa y no llega a getStripe", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: null,
      replayed: false,
    });

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toBe(
      "Los pagos no están disponibles en este momento. Inténtalo más tarde."
    );
    expect(result.current.place.status).toBe("idle");
    expect(getStripeMock).not.toHaveBeenCalled();
  });

  it("con getStripe() null (falta la llave publicable), avisa que la pasarela no está configurada", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    getStripeMock.mockReturnValue(null);

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toBe(
      "La pasarela de pago no está configurada. Inténtalo más tarde."
    );
    expect(result.current.place.status).toBe("idle");
  });

  it("con la promesa de Stripe resuelta a null, avisa que no pudo cargar la pasarela", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    getStripeMock.mockReturnValue(Promise.resolve(null));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toBe(
      "No pudimos cargar la pasarela de pago. Revisa tu conexión e inténtalo de nuevo."
    );
    expect(result.current.place.status).toBe("idle");
  });
});

describe("resultado de confirmCardPayment", () => {
  it("con result.error, muestra el mensaje de Stripe", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ error: { message: "Fondos insuficientes" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toBe("Fondos insuficientes");
    expect(result.current.place.status).toBe("idle");
  });

  it("con result.error sin mensaje, cae a la copia genérica", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ error: {} });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toBe("No pudimos procesar el pago. Inténtalo de nuevo.");
  });

  it("con un status inesperado (ni succeeded ni error), pide reintentar", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({
      paymentIntent: { status: "requires_action" },
    });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    const onSuccess = jest.fn();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    expect(result.current.place.error).toBe(
      "El pago quedó pendiente de confirmación. Inténtalo de nuevo."
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("los tres 409 especiales de POST /api/orders", () => {
  it("cotización expirada: limpia la tarifa elegida y fuerza una nueva cotización", async () => {
    createOrderMock.mockRejectedValueOnce(
      apiError(409, `Las cotizaciones expiran (${RATE_EXPIRED_HINT}) a las 24 horas.`)
    );

    const { result, queryClient } = renderPlaceOrder();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const shipSig = shippingSignature(items, customer);
    act(() => result.current.checkout.setSelectedRate(shipSig, rate));

    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.checkout.getSelectedRate(shipSig)).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: shippingKeys.rates(items, customer),
    });
    expect(result.current.place.status).toBe("idle");
  });

  it("clave de idempotencia reusada: la descarta para que el siguiente intento use una nueva", async () => {
    createOrderMock.mockRejectedValueOnce(
      apiError(409, `Esa ${IDEMPOTENCY_CONFLICT_HINT} ya se usó para otro pedido.`)
    );
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_2",
      replayed: false,
    });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });
    const firstKey = createOrderMock.mock.calls[0][1];

    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });
    const secondKey = createOrderMock.mock.calls[1][1];

    // Reintentar con la MISMA clave daría el mismo 409 para siempre.
    expect(secondKey).not.toBe(firstKey);
  });

  it("cupón rechazado al cobrar: expone couponRejected sin tocar la orden pendiente", async () => {
    createOrderMock.mockRejectedValueOnce(
      apiError(409, `El ${COUPON_HINT} "VERANO25" se agotó justo antes de que confirmaras.`)
    );

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, "VERANO25", jest.fn());
    });

    expect(result.current.place.couponRejected).toBe(true);
    expect(result.current.place.error).toMatch(/VERANO25/);
  });

  it("un 409 sin ninguno de los tres hints no marca couponRejected", async () => {
    createOrderMock.mockRejectedValueOnce(apiError(409, "Sin stock suficiente."));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.couponRejected).toBe(false);
    expect(result.current.place.error).toBe("Sin stock suficiente.");
  });
});

describe("mapeo de errores genéricos (vía checkoutErrors)", () => {
  it("un error de red se traduce a 'no pudimos conectar'", async () => {
    const networkError = new Error("Network Error");
    Object.assign(networkError, { isAxiosError: true, response: undefined });
    createOrderMock.mockRejectedValueOnce(networkError);

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    expect(result.current.place.error).toMatch(/conectar con el servidor/i);
    expect(result.current.place.status).toBe("idle");
  });
});

describe("constancia de aceptación de términos (Fase 27)", () => {
  it("manda acceptedTerms y la versión de los documentos en el payload", async () => {
    const order = makeOrderResponse();
    createOrderMock.mockResolvedValueOnce({ order, clientSecret: "secret_1", replayed: false });
    const stripe = makeStripeMock();
    stripe.confirmCardPayment.mockResolvedValueOnce({ paymentIntent: { status: "succeeded" } });
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { result } = renderPlaceOrder();
    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, jest.fn());
    });

    // `[0][0]` es el payload; `[0][1]` es la idempotency key (lo único que esta
    // suite miraba del `createOrder` antes de esta fase).
    const payload = createOrderMock.mock.calls[0][0];
    expect(payload.acceptedTerms).toBe(true);
    // Se compara contra la constante, no contra un literal: si el literal se
    // quedara atrás al editar los documentos, el test seguiría en verde mientras
    // el pedido guarda una versión distinta de la que se le mostró al comprador.
    expect(payload.termsVersion).toBe(LEGAL_VERSION);
  });

  it("sin aceptación no crea el pedido y explica por qué", async () => {
    // Solo se llega aquí volviendo al resumen por el Stepper y desmarcando la
    // casilla: `acceptedTerms` no se resetea al avanzar. Antes de esta fase ese
    // camino pagaba sin problema — la casilla no se volvía a consultar nunca.
    const { result } = renderPlaceOrder({ acceptedTerms: false });
    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.place.placeOrder(items, customer, rate, null, onSuccess);
    });

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.place.error).toMatch(/aceptar los términos/i);
    expect(result.current.place.status).toBe("idle");
  });
});
