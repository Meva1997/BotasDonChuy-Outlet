import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutletPagination from "../OutletPagination";

describe("OutletPagination", () => {
  it("no renderiza nada con una sola página", () => {
    const { container } = render(
      <OutletPagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada con cero páginas", () => {
    const { container } = render(
      <OutletPagination currentPage={1} totalPages={0} onPageChange={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza un botón por página y marca la actual", () => {
    render(
      <OutletPagination currentPage={2} totalPages={3} onPageChange={jest.fn()} />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole("button", { name: "2" })).toHaveClass(
      "border-amber-400/70"
    );
    expect(screen.getByRole("button", { name: "1" })).not.toHaveClass(
      "border-amber-400/70"
    );
  });

  it("llama a onPageChange con el número de página elegido", async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <OutletPagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
    );

    await user.click(screen.getByRole("button", { name: "3" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
