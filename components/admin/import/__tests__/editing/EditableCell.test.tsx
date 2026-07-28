import { screen } from "@testing-library/react";
import EditableCell from "../../EditableCell";
import { COPY } from "../../labels";
import { FIELD_LABELS } from "../../rowInput";
import type { Cell, EditableField } from "../../types";
import { renderWithUser } from "../helpers/render";

// El control de presencia es el corazón del contrato de la importación: una clave AUSENTE
// significa "no toques esa columna", pero `description: ""` SÍ borra la descripción. Como el
// valor de un <input> siempre es un string, esa diferencia no se puede inferir del texto — de
// ahí el mando explícito, y de ahí que estos tests sean sobre presencia, no sobre estilos.

const present = (text: string): Cell => ({ presence: "present", text });
const absent = (text = ""): Cell => ({ presence: "absent", text });

function setup({
  field = "salePrice" as EditableField,
  cell = present("2500"),
  currentValue = null as string | null,
  ...rest
}: Partial<React.ComponentProps<typeof EditableCell>> = {}) {
  const onChange = jest.fn();
  const onPresenceChange = jest.fn();
  const utils = renderWithUser(
    <EditableCell
      field={field}
      cell={cell}
      currentValue={currentValue}
      onChange={onChange}
      onPresenceChange={onPresenceChange}
      {...rest}
    />
  );
  return { onChange, onPresenceChange, ...utils };
}

const input = (field: EditableField = "salePrice") =>
  screen.getByLabelText(FIELD_LABELS[field]) as HTMLInputElement;

describe("presencia", () => {
  it("una celda ausente se deshabilita y enseña el valor guardado como fantasma", () => {
    setup({ cell: absent(), currentValue: "2800" });
    expect(input()).toBeDisabled();
    expect(input()).toHaveAttribute("placeholder", "2800");
    expect(input()).toHaveValue("");
  });

  it("«Establecer» siembra el valor guardado para hacerlo explícito de un clic", async () => {
    const { user, onChange, onPresenceChange } = setup({ cell: absent(), currentValue: "2800" });
    await user.click(screen.getByRole("button", { name: "Establecer" }));

    expect(onChange).toHaveBeenCalledWith("2800");
    expect(onPresenceChange).not.toHaveBeenCalled();
  });

  it("NO siembra las tallas: sembrar lo que el producto tiene hoy DUPLICA su stock", async () => {
    // Las tallas se suman (`stock = stock + EXCLUDED.stock`), así que sembrar "26x3" no hace
    // explícito el valor actual — lo duplica al aplicar. Y como la celda quedaría marcada como
    // editada, el ImportSizeDiff que habría hecho visible la suma se suprime.
    const { user, onChange, onPresenceChange } = setup({
      field: "sizes",
      cell: absent(),
      currentValue: "26x3",
    });
    await user.click(screen.getByRole("button", { name: "Establecer" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onPresenceChange).toHaveBeenCalledWith(true);
  });

  it("tampoco siembra la descripción (ya se ve como placeholder)", async () => {
    const { user, onChange, onPresenceChange } = setup({
      field: "description",
      cell: absent(),
      currentValue: "Bota de piel",
    });
    await user.click(screen.getByRole("button", { name: "Establecer" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onPresenceChange).toHaveBeenCalledWith(true);
  });

  it("no siembra sobre texto ya tecleado: alternar no debe perder lo escrito", async () => {
    const { user, onChange, onPresenceChange } = setup({
      cell: absent("999"),
      currentValue: "2800",
    });
    await user.click(screen.getByRole("button", { name: "Establecer" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onPresenceChange).toHaveBeenCalledWith(true);
  });

  it("«No tocar» saca la clave del payload sin borrar el texto", async () => {
    const { user, onPresenceChange } = setup({ cell: present("2500") });
    await user.click(screen.getByRole("button", { name: "✕ No tocar" }));
    expect(onPresenceChange).toHaveBeenCalledWith(false);
  });

  it("teclear reporta el texto crudo, sin interpretarlo", async () => {
    const { user, onChange } = setup({ cell: present("") });
    await user.type(input(), "2");
    expect(onChange).toHaveBeenCalledWith("2");
  });
});

describe("captura numérica", () => {
  it("es un campo de texto con teclado decimal, NO un type=number", () => {
    // `type="number"` devuelve "" ante cualquier basura (no se puede ni leer lo que se tecleó),
    // se traga la coma decimal y cambia el valor al hacer scroll encima.
    setup({ field: "weightKg", cell: present("1.5") });
    const field = input("weightKg");
    expect(field).toHaveAttribute("type", "text");
    expect(field).toHaveAttribute("inputMode", "decimal");
  });

  it("un campo de texto no numérico no pide teclado decimal", () => {
    setup({ field: "code", cell: present("BTA-1") });
    expect(input("code")).not.toHaveAttribute("inputMode");
  });
});

describe("tallas", () => {
  it("deriva el total que ENTRA — la defensa contra un «26x200» mal tecleado", () => {
    setup({ field: "sizes", cell: present("26x20, 27") });
    expect(screen.getByText("Se suman 21 piezas · talla 26 ×20, talla 27 ×1")).toBeInTheDocument();
  });

  it("no inventa un total si la notación no es válida", () => {
    setup({ field: "sizes", cell: present("veintiséis") });
    expect(screen.queryByText(/Se suman/)).not.toBeInTheDocument();
  });
});

describe("visible (tri-estado)", () => {
  it("no lleva el botón de presencia: sería un segundo mando sobre lo mismo", () => {
    setup({ field: "visible", cell: absent() });
    expect(screen.queryByRole("button", { name: /establecer|no tocar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "No tocar" })).toBeInTheDocument();
  });

  it("«No tocar» ≠ «No»: para un booleano, ausente deja la visibilidad como está", async () => {
    const { user, onChange, onPresenceChange } = setup({ field: "visible", cell: present("true") });
    expect(screen.getByRole("radio", { name: "Sí" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "No tocar" }));
    expect(onPresenceChange).toHaveBeenCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("elegir Sí/No manda el booleano como texto", async () => {
    const { user, onChange } = setup({ field: "visible", cell: absent() });
    expect(screen.getByRole("radio", { name: "No tocar" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(onChange).toHaveBeenCalledWith("false");
  });
});

describe("categoría", () => {
  it("ofrece «Sin cambio» mientras está ausente", () => {
    setup({ field: "type", cell: absent() });
    expect(screen.getByRole("option", { name: "Sin cambio" })).toBeInTheDocument();
  });

  it("obliga a elegir cuando está presente pero vacía", () => {
    // Sin una opción de valor "", el navegador pintaría la primera categoría mientras el estado
    // sigue en "": la fila se marcaría inválida por un valor que nadie eligió y que no se ve.
    setup({ field: "type", cell: present("") });
    expect(screen.getByRole("option", { name: "Elige una categoría" })).toBeInTheDocument();
  });

  it("muestra una categoría desconocida en vez de descartarla en silencio", () => {
    setup({ field: "type", cell: present("chamarra") });
    expect(screen.getByRole("option", { name: "chamarra (no reconocida)" })).toBeInTheDocument();
    expect(screen.getByLabelText(FIELD_LABELS.type)).toHaveValue("chamarra");
  });

  it("reporta la categoría elegida", async () => {
    const { user, onChange } = setup({ field: "type", cell: present("bota") });
    await user.selectOptions(screen.getByLabelText(FIELD_LABELS.type), "sombrero");
    expect(onChange).toHaveBeenCalledWith("sombrero");
  });
});

describe("errores y avisos", () => {
  it("asocia el error al campo para un lector de pantalla", () => {
    setup({ cell: present("abc"), error: '"abc" no es un número válido.' });
    const field = input();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription('"abc" no es un número válido.');
  });

  it("avisa cuando un vacío explícito borraría la descripción guardada", () => {
    setup({ field: "description", cell: present(""), wouldClearDescription: true });
    expect(screen.getByLabelText(FIELD_LABELS.description)).toHaveAccessibleDescription(
      COPY.clearsDescription
    );
  });

  it("el error gana sobre el aviso: no se pueden anunciar los dos", () => {
    setup({
      field: "description",
      cell: present(""),
      wouldClearDescription: true,
      error: "Escribe un valor.",
    });
    expect(screen.getByLabelText(FIELD_LABELS.description)).toHaveAccessibleDescription(
      "Escribe un valor."
    );
    expect(screen.queryByText(COPY.clearsDescription)).not.toBeInTheDocument();
  });
});

describe("deshabilitado", () => {
  it("apaga el campo y su control de presencia mientras se aplica el lote", () => {
    setup({ cell: present("2500"), disabled: true });
    expect(input()).toBeDisabled();
    expect(screen.getByRole("button", { name: "✕ No tocar" })).toBeDisabled();
  });
});
