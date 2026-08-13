import { render, screen } from "@testing-library/react";
import TrackedOrderItems from "../TrackedOrderItems";
import { makePublicOrderItem } from "./helpers/factories";

// Renglones CONGELADOS al comprar — nameSnapshot + precios de ese momento, nunca
// un Product en vivo. La única rama de presentación real es `size === 0`
// (producto sin tallas, Fase 24): esa fila no debe leerse "Talla: 0", debe
// desaparecer por completo.

describe("TrackedOrderItems", () => {
  it("muestra la talla cuando size > 0", () => {
    render(<TrackedOrderItems items={[makePublicOrderItem({ size: 26, quantity: 2 })]} />);

    expect(screen.getByText(/Talla: 26/)).toBeInTheDocument();
    expect(screen.getByText(/Cant: 2/)).toBeInTheDocument();
  });

  it("oculta la talla cuando size === 0 (producto sin tallas)", () => {
    render(<TrackedOrderItems items={[makePublicOrderItem({ size: 0, quantity: 1 })]} />);

    expect(screen.queryByText(/Talla:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Cant: 1/)).toBeInTheDocument();
  });

  it("muestra el precio tachado cuando hubo descuento (listed > paid)", () => {
    render(
      <TrackedOrderItems
        items={[
          makePublicOrderItem({
            unitOriginalPrice: 1000,
            unitSalePrice: 800,
            quantity: 1,
          }),
        ]}
      />
    );

    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    expect(screen.getByText("$800.00")).toBeInTheDocument();
  });

  it("no muestra precio tachado cuando no hubo descuento (listed === paid)", () => {
    render(
      <TrackedOrderItems
        items={[
          makePublicOrderItem({
            unitOriginalPrice: 800,
            unitSalePrice: 800,
            quantity: 1,
          }),
        ]}
      />
    );

    expect(screen.getAllByText("$800.00")).toHaveLength(1);
    expect(document.querySelector("s")).not.toBeInTheDocument();
  });

  it("renderiza el nombre congelado (nameSnapshot), no un producto vivo", () => {
    render(
      <TrackedOrderItems
        items={[makePublicOrderItem({ nameSnapshot: "Sombrero vaquero" })]}
      />
    );

    expect(screen.getByText("Sombrero vaquero")).toBeInTheDocument();
  });

  it("renderiza una lista vacía sin explotar cuando no hay items", () => {
    const { container } = render(<TrackedOrderItems items={[]} />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  it("renderiza múltiples renglones en orden", () => {
    render(
      <TrackedOrderItems
        items={[
          makePublicOrderItem({ nameSnapshot: "Bota vaquera" }),
          makePublicOrderItem({ nameSnapshot: "Cinturón" }),
        ]}
      />
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Bota vaquera");
    expect(rows[1]).toHaveTextContent("Cinturón");
  });
});
