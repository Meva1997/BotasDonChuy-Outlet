import { render, screen } from "@testing-library/react";
import ImportDiff, { formatDiffValue } from "../../ImportDiff";
import { makeFieldChange } from "../helpers/factories";

// El diff campo por campo de un `update`. Dos riesgos: que un valor raro se pinte como
// "[object Object]" o como una celda en blanco (que se leería como "sin cambio"), y que se
// muestre una línea cuyos insumos el usuario ya editó.

describe("formatDiffValue", () => {
  it("marca el vacío con un token visible, nunca con una celda en blanco", () => {
    // `before`/`after` son `unknown` en el contrato; una celda vacía se leería como "no cambia".
    expect(formatDiffValue("description", null)).toBe("«vacío»");
    expect(formatDiffValue("description", undefined)).toBe("«vacío»");
    expect(formatDiffValue("description", "")).toBe("«vacío»");
  });

  it("formatea los campos monetarios con la moneda es-MX", () => {
    expect(formatDiffValue("salePrice", 2800)).toContain("2,800");
    expect(formatDiffValue("salePrice", 2800)).toContain("$");
  });

  it("no le pone símbolo de moneda a lo que no es dinero", () => {
    expect(formatDiffValue("weightKg", 1500)).toBe("1,500");
  });

  it("traduce los booleanos", () => {
    expect(formatDiffValue("visible", true)).toBe("Sí");
    expect(formatDiffValue("visible", false)).toBe("No");
  });

  it("serializa un objeto en vez de imprimir [object Object]", () => {
    expect(formatDiffValue("raro", { a: 1 })).toBe('{"a":1}');
  });
});

describe("tabla del diff", () => {
  const changes = [
    makeFieldChange({ field: "salePrice", label: "Precio oferta", before: 2800, after: 2500 }),
    makeFieldChange({ field: "unitCost", label: "Costo unitario", before: 1500, after: 1600 }),
  ];

  it("pinta una fila por cambio, con el antes y el después", () => {
    render(<ImportDiff changes={changes} />);
    const row = screen.getByRole("rowheader", { name: "Precio oferta" }).closest("tr")!;
    expect(row).toHaveTextContent("$2,800");
    expect(row).toHaveTextContent("$2,500");
  });

  it("no pinta nada cuando no hay cambios", () => {
    const { container } = render(<ImportDiff changes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suprime las líneas cuyos insumos el usuario editó", () => {
    // Regla dura: nunca pintar un diff que dejó de ser cierto.
    render(<ImportDiff changes={changes} suppressedFields={new Set(["salePrice"])} />);
    expect(screen.queryByRole("rowheader", { name: "Precio oferta" })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Costo unitario" })).toBeInTheDocument();
  });

  it("desaparece entera si se suprimieron todas las líneas", () => {
    const { container } = render(
      <ImportDiff changes={changes} suppressedFields={new Set(["salePrice", "unitCost"])} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("cae a la clave del campo si el backend no mandó etiqueta", () => {
    render(<ImportDiff changes={[makeFieldChange({ field: "weightKg", label: "" })]} />);
    expect(screen.getByRole("rowheader", { name: "weightKg" })).toBeInTheDocument();
  });
});
