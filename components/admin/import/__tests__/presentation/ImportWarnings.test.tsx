import { screen } from "@testing-library/react";
import ImportWarnings from "../../ImportWarnings";
import { renderWithUser } from "../helpers/render";

// Avisos a nivel ARCHIVO: sobre todo, columnas que no se reconocieron y por lo tanto no se van a
// importar. Son lo que evita la importación fantasma (el dueño cree que actualizó una columna
// que en realidad se ignoró), así que el conteo tiene que seguir visible aunque se colapse.

const WARNINGS = [
  'La columna "Precio mayoreo" no se reconoció y no se importará.',
  'La columna "Proveedor" no se reconoció y no se importará.',
];

describe("ImportWarnings", () => {
  it("no ocupa espacio cuando no hay avisos", () => {
    const { container } = renderWithUser(<ImportWarnings warnings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("nace abierto: el aviso no puede depender de que alguien lo despliegue", () => {
    renderWithUser(<ImportWarnings warnings={WARNINGS} />);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText(WARNINGS[0])).toBeInTheDocument();
  });

  it("conserva el conteo al colapsar, aunque esconda el detalle", async () => {
    const { user } = renderWithUser(<ImportWarnings warnings={WARNINGS} />);
    await user.click(screen.getByRole("button"));

    expect(screen.queryByText(WARNINGS[0])).not.toBeInTheDocument();
    expect(screen.getByText("2 avisos sobre el archivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
  });

  it("concuerda el conteo en singular", () => {
    renderWithUser(<ImportWarnings warnings={[WARNINGS[0]]} />);
    expect(screen.getByText("1 aviso sobre el archivo")).toBeInTheDocument();
  });

  it("se anuncia como status, no como alert: el archivo sí se puede aplicar", () => {
    renderWithUser(<ImportWarnings warnings={WARNINGS} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("el botón apunta a la lista que despliega", () => {
    renderWithUser(<ImportWarnings warnings={WARNINGS} />);
    const controls = screen.getByRole("button").getAttribute("aria-controls")!;
    expect(document.getElementById(controls)).toContainElement(screen.getByText(WARNINGS[1]));
  });
});
