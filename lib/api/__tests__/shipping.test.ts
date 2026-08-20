import { getShippingRates, shippingKeys } from "../shipping";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import {
  makeCartItem,
  makeShippingData,
  makeShippingRate,
  omit,
} from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

describe("getShippingRates", () => {
  it("postea { customer, items } con el carrito ya mapeado a renglones de pedido", async () => {
    // El mapeo se comparte con buildOrderPayload a propósito: lo que se cotiza
    // tiene que ser exactamente lo que después se cobra.
    mock.ok({ quotationId: "quo-1", rates: [makeShippingRate()] });

    const customer = makeShippingData();
    await getShippingRates(
      [makeCartItem({ size: 26, quantity: 2 }), makeCartItem({ product: { id: 2 }, size: 27 })],
      customer
    );

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/shipping/rates");
    expect(mock.lastCall().body).toEqual({
      customer,
      items: [
        { productId: 1, size: 26, quantity: 2 },
        { productId: 2, size: 27, quantity: 1 },
      ],
    });
  });

  it("parsea la cotización en vivo", async () => {
    const rate = makeShippingRate({ rateId: "rate-9", packageCount: 3, total: 480 });
    mock.ok({ quotationId: "quo-1", rates: [rate] });

    await expect(getShippingRates([makeCartItem()], makeShippingData())).resolves.toEqual({
      quotationId: "quo-1",
      rates: [rate],
    });
  });

  it("acepta la tarifa plana de respaldo: quotationId, rateId y days en null", async () => {
    // Es la rama que corre cuando Skydropx falla. El backend igual responde 200,
    // así que el schema TIENE que aceptarla o el checkout se caería justo en la
    // situación que ese respaldo vino a rescatar.
    const plana = makeShippingRate({
      rateId: null,
      days: null,
      carrier: "Estándar",
      packageCount: 2,
    });
    mock.ok({ quotationId: null, rates: [plana] });

    await expect(getShippingRates([makeCartItem()], makeShippingData())).resolves.toEqual({
      quotationId: null,
      rates: [plana],
    });
  });

  it("LANZA si una tarifa no trae packageCount", async () => {
    // Declarado requerido a propósito (Fase 23): un backend viejo debe fallar
    // ruidoso en vez de dejar que la UI pinte "una caja" sobre un pedido de cuatro.
    const sinConteo = omit(makeShippingRate(), "packageCount");
    mock.ok({ quotationId: "quo-1", rates: [sinConteo] });

    await expect(getShippingRates([makeCartItem()], makeShippingData())).rejects.toThrow();
  });

  it("LANZA si packageCount es 0 (no hay envío de cero bultos)", async () => {
    mock.ok({
      quotationId: "quo-1",
      rates: [makeShippingRate({ packageCount: 0 })],
    });

    await expect(getShippingRates([makeCartItem()], makeShippingData())).rejects.toThrow();
  });

  it("LANZA si packageCount no es entero", async () => {
    mock.ok({
      quotationId: "quo-1",
      rates: [makeShippingRate({ packageCount: 1.5 })],
    });

    await expect(getShippingRates([makeCartItem()], makeShippingData())).rejects.toThrow();
  });

  it("acepta una respuesta sin tarifas (array vacío)", async () => {
    mock.ok({ quotationId: null, rates: [] });

    await expect(
      getShippingRates([makeCartItem()], makeShippingData())
    ).resolves.toEqual({ quotationId: null, rates: [] });
  });

  it("propaga un fallo de red (la ruta siempre da 200; llegar aquí es infraestructura)", async () => {
    mock.networkError();

    await expect(getShippingRates([makeCartItem()], makeShippingData())).rejects.toBeDefined();
  });
});

describe("shippingKeys", () => {
  it("clavea por carrito mapeado + dirección, no por el CartItem crudo", () => {
    // El CartItem lleva el `Product` completo: usarlo tal cual haría que un
    // cambio irrelevante del catálogo (una foto nueva) invalidara la cotización.
    const customer = makeShippingData();

    expect(shippingKeys.rates([makeCartItem({ size: 26, quantity: 2 })], customer)).toEqual([
      "shipping",
      "rates",
      [{ productId: 1, size: 26, quantity: 2 }],
      customer,
    ]);
  });

  it("expone la raíz para invalidar todas las cotizaciones", () => {
    expect(shippingKeys.all).toEqual(["shipping"]);
  });
});
