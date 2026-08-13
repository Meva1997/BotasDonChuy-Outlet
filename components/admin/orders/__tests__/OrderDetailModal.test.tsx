import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  cancelAdminOrder,
  retryAdminOrderShipment,
  updateAdminOrderStatus,
} from "@/lib/api/adminOrders";
import OrderDetailModal from "../OrderDetailModal";
import { apiError } from "./helpers/apiError";
import { makeAdminOrder, makeAdminOrderItem } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// El panel donde el dueño opera pedidos reales: cancela/reembolsa dinero de
// verdad y decide cuándo generar una guía de Skydropx que SE COBRA. Las ramas
// que importan no son de estilo — son las que, de romperse, cobran una guía de
// más, dejan un pedido sin salida, o esconden un botón que el backend sí
// aceptaría (o muestran uno que solo puede devolver 409).

jest.mock("../../../../lib/api/adminOrders", () => ({
  ...jest.requireActual("../../../../lib/api/adminOrders"),
  cancelAdminOrder: jest.fn(),
  updateAdminOrderStatus: jest.fn(),
  retryAdminOrderShipment: jest.fn(),
}));

const cancelAdminOrderMock = cancelAdminOrder as jest.Mock;
const updateAdminOrderStatusMock = updateAdminOrderStatus as jest.Mock;
const retryAdminOrderShipmentMock = retryAdminOrderShipment as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function renderModal(overrides: Parameters<typeof makeAdminOrder>[0] = {}, props = {}) {
  const order = makeAdminOrder(overrides);
  const onClose = jest.fn();
  const onOrderUpdated = jest.fn();
  const onRequestRefresh = jest.fn();
  const utils = renderWithQueryClient(
    <OrderDetailModal
      order={order}
      onClose={onClose}
      onOrderUpdated={onOrderUpdated}
      onRequestRefresh={onRequestRefresh}
      {...props}
    />
  );
  return { order, onClose, onOrderUpdated, onRequestRefresh, ...utils };
}

describe("OrderDetailModal — fila de cupón", () => {
  it("no aparece cuando couponDiscount es 0", () => {
    renderModal({ couponDiscount: 0 });
    expect(screen.queryByText(/cupón/i)).not.toBeInTheDocument();
  });

  it("aparece con el código y va ANTES de Envío cuando couponDiscount > 0", () => {
    renderModal({ couponCode: "VERANO10", couponDiscount: 50 });
    const labels = screen
      .getAllByText((_, el) => el?.tagName === "SPAN" && /^(Cupón|Envío)/.test(el.textContent ?? ""))
      .map((el) => el.textContent);
    const couponIndex = labels.findIndex((l) => l?.startsWith("Cupón"));
    const shippingIndex = labels.findIndex((l) => l === "Envío");
    expect(couponIndex).toBeGreaterThanOrEqual(0);
    expect(shippingIndex).toBeGreaterThanOrEqual(0);
    expect(couponIndex).toBeLessThan(shippingIndex);
    expect(screen.getByText("Cupón VERANO10")).toBeInTheDocument();
  });

  it("cae a la etiqueta genérica 'Cupón' sin código", () => {
    renderModal({ couponCode: null, couponDiscount: 50 });
    expect(screen.getByText("Cupón")).toBeInTheDocument();
  });

  it("con couponDiscount ausente (pedido anterior a Fase 19), el margen no es NaN", () => {
    // `couponDiscount` es `.optional()` en el contrato, así que un pedido viejo
    // llega sin la clave: sin el `?? 0`, restarlo dejaría el margen en NaN.
    renderModal({
      couponDiscount: undefined,
      items: [makeAdminOrderItem({ unitSalePrice: 800, unitCost: 500, quantity: 2 })],
    });
    expect(screen.queryByText(/cupón/i)).not.toBeInTheDocument();
    const margen = screen.getByText("Margen total").closest("div")!;
    expect(within(margen).getByText("$600.00")).toBeInTheDocument();
  });
});

describe("OrderDetailModal — columna Talla", () => {
  it("muestra el número de talla cuando size > 0", () => {
    renderModal({ items: [makeAdminOrderItem({ size: 26 })] });
    expect(screen.getByText("26")).toBeInTheDocument();
  });

  it("muestra un guion en vez del centinela 0 (producto sin tallas)", () => {
    renderModal({ items: [makeAdminOrderItem({ size: 0, nameSnapshot: "Corbatín" })] });
    const row = screen.getByText("Corbatín").closest("tr")!;
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).queryByText("0")).not.toBeInTheDocument();
  });
});

describe("OrderDetailModal — cancelar/reembolsar", () => {
  it("visible en pending y paid, ausente en shipped/delivered/cancelled", () => {
    for (const status of ["pending", "paid"] as const) {
      const { unmount } = renderModal({ status });
      expect(
        screen.getByRole("button", { name: "Cancelar / reembolsar pedido" })
      ).toBeInTheDocument();
      unmount();
    }
    for (const status of ["shipped", "delivered", "cancelled"] as const) {
      const { unmount } = renderModal({ status });
      expect(
        screen.queryByRole("button", { name: "Cancelar / reembolsar pedido" })
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("confirma y cancela, invoca onOrderUpdated con el pedido actualizado", async () => {
    const user = userEvent.setup();
    const updated = makeAdminOrder({ status: "cancelled" });
    cancelAdminOrderMock.mockResolvedValueOnce(updated);
    const { onOrderUpdated } = renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    await waitFor(() => expect(onOrderUpdated).toHaveBeenCalledWith(updated));
    expect(cancelAdminOrderMock).toHaveBeenCalledWith(updated.id, undefined);
  });

  it("muestra el mensaje del backend en un 409", async () => {
    const user = userEvent.setup();
    cancelAdminOrderMock.mockRejectedValueOnce(apiError(409, "Este pedido ya fue enviado."));
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este pedido ya fue enviado.");
  });

  it("cae al mensaje genérico de red cuando el error no trae body", async () => {
    const user = userEvent.setup();
    cancelAdminOrderMock.mockRejectedValueOnce(new Error("network down"));
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cancelar el pedido. Inténtalo de nuevo."
    );
  });
});

describe("OrderDetailModal — avance de estado forward-only", () => {
  it("paid: ofrece 'Marcar como enviado' y 'Marcar como entregado', no 'Agregar guía'", () => {
    renderModal({ status: "paid" });
    expect(screen.getByRole("button", { name: "Marcar como enviado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como entregado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar guía" })).not.toBeInTheDocument();
  });

  it("shipped sin trackingNumber: ofrece 'Agregar guía' y 'Marcar como entregado', no 'Marcar como enviado'", () => {
    renderModal({ status: "shipped", trackingNumber: null });
    expect(screen.getByRole("button", { name: "Agregar guía" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como entregado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como enviado" })).not.toBeInTheDocument();
  });

  it("shipped CON trackingNumber ya capturado: no ofrece 'Agregar guía' de nuevo", () => {
    renderModal({ status: "shipped", trackingNumber: "794658123456" });
    expect(screen.queryByRole("button", { name: "Agregar guía" })).not.toBeInTheDocument();
  });

  it("delivered/cancelled/pending: sin ninguna acción de envío (backend respondería 409)", () => {
    // "Estado del envío" también es la etiqueta del Field que muestra el badge de
    // Skydropx (siempre presente) — la sección de acciones agrega una SEGUNDA
    // aparición del mismo texto como encabezado. Sin acciones, solo debe quedar 1.
    for (const status of ["delivered", "cancelled", "pending"] as const) {
      const { unmount } = renderModal({ status });
      expect(screen.getAllByText("Estado del envío")).toHaveLength(1);
      unmount();
    }
  });

  it("confirmar 'enviado' manda status+tracking y limpia el formulario al éxito", async () => {
    const user = userEvent.setup();
    const updated = makeAdminOrder({ status: "shipped" });
    updateAdminOrderStatusMock.mockResolvedValueOnce(updated);
    const { order, onOrderUpdated } = renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
    await user.type(screen.getByLabelText("Número de guía"), "12345");
    await user.type(screen.getByLabelText("Paquetería"), "Estafeta");
    await user.click(screen.getByRole("button", { name: "Confirmar envío" }));

    await waitFor(() => expect(onOrderUpdated).toHaveBeenCalledWith(updated));
    expect(updateAdminOrderStatusMock).toHaveBeenCalledWith(order.id, {
      status: "shipped",
      trackingNumber: "12345",
      shippingCarrier: "Estafeta",
    });
  });

  it("confirmar 'entregado' NO manda campos de guía", async () => {
    const user = userEvent.setup();
    const updated = makeAdminOrder({ status: "delivered" });
    updateAdminOrderStatusMock.mockResolvedValueOnce(updated);
    const { order } = renderModal({ status: "shipped", trackingNumber: "12345" });

    await user.click(screen.getByRole("button", { name: "Marcar como entregado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    await waitFor(() =>
      expect(updateAdminOrderStatusMock).toHaveBeenCalledWith(order.id, {
        status: "delivered",
      })
    );
  });

  it("un 409 (retroceso/estado inválido) muestra el mensaje del backend", async () => {
    const user = userEvent.setup();
    updateAdminOrderStatusMock.mockRejectedValueOnce(
      apiError(409, "El pedido está cancelado.")
    );
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar envío" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El pedido está cancelado.");
  });

  it("'Volver' cierra el formulario sin enviar nada", async () => {
    const user = userEvent.setup();
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.queryByLabelText("Número de guía")).not.toBeInTheDocument();
    expect(updateAdminOrderStatusMock).not.toHaveBeenCalled();
  });
});

describe("OrderDetailModal — reintento de guía Skydropx", () => {
  it("sin guía y con tarifa de Skydropx, pide confirmar antes de generar", async () => {
    const user = userEvent.setup();
    const updated = makeAdminOrder({ skydropxShipmentId: "shp_new" });
    retryAdminOrderShipmentMock.mockResolvedValueOnce(updated);
    const { order, onOrderUpdated } = renderModal({
      status: "paid",
      skydropxQuotationId: "quo_1",
      skydropxRateId: "rate_1",
      skydropxShipmentId: null,
    });

    await user.click(screen.getByRole("button", { name: "Reintentar guía" }));
    expect(screen.getByText(/cada guía se cobra/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generar guía" }));

    await waitFor(() => expect(onOrderUpdated).toHaveBeenCalledWith(updated));
    // Sin force: el reintento normal manda `{}` (undefined en el mock).
    expect(retryAdminOrderShipmentMock).toHaveBeenCalledWith(order.id, undefined);
  });

  it("guía cobrada sin persistir: NO ofrece reintentar, solo avisa dónde buscarla", () => {
    renderModal({
      status: "paid",
      skydropxShipmentId: "unreconciled:shp_abc123",
    });
    expect(screen.queryByRole("button", { name: "Reintentar guía" })).not.toBeInTheDocument();
    expect(screen.getByText(/ya se generó y se cobró/i)).toBeInTheDocument();
    expect(screen.getByText("shp_abc123")).toBeInTheDocument();
  });

  it("guía desconocida: 'force' solo se manda tras la segunda confirmación", async () => {
    const user = userEvent.setup();
    const updated = makeAdminOrder({ skydropxShipmentId: "shp_forced" });
    retryAdminOrderShipmentMock.mockResolvedValueOnce(updated);
    const { order, onOrderUpdated } = renderModal({
      status: "paid",
      skydropxShipmentId: "unreconciled:desconocido",
    });

    await user.click(
      screen.getByRole("button", { name: "No existe — generar de todos modos" })
    );
    expect(screen.getByText(/no existe ninguna guía/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ya verifiqué, generar guía" })
    );

    await waitFor(() => expect(onOrderUpdated).toHaveBeenCalledWith(updated));
    expect(retryAdminOrderShipmentMock).toHaveBeenCalledWith(order.id, { force: true });
  });

  it("'Ya la encontré' de la guía desconocida abre el formulario de captura de guía", async () => {
    const user = userEvent.setup();
    renderModal({
      status: "paid",
      skydropxShipmentId: "unreconciled:desconocido",
    });

    await user.click(
      screen.getByRole("button", { name: "Ya la encontré — capturar guía" })
    );
    expect(screen.getByLabelText("Número de guía")).toBeInTheDocument();
  });

  it("un reintento fallido dispara onRequestRefresh (pudo cobrar sin persistir)", async () => {
    const user = userEvent.setup();
    retryAdminOrderShipmentMock.mockRejectedValueOnce(apiError(502, "Skydropx no respondió."));
    const { onRequestRefresh } = renderModal({
      status: "paid",
      skydropxShipmentId: null,
    });

    await user.click(screen.getByRole("button", { name: "Reintentar guía" }));
    await user.click(screen.getByRole("button", { name: "Generar guía" }));

    await waitFor(() => expect(onRequestRefresh).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("Skydropx no respondió.");
  });

  it("pedido pagado con tarifa plana (sin quotationId/rateId): no ofrece reintentar", () => {
    renderModal({
      status: "paid",
      skydropxQuotationId: null,
      skydropxRateId: null,
      skydropxShipmentId: null,
    });
    expect(screen.queryByRole("button", { name: "Reintentar guía" })).not.toBeInTheDocument();
  });
});

describe("OrderDetailModal — cierre", () => {
  it("Escape llama a onClose", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("el botón Cerrar del footer llama a onClose", async () => {
    // Hay dos botones con nombre accesible "Cerrar": el ícono X del header
    // (aria-label) y el botón de texto del footer — se toma el último.
    const user = userEvent.setup();
    const { onClose } = renderModal();
    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it("Tab en el último elemento enfocable vuelve al primero (trampa de foco)", () => {
    renderModal();
    const focusables = screen
      .getByRole("dialog")
      .querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("Shift+Tab en el primer elemento enfocable va al último (trampa de foco)", () => {
    renderModal();
    const focusables = screen
      .getByRole("dialog")
      .querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});

describe("OrderDetailModal — mensajes de error (fallbacks sin body)", () => {
  it("cancelar: 502/404/400 sin mensaje del backend caen al genérico por status", async () => {
    const user = userEvent.setup();
    const cases: [number, RegExp][] = [
      [502, /no se pudo procesar el reembolso/i],
      [404, /el pedido ya no existe/i],
      [400, /revisa los datos/i],
    ];
    for (const [status, expected] of cases) {
      cancelAdminOrderMock.mockRejectedValueOnce(apiError(status));
      const { unmount } = renderModal({ status: "paid" });
      await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
      await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      unmount();
    }
  });

  it("cancelar: un 409 sin mensaje cae al genérico de 409 (no al de red)", async () => {
    const user = userEvent.setup();
    cancelAdminOrderMock.mockRejectedValueOnce(apiError(409));
    renderModal({ status: "paid" });
    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya no se puede cancelar/i);
  });

  it("avance de estado: un 409 sin mensaje cae al genérico de 409 (no al de red)", async () => {
    const user = userEvent.setup();
    updateAdminOrderStatusMock.mockRejectedValueOnce(apiError(409));
    renderModal({ status: "paid" });
    await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar envío" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya no puede cambiar a ese estado/i);
  });

  it("cancelar: un 400 con mensaje del backend lo prefiere sobre el genérico", async () => {
    const user = userEvent.setup();
    cancelAdminOrderMock.mockRejectedValueOnce(apiError(400, "Motivo demasiado largo."));
    renderModal({ status: "paid" });
    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Motivo demasiado largo.");
  });

  it("avance de estado: 400/404 sin mensaje caen al genérico; red cae al fallback no-axios", async () => {
    const user = userEvent.setup();
    const cases: [unknown, RegExp][] = [
      [apiError(400), /revisa los datos/i],
      [apiError(404), /el pedido ya no existe/i],
      [new Error("network down"), /no pudimos actualizar el pedido/i],
    ];
    for (const [error, expected] of cases) {
      updateAdminOrderStatusMock.mockRejectedValueOnce(error);
      const { unmount } = renderModal({ status: "paid" });
      await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
      await user.click(screen.getByRole("button", { name: "Confirmar envío" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      unmount();
    }
  });
});

describe("OrderDetailModal — fecha inválida", () => {
  it("no muestra la línea 'Creado/actualizado' cuando el ISO no parsea", () => {
    renderModal({ createdAt: "fecha-invalida", updatedAt: "fecha-invalida" });
    expect(screen.queryByText(/^Creado/)).not.toBeInTheDocument();
  });

  it("con updatedAt distinto de createdAt, agrega '· actualizado'", () => {
    renderModal({
      createdAt: "2026-07-03T12:00:00.000Z",
      updatedAt: "2026-07-04T15:30:00.000Z",
    });
    // `selector: "p"` acota al párrafo: su texto también vive en cada ancestro,
    // y un matcher sin selector devolvería varios nodos.
    const line = screen.getByText(/^Creado/, { selector: "p" });
    expect(line.textContent).toMatch(/^Creado .+ · actualizado .+$/);
  });

  it("con updatedAt igual a createdAt, no repite la fecha como 'actualizado'", () => {
    renderModal({
      createdAt: "2026-07-03T12:00:00.000Z",
      updatedAt: "2026-07-03T12:00:00.000Z",
    });
    const line = screen.getByText(/^Creado/, { selector: "p" });
    expect(line.textContent).not.toMatch(/actualizado/);
  });
});

// El bloque de reembolso es el RESULTADO del flujo sensible de esta pantalla:
// se prueba que cancelar dispara la mutation, pero eso no dice nada de cómo se
// ve el pedido ya reembolsado. Sus dos campos son independientes (el backend
// puede tener uno sin el otro), así que cada uno cae a su propio guion.
describe("OrderDetailModal — bloque de reembolso", () => {
  it("no existe cuando el pedido no tiene reembolso", () => {
    renderModal({ refundId: null, refundedAt: null });
    expect(screen.queryByText("Reembolso")).not.toBeInTheDocument();
    expect(screen.queryByText("Reembolsado el")).not.toBeInTheDocument();
  });

  it("con refundId y refundedAt, muestra el id de Stripe y la fecha", () => {
    renderModal({
      status: "cancelled",
      paymentStatus: "refunded",
      refundId: "re_3Ab12CdEf",
      refundedAt: "2026-07-04T18:30:00.000Z",
    });
    expect(screen.getByText("re_3Ab12CdEf")).toBeInTheDocument();
    const fecha = screen.getByText("Reembolsado el").closest("div")!;
    expect(within(fecha).queryByText("—")).not.toBeInTheDocument();
  });

  it("con refundId pero sin fecha, la fecha cae al guion", () => {
    renderModal({ refundId: "re_3Ab12CdEf", refundedAt: null });
    const fecha = screen.getByText("Reembolsado el").closest("div")!;
    expect(within(fecha).getByText("—")).toBeInTheDocument();
  });

  it("con fecha pero sin refundId, el id cae al guion", () => {
    renderModal({ refundId: null, refundedAt: "2026-07-04T18:30:00.000Z" });
    const id = screen.getByText("Reembolso").closest("div")!;
    expect(within(id).getByText("—")).toBeInTheDocument();
  });

  it("con una fecha de reembolso que no parsea, también cae al guion", () => {
    renderModal({ refundId: "re_3Ab12CdEf", refundedAt: "fecha-invalida" });
    const fecha = screen.getByText("Reembolsado el").closest("div")!;
    expect(within(fecha).getByText("—")).toBeInTheDocument();
  });
});

// Si nadie lleva el paquete a la sucursal, el pedido nunca sale de la tienda:
// el aviso es la única señal dentro del detalle. Va con role="alert" — el mismo
// rol por el que preguntan las aserciones de error de este archivo.
describe("OrderDetailModal — sin recolección a domicilio", () => {
  it("nombra la paquetería a la que hay que llevar el paquete", () => {
    renderModal({ shippingRequiresDropoff: true, shippingCarrier: "Estafeta" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /lleva el paquete a la sucursal de Estafeta/i
    );
  });

  it("sin paquetería asignada, cae a 'la paquetería'", () => {
    renderModal({ shippingRequiresDropoff: true, shippingCarrier: null });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /sucursal de la paquetería/i
    );
  });

  it("sin la bandera, no hay aviso", () => {
    renderModal({ shippingRequiresDropoff: false });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["shipped", "delivered"] as const)(
    "pedido %s ya no muestra el aviso aunque la bandera siga en true",
    (status) => {
      renderModal({ shippingRequiresDropoff: true, status });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  );
});

describe("OrderDetailModal — campo Referencias", () => {
  it("muestra las referencias capturadas por el comprador", () => {
    renderModal({ references: "Portón negro, frente a la primaria" });
    expect(
      screen.getByText("Portón negro, frente a la primaria")
    ).toBeInTheDocument();
  });

  it("sin referencias, muestra un guion", () => {
    renderModal({ references: null });
    const field = screen.getByText("Referencias").closest("div")!;
    expect(within(field).getByText("—")).toBeInTheDocument();
  });
});

describe("OrderDetailModal — campo Guía (todas las ramas)", () => {
  it("con labelUrl, ofrece 'Descargar guía (PDF)'", () => {
    renderModal({ labelUrl: "https://example.com/label.pdf" });
    expect(screen.getByRole("link", { name: "Descargar guía (PDF)" })).toBeInTheDocument();
  });

  it("con guía por revisar, el campo dice 'Por revisar en Skydropx'", () => {
    renderModal({ status: "paid", skydropxShipmentId: "unreconciled:shp_1" });
    expect(screen.getByText("Por revisar en Skydropx")).toBeInTheDocument();
  });

  it("reintentable, el campo dice 'Sin guía'", () => {
    renderModal({ status: "paid", skydropxShipmentId: null });
    const field = screen.getByText("Guía").closest("div")!;
    expect(within(field).getByText("Sin guía")).toBeInTheDocument();
  });

  it("pagado con tarifa plana (sin reintento posible), el campo dice 'Guía en proceso'", () => {
    renderModal({
      status: "paid",
      skydropxQuotationId: null,
      skydropxRateId: null,
      skydropxShipmentId: null,
    });
    const field = screen.getByText("Guía").closest("div")!;
    expect(within(field).getByText("Guía en proceso")).toBeInTheDocument();
  });

  it("cancelado/pendiente (no puede haber guía), el campo dice 'Aún no generada'", () => {
    renderModal({ status: "cancelled", skydropxShipmentId: null });
    const field = screen.getByText("Guía").closest("div")!;
    expect(within(field).getByText("Aún no generada")).toBeInTheDocument();
  });
});

describe("OrderDetailModal — campo Rastreo y Estado del envío", () => {
  it("con número y URL de rastreo, el número es un link", () => {
    renderModal({ trackingNumber: "12345", trackingUrl: "https://track.example.com/12345" });
    const link = screen.getByRole("link", { name: "12345" });
    expect(link).toHaveAttribute("href", "https://track.example.com/12345");
  });

  it("con número pero sin URL, el número se muestra como texto plano", () => {
    renderModal({ trackingNumber: "12345", trackingUrl: null });
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "12345" })).not.toBeInTheDocument();
  });

  it("con shipmentStatus, pinta el badge del carrier en el campo del header", () => {
    renderModal({ shipmentStatus: "in_transit" });
    expect(screen.getByText("En tránsito")).toBeInTheDocument();
  });
});

describe("OrderDetailModal — margen negativo por artículo", () => {
  it("pinta en rojo el margen cuando el costo supera el precio de venta", () => {
    renderModal({
      items: [
        makeAdminOrderItem({ nameSnapshot: "Bota liquidada", unitSalePrice: 400, unitCost: 500 }),
      ],
    });
    const row = screen.getByText("Bota liquidada").closest("tr")!;
    const marginCell = within(row).getByText("$-100.00");
    expect(marginCell.className).toMatch(/text-red-400/);
  });
});

describe("OrderDetailModal — estado 'creating' del reintento de guía", () => {
  it("muestra el mensaje de guía a medio generar en vez del genérico", () => {
    renderModal({ status: "paid", skydropxShipmentId: "creating" });
    expect(
      screen.getByText(/quedó a medio generar/i)
    ).toBeInTheDocument();
  });
});

describe("OrderDetailModal — 'Volver' en los flujos de confirmación", () => {
  it("retry normal: 'Volver' regresa al botón 'Reintentar guía' sin llamar al backend", async () => {
    const user = userEvent.setup();
    renderModal({ status: "paid", skydropxShipmentId: null });

    await user.click(screen.getByRole("button", { name: "Reintentar guía" }));
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: "Reintentar guía" })).toBeInTheDocument();
    expect(retryAdminOrderShipmentMock).not.toHaveBeenCalled();
  });

  it("retry forzado: 'Volver' regresa a las dos opciones sin llamar al backend", async () => {
    const user = userEvent.setup();
    renderModal({ status: "paid", skydropxShipmentId: "unreconciled:desconocido" });

    await user.click(
      screen.getByRole("button", { name: "No existe — generar de todos modos" })
    );
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(
      screen.getByRole("button", { name: "No existe — generar de todos modos" })
    ).toBeInTheDocument();
    expect(retryAdminOrderShipmentMock).not.toHaveBeenCalled();
  });

  it("cancelar: 'Volver' cierra el formulario y limpia el motivo sin llamar al backend", async () => {
    const user = userEvent.setup();
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.type(screen.getByLabelText("Motivo (opcional)"), "cliente se arrepintió");
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(
      screen.getByRole("button", { name: "Cancelar / reembolsar pedido" })
    ).toBeInTheDocument();
    expect(cancelAdminOrderMock).not.toHaveBeenCalled();
  });
});

describe("OrderDetailModal — mensaje de cancelación según status", () => {
  it("pending: avisa que se libera el stock reservado (sin mencionar Stripe)", async () => {
    const user = userEvent.setup();
    renderModal({ status: "pending" });
    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    expect(screen.getByText(/se liberará el stock reservado/i)).toBeInTheDocument();
  });

  it("paid: avisa del reembolso en Stripe", async () => {
    const user = userEvent.setup();
    renderModal({ status: "paid" });
    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    expect(screen.getByText(/se emitirá un reembolso total en stripe/i)).toBeInTheDocument();
  });
});

describe("OrderDetailModal — mensaje 'Agregar guía' y placeholder de paquetería", () => {
  it("shipped sin tracking: el mensaje dice 'Captura la guía…' (rama canAddTracking)", async () => {
    const user = userEvent.setup();
    renderModal({ status: "shipped", trackingNumber: null, shippingCarrier: "Estafeta" });
    await user.click(screen.getByRole("button", { name: "Agregar guía" }));
    expect(screen.getByText(/captura la guía de este pedido/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Actual: Estafeta")).toBeInTheDocument();
  });
});

describe("OrderDetailModal — estados 'pendiente' de las mutations", () => {
  it("cancelar: mientras la mutation está pendiente, el botón dice 'Cancelando…'", async () => {
    const user = userEvent.setup();
    cancelAdminOrderMock.mockImplementation(() => new Promise(() => {}));
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Cancelar / reembolsar pedido" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

    expect(await screen.findByRole("button", { name: "Cancelando…" })).toBeDisabled();
  });

  it("reintento de guía: mientras está pendiente, el botón dice 'Generando…'", async () => {
    const user = userEvent.setup();
    retryAdminOrderShipmentMock.mockImplementation(() => new Promise(() => {}));
    renderModal({ status: "paid", skydropxShipmentId: null });

    await user.click(screen.getByRole("button", { name: "Reintentar guía" }));
    await user.click(screen.getByRole("button", { name: "Generar guía" }));

    expect(await screen.findByRole("button", { name: "Generando…" })).toBeDisabled();
  });

  it("reintento forzado: mientras está pendiente, el botón dice 'Generando…'", async () => {
    const user = userEvent.setup();
    retryAdminOrderShipmentMock.mockImplementation(() => new Promise(() => {}));
    renderModal({ status: "paid", skydropxShipmentId: "unreconciled:desconocido" });

    await user.click(
      screen.getByRole("button", { name: "No existe — generar de todos modos" })
    );
    await user.click(screen.getByRole("button", { name: "Ya verifiqué, generar guía" }));

    expect(await screen.findByRole("button", { name: "Generando…" })).toBeDisabled();
  });

  it("avance de estado: mientras está pendiente, el botón dice 'Guardando…'", async () => {
    const user = userEvent.setup();
    updateAdminOrderStatusMock.mockImplementation(() => new Promise(() => {}));
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Marcar como enviado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar envío" }));

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("marcar entregado: mientras está pendiente, el botón dice 'Guardando…'", async () => {
    const user = userEvent.setup();
    updateAdminOrderStatusMock.mockImplementation(() => new Promise(() => {}));
    renderModal({ status: "paid" });

    await user.click(screen.getByRole("button", { name: "Marcar como entregado" }));
    await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
