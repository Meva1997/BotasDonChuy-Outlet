import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

// Puramente presentacional, pero OutletView lo usa en dos variantes que no deben
// confundirse: sin filtros → "Agotado" (catálogo real vacío), con filtros →
// "No encontramos nada" + salida para limpiar (el catálogo sí tiene piezas).

describe("EmptyState", () => {
  it("usa los textos por defecto (variante sin filtros)", () => {
    render(<EmptyState />);

    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByText("Sin productos disponibles")).toBeInTheDocument();
    expect(
      screen.getByText("No hay piezas en esta categoría por el momento.")
    ).toBeInTheDocument();
    // Sin filtros no hay salida que ofrecer: el catálogo de verdad está vacío.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("acepta título, mensaje y sello propios (variante con filtros)", () => {
    render(
      <EmptyState
        stamp="Sin resultados"
        title="No encontramos nada"
        message="Ninguna pieza coincide con los filtros que elegiste."
      />
    );

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("No encontramos nada")).toBeInTheDocument();
    expect(
      screen.getByText("Ninguna pieza coincide con los filtros que elegiste.")
    ).toBeInTheDocument();
  });

  it("renderiza la acción cuando se provee (botón de limpiar filtros)", () => {
    render(
      <EmptyState
        action={<button type="button">Limpiar filtros</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "Limpiar filtros" })
    ).toBeInTheDocument();
  });
});
