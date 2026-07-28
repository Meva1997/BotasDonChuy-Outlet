import { screen } from "@testing-library/react";
import ImportRowDetail from "../../ImportRowDetail";
import { COPY, brokenDependencyNotice } from "../../labels";
import {
  makeFieldChange,
  makePlanRow,
  makeRowEdit,
  makeSizeChange,
  makeSnapshot,
} from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// El panel expandido de una fila. Aquí vive la regla dura de la pantalla: NUNCA se pinta una
// línea de diff cuyos insumos el usuario cambió. El endpoint de preview solo acepta un archivo,
// así que una fila editada no se puede volver a previsualizar — en vez de fingir un diff viejo,
// se suprime lo que dejó de ser cierto.

function setup(props: Partial<React.ComponentProps<typeof ImportRowDetail>> = {}) {
  const handlers = {
    onChange: jest.fn(),
    onPresenceChange: jest.fn(),
    onRevert: jest.fn(),
  };
  const utils = renderWithUser(
    <ImportRowDetail
      planRow={makePlanRow({
        row: 2,
        action: "update",
        productId: 7,
        before: makeSnapshot(),
        after: makeSnapshot({ salePrice: 2500 }),
        changes: [makeFieldChange({ field: "salePrice", label: "Precio oferta" })],
        sizeChanges: [makeSizeChange({ size: 26, before: 3, added: 2, after: 5 })],
      })}
      edit={makeRowEdit({ code: "BTA-1" })}
      errors={{}}
      editedFields={[]}
      staleness="fresh"
      providerRow={null}
      dependencyBroken={false}
      disabled={false}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...utils };
}

describe("diff sin ediciones", () => {
  it("muestra el estado guardado, los cambios al producto y la suma de tallas", () => {
    setup();
    expect(screen.getByText(COPY.storedBefore)).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Precio oferta" })).toBeInTheDocument();
    expect(screen.getByText("Stock por talla")).toBeInTheDocument();
  });

  it("etiqueta el before como PROYECTADO cuando viene de otra fila del archivo", () => {
    // `productId === null` en un update significa que emparejó con la proyección de una fila
    // anterior, no con la base. Llamarlo "actual en el catálogo" sería mentir.
    setup({
      planRow: makePlanRow({ row: 5, action: "update", productId: null, before: makeSnapshot() }),
    });
    expect(screen.getByText(COPY.projectedBefore)).toBeInTheDocument();
    expect(screen.queryByText(COPY.storedBefore)).not.toBeInTheDocument();
  });

  it("un alta enseña cómo quedaría el producto nuevo", () => {
    setup({
      planRow: makePlanRow({ row: 2, action: "create", after: makeSnapshot({ id: null }) }),
    });
    expect(screen.getByText("Se dará de alta así")).toBeInTheDocument();
  });

  it("avisa si no hay vista previa del resultado, en vez de quedarse mudo", () => {
    setup({ planRow: makePlanRow({ row: 2, action: "update", productId: 7, after: null }) });
    expect(screen.getByText(/No tenemos vista previa del resultado/)).toBeInTheDocument();
  });
});

describe("supresión del diff tras editar", () => {
  it("tocar el código invalida TODO el diff (la fila puede emparejar con otro producto)", () => {
    setup({ staleness: "identity", editedFields: ["code"] });

    expect(screen.getByText(COPY.staleDiff)).toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "Precio oferta" })).not.toBeInTheDocument();
    expect(screen.queryByText("Stock por talla")).not.toBeInTheDocument();
    expect(screen.queryByText(COPY.storedBefore)).not.toBeInTheDocument();
  });

  it("editar otro campo suprime solo su línea y conserva el resto", () => {
    setup({
      staleness: "partial",
      editedFields: ["salePrice"],
      planRow: makePlanRow({
        row: 2,
        action: "update",
        productId: 7,
        before: makeSnapshot(),
        after: makeSnapshot(),
        changes: [
          makeFieldChange({ field: "salePrice", label: "Precio oferta" }),
          makeFieldChange({ field: "unitCost", label: "Costo unitario" }),
        ],
        sizeChanges: [makeSizeChange({ size: 26 })],
      }),
    });

    expect(screen.getByText(COPY.staleDiffPartial)).toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "Precio oferta" })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Costo unitario" })).toBeInTheDocument();
    expect(screen.getByText("Stock por talla")).toBeInTheDocument();
  });

  it("editar las tallas esconde la suma del preview, que ya no es la que se va a aplicar", () => {
    setup({ staleness: "partial", editedFields: ["sizes"] });
    expect(screen.queryByText("Stock por talla")).not.toBeInTheDocument();
  });
});

describe("avisos", () => {
  it("el mensaje de una fila con error va como alert", () => {
    setup({
      planRow: makePlanRow({ row: 2, action: "error", message: "Falta el precio de oferta." }),
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Falta el precio de oferta.");
  });

  it("nombra por FOLIO la fila que crea el producto cuando la dependencia está rota", () => {
    setup({
      dependencyBroken: true,
      providerRow: 7,
      planRow: makePlanRow({ row: 9, action: "update", productId: null, name: "Bota" }),
    });
    expect(screen.getByRole("alert")).toHaveTextContent(brokenDependencyNotice(7, "Bota"));
  });

  it("avisa que un producto descontinuado volverá al catálogo público", () => {
    // Ese efecto no aparece en `changes`: sin este aviso se aplicaría sin que nadie lo viera.
    setup({ planRow: makePlanRow({ row: 2, action: "update", productId: 7, reactivated: true }) });
    expect(screen.getByText(COPY.reactivateNote)).toBeInTheDocument();
  });

  it("avisa que restockear un producto oculto no lo pone a la venta", () => {
    setup({
      planRow: makePlanRow({
        row: 2,
        action: "update",
        productId: 7,
        before: makeSnapshot({ visible: false }),
      }),
    });
    expect(screen.getByText(COPY.hiddenProduct)).toBeInTheDocument();
  });

  it("no repite el aviso de oculto si ya se dijo que se reactivará", () => {
    setup({
      planRow: makePlanRow({
        row: 2,
        action: "update",
        productId: 7,
        reactivated: true,
        before: makeSnapshot({ visible: false }),
      }),
    });
    expect(screen.queryByText(COPY.hiddenProduct)).not.toBeInTheDocument();
  });

  it("pinta los avisos que el backend puso en la fila", () => {
    setup({
      planRow: makePlanRow({
        row: 2,
        action: "update",
        productId: 7,
        warnings: ["El precio de oferta subió más del 50%."],
      }),
    });
    expect(screen.getByText("El precio de oferta subió más del 50%.")).toBeInTheDocument();
  });
});

describe("editor inline", () => {
  it("siempre está disponible, incluso con el diff suprimido", () => {
    setup({ staleness: "identity", editedFields: ["code"] });
    expect(screen.getByText("Editar la fila antes de aplicar")).toBeInTheDocument();
  });
});
