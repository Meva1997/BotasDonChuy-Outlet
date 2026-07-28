import { render, screen, within } from "@testing-library/react";
import ImportSizeDiff from "../../ImportSizeDiff";
import { makeSizeChange } from "../helpers/factories";

// La aritmética del stock por talla: `added` se SUMA a `before`, y eso no se puede deshacer
// desde el panel. Este bloque es donde un "26x200" mal tecleado se vuelve visible antes de
// aplicar, así que la ecuación (tiene + se suma = queda) tiene que salir completa y correcta.

describe("ImportSizeDiff", () => {
  it("no pinta nada sin cambios de talla", () => {
    const { container } = render(<ImportSizeDiff sizeChanges={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("pinta la ecuación completa de cada talla", () => {
    render(<ImportSizeDiff sizeChanges={[makeSizeChange({ size: 26, before: 3, added: 20, after: 23 })]} />);
    const row = screen.getByRole("rowheader", { name: "26" }).closest("tr")!;
    expect(within(row).getByText("3")).toBeInTheDocument();
    expect(within(row).getByText("+20")).toBeInTheDocument();
    expect(within(row).getByText("23")).toBeInTheDocument();
  });

  it("suma el total de piezas que entran y el que queda", () => {
    render(
      <ImportSizeDiff
        sizeChanges={[
          makeSizeChange({ size: 25, before: 1, added: 2, after: 3 }),
          makeSizeChange({ size: 26, before: 0, added: 5, after: 5 }),
        ]}
      />
    );
    expect(screen.getByText("+7 piezas")).toBeInTheDocument();
    expect(screen.getByText("quedan 8 piezas")).toBeInTheDocument();
  });

  it("usa el signo menos y no «+-3» cuando el ajuste es negativo", () => {
    render(<ImportSizeDiff sizeChanges={[makeSizeChange({ size: 26, before: 5, added: -3, after: 2 })]} />);
    expect(screen.getByText("−3")).toBeInTheDocument();
    expect(screen.queryByText("+-3")).not.toBeInTheDocument();
    expect(screen.getByText("−3 piezas")).toBeInTheDocument();
  });

  it("marca con un guion las tallas que no cambian", () => {
    render(
      <ImportSizeDiff
        sizeChanges={[
          makeSizeChange({ size: 25, before: 4, added: 0, after: 4 }),
          makeSizeChange({ size: 26, before: 1, added: 2, after: 3 }),
        ]}
      />
    );
    const untouched = screen.getByRole("rowheader", { name: "25" }).closest("tr")!;
    expect(within(untouched).getByText("—")).toBeInTheDocument();
  });

  it("omite el delta del encabezado si el neto es cero, pero sigue diciendo cuánto queda", () => {
    render(
      <ImportSizeDiff
        sizeChanges={[
          makeSizeChange({ size: 25, before: 4, added: 2, after: 6 }),
          makeSizeChange({ size: 26, before: 5, added: -2, after: 3 }),
        ]}
      />
    );
    expect(screen.getByText("quedan 9 piezas")).toBeInTheDocument();
    expect(screen.queryByText(/^[+−]0 piezas$/)).not.toBeInTheDocument();
  });
});
