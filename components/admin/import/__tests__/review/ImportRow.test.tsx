import { screen, within } from "@testing-library/react";
import ImportRow from "../../ImportRow";
import { makePlanRow, makeRowEdit, makeSizeChange, makeFieldChange } from "../helpers/factories";
import { renderRowInTable } from "../helpers/render";

// La línea colapsada de la revisión: lo que se pinta 500 veces. Su trabajo es decir en una línea
// qué le va a pasar al producto y si la fila se puede enviar — y no mentir cuando el diff del
// preview dejó de aplicar.

function setup(props: Partial<React.ComponentProps<typeof ImportRow>> = {}) {
  const handlers = {
    onToggleSelected: jest.fn(),
    onToggleExpanded: jest.fn(),
    onChange: jest.fn(),
    onPresenceChange: jest.fn(),
    onRevert: jest.fn(),
  };
  const utils = renderRowInTable(
    <ImportRow
      index={0}
      planRow={makePlanRow({
        row: 7,
        action: "update",
        productId: 3,
        name: "Bota de avestruz",
        code: "BTA-1",
        changes: [makeFieldChange()],
        sizeChanges: [makeSizeChange({ size: 26, before: 3, added: 2, after: 5 })],
      })}
      edit={makeRowEdit({ code: "BTA-1" })}
      errors={{}}
      editedFields={[]}
      staleness="fresh"
      selected
      applied={false}
      expanded={false}
      hasDependency={false}
      dependencySatisfied={false}
      providerRow={null}
      disabled={false}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...utils };
}

const checkbox = () => screen.getByRole("checkbox");
const expander = () => screen.getByRole("button", { name: /detalle de la fila/i });

describe("identidad de la fila", () => {
  it("ancla la fila a su folio del Excel y muestra nombre y código", () => {
    setup();
    expect(screen.getByRole("rowheader", { name: "7" })).toBeInTheDocument();
    expect(screen.getByText("Bota de avestruz")).toBeInTheDocument();
    expect(screen.getByText("BTA-1")).toBeInTheDocument();
  });

  it("no deja la fila sin etiqueta cuando el archivo no trajo nombre ni código", () => {
    setup({ planRow: makePlanRow({ row: 7, action: "error" }) });
    expect(screen.getByText("(sin nombre)")).toBeInTheDocument();
  });
});

describe("selección", () => {
  it("se puede marcar y desmarcar, nombrando la fila para un lector de pantalla", async () => {
    const { user, onToggleSelected } = setup();
    expect(checkbox()).toBeChecked();
    expect(checkbox()).toHaveAccessibleName('Aplicar la fila 7, «Bota de avestruz»');

    await user.click(checkbox());
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it("una fila ya aplicada queda con candado, explicando por qué", () => {
    // Reenviarla sumaría el stock otra vez, y eso no se puede deshacer desde el panel.
    setup({ applied: true, selected: true });
    expect(checkbox()).toBeDisabled();
    expect(checkbox()).not.toBeChecked();
    expect(checkbox()).toHaveAttribute("title", expect.stringMatching(/duplicaría/));
    expect(screen.getByText("Ya aplicada")).toBeInTheDocument();
  });

  it("una fila con errores de captura no se puede enviar", () => {
    setup({ errors: { salePrice: '"abc" no es un número válido.' } });
    expect(checkbox()).toBeDisabled();
    expect(checkbox()).toHaveAttribute("title", expect.stringMatching(/Corrige los errores/));
    expect(screen.getByText("Revisa los campos marcados")).toBeInTheDocument();
  });

  it("nada se puede tocar mientras el lote se está aplicando", () => {
    setup({ disabled: true });
    expect(checkbox()).toBeDisabled();
  });
});

describe("resumen de una línea", () => {
  it("dice cuántas piezas entran y cuántos campos cambian", () => {
    setup();
    expect(screen.getByText("+2 piezas · 1 campo")).toBeInTheDocument();
  });

  it("tras editar deja de afirmar el resumen del preview", () => {
    // El resumen del archivo pudo dejar de ser cierto: lo único que se puede afirmar es que la
    // fila cambió y que el resultado se recalcula al aplicar.
    setup({ editedFields: ["salePrice"], staleness: "partial" });
    expect(screen.getByText("1 campo editado · se recalcula al aplicar")).toBeInTheDocument();
    expect(screen.queryByText(/\+2 piezas/)).not.toBeInTheDocument();
  });

  it("cuenta los avisos del backend", () => {
    setup({
      planRow: makePlanRow({ row: 7, action: "update", warnings: ["a", "b"] }),
    });
    expect(screen.getByText("2 avisos")).toBeInTheDocument();
  });
});

describe("badges", () => {
  it("atenúa la acción del archivo y marca la fila como editada", () => {
    setup({ editedFields: ["salePrice"], staleness: "partial" });
    expect(screen.getByText(/\(original\)/)).toBeInTheDocument();
    expect(screen.getByText("Editada")).toBeInTheDocument();
  });

  it("anuncia la reactivación, salvo que la fila esté editada", () => {
    const reactivated = makePlanRow({ row: 7, action: "update", productId: 3, reactivated: true });
    const { unmount } = setup({ planRow: reactivated });
    expect(screen.getByText("Se reactivará")).toBeInTheDocument();
    unmount();

    setup({ planRow: reactivated, editedFields: ["salePrice"], staleness: "partial" });
    expect(screen.queryByText("Se reactivará")).not.toBeInTheDocument();
  });

  it("señala la dependencia con otra fila del archivo", () => {
    setup({ hasDependency: true, dependencySatisfied: false, providerRow: 3 });
    expect(screen.getByText("Depende de la fila 3")).toBeInTheDocument();
  });

  it("una fila aplicada da por satisfecha su dependencia (el producto ya existe)", () => {
    setup({ hasDependency: true, dependencySatisfied: false, providerRow: 3, applied: true });
    expect(
      screen.getByTitle("Este producto lo crea una fila anterior de este mismo archivo")
    ).toBeInTheDocument();
  });
});

describe("resultado del commit", () => {
  it("reemplaza la acción prevista por lo que realmente pasó", () => {
    setup({ resultStatus: "updated", resultMessage: "Se sumaron 2 piezas." });
    expect(screen.getByText("Actualizado")).toBeInTheDocument();
    expect(screen.getByText("Se sumaron 2 piezas.")).toBeInTheDocument();
    expect(screen.queryByText("Restock")).not.toBeInTheDocument();
  });
});

describe("detalle", () => {
  it("nace colapsado y solo monta el editor al expandirse", () => {
    // 500 filas × 13 campos serían 6 500 inputs montados a la vez.
    setup();
    expect(expander()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Editar la fila antes de aplicar")).not.toBeInTheDocument();
  });

  it("pide expandir al pulsar el chevron", async () => {
    const { user, onToggleExpanded } = setup();
    await user.click(expander());
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it("expandida, el botón apunta a la fila del detalle", () => {
    setup({ expanded: true });
    const detail = document.getElementById(expander().getAttribute("aria-controls")!)!;
    expect(within(detail).getByText("Editar la fila antes de aplicar")).toBeInTheDocument();
  });

  it("una fila aplicada abre en solo lectura", () => {
    setup({ expanded: true, applied: true });
    expect(screen.getByLabelText("Código")).toBeDisabled();
  });
});
