import { AxiosError, AxiosHeaders } from "axios";
import type { AdminOrder } from "@/lib/api/adminOrders";
import {
  canMarkOrderShipped,
  canRetryShipment,
  needsDropoffAction,
  needsShipmentReview,
  retryShipmentErrorMessage,
  shipmentLabelState,
} from "../shipmentLabel";

// `skydropxShipmentId` no es "un id o null": el backend guarda ahí dos
// centinelas más, y cada uno pide una salida distinta en el panel. Como **cada
// guía se cobra**, clasificar de más (ofrecer reintentar cuando ya hay una
// cobrada) cuesta dinero, y clasificar de menos deja el pedido atorado sin
// ninguna salida. Por eso esta clasificación se prueba estado por estado.

/** Pedido mínimo con lo que miran los guards; el resto no participa. */
function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 1,
    status: "paid",
    paymentStatus: "paid",
    subtotal: 1000,
    savings: 0,
    shipping: 160,
    total: 1160,
    customerName: "Ana",
    customerEmail: "ana@example.com",
    customerPhone: "4771234567",
    street: "Calle 1",
    neighborhood: "Centro",
    city: "Celaya",
    state: "Guanajuato",
    postalCode: "38000",
    skydropxQuotationId: "quo_1",
    skydropxRateId: "rate_1",
    skydropxShipmentId: null,
    items: [],
    ...overrides,
  };
}

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

describe("shipmentLabelState", () => {
  it("distingue los cinco estados", () => {
    expect(shipmentLabelState(null)).toEqual({
      state: "none",
      shipmentId: null,
    });
    expect(shipmentLabelState(undefined)).toEqual({
      state: "none",
      shipmentId: null,
    });
    expect(shipmentLabelState("creating")).toEqual({
      state: "creating",
      shipmentId: null,
    });
    expect(shipmentLabelState("shp_abc123")).toEqual({
      state: "real",
      shipmentId: "shp_abc123",
    });
    expect(shipmentLabelState("unreconciled:shp_abc123")).toEqual({
      state: "unreconciled",
      shipmentId: "shp_abc123",
    });
    expect(shipmentLabelState("unreconciled:desconocido")).toEqual({
      state: "unreconciled-unknown",
      shipmentId: null,
    });
  });

  it("trata un marcador sin id como desconocido", () => {
    // Un `unreconciled:` pelón no identifica ninguna guía que buscar en el
    // panel de Skydropx. Tratarlo como id conocido dejaría el pedido sin
    // salida; como desconocido, al menos se puede confirmar y forzar.
    expect(shipmentLabelState("unreconciled:")).toEqual({
      state: "unreconciled-unknown",
      shipmentId: null,
    });
  });

  it("no confunde una cadena vacía con un id de guía", () => {
    expect(shipmentLabelState("")).toEqual({ state: "none", shipmentId: null });
  });
});

describe("canRetryShipment", () => {
  it("permite el reintento de un pedido pagado con tarifa de Skydropx y sin guía", () => {
    expect(canRetryShipment(order())).toBe(true);
    // El centinela puede ser huérfano de un proceso caído: el backend lo libera.
    expect(canRetryShipment(order({ skydropxShipmentId: "creating" }))).toBe(
      true
    );
  });

  it("no lo ofrece cuando el estado del pedido lo rechaza (409 del backend)", () => {
    // Un pedido ya enviado pudo llevar guía capturada a mano: reintentar
    // pagaría una segunda para un pedido que ya salió de la tienda.
    for (const status of ["pending", "shipped", "delivered", "cancelled"] as const) {
      expect(canRetryShipment(order({ status }))).toBe(false);
    }
  });

  it("no lo ofrece sin tarifa de Skydropx (pedido cobrado con la tarifa plana)", () => {
    expect(canRetryShipment(order({ skydropxQuotationId: null }))).toBe(false);
    expect(canRetryShipment(order({ skydropxRateId: null }))).toBe(false);
    expect(
      canRetryShipment(
        order({ skydropxQuotationId: undefined, skydropxRateId: undefined })
      )
    ).toBe(false);
  });

  it("no lo ofrece cuando ya hay una guía real o cobrada sin persistir", () => {
    expect(canRetryShipment(order({ skydropxShipmentId: "shp_abc123" }))).toBe(
      false
    );
    expect(
      canRetryShipment(order({ skydropxShipmentId: "unreconciled:shp_abc123" }))
    ).toBe(false);
    // El caso "desconocido" tampoco se reintenta a ciegas: pide `force`, que
    // se ofrece por su propia rama de UI tras confirmar en el panel.
    expect(
      canRetryShipment(order({ skydropxShipmentId: "unreconciled:desconocido" }))
    ).toBe(false);
  });
});

describe("needsShipmentReview", () => {
  it("solo marca los dos estados que necesitan un humano", () => {
    expect(
      needsShipmentReview(order({ skydropxShipmentId: "unreconciled:shp_1" }))
    ).toBe(true);
    expect(
      needsShipmentReview(order({ skydropxShipmentId: "unreconciled:desconocido" }))
    ).toBe(true);
    expect(needsShipmentReview(order({ skydropxShipmentId: null }))).toBe(false);
    expect(needsShipmentReview(order({ skydropxShipmentId: "creating" }))).toBe(
      false
    );
    expect(needsShipmentReview(order({ skydropxShipmentId: "shp_1" }))).toBe(
      false
    );
  });
});

describe("canMarkOrderShipped", () => {
  it("solo lo permite con el pedido pagado — único estado donde el 409 del backend no aplica", () => {
    expect(canMarkOrderShipped(order({ status: "paid" }))).toBe(true);
    for (const status of ["pending", "shipped", "delivered", "cancelled"] as const) {
      expect(canMarkOrderShipped(order({ status }))).toBe(false);
    }
  });
});

describe("needsDropoffAction", () => {
  it("solo avisa con la bandera activa y el pedido todavía pagado sin enviar", () => {
    expect(
      needsDropoffAction(order({ status: "paid", shippingRequiresDropoff: true }))
    ).toBe(true);
  });

  it("no avisa sin la bandera, sin importar el estado", () => {
    expect(
      needsDropoffAction(order({ status: "paid", shippingRequiresDropoff: false }))
    ).toBe(false);
  });

  it("deja de avisar en cuanto el pedido avanza — enviado, entregado, pendiente o cancelado", () => {
    // `shipped`/`delivered`: el dueño ya llevó el paquete (o lo marcó a mano).
    // `pending`/`cancelled`: canMarkOrderShipped ya es false por su cuenta.
    for (const status of ["pending", "shipped", "delivered", "cancelled"] as const) {
      expect(
        needsDropoffAction(order({ status, shippingRequiresDropoff: true }))
      ).toBe(false);
    }
  });
});

describe("retryShipmentErrorMessage", () => {
  // Mensajes reales del backend (payment.service.ts). El del 409 dice qué
  // buscar en Skydropx y el del 502 si conviene insistir: perderlos por un
  // genérico deja al dueño sin saber qué hacer con un pedido ya cobrado.
  const ALREADY_CHARGED =
    "Este pedido ya tiene una guía cobrada en Skydropx (shp_abc123) que no se alcanzó a guardar. Búscala en el panel de Skydropx y captura su número de guía al marcar el pedido como enviado; generar otra la cobraría dos veces.";
  const SKYDROPX_DOWN =
    "No se pudo generar la guía con Skydropx. Revisa el saldo de la cuenta y los datos de envío del pedido, y vuelve a intentarlo.";

  it("prefiere siempre el mensaje del backend", () => {
    expect(retryShipmentErrorMessage(apiError(409, ALREADY_CHARGED))).toBe(
      ALREADY_CHARGED
    );
    expect(retryShipmentErrorMessage(apiError(502, SKYDROPX_DOWN))).toBe(
      SKYDROPX_DOWN
    );
  });

  it("cae a un genérico por status cuando el cuerpo no trae mensaje", () => {
    expect(retryShipmentErrorMessage(apiError(409))).toMatch(/ya no admite/i);
    expect(retryShipmentErrorMessage(apiError(502))).toMatch(/Skydropx/);
    expect(retryShipmentErrorMessage(apiError(404))).toBe(
      "El pedido ya no existe."
    );
    expect(retryShipmentErrorMessage(apiError(400))).toMatch(/Revisa los datos/);
  });

  it("cubre el error de red y lo que no viene de axios", () => {
    const fallback = "No pudimos generar la guía. Inténtalo de nuevo.";
    expect(retryShipmentErrorMessage(new AxiosError("Network Error"))).toBe(
      fallback
    );
    expect(retryShipmentErrorMessage(new Error("boom"))).toBe(fallback);
    expect(retryShipmentErrorMessage(undefined)).toBe(fallback);
  });
});
