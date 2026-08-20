import {
  buildOrderPayload,
  createOrder,
  lookupOrder,
  lookupOrderErrorMessage,
  OrderResponseParseError,
  orderKeys,
} from "../orders";
import { LEGAL_VERSION } from "../../../components/legal/entity";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import {
  makeCartItem,
  makeOrderResponse,
  makePublicOrder,
  makeSelectedRate,
  makeShippingData,
  omit,
} from "./helpers/factories";
import { apiError, networkError } from "./helpers/apiError";
import { useAuthStore } from "../../../store/authStore";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
  useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
  mock.restore();
  useAuthStore.setState({ token: null, user: null });
});

describe("buildOrderPayload", () => {
  const items = [makeCartItem({ quantity: 2 })];
  const customer = makeShippingData();

  it("manda identificadores y cliente, NUNCA montos", async () => {
    // El backend recalcula todo (precios, envío, cupón) de forma atómica. Un
    // monto que viajara desde el cliente sería un precio que el comprador podría
    // dictar.
    const payload = buildOrderPayload(items, customer, null, null, true);

    expect(payload).toEqual({
      items: [{ productId: 1, size: 26, quantity: 2 }],
      customer,
      acceptedTerms: true,
      termsVersion: LEGAL_VERSION,
    });
    expect(payload).not.toHaveProperty("total");
    expect(payload).not.toHaveProperty("subtotal");
    expect(payload).not.toHaveProperty("shipping");
  });

  it("`termsVersion` sale de LEGAL_VERSION — solo el cliente sabe qué texto pintó", () => {
    expect(buildOrderPayload(items, customer).termsVersion).toBe(LEGAL_VERSION);
  });

  it("manda acceptedTerms: false tal cual, sin ponerlo en true por su cuenta", () => {
    // Es la clave de la Fase 27: si este helper "arreglara" el valor, el campo
    // afirmaría algo que el sistema no comprobó, y el 400 del backend —la última
    // red— sería una formalidad que el front esquiva.
    expect(buildOrderPayload(items, customer, null, null, false).acceptedTerms).toBe(false);
  });

  it("por omisión acceptedTerms es false, no true", () => {
    expect(buildOrderPayload(items, customer).acceptedTerms).toBe(false);
  });

  it("con una tarifa viva manda carrier + quotationId + rateId", () => {
    const payload = buildOrderPayload(
      items,
      customer,
      makeSelectedRate({ carrier: "Estafeta", rateId: "rate-9", quotationId: "quo-9" }),
      null,
      true
    );

    expect(payload.shippingCarrier).toBe("Estafeta");
    expect(payload.quotationId).toBe("quo-9");
    expect(payload.rateId).toBe("rate-9");
  });

  it("con la tarifa plana de respaldo manda SOLO el carrier, nunca quotationId/rateId", () => {
    // El backend valida los dos ids como "ambos o ninguno". Mandar uno sería un
    // 400 justo en la rama que existe para rescatar un checkout cuando Skydropx
    // no responde.
    const payload = buildOrderPayload(
      items,
      customer,
      makeSelectedRate({ carrier: "Estándar", rateId: null, quotationId: null }),
      null,
      true
    );

    expect(payload.shippingCarrier).toBe("Estándar");
    expect(payload).not.toHaveProperty("quotationId");
    expect(payload).not.toHaveProperty("rateId");
  });

  it("con quotationId pero sin rateId omite AMBOS (respeta el both-or-neither)", () => {
    const payload = buildOrderPayload(
      items,
      customer,
      makeSelectedRate({ rateId: null, quotationId: "quo-9" }),
      null,
      true
    );

    expect(payload).not.toHaveProperty("quotationId");
    expect(payload).not.toHaveProperty("rateId");
  });

  it("con rateId pero sin quotationId omite AMBOS", () => {
    const payload = buildOrderPayload(
      items,
      customer,
      makeSelectedRate({ rateId: "rate-9", quotationId: null }),
      null,
      true
    );

    expect(payload).not.toHaveProperty("quotationId");
    expect(payload).not.toHaveProperty("rateId");
  });

  it("omite shippingCarrier cuando la tarifa no trae carrier", () => {
    const payload = buildOrderPayload(items, customer, null, null, true);

    expect(payload).not.toHaveProperty("shippingCarrier");
  });

  it("manda el CÓDIGO del cupón, jamás un monto", () => {
    expect(buildOrderPayload(items, customer, null, "VERANO20", true).couponCode).toBe(
      "VERANO20"
    );
  });

  it("OMITE couponCode cuando no hay cupón (una clave con \"\" sería un 400)", () => {
    expect(buildOrderPayload(items, customer, null, null, true)).not.toHaveProperty(
      "couponCode"
    );
    expect(buildOrderPayload(items, customer, null, "", true)).not.toHaveProperty(
      "couponCode"
    );
  });

  it("mapea varios renglones del carrito conservando talla y cantidad", () => {
    const payload = buildOrderPayload(
      [
        makeCartItem({ size: 26, quantity: 2 }),
        makeCartItem({ product: { id: 2 }, size: 0, quantity: 1 }),
      ],
      customer
    );

    expect(payload.items).toEqual([
      { productId: 1, size: 26, quantity: 2 },
      { productId: 2, size: 0, quantity: 1 },
    ]);
  });
});

describe("createOrder", () => {
  const payload = buildOrderPayload([makeCartItem()], makeShippingData(), null, null, true);

  it("postea a /orders y devuelve { order, clientSecret, replayed:false }", async () => {
    const order = makeOrderResponse();
    mock.ok({ order, clientSecret: "pi_1_secret" });

    await expect(createOrder(payload)).resolves.toEqual({
      order,
      clientSecret: "pi_1_secret",
      replayed: false,
    });
    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/orders");
    expect(mock.lastCall().body).toEqual(payload);
  });

  it("acepta clientSecret null (pasarela sin configurar)", async () => {
    mock.ok({ order: makeOrderResponse(), clientSecret: null });

    const result = await createOrder(payload);

    expect(result.clientSecret).toBeNull();
  });

  it("NO manda la cabecera Idempotency-Key cuando no se le pasa clave", async () => {
    mock.ok({ order: makeOrderResponse(), clientSecret: null });

    await createOrder(payload);

    expect(mock.lastCall().headers["Idempotency-Key"]).toBeUndefined();
  });

  it("manda la cabecera Idempotency-Key cuando sí se le pasa", async () => {
    // Es lo que protege el camino de reintento que NO pasa por la caché del
    // contexto (doble clic, reintento automático del navegador): sin ella, dos
    // pedidos con dos cobros y el stock descontado dos veces.
    mock.ok({ order: makeOrderResponse(), clientSecret: null });

    await createOrder(payload, "idem-abc-123");

    expect(mock.lastCall().headers["Idempotency-Key"]).toBe("idem-abc-123");
  });

  it("lee `replayed` de la CABECERA, no del cuerpo", async () => {
    // El reenvío es byte a byte idéntico al original —esa es la garantía de la
    // idempotencia—, así que el cuerpo no puede delatarlo. Importa porque el
    // PaymentIntent de un reenvío puede estar YA cobrado, y confirmarlo otra vez
    // le diría al comprador que su pago falló cuando en realidad ya se hizo.
    mock.ok(
      { order: makeOrderResponse(), clientSecret: "pi_1_secret" },
      { headers: { "idempotency-replayed": "true" } }
    );

    const result = await createOrder(payload, "idem-abc-123");

    expect(result.replayed).toBe(true);
  });

  it("`replayed` es false ante cualquier valor de cabecera que no sea exactamente \"true\"", async () => {
    mock.ok(
      { order: makeOrderResponse(), clientSecret: null },
      { headers: { "idempotency-replayed": "false" } }
    );

    await expect(createOrder(payload, "idem-1")).resolves.toMatchObject({
      replayed: false,
    });
  });

  it("lanza OrderResponseParseError —no un error de Zod— si el 2xx no valida", async () => {
    // El pedido YA se creó y el stock ya se descontó. La clase dedicada existe
    // para que la UI muestre "tu pedido se creó pero..." en vez de invitar a un
    // reintento que crearía un segundo pedido.
    mock.ok({ order: { id: 100 }, clientSecret: null });

    await expect(createOrder(payload)).rejects.toBeInstanceOf(OrderResponseParseError);
  });

  it("el OrderResponseParseError lleva nombre propio para distinguirlo en la UI", async () => {
    mock.ok({ clientSecret: null });

    await expect(createOrder(payload)).rejects.toMatchObject({
      name: "OrderResponseParseError",
    });
  });

  it("propaga los 409 del checkout sin traducirlos (los mapea checkoutErrors.ts)", async () => {
    mock.httpError(409, { message: "Ya no queda stock de la talla 26" });

    await expect(createOrder(payload)).rejects.toMatchObject({
      response: { status: 409 },
    });
  });

  it("acepta un pedido con cupón y token público en la respuesta", async () => {
    const order = makeOrderResponse({
      couponCode: "VERANO20",
      couponDiscount: 160,
      total: 590,
      publicToken: "tok-publico",
    });
    mock.ok({ order, clientSecret: null });

    const result = await createOrder(payload);

    expect(result.order.couponDiscount).toBe(160);
    expect(result.order.publicToken).toBe("tok-publico");
  });
});

describe("lookupOrder", () => {
  it("consulta por token y desenvuelve `order`", async () => {
    const order = makePublicOrder();
    mock.ok({ order });

    await expect(lookupOrder("abc123")).resolves.toEqual(order);
    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/orders/lookup/abc123");
  });

  it("escapa el token en la URL", async () => {
    // El token viene de lo que el comprador pegó: sin escapar, un carácter suelto
    // cambiaría la ruta consultada en vez de producir el 404 que corresponde.
    mock.ok({ order: makePublicOrder() });

    await lookupOrder("a b/c?d");

    expect(mock.lastCall().url).toBe("/orders/lookup/a%20b%2Fc%3Fd");
  });

  it("va como skipAuth: es la consulta del comprador, no del dueño", async () => {
    useAuthStore.setState({ token: "tok-admin", user: null });
    mock.ok({ order: makePublicOrder() });

    await lookupOrder("abc123");

    expect(mock.lastCall().config.skipAuth).toBe(true);
    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });

  it("acepta un pedido reembolsado (paymentStatus que el checkout nunca produce)", async () => {
    // `refunded` solo es alcanzable por la cancelación del admin (Fase 12). Si el
    // enum no lo aceptara, el comprador vería un error justo cuando consulta por
    // qué le devolvieron su dinero.
    mock.ok({
      order: makePublicOrder({
        status: "cancelled",
        paymentStatus: "refunded",
        refundedAt: "2026-08-01T10:00:00.000Z",
      }),
    });

    const order = await lookupOrder("abc123");

    expect(order.paymentStatus).toBe("refunded");
  });

  it("LANZA si el cuerpo no valida (parse estricto: es lectura, reintentable)", async () => {
    mock.ok({ order: omit(makePublicOrder(), "shippingAddress") });

    await expect(lookupOrder("abc123")).rejects.toThrow();
  });

  it("propaga el 404 de token inexistente/alterado", async () => {
    mock.httpError(404, { message: "No encontramos ningún pedido con ese código." });

    await expect(lookupOrder("noexiste")).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});

describe("lookupOrderErrorMessage", () => {
  it("prefiere SIEMPRE el mensaje del backend", () => {
    // El 404 de esta ruta es deliberadamente el mismo para un token inexistente,
    // alterado o mal formado —no revela cuál fue— y su texto ya dice qué hacer.
    // Un "token inválido" inventado aquí sería menos útil Y una filtración.
    expect(
      lookupOrderErrorMessage(apiError(404, "Revisa que el código esté completo."))
    ).toBe("Revisa que el código esté completo.");
  });

  it("tiene copia propia para un 404 sin mensaje", () => {
    expect(lookupOrderErrorMessage(apiError(404))).toMatch(
      /No encontramos ningún pedido con ese enlace/
    );
  });

  it("tiene copia propia para un 429 sin mensaje", () => {
    expect(lookupOrderErrorMessage(apiError(429))).toMatch(/Demasiadas consultas/);
  });

  it("distingue 'no pudimos conectar' cuando la petición nunca llegó", () => {
    expect(lookupOrderErrorMessage(networkError())).toMatch(/No pudimos conectar/);
  });

  it("cae al genérico ante un status sin mensaje", () => {
    expect(lookupOrderErrorMessage(apiError(500))).toBe(
      "No pudimos consultar tu pedido. Inténtalo de nuevo en unos minutos."
    );
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(lookupOrderErrorMessage(new Error("boom"))).toBe(
      "No pudimos consultar tu pedido. Inténtalo de nuevo en unos minutos."
    );
  });
});

describe("orderKeys", () => {
  it("clavea la consulta por su token: es lo único que identifica al pedido", () => {
    expect(orderKeys.all).toEqual(["orders"]);
    expect(orderKeys.lookup("abc123")).toEqual(["orders", "lookup", "abc123"]);
  });
});
