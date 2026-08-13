import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesTable from "../SalesTable";
import { makeSaleRow, makeSaleRows } from "./helpers/factories";

// SalesTable es la ÚNICA tabla del panel que pagina y filtra del lado del
// cliente: recibe `recentSales` (las últimas 20 del dashboard, ya derivadas por
// el backend) y corta sobre ese arreglo. Su gemela de pedidos, OrdersSection,
// hace lo contrario —pide cada página y cada día al backend—, así que las dos
// suites NO son intercambiables.
//
// Dos cosas la hacen delicada:
//  1. La ganancia de la fila resta el ENVÍO además del costo de producto
//     (`total − shipping − costoTotal`, Fase 22). Sin ese término, un pedido de
//     $2,000 con $160 de guía se leía como si los $2,000 cargaran margen.
//  2. jsdom no aplica media queries: las cards (`xl:hidden`) y la tabla
//     (`hidden xl:block`) se pintan a la vez, así que cada texto aparece dos
//     veces. Las aserciones que necesitan unicidad se acotan con `within`.

/** El `<input type="date">` no se puede teclear como texto plano. */
function pickDay(day: string) {
  fireEvent.change(screen.getByLabelText("Filtrar ventas por día"), {
    target: { value: day },
  });
}

function desktopTable() {
  return within(screen.getByRole("table"));
}

describe("SalesTable", () => {
  it("pinta cada venta con fecha, piezas, artículos, ahorro, envío y total", () => {
    render(
      <SalesTable
        sales={[
          makeSaleRow({
            date: "13 jul, 10:30",
            pieces: 3,
            items: "Bota vaquera ×2, Sombrero ×1",
            savings: 300,
            shipping: 160,
            total: 2000,
          }),
        ]}
      />,
    );

    const table = desktopTable();
    expect(table.getByText("13 jul, 10:30")).toBeInTheDocument();
    expect(table.getByText("3")).toBeInTheDocument();
    expect(table.getByText("Bota vaquera ×2, Sombrero ×1")).toBeInTheDocument();
    expect(table.getByText("$300.00")).toBeInTheDocument();
    expect(table.getByText("$160.00")).toBeInTheDocument();
    expect(table.getByText("$2,000.00")).toBeInTheDocument();
  });

  // La invariante de Fase 22. Con `shipping` fuera de la resta el número sería
  // $1,160.00 / 58%, así que el caso falla si alguien quita el término.
  it("la ganancia resta el envío además del costo de producto", () => {
    render(
      <SalesTable
        sales={[makeSaleRow({ total: 2000, shipping: 160, costoTotal: 840 })]}
      />,
    );

    const table = desktopTable();
    expect(table.getByText("$1,000.00")).toBeInTheDocument();
    expect(table.getByText("50%")).toBeInTheDocument();
  });

  it("la card móvil calcula la misma ganancia que la tabla", () => {
    const { container } = render(
      <SalesTable
        sales={[makeSaleRow({ total: 2000, shipping: 160, costoTotal: 840 })]}
      />,
    );

    // La vista de cards es la hermana `xl:hidden` de la tabla.
    const cards = container.querySelector(".xl\\:hidden");
    expect(within(cards as HTMLElement).getByText("$1,000.00")).toBeInTheDocument();
    expect(within(cards as HTMLElement).getByText("50%")).toBeInTheDocument();
    expect(within(cards as HTMLElement).getByText("Envío $160.00")).toBeInTheDocument();
  });

  it("con la lista vacía avisa 'Sin ventas registradas' y no pinta el estado de día vacío", () => {
    render(<SalesTable sales={[]} />);

    expect(screen.getByText("Sin ventas registradas")).toBeInTheDocument();
    expect(screen.queryByText(/Sin ventas el/)).not.toBeInTheDocument();
  });

  it("sin filtro muestra el rango completo de la primera página", () => {
    render(<SalesTable sales={makeSaleRows(12)} />);
    expect(screen.getByText("Mostrando 1–5 de 12")).toBeInTheDocument();
  });

  it("no pagina con cinco ventas o menos", () => {
    render(<SalesTable sales={makeSaleRows(5)} />);
    expect(screen.queryByRole("button", { name: "Página 2" })).not.toBeInTheDocument();
  });

  it("pagina de cinco en cinco y la última página trae el resto", async () => {
    const user = userEvent.setup();
    render(<SalesTable sales={makeSaleRows(12)} />);

    expect(desktopTable().getByText("Pieza 1")).toBeInTheDocument();
    expect(desktopTable().queryByText("Pieza 6")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    expect(screen.getByText("Mostrando 6–10 de 12")).toBeInTheDocument();
    expect(desktopTable().getByText("Pieza 6")).toBeInTheDocument();
    expect(desktopTable().queryByText("Pieza 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página 3" }));
    expect(screen.getByText("Mostrando 11–12 de 12")).toBeInTheDocument();
    expect(desktopTable().getByText("Pieza 12")).toBeInTheDocument();
  });

  // El orden de las fixtures no es decorativo: con los días ya ordenados, los
  // dos `reduce` que buscan mínimo y máximo nunca ejecutan su rama "quédate con
  // el segundo". Este orden (medio, mayor, menor) obliga a las dos ramas de
  // ambos comparadores.
  it("acota el date picker a la ventana de días realmente cargada, sin importar el orden", () => {
    render(
      <SalesTable
        sales={[
          makeSaleRow({ id: "1", day: "2026-07-11" }),
          makeSaleRow({ id: "2", day: "2026-07-20" }),
          makeSaleRow({ id: "3", day: "2026-07-05" }),
        ]}
      />,
    );

    const input = screen.getByLabelText("Filtrar ventas por día");
    expect(input).toHaveAttribute("min", "2026-07-05");
    expect(input).toHaveAttribute("max", "2026-07-20");
  });

  it("sin ventas no acota el date picker (no hay ventana que acotar)", () => {
    render(<SalesTable sales={[]} />);

    const input = screen.getByLabelText("Filtrar ventas por día");
    expect(input).not.toHaveAttribute("min");
    expect(input).not.toHaveAttribute("max");
  });

  it("filtra por día del lado del cliente y lo anuncia en el resumen", () => {
    render(
      <SalesTable
        sales={[
          makeSaleRow({ id: "1", day: "2026-07-05", items: "Del 5" }),
          makeSaleRow({ id: "2", day: "2026-07-20", items: "Del 20" }),
        ]}
      />,
    );

    pickDay("2026-07-05");

    expect(screen.getByText("Mostrando 1–1 de 1 · día seleccionado")).toBeInTheDocument();
    expect(desktopTable().getByText("Del 5")).toBeInTheDocument();
    expect(desktopTable().queryByText("Del 20")).not.toBeInTheDocument();
  });

  it("un día sin ventas dentro del rango se muestra vacío, con la fecha en texto", () => {
    render(
      <SalesTable
        sales={[
          makeSaleRow({ id: "1", day: "2026-07-05" }),
          makeSaleRow({ id: "2", day: "2026-07-20" }),
        ]}
      />,
    );

    pickDay("2026-07-13");

    expect(screen.getByText("Sin ventas el 13 de julio")).toBeInTheDocument();
    expect(screen.getByText("Sin ventas este día")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("«Ver todas las ventas» del estado vacío limpia el filtro", async () => {
    const user = userEvent.setup();
    render(
      <SalesTable
        sales={[
          makeSaleRow({ id: "1", day: "2026-07-05", items: "Del 5" }),
          makeSaleRow({ id: "2", day: "2026-07-20", items: "Del 20" }),
        ]}
      />,
    );

    pickDay("2026-07-13");
    await user.click(screen.getByRole("button", { name: "Ver todas las ventas" }));

    expect(screen.getByText("Mostrando 1–2 de 2")).toBeInTheDocument();
    expect(desktopTable().getByText("Del 5")).toBeInTheDocument();
  });

  it("el botón «Limpiar» solo existe con un día elegido, y devuelve la lista completa", async () => {
    const user = userEvent.setup();
    render(
      <SalesTable
        sales={[
          makeSaleRow({ id: "1", day: "2026-07-05", items: "Del 5" }),
          makeSaleRow({ id: "2", day: "2026-07-20", items: "Del 20" }),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Limpiar/ })).not.toBeInTheDocument();

    pickDay("2026-07-05");
    await user.click(screen.getByRole("button", { name: /Limpiar/ }));

    expect(screen.getByText("Mostrando 1–2 de 2")).toBeInTheDocument();
    expect(desktopTable().getByText("Del 20")).toBeInTheDocument();
  });

  // Sin el reset de página, filtrar desde la página 3 dejaría `page` fuera de
  // rango y la tabla saldría vacía aunque el día sí tenga ventas.
  it("elegir un día vuelve a la primera página", async () => {
    const user = userEvent.setup();
    const sales = makeSaleRows(12);
    render(<SalesTable sales={sales} />);

    await user.click(screen.getByRole("button", { name: "Página 3" }));
    expect(screen.getByText("Mostrando 11–12 de 12")).toBeInTheDocument();

    // El día 03 tiene una sola venta: cabe entera en la página 1.
    pickDay("2026-07-03");
    expect(screen.getByText("Mostrando 1–1 de 1 · día seleccionado")).toBeInTheDocument();
    expect(desktopTable().getByText("Pieza 3")).toBeInTheDocument();
  });

  it("limpiar el día también vuelve a la primera página", async () => {
    const user = userEvent.setup();
    render(<SalesTable sales={makeSaleRows(12)} />);

    await user.click(screen.getByRole("button", { name: "Página 2" }));
    pickDay("2026-07-03");
    await user.click(screen.getByRole("button", { name: /Limpiar/ }));

    expect(screen.getByText("Mostrando 1–5 de 12")).toBeInTheDocument();
  });
});
