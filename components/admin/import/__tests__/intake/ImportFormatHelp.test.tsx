import { screen, within } from "@testing-library/react";
import ImportFormatHelp from "../../ImportFormatHelp";
import { COPY } from "../../labels";
import { renderWithUser } from "../helpers/render";

// Panel plegable con el formato del archivo. Documenta el encabezado canónico y la notación
// `26x20`, que es lo que hace usable el restock desde una hoja de cálculo.

describe("ImportFormatHelp", () => {
  it("nace colapsado: es referencia, no un paso del flujo", async () => {
    renderWithUser(<ImportFormatHelp />);
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("al abrirlo encabeza con el aviso de que el restock SUMA", async () => {
    const { user } = renderWithUser(<ImportFormatHelp />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(COPY.restockWarning)).toBeInTheDocument();
  });

  it("documenta la notación de tallas, que es lo que hace usable el restock", async () => {
    const { user } = renderWithUser(<ImportFormatHelp />);
    await user.click(screen.getByRole("button"));

    const row = screen.getByRole("rowheader", { name: "Tallas" }).closest("tr")!;
    expect(within(row).getByText(/"26x20" \(20 piezas de la 26\)/)).toBeInTheDocument();
  });

  it("lista las columnas del encabezado canónico, cada una con si es obligatoria", async () => {
    const { user } = renderWithUser(<ImportFormatHelp />);
    await user.click(screen.getByRole("button"));

    // 13 columnas + el encabezado de la tabla.
    expect(screen.getAllByRole("row")).toHaveLength(14);
    expect(
      within(screen.getByRole("rowheader", { name: "Visible" }).closest("tr")!).getByText("Opcional")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("rowheader", { name: "Código" }).closest("tr")!).getByText("Recomendada")
    ).toBeInTheDocument();
  });

  it("vuelve a cerrarse", async () => {
    const { user } = renderWithUser(<ImportFormatHelp />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("el botón apunta al panel que despliega", async () => {
    const { user } = renderWithUser(<ImportFormatHelp />);
    const button = screen.getByRole("button");
    await user.click(button);
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toContainElement(
      screen.getByRole("table")
    );
  });
});
