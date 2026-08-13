import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImageCarousel from "../ImageCarousel";

// Tres branches por conteo de imágenes que no deben mezclarse: 0 (placeholder,
// sin controles), 1 (imagen sola, sin controles) y 2+ (flechas + puntos +
// navegación por teclado). `safeIndex` acota el índice acumulado (puede quedar
// negativo o fuera de rango tras varios `paginate`), así que el wrap-around en
// ambas direcciones es una branch propia, no un detalle de implementación.

const TWO_IMAGES = [
  { url: "https://cdn.example.com/1.jpg", alt: "Frente" },
  { url: "https://cdn.example.com/2.jpg", alt: "Perfil" },
];

const THREE_IMAGES = [
  ...TWO_IMAGES,
  { url: "https://cdn.example.com/3.jpg", alt: "Suela" },
];

describe("ImageCarousel", () => {
  it("sin imágenes muestra el placeholder y ningún control", () => {
    const { container } = render(<ImageCarousel images={[]} />);

    expect(screen.getByLabelText("Sin imágenes")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-image-off")).toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen siguiente")).not.toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveAttribute("tabIndex", "-1");
  });

  it("con una sola imagen no muestra flechas ni puntos", () => {
    render(<ImageCarousel images={[TWO_IMAGES[0]]} />);

    expect(screen.getByLabelText("Imagen 1 de 1")).toBeInTheDocument();
    expect(screen.getByAltText("Frente")).toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ir a la imagen 1")).not.toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveAttribute("tabIndex", "-1");
  });

  it("una imagen sin `alt` usa alt vacío (no undefined)", () => {
    render(<ImageCarousel images={[{ url: "https://cdn.example.com/1.jpg" }]} />);

    expect(screen.getByAltText("")).toBeInTheDocument();
  });

  it("con 2+ imágenes muestra flechas y puntos, con el primero marcado actual", () => {
    render(<ImageCarousel images={TWO_IMAGES} />);

    expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen siguiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir a la imagen 1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Ir a la imagen 2")).toHaveAttribute("aria-current", "false");
    expect(screen.getByRole("group")).toHaveAttribute("tabIndex", "0");
  });

  it("la flecha derecha avanza y la izquierda retrocede", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={TWO_IMAGES} />);

    await user.click(screen.getByLabelText("Imagen siguiente"));
    expect(screen.getByLabelText("Imagen 2 de 2")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Imagen anterior"));
    expect(screen.getByLabelText("Imagen 1 de 2")).toBeInTheDocument();
  });

  it("avanzar desde la última imagen da la vuelta a la primera", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={TWO_IMAGES} />);

    await user.click(screen.getByLabelText("Imagen siguiente")); // → 2 de 2
    await user.click(screen.getByLabelText("Imagen siguiente")); // wrap → 1 de 2
    expect(screen.getByLabelText("Imagen 1 de 2")).toBeInTheDocument();
  });

  it("retroceder desde la primera imagen da la vuelta a la última", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={TWO_IMAGES} />);

    await user.click(screen.getByLabelText("Imagen anterior"));
    expect(screen.getByLabelText("Imagen 2 de 2")).toBeInTheDocument();
  });

  it("un punto salta directamente a esa imagen y actualiza aria-current", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={THREE_IMAGES} />);

    await user.click(screen.getByLabelText("Ir a la imagen 3"));

    expect(screen.getByLabelText("Imagen 3 de 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir a la imagen 3")).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Ir a la imagen 1")).toHaveAttribute("aria-current", "false");
  });

  it("un punto hacia atrás también actualiza la imagen mostrada", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={THREE_IMAGES} />);

    await user.click(screen.getByLabelText("Ir a la imagen 3"));
    await user.click(screen.getByLabelText("Ir a la imagen 1"));

    expect(screen.getByLabelText("Imagen 1 de 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Ir a la imagen 1")).toHaveAttribute("aria-current", "true");
  });

  it("ArrowRight/ArrowLeft navegan cuando el carrusel tiene foco", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={TWO_IMAGES} />);

    const group = screen.getByRole("group");
    group.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("Imagen 2 de 2")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByLabelText("Imagen 1 de 2")).toBeInTheDocument();
  });

  it("con una sola imagen, las flechas de teclado no hacen nada (no hay a quién navegar)", async () => {
    const user = userEvent.setup();
    render(<ImageCarousel images={[TWO_IMAGES[0]]} />);

    const group = screen.getByRole("group");
    group.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByLabelText("Imagen 1 de 1")).toBeInTheDocument();
  });

  it("renderiza overlays del consumidor por encima de la imagen", () => {
    render(
      <ImageCarousel images={TWO_IMAGES}>
        <span data-testid="badge">Nuevo</span>
      </ImageCarousel>
    );

    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });
});
