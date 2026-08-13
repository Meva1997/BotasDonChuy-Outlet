import { render, screen } from "@testing-library/react";
import OrderStatusTimeline from "../OrderStatusTimeline";
import { makePublicOrder } from "./helpers/factories";

// Todas las ramas de estado salen de `orderTimeline()` (módulo puro, ya con
// specs): aquí solo se verifica que el componente pinte lo correcto por cada
// `kind`, y las dos cosas que SÍ decide el propio componente — ocultar
// "Rastrear" cuando `trackingUrl` apunta a nuestra propia página
// (`isOwnOrderTrackingUrl`) y mostrar el detalle crudo de la paquetería solo
// junto al paso EN CURSO, nunca en uno pasado o futuro.

describe("OrderStatusTimeline", () => {
  it("pinta el banner de espera de pago (kind: awaiting-payment)", () => {
    const order = makePublicOrder({ status: "pending", paymentStatus: "unpaid" });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText("Esperando el pago")).toBeInTheDocument();
  });

  it("pinta el banner de cancelado SIN mención de reembolso si no hubo", () => {
    const order = makePublicOrder({ status: "cancelled", paymentStatus: "unpaid" });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText("Pedido cancelado")).toBeInTheDocument();
    expect(screen.queryByText(/reembolso/)).not.toBeInTheDocument();
  });

  it("incluye la fecha de reembolso cuando refundedAt viene con valor", () => {
    const order = makePublicOrder({
      status: "cancelled",
      paymentStatus: "refunded",
      refundedAt: "2026-07-10T12:00:00.000Z",
    });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText("Pedido cancelado y reembolsado")).toBeInTheDocument();
    expect(screen.getByText(/Emitimos el reembolso el/)).toBeInTheDocument();
  });

  it("omite la fecha si refundedAt es null aunque el estado sea reembolsado", () => {
    const order = makePublicOrder({
      status: "cancelled",
      paymentStatus: "refunded",
      refundedAt: null,
    });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText(/Los bancos suelen tardar/)).toBeInTheDocument();
    expect(screen.queryByText(/Emitimos el reembolso el/)).not.toBeInTheDocument();
  });

  it("pinta la línea de progreso con el paso actual resaltado", () => {
    const order = makePublicOrder({ status: "shipped", paymentStatus: "paid" });
    render(<OrderStatusTimeline order={order} />);

    // "Va en camino" aparece dos veces: como título y como paso de la lista.
    expect(screen.getAllByText("Va en camino").length).toBeGreaterThan(0);
    expect(screen.getByText("Pago recibido")).toBeInTheDocument();
    expect(screen.getByText("Entregado")).toBeInTheDocument();
  });

  it("muestra el estado crudo de la paquetería solo junto al paso en curso", () => {
    const order = makePublicOrder({
      status: "shipped",
      paymentStatus: "paid",
      shipmentStatus: "in_transit",
    });
    render(<OrderStatusTimeline order={order} />);

    // Debe colgar del <li> marcado como paso actual, no repetirse en los demás.
    const current = screen
      .getAllByRole("listitem")
      .filter((li) => li.textContent?.includes("paso actual"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("La paquetería reporta: En tránsito");
    expect(screen.getAllByText(/La paquetería reporta/)).toHaveLength(1);
  });

  it("no muestra el detalle de paquetería si shipmentStatus es null", () => {
    const order = makePublicOrder({
      status: "shipped",
      paymentStatus: "paid",
      shipmentStatus: null,
    });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.queryByText(/La paquetería reporta/)).not.toBeInTheDocument();
  });

  it("no muestra el bloque de envío si no hay carrier, guía ni url", () => {
    const order = makePublicOrder({
      status: "shipped",
      paymentStatus: "paid",
      shippingCarrier: null,
      trackingNumber: null,
      trackingUrl: null,
    });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.queryByText(/Paquetería:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Guía:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rastrear/ })).not.toBeInTheDocument();
  });

  it("muestra 'Rastrear' cuando trackingUrl es del carrier", () => {
    const order = makePublicOrder({
      status: "shipped",
      paymentStatus: "paid",
      shippingCarrier: "Estafeta",
      trackingNumber: "ABC123",
      trackingUrl: "https://rastreo.estafeta.com/ABC123",
    });
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText("Estafeta")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rastrear/ })).toHaveAttribute(
      "href",
      "https://rastreo.estafeta.com/ABC123"
    );
  });

  it("oculta 'Rastrear' cuando trackingUrl apunta a nuestra propia página", () => {
    const order = makePublicOrder({
      status: "shipped",
      paymentStatus: "paid",
      shippingCarrier: "Estafeta",
      trackingUrl: "https://botasdonchuy.com/pedido/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    render(<OrderStatusTimeline order={order} />);

    // El resto del bloque de envío sí se pinta (hay carrier), solo el botón se oculta.
    expect(screen.getByText("Estafeta")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rastrear/ })).not.toBeInTheDocument();
  });
});
