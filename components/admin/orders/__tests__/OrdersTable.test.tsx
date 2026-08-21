import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrdersTable from "../OrdersTable";
import { makeAdminOrder, makeAdminOrderItem } from "./helpers/factories";

// La tabla pinta DOS estructuras a la vez (cards para xl:hidden, <table> para
// hidden xl:block) — jsdom no aplica media queries, así que ambas coexisten en el
// DOM y el mismo texto aparece dos veces. Las aserciones que necesitan unicidad
// se acotan con `within(table)`; el aria-label de cada <tr> ("Ver pedido #N")
// también es exclusivo del renglón de escritorio.
//
// La rama más fácil de romper en silencio es `labelNote` (qué decir en la columna
// "Envío" antes de que exista una guía): tres mensajes distintos según el estado
// del pedido y de `skydropxShipmentId`, más el caso sin nota. Se prueba cada uno.

describe("OrdersTable — estado vacío", () => {
  it("usa el mensaje default cuando no hay pedidos", () => {
    render(<OrdersTable orders={[]} onSelect={jest.fn()} />);
    expect(screen.getByText("Aún no hay pedidos")).toBeInTheDocument();
  });

  it("usa el emptyMessage dado", () => {
    render(
      <OrdersTable orders={[]} onSelect={jest.fn()} emptyMessage="Sin pedidos ese día" />
    );
    expect(screen.getByText("Sin pedidos ese día")).toBeInTheDocument();
  });
});

describe("OrdersTable — selección de pedido", () => {
  it("clic en un renglón llama a onSelect con ese pedido", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const order = makeAdminOrder({ id: 42 });
    render(<OrdersTable orders={[order]} onSelect={onSelect} />);

    await user.click(screen.getByLabelText("Ver pedido #42"));
    expect(onSelect).toHaveBeenCalledWith(order);
  });

  it("Enter y espacio en un renglón enfocado también llaman a onSelect", () => {
    const onSelect = jest.fn();
    const order = makeAdminOrder({ id: 7 });
    render(<OrdersTable orders={[order]} onSelect={onSelect} />);

    const row = screen.getByLabelText("Ver pedido #7");
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(order);
  });

  it("clic en el link de la guía no dispara onSelect (no propaga)", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const order = makeAdminOrder({ id: 9, labelUrl: "https://example.com/label.pdf" });
    render(<OrdersTable orders={[order]} onSelect={onSelect} />);

    const table = screen.getByRole("table");
    await user.click(within(table).getByText("Descargar guía"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// La vista de cards (xl:hidden) tiene sus PROPIOS handlers — no reusa los del
// <tr>. Como jsdom pinta las dos a la vez, es fácil dar por probada la selección
// habiendo ejercitado solo la de escritorio: el clic en la card y el
// stopPropagation de su link de guía son código aparte.
describe("OrdersTable — vista de cards (móvil)", () => {
  it("clic en la card llama a onSelect con ese pedido", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const order = makeAdminOrder({ id: 42 });
    render(<OrdersTable orders={[order]} onSelect={onSelect} />);

    // La card empieza con "Pedido #42"; el <tr> de escritorio se llama
    // "Ver pedido #42" (minúscula), así que el ancla ^ los distingue.
    await user.click(screen.getByRole("button", { name: /^Pedido #42/ }));
    expect(onSelect).toHaveBeenCalledWith(order);
  });

  it("clic en el link de la guía de la card no dispara onSelect (no propaga)", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const order = makeAdminOrder({ id: 9, labelUrl: "https://example.com/label.pdf" });
    render(<OrdersTable orders={[order]} onSelect={onSelect} />);

    // La card abrevia el link a "Guía"; la tabla lo llama "Descargar guía".
    await user.click(screen.getByText("Guía"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("cancelado con dropoff no pinta el badge (nunca va a haber envío)", () => {
    const order = makeAdminOrder({
      status: "cancelled",
      shippingRequiresDropoff: true,
      skydropxShipmentId: null,
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.queryByText("Sin recolección")).not.toBeInTheDocument();
    expect(screen.queryByText("Guía en proceso")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin guía")).not.toBeInTheDocument();
  });
});

describe("OrdersTable — piezas totales", () => {
  it("suma la cantidad de todos los renglones del pedido", () => {
    const order = makeAdminOrder({
      id: 1,
      items: [
        makeAdminOrderItem({ id: 1, quantity: 2 }),
        makeAdminOrderItem({ id: 2, quantity: 3 }),
      ],
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("5")).toBeInTheDocument();
  });
});

describe("OrdersTable — nota de guía por columna 'Envío'", () => {
  it("con guía cobrada sin persistir, muestra 'Guía por revisar'", () => {
    const order = makeAdminOrder({
      status: "paid",
      skydropxShipmentId: "unreconciled:shp_1",
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.getAllByText("Guía por revisar")).not.toHaveLength(0);
  });

  it("pagado, con tarifa de Skydropx y sin guía, muestra 'Sin guía'", () => {
    const order = makeAdminOrder({
      status: "paid",
      skydropxQuotationId: "quo_1",
      skydropxRateId: "rate_1",
      skydropxShipmentId: null,
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.getAllByText("Sin guía")).not.toHaveLength(0);
  });

  it("pagado con tarifa plana (sin quotationId), muestra 'Guía en proceso'", () => {
    const order = makeAdminOrder({
      status: "paid",
      skydropxQuotationId: null,
      skydropxRateId: null,
      skydropxShipmentId: null,
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.getAllByText("Guía en proceso")).not.toHaveLength(0);
  });

  it("pendiente o cancelado no muestra ninguna nota de guía", () => {
    for (const status of ["pending", "cancelled"] as const) {
      const order = makeAdminOrder({ status, skydropxShipmentId: null });
      const { unmount } = render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
      expect(screen.queryByText("Guía en proceso")).not.toBeInTheDocument();
      expect(screen.queryByText("Sin guía")).not.toBeInTheDocument();
      expect(screen.queryByText("Guía por revisar")).not.toBeInTheDocument();
      // Sin nota y sin guía, la celda de escritorio cae al guion.
      const table = screen.getByRole("table");
      expect(within(table).getByText("—")).toBeInTheDocument();
      unmount();
    }
  });

  it("con guía ya descargable, no muestra ninguna nota (aunque calificaría)", () => {
    const order = makeAdminOrder({
      status: "paid",
      skydropxShipmentId: null,
      labelUrl: "https://example.com/label.pdf",
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.queryByText("Sin guía")).not.toBeInTheDocument();
    expect(screen.getAllByText("Descargar guía").length).toBeGreaterThan(0);
  });
});

describe("OrdersTable — sin recolección a domicilio", () => {
  it("pinta DropoffBadge cuando shippingRequiresDropoff es true", () => {
    const order = makeAdminOrder({ shippingRequiresDropoff: true });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.getAllByText("Sin recolección").length).toBeGreaterThan(0);
  });

  it("sin dropoff ni guía ni nota, la celda de escritorio muestra el guion, no el badge", () => {
    const order = makeAdminOrder({
      status: "cancelled",
      shippingRequiresDropoff: false,
      labelUrl: null,
      skydropxShipmentId: null,
    });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    expect(screen.queryByText("Sin recolección")).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("—")).toBeInTheDocument();
  });

  it.each(["shipped", "delivered"] as const)(
    "pedido %s con dropoff ya no pinta el badge (la acción ya se hizo o no aplica)",
    (status) => {
      const order = makeAdminOrder({
        status,
        shippingRequiresDropoff: true,
        labelUrl: "https://example.com/label.pdf",
      });
      render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
      expect(screen.queryByText("Sin recolección")).not.toBeInTheDocument();
    }
  );
});

describe("OrdersTable — disputa (Fase 28)", () => {
  // Se prueba en las DOS estructuras porque el badge se agregó a mano en cada una:
  // ponerlo solo en la tabla dejaría al dueño sin la señal en el celular, que es
  // donde más rápido revisa los pedidos del día.
  it("pinta el badge en la tabla y en las cards", () => {
    const order = makeAdminOrder({ disputeStatus: "needs_response" });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("En disputa")).toBeInTheDocument();
    // Dos apariciones = una por estructura (jsdom no aplica media queries).
    expect(screen.getAllByText("En disputa")).toHaveLength(2);
  });

  it("sin disputa no aparece por ningún lado", () => {
    render(<OrdersTable orders={[makeAdminOrder()]} onSelect={jest.fn()} />);
    expect(screen.queryByText(/disputa/i)).not.toBeInTheDocument();
  });
});

describe("OrdersTable — formato de fecha", () => {
  it("sin createdAt, muestra un guion", () => {
    const order = makeAdminOrder({ createdAt: undefined });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("—")).toBeInTheDocument();
  });

  it("con un createdAt que no parsea, también muestra un guion", () => {
    const order = makeAdminOrder({ createdAt: "fecha-invalida" });
    render(<OrdersTable orders={[order]} onSelect={jest.fn()} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("—")).toBeInTheDocument();
  });
});
