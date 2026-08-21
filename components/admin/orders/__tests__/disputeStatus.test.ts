import {
  disputeBlocksShipping,
  disputeReasonLabel,
  disputeState,
} from "../disputeStatus";
import { makeAdminOrder } from "./helpers/factories";

/**
 * `disputeBlocksShipping` es la única función de la app que decide si un pedido sale o no en la
 * hoja de empaque. Un falso "no bloquea" se paga con la pieza Y con el dinero (el cargo ya se
 * revirtió), así que las dos direcciones se prueban explícitamente — sobre todo el default.
 */

describe("disputeState", () => {
  it("sin disputa devuelve null", () => {
    expect(disputeState(makeAdminOrder())).toBeNull();
  });

  it("clasifica los tres estados terminales de Stripe", () => {
    expect(disputeState(makeAdminOrder({ disputeStatus: "won" }))).toBe("ganada");
    expect(disputeState(makeAdminOrder({ disputeStatus: "lost" }))).toBe("perdida");
    expect(disputeState(makeAdminOrder({ disputeStatus: "warning_closed" }))).toBe(
      "cerrada"
    );
  });

  it("trata como abierta todo lo que sigue en curso", () => {
    for (const status of [
      "needs_response",
      "under_review",
      "warning_needs_response",
      "warning_under_review",
    ]) {
      expect(disputeState(makeAdminOrder({ disputeStatus: status }))).toBe("abierta");
    }
  });

  // El default es la decisión de diseño, no un descuido: equivocarse hacia "abierta" cuesta un
  // pedido de menos en la hoja (recuperable en un clic); hacia "resuelta", la mercancía.
  it("un estado que Stripe agregue mañana cuenta como abierta, no como resuelta", () => {
    expect(disputeState(makeAdminOrder({ disputeStatus: "prevented" }))).toBe("abierta");
    expect(disputeState(makeAdminOrder({ disputeStatus: "algo_nuevo" }))).toBe("abierta");
  });
});

describe("disputeBlocksShipping", () => {
  it("sin disputa no bloquea", () => {
    expect(disputeBlocksShipping(makeAdminOrder())).toBe(false);
  });

  it("bloquea con la disputa abierta", () => {
    expect(
      disputeBlocksShipping(makeAdminOrder({ disputeStatus: "needs_response" }))
    ).toBe(true);
  });

  // No es un caso cerrado del que olvidarse: el dinero se fue definitivamente, así que enviar
  // ahí es regalar la pieza encima de haber perdido el cobro.
  it("bloquea también con la disputa PERDIDA", () => {
    expect(disputeBlocksShipping(makeAdminOrder({ disputeStatus: "lost" }))).toBe(true);
  });

  it("deja de bloquear cuando la disputa se gana o se cierra sin contracargo", () => {
    expect(disputeBlocksShipping(makeAdminOrder({ disputeStatus: "won" }))).toBe(false);
    expect(
      disputeBlocksShipping(makeAdminOrder({ disputeStatus: "warning_closed" }))
    ).toBe(false);
  });
});

describe("disputeReasonLabel", () => {
  it("traduce los motivos que puede ver esta tienda", () => {
    expect(disputeReasonLabel("product_not_received")).toBe("Producto no recibido");
    expect(disputeReasonLabel("fraudulent")).toBe("Cargo no reconocido (fraude)");
  });

  it("sin motivo devuelve null", () => {
    expect(disputeReasonLabel(null)).toBeNull();
    expect(disputeReasonLabel(undefined)).toBeNull();
  });

  // Un código sin traducir se puede buscar en el Dashboard de Stripe; un guion no.
  it("devuelve el código crudo cuando no conoce el motivo", () => {
    expect(disputeReasonLabel("incorrect_account_details")).toBe(
      "incorrect_account_details"
    );
  });
});
