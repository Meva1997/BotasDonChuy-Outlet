import { screen, within } from "@testing-library/react";
import ImportRowEditor from "../../ImportRowEditor";
import { FIELD_LABELS } from "../../rowInput";
import { EDITABLE_FIELDS } from "../../types";
import { makePlanRow, makeRowEdit, makeSnapshot } from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// Formulario inline de una fila. Su parte con criterio es el diff LOCAL ("cambios que hiciste a
// la fila"): tras editar no se puede re-previsualizar contra el catálogo, así que ese diff de la
// INSTRUCCIÓN es lo único que sí se puede afirmar.

function setup(props: Partial<React.ComponentProps<typeof ImportRowEditor>> = {}) {
  const onChange = jest.fn();
  const onPresenceChange = jest.fn();
  const onRevert = jest.fn();
  const utils = renderWithUser(
    <ImportRowEditor
      planRow={makePlanRow({ row: 2, action: "update", before: makeSnapshot() })}
      edit={makeRowEdit({ code: "BTA-1", salePrice: 2500 })}
      errors={{}}
      editedFields={[]}
      disabled={false}
      onChange={onChange}
      onPresenceChange={onPresenceChange}
      onRevert={onRevert}
      {...props}
    />
  );
  return { onChange, onPresenceChange, onRevert, ...utils };
}

/** La línea del diff local de un campo. Se acota a la lista porque la etiqueta del campo
 *  aparece dos veces en pantalla: en el <label> del editor y aquí. */
function diffLine(field: keyof typeof FIELD_LABELS): HTMLElement {
  return within(screen.getByRole("list")).getByText(FIELD_LABELS[field]).closest("li")!;
}

describe("campos", () => {
  it("monta los 13 campos editables del contrato", () => {
    setup();
    for (const field of EDITABLE_FIELDS) {
      // `visible` es un radiogroup, no un control etiquetado por <label>.
      const found =
        field === "visible"
          ? screen.getByRole("radiogroup", { name: /visible/i })
          : screen.getByLabelText(FIELD_LABELS[field]);
      expect(found).toBeInTheDocument();
    }
  });

  it("reenvía cada cambio con el campo al que pertenece", async () => {
    const { user, onChange } = setup();
    await user.type(screen.getByLabelText(FIELD_LABELS.code), "9");
    expect(onChange).toHaveBeenCalledWith("code", "BTA-19");
  });

  it("reenvía el cambio de presencia con su campo", async () => {
    const { user, onPresenceChange } = setup();
    const cell = screen.getByLabelText(FIELD_LABELS.salePrice).closest<HTMLElement>("div.min-w-0")!;
    await user.click(within(cell).getByRole("button", { name: "✕ No tocar" }));
    expect(onPresenceChange).toHaveBeenCalledWith("salePrice", false);
  });

  it("siembra los placeholders con lo que el producto tiene hoy", () => {
    setup({ planRow: makePlanRow({ row: 2, action: "update", before: makeSnapshot({ unitCost: 1500 }) }) });
    expect(screen.getByLabelText(FIELD_LABELS.unitCost)).toHaveAttribute("placeholder", "1500");
  });

  it("propaga `disabled` a los campos mientras se aplica el lote", () => {
    setup({ disabled: true });
    expect(screen.getByLabelText(FIELD_LABELS.code)).toBeDisabled();
  });
});

describe("diff local de la instrucción", () => {
  it("no aparece mientras la fila siga como venía en el archivo", () => {
    setup();
    expect(screen.queryByText("Cambios que hiciste a la fila")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deshacer cambios/i })).not.toBeInTheDocument();
  });

  it("compara contra el archivo, no contra el catálogo", () => {
    const edit = makeRowEdit({ code: "BTA-1", salePrice: 2500 }, (e) => {
      e.cells.salePrice = { presence: "present", text: "2100" };
    });
    setup({ edit, editedFields: ["salePrice"] });

    expect(diffLine("salePrice")).toHaveTextContent("2500");
    expect(diffLine("salePrice")).toHaveTextContent("2100");
  });

  it("nombra «sin cambio» el paso a ausente, en vez de dejar el hueco vacío", () => {
    const edit = makeRowEdit({ code: "BTA-1", salePrice: 2500 }, (e) => {
      e.cells.salePrice = { presence: "absent", text: "2500" };
    });
    setup({ edit, editedFields: ["salePrice"] });
    expect(diffLine("salePrice")).toHaveTextContent("sin cambio");
  });

  it("deshacer devuelve la fila a lo que decía el archivo", async () => {
    const edit = makeRowEdit({ salePrice: 2500 }, (e) => {
      e.cells.salePrice = { presence: "present", text: "2100" };
    });
    const { user, onRevert } = setup({ edit, editedFields: ["salePrice"] });

    await user.click(screen.getByRole("button", { name: /deshacer cambios/i }));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it("no deja deshacer mientras el lote se está aplicando", () => {
    const edit = makeRowEdit({ salePrice: 2500 }, (e) => {
      e.cells.salePrice = { presence: "present", text: "2100" };
    });
    setup({ edit, editedFields: ["salePrice"], disabled: true });
    expect(screen.getByRole("button", { name: /deshacer cambios/i })).toBeDisabled();
  });
});

describe("errores de captura", () => {
  it("marca el campo que los tiene", () => {
    setup({ errors: { salePrice: '"abc" no es un número válido.' } });
    expect(screen.getByLabelText(FIELD_LABELS.salePrice)).toHaveAccessibleDescription(
      '"abc" no es un número válido.'
    );
  });
});
