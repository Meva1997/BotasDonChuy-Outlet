import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrdersPagination from "../OrdersPagination";

// A diferencia de components/outlet/OutletPagination.tsx (un botón por página, sin
// límite porque el catálogo tiene pocas), los pedidos crecen sin límite con el
// tiempo: esta pagina con ventana + elipsis (primera, actual±1, última) y SÍ tiene
// flechas con estado disabled en los extremos — justo lo que OutletPagination no
// necesita. Las ramas a cubrir son la ventana (con y sin huecos) y los extremos.

describe("OrdersPagination", () => {
  it("no renderiza nada con una sola página", () => {
    const { container } = render(
      <OrdersPagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada con cero páginas", () => {
    const { container } = render(
      <OrdersPagination currentPage={1} totalPages={0} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("sin huecos, muestra todas las páginas seguidas", () => {
    render(
      <OrdersPagination currentPage={1} totalPages={3} onPageChange={jest.fn()} />
    );
    expect(
      screen.getAllByRole("button").map((b) => b.textContent)
    ).toEqual(["‹", "1", "2", "3", "›"]);
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("con huecos, inserta elipsis entre la primera/última y la ventana central", () => {
    render(
      <OrdersPagination currentPage={5} totalPages={10} onPageChange={jest.fn()} />
    );
    // La elipsis es un <span aria-hidden>, no un botón — se prueba aparte de los
    // números de página, que sí deben ser clicables.
    const pageLabels = screen
      .getAllByRole("button")
      .map((b) => b.textContent)
      .filter((t) => t !== "‹" && t !== "›");
    expect(pageLabels).toEqual(["1", "4", "5", "6", "10"]);
    expect(screen.getAllByText("…")).toHaveLength(2);
  });

  it("marca la página actual con aria-current y ninguna otra", () => {
    render(
      <OrdersPagination currentPage={5} totalPages={10} onPageChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Página 5" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("button", { name: "Página 4" })
    ).not.toHaveAttribute("aria-current");
  });

  it("clic en un número de página dispara onPageChange con ese número", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <OrdersPagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );
    await user.click(screen.getByRole("button", { name: "Página 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("deshabilita '‹' en la primera página y '›' en la última", () => {
    const { rerender } = render(
      <OrdersPagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeEnabled();

    rerender(
      <OrdersPagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  });

  it("'‹'/'›' avanzan/retroceden una página desde el medio", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <OrdersPagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );
    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
