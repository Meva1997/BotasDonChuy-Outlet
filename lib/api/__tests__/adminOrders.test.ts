import {
  adminOrderKeys,
  cancelAdminOrder,
  getAdminOrders,
  retryAdminOrderShipment,
  rotateAdminOrderToken,
  updateAdminOrderStatus,
} from "../adminOrders";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeAdminOrder, omit } from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

function listResponse(orders = [makeAdminOrder()]) {
  return { orders, total: orders.length, page: 1, perPage: 20, totalPages: 1 };
}

describe("getAdminOrders", () => {
  it("usa page 1 y perPage 20 por defecto", async () => {
    mock.ok(listResponse());

    await getAdminOrders();

    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/admin/orders");
    expect(mock.lastCall().params).toEqual({
      page: 1,
      perPage: 20,
      date: undefined,
      estado: undefined,
    });
  });

  it("manda page/perPage/date/estado cuando se le pasan", async () => {
    mock.ok(listResponse());

    await getAdminOrders(3, 5, "2026-08-12", "pendientes_envio");

    expect(mock.lastCall().params).toEqual({
      page: 3,
      perPage: 5,
      date: "2026-08-12",
      estado: "pendientes_envio",
    });
  });

  it.each(["pendientes_envio", "enviados", "entregados"] as const)(
    "manda estado=%s tal cual",
    async (estado) => {
      mock.ok(listResponse());

      await getAdminOrders(1, 20, undefined, estado);

      expect(mock.lastCall().params).toMatchObject({ estado });
    }
  );

  it("la pestaña 'Todos' OMITE el parámetro en vez de mandar 'todos'", async () => {
    // El backend lo interpretaría igual, pero un `estado: "todos"` que viajara
    // por accidente sería un valor que no existe en el contrato.
    mock.ok(listResponse());

    await getAdminOrders(1, 20);

    expect(mock.lastCall().params?.estado).toBeUndefined();
  });

  it("parsea el envoltorio paginado", async () => {
    const response = listResponse();
    mock.ok(response);

    await expect(getAdminOrders()).resolves.toEqual(response);
  });

  it("conserva la constancia de términos cuando existe", async () => {
    mock.ok(
      listResponse([
        makeAdminOrder({
          termsAcceptedAt: "2026-08-18T10:00:00.000Z",
          termsVersion: "2026-08-18",
          termsAcceptedIp: "187.190.1.1",
        }),
      ])
    );

    const { orders } = await getAdminOrders();

    expect(orders[0].termsAcceptedIp).toBe("187.190.1.1");
  });

  it("acepta null en la constancia (pedidos anteriores al registro)", async () => {
    // `null` significa "no hay constancia", jamás "aceptó". Que el schema lo
    // acepte es lo que permite pintarlo como "sin constancia" en vez de reventar
    // la lista entera por los pedidos viejos.
    mock.ok(listResponse([makeAdminOrder({ termsAcceptedAt: null })]));

    const { orders } = await getAdminOrders();

    expect(orders[0].termsAcceptedAt).toBeNull();
  });

  it("LANZA si falta `total` (parse estricto: es lectura y la paginación depende de él)", async () => {
    mock.ok(omit(listResponse(), "total"));

    await expect(getAdminOrders()).rejects.toThrow();
  });
});

describe("cancelAdminOrder", () => {
  it("postea a /cancel y desenvuelve `order`", async () => {
    const order = makeAdminOrder({ status: "cancelled", paymentStatus: "refunded" });
    mock.ok({ order });

    await expect(cancelAdminOrder(100)).resolves.toEqual(order);
    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/orders/100/cancel");
  });

  it("manda la razón cuando se captura", async () => {
    mock.ok({ order: makeAdminOrder({ status: "cancelled" }) });

    await cancelAdminOrder(100, "El cliente se arrepintió");

    expect(mock.lastCall().body).toEqual({ reason: "El cliente se arrepintió" });
  });

  it("propaga el 409 de un pedido que ya no es cancelable", async () => {
    // El backend rechaza shipped/delivered/cancelled. La UI solo ofrece el botón
    // en pending/paid, pero el 409 es la red que cubre la carrera entre ambos.
    mock.httpError(409, { message: "Este pedido ya fue enviado" });

    await expect(cancelAdminOrder(100)).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});

describe("updateAdminOrderStatus", () => {
  it("manda solo `status` cuando no hay datos de guía", async () => {
    mock.ok({ order: makeAdminOrder({ status: "shipped" }) });

    await updateAdminOrderStatus(100, { status: "shipped" });

    expect(mock.lastCall().method).toBe("patch");
    expect(mock.lastCall().url).toBe("/admin/orders/100/status");
    expect(mock.lastCall().body).toEqual({ status: "shipped" });
  });

  it("incluye los datos de guía capturados, ya recortados", async () => {
    mock.ok({ order: makeAdminOrder({ status: "shipped" }) });

    await updateAdminOrderStatus(100, {
      status: "shipped",
      trackingNumber: "  1234ABC  ",
      shippingCarrier: " Estafeta ",
    });

    expect(mock.lastCall().body).toEqual({
      status: "shipped",
      trackingNumber: "1234ABC",
      shippingCarrier: "Estafeta",
    });
  });

  it("los tres campos de guía viajan de forma independiente", async () => {
    // `trackingUrl` sigue en el contrato aunque el formulario del panel ya no lo
    // capture (se quitó en la Fase 21: es el enlace de la paquetería y solo el
    // webhook de Skydropx debería escribirlo). La función tiene que seguir
    // mandándolo, o el día que un llamador lo use se perdería en silencio.
    mock.ok({ order: makeAdminOrder({ status: "shipped" }) });

    await updateAdminOrderStatus(100, {
      status: "shipped",
      trackingUrl: "https://rastreo.example/1234ABC",
    });

    expect(mock.lastCall().body).toEqual({
      status: "shipped",
      trackingUrl: "https://rastreo.example/1234ABC",
    });
  });

  it("OMITE una clave vacía en vez de mandarla como \"\"", async () => {
    // El backend la valida con `.trim().min(1)`: un "" sería un 400. Y una clave
    // ausente significa "no toques ese campo", que es justo lo que hace falta
    // para avanzar el estado sin borrar la guía ya guardada.
    mock.ok({ order: makeAdminOrder({ status: "delivered" }) });

    await updateAdminOrderStatus(100, {
      status: "delivered",
      trackingNumber: "",
      trackingUrl: "   ",
      shippingCarrier: undefined,
    });

    expect(mock.lastCall().body).toEqual({ status: "delivered" });
  });

  it("desenvuelve `order` de la respuesta", async () => {
    const order = makeAdminOrder({ status: "delivered" });
    mock.ok({ order });

    await expect(
      updateAdminOrderStatus(100, { status: "delivered" })
    ).resolves.toEqual(order);
  });

  it("propaga el 409 de retroceder de estado", async () => {
    mock.httpError(409, { message: "El pedido ya está entregado" });

    await expect(
      updateAdminOrderStatus(100, { status: "shipped" })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});

describe("retryAdminOrderShipment", () => {
  it("el reintento normal manda un cuerpo VACÍO, sin `force`", async () => {
    // `force` es la única forma de generar una segunda guía (y cada guía se
    // cobra). Mandarlo siempre convertiría el reintento normal en un gasto.
    mock.ok({ order: makeAdminOrder({ skydropxShipmentId: "shp_1" }) });

    await retryAdminOrderShipment(100);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/orders/100/shipment/retry");
    expect(mock.lastCall().body).toEqual({});
  });

  it("manda { force: true } solo cuando se pide explícitamente", async () => {
    mock.ok({ order: makeAdminOrder({ skydropxShipmentId: "shp_1" }) });

    await retryAdminOrderShipment(100, { force: true });

    expect(mock.lastCall().body).toEqual({ force: true });
  });

  it("`force: false` se trata como ausente (no viaja como false)", async () => {
    mock.ok({ order: makeAdminOrder() });

    await retryAdminOrderShipment(100, { force: false });

    expect(mock.lastCall().body).toEqual({});
  });

  it("acepta los marcadores no-id de skydropxShipmentId", async () => {
    // No es "un id o null": también puede ser "creating" o "unreconciled:<id>".
    // Si el schema no los aceptara, la pantalla se caería justo en los estados
    // ambiguos que shipmentLabel.ts existe para explicar.
    mock.ok({ order: makeAdminOrder({ skydropxShipmentId: "unreconciled:desconocido" }) });

    const order = await retryAdminOrderShipment(100);

    expect(order.skydropxShipmentId).toBe("unreconciled:desconocido");
  });

  it("propaga el 502 de Skydropx caído (reintentable de inmediato)", async () => {
    mock.httpError(502, { message: "Skydropx no respondió" });

    await expect(retryAdminOrderShipment(100)).rejects.toMatchObject({
      response: { status: 502 },
    });
  });

  it("propaga el 409 de ambigüedad (ante la duda el backend no genera otra guía)", async () => {
    mock.httpError(409, { message: "Ya hay una guía en proceso" });

    await expect(retryAdminOrderShipment(100)).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});

describe("rotateAdminOrderToken", () => {
  it("postea SIN cuerpo y desenvuelve `order`", async () => {
    // No se captura nada: el backend tampoco guarda quién la pidió.
    const order = makeAdminOrder();
    mock.ok({ order });

    await expect(rotateAdminOrderToken(100)).resolves.toEqual(order);
    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/orders/100/rotate-token");
    expect(mock.lastCall().body).toBeUndefined();
  });

  it.each(["pending", "paid", "shipped", "delivered", "cancelled"] as const)(
    "funciona con un pedido en estado %s",
    async (status) => {
      // Es la única acción del modal SIN 409: un enlace filtrado hay que poder
      // apagarlo aunque el pedido ya se haya entregado o cancelado.
      mock.ok({ order: makeAdminOrder({ status }) });

      await expect(rotateAdminOrderToken(100)).resolves.toMatchObject({ status });
    }
  );

  it("el `publicToken` sobrevive el parse aunque ninguna vista lo pinte", async () => {
    // Está declarado en el schema solo para que la respuesta de la rotación no se
    // caiga; nada del panel debe leerlo (es la credencial que abre /pedido/<token>
    // sin contraseña).
    mock.ok({ order: makeAdminOrder({ publicToken: "tok-nuevo" } as never) });

    const order = await rotateAdminOrderToken(100);

    expect((order as { publicToken?: string }).publicToken).toBe("tok-nuevo");
  });

  it("propaga el 404 de un id que no existe", async () => {
    mock.httpError(404);

    await expect(rotateAdminOrderToken(999)).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});

describe("adminOrderKeys", () => {
  it("mete page/perPage/date/estado en la key, para que cambiar de pestaña sea un refetch real", () => {
    expect(adminOrderKeys.list(2, 5, "2026-08-12", "enviados")).toEqual([
      "adminOrders",
      "list",
      2,
      5,
      "2026-08-12",
      "enviados",
    ]);
  });

  it("usa null (no undefined) para date/estado ausentes, así la key serializa igual siempre", () => {
    expect(adminOrderKeys.list(1, 20)).toEqual([
      "adminOrders",
      "list",
      1,
      20,
      null,
      null,
    ]);
  });

  it("dos pestañas distintas producen keys distintas", () => {
    expect(adminOrderKeys.list(1, 20, undefined, "enviados")).not.toEqual(
      adminOrderKeys.list(1, 20, undefined, "entregados")
    );
  });
});
