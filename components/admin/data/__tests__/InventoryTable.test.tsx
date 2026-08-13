import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InventoryTable from "../InventoryTable";
import { makeInventoryRow, makeInventoryRows } from "./helpers/factories";

// InventoryTable pinta lo que el dashboard ya calculó (`valorInventario` viene
// del backend), pero tiene dos cosas propias que sí pueden mentir:
//
//  1. `StockBadge` tiene tres tramos con colores disjuntos —agotado / quedan
//     pocas / hay de sobra— y el del medio (≤2) es el que mueve al dueño a
//     reponer. Un corte mal puesto convierte "quedan 2" en verde.
//  2. Solo la vista de cards (`xl:hidden`) pagina; la tabla de escritorio pinta
//     TODAS las filas y su total suma sobre `rows` completo, no sobre la página.
//     jsdom pinta ambas vistas a la vez, así que las aserciones se acotan.

// El `<tfoot>` repite los mismos formatos que las filas (un inventario de una
// sola pieza tiene el mismo total que su renglón), así que las aserciones de
// fila se acotan al `<tbody>` y no a la tabla entera.
function desktopTable() {
  return within(screen.getByRole("table").querySelector("tbody") as HTMLElement);
}

function cardsView(container: HTMLElement) {
  return within(container.querySelector(".xl\\:hidden") as HTMLElement);
}

describe("InventoryTable", () => {
  it("pinta producto, tipo, precios y valor restante de cada fila", () => {
    render(
      <InventoryTable
        rows={[
          makeInventoryRow({
            name: "Bota vaquera",
            type: "bota",
            stock: 5,
            salePrice: 900,
            unitCost: 500,
            valorInventario: 2500,
          }),
        ]}
      />,
    );

    const table = desktopTable();
    expect(table.getByText("Bota vaquera")).toBeInTheDocument();
    expect(table.getByText("Bota")).toBeInTheDocument();
    expect(table.getByText("$900.00")).toBeInTheDocument();
    expect(table.getByText("$500.00")).toBeInTheDocument();
    expect(table.getByText("$2,500.00")).toBeInTheDocument();
  });

  it("calcula el margen unitario y su porcentaje sobre el precio de venta", () => {
    render(
      <InventoryTable
        rows={[makeInventoryRow({ salePrice: 900, unitCost: 500 })]}
      />,
    );

    const table = desktopTable();
    expect(table.getByText("$400.00")).toBeInTheDocument();
    expect(table.getByText("44%")).toBeInTheDocument();
  });

  // Los tres tramos de StockBadge, con sus tonos disjuntos: si alguien mueve el
  // corte a `< 2`, el caso de "quedan 2 piezas" deja de ser ámbar.
  it("stock 0 se pinta como «Agotado» en rojo", () => {
    render(<InventoryTable rows={[makeInventoryRow({ stock: 0 })]} />);
    expect(desktopTable().getByText("Agotado")).toHaveClass("text-red-400");
  });

  it("stock ≤ 2 se pinta en ámbar (aviso de reponer)", () => {
    render(<InventoryTable rows={[makeInventoryRow({ stock: 2 })]} />);
    expect(desktopTable().getByText("2 pz")).toHaveClass("text-amber-400");
  });

  it("stock > 2 se pinta en verde", () => {
    render(<InventoryTable rows={[makeInventoryRow({ stock: 3 })]} />);
    expect(desktopTable().getByText("3 pz")).toHaveClass("text-emerald-400");
  });

  it("traduce los tipos conocidos y deja pasar cualquier otro tal cual", () => {
    render(
      <InventoryTable
        rows={[
          makeInventoryRow({ id: 1, name: "A", type: "bota" }),
          makeInventoryRow({ id: 2, name: "B", type: "sombrero" }),
          makeInventoryRow({ id: 3, name: "C", type: "ropa" }),
        ]}
      />,
    );

    const table = desktopTable();
    expect(table.getByText("Bota")).toBeInTheDocument();
    expect(table.getByText("Sombrero")).toBeInTheDocument();
    // `ropa` no está en el mapa: se pinta crudo en vez de desaparecer.
    expect(table.getByText("ropa")).toBeInTheDocument();
  });

  it("el total suma piezas y valor de TODAS las filas, no solo las de la página visible", async () => {
    // 7 filas: stocks 3..9 → 42 piezas; valor 500×(3..9) → $21,000.00.
    render(<InventoryTable rows={makeInventoryRows(7)} />);

    expect(screen.getAllByText("42 pz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$21,000.00").length).toBeGreaterThan(0);

    // Y sigue siendo el mismo total tras cambiar de página de cards.
    await userEvent.setup().click(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getAllByText("42 pz").length).toBeGreaterThan(0);
  });

  it("con una lista vacía el total es cero piezas", () => {
    render(<InventoryTable rows={[]} />);
    expect(screen.getAllByText("0 pz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
  });

  it("no pagina las cards con cinco filas o menos", () => {
    render(<InventoryTable rows={makeInventoryRows(5)} />);
    expect(screen.queryByRole("button", { name: "Página 2" })).not.toBeInTheDocument();
  });

  it("pagina las cards de cinco en cinco sin tocar la tabla de escritorio", async () => {
    const user = userEvent.setup();
    const { container } = render(<InventoryTable rows={makeInventoryRows(7)} />);

    expect(cardsView(container).getByText("Producto 1")).toBeInTheDocument();
    expect(cardsView(container).queryByText("Producto 6")).not.toBeInTheDocument();
    // La tabla de escritorio nunca pagina: trae las 7 desde el primer render.
    expect(desktopTable().getByText("Producto 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página 2" }));

    expect(cardsView(container).getByText("Producto 6")).toBeInTheDocument();
    expect(cardsView(container).queryByText("Producto 1")).not.toBeInTheDocument();
    expect(desktopTable().getByText("Producto 1")).toBeInTheDocument();
  });

  // Sin los placeholders, pasar de una página llena (5 cards) a la última corta
  // (2) colapsa la altura del contenedor y la página da un salto.
  it("rellena la última página corta con cards invisibles para no colapsar la altura", async () => {
    const user = userEvent.setup();
    const { container } = render(<InventoryTable rows={makeInventoryRows(7)} />);

    const placeholders = () =>
      container.querySelectorAll('[aria-hidden="true"].invisible');

    // Página 1 está llena: no hace falta rellenar.
    expect(placeholders()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    // Quedan 2 filas reales de 5 → 3 huecos reservados.
    expect(placeholders()).toHaveLength(3);
  });

  it("no rellena con placeholders cuando hay una sola página", () => {
    const { container } = render(<InventoryTable rows={makeInventoryRows(3)} />);
    expect(container.querySelectorAll('[aria-hidden="true"].invisible')).toHaveLength(0);
  });
});
