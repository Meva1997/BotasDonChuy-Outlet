import { render, screen } from "@testing-library/react";
import OutletCard from "../OutletCard";

// Tres branches de `stock` que no deben mezclarse: agotado (0), última pieza
// (centinela "ultima"), y el resto (número real → "Solo N disponibles").

const BASE_PROPS = {
  slug: 42,
  name: "Bota vaquera",
  originalPrice: 1000,
  salePrice: 800,
  discountPercent: 20,
};

describe("OutletCard", () => {
  it("renderiza nombre, precios y descuento, y enlaza al detalle del producto", () => {
    render(<OutletCard {...BASE_PROPS} stock={5} />);

    expect(screen.getByText("Bota vaquera")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    expect(screen.getByText("$800.00")).toBeInTheDocument();
    expect(screen.getByText("−20%")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/outlet/42/producto"
    );
  });

  it("muestra el conteo de existencias cuando hay más de una pieza", () => {
    render(<OutletCard {...BASE_PROPS} stock={5} />);

    expect(screen.getByText("Solo 5 disponibles")).toBeInTheDocument();
    expect(screen.queryByText("Última pieza")).not.toBeInTheDocument();
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });

  it("muestra el listón de última pieza cuando stock es el centinela 'ultima'", () => {
    render(<OutletCard {...BASE_PROPS} stock="ultima" />);

    expect(screen.getByText("Última pieza")).toBeInTheDocument();
    expect(screen.queryByText(/disponibles/)).not.toBeInTheDocument();
  });

  it("marca la pieza como agotada cuando stock es 0", () => {
    render(<OutletCard {...BASE_PROPS} stock={0} />);

    // Aparece dos veces: el sello central y el texto de existencias.
    expect(screen.getAllByText("Agotado").length).toBeGreaterThan(0);
    expect(screen.queryByText("Última pieza")).not.toBeInTheDocument();
  });

  it("sin imagen muestra el fallback (icono ImageOff)", () => {
    const { container } = render(<OutletCard {...BASE_PROPS} stock={5} />);

    expect(container.querySelector("svg.lucide-image-off")).toBeInTheDocument();
  });

  it("con imagen usa la foto real y no el fallback", () => {
    const { container } = render(
      <OutletCard
        {...BASE_PROPS}
        stock={5}
        imageSrc="https://example.com/bota.jpg"
      />
    );

    // Las capas opacas del fallback taparían la foto real, así que no deben
    // pintarse cuando sí hay imagen (ver OutletCard.tsx, rama `!imageSrc`).
    expect(
      container.querySelector("svg.lucide-image-off")
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('div[style*="bota.jpg"]')
    ).toBeInTheDocument();
  });
});
