import { render, screen } from "@testing-library/react";
import CategoryCard from "../CategoryCard";

describe("CategoryCard", () => {
  it("renderiza título, conteo de piezas y enlaza a href", () => {
    render(<CategoryCard title="Botas" count={12} href="/botas" />);

    expect(screen.getByText("Botas")).toBeInTheDocument();
    expect(screen.getByText("12 Piezas")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/botas");
  });

  it("renderiza la imagen cuando se provee imageSrc", () => {
    render(
      <CategoryCard title="Botas" count={12} href="/botas" imageSrc="/boots-outlet.png" />
    );

    expect(screen.getByAltText("Botas")).toBeInTheDocument();
  });

  it("sin imageSrc no renderiza ninguna imagen", () => {
    render(<CategoryCard title="Botas" count={12} href="/botas" />);

    expect(screen.queryByAltText("Botas")).not.toBeInTheDocument();
  });

  it("con cero piezas también muestra '0 Piezas' (no se oculta la tarjeta)", () => {
    render(<CategoryCard title="Ropa" count={0} href="/ropa" />);

    expect(screen.getByText("0 Piezas")).toBeInTheDocument();
  });
});
