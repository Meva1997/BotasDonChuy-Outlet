import { screen, within } from "@testing-library/react";
import ImportRowList from "../../ImportRowList";
import { analyzeDependencies } from "../../dependencies";
import { localErrorsFor } from "../../importReducer";
import type { ImportState } from "../../types";
import {
  loadedState,
  makePlan,
  makePlanRow,
  makeCommitResponse,
  makeRowResult,
  reduce,
} from "../helpers/factories";
import { renderWithUser } from "../helpers/render";

// La tabla de la revisión. Dos decisiones se prueban aquí porque romperlas es invisible en el
// código y evidente en pantalla:
//
// 1. Las filas `unchanged` viven SIEMPRE en su propio grupo colapsable (con el filtro "Todas"),
//    nunca mezcladas en el tbody principal. Derivar el grupo de "las que están ocultas"
//    desmontaba el botón al expandirlo y el grupo ya no se podía volver a cerrar.
// 2. El select-all se acota a lo que ESTÁ EN PANTALLA: marcar todo mientras se ve solo "restock"
//    no debe tocar filas que no se ven.

const PLAN = makePlan([
  makePlanRow({ row: 2, action: "create", name: "Bota nueva" }),
  makePlanRow({ row: 3, action: "update", productId: 5, name: "Sombrero" }),
  makePlanRow({ row: 4, action: "unchanged", productId: 6, name: "Cinto" }),
  makePlanRow({ row: 5, action: "error", name: "Chamarra", message: "Falta el precio." }),
]);

function setup({
  state = loadedState(PLAN),
  ...props
}: Partial<React.ComponentProps<typeof ImportRowList>> & { state?: ImportState } = {}) {
  const handlers = {
    onToggleRow: jest.fn(),
    onToggleExpanded: jest.fn(),
    onToggleUnchangedGroup: jest.fn(),
    onSetAll: jest.fn(),
    onChange: jest.fn(),
    onPresenceChange: jest.fn(),
    onRevert: jest.fn(),
  };
  const plan = state.plan!;
  const utils = renderWithUser(
    <ImportRowList
      plan={plan}
      state={state}
      localErrors={localErrorsFor(state)}
      dependencies={analyzeDependencies(state)}
      disabled={false}
      resultFor={() => undefined}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...utils };
}

/** Folios visibles en la tabla, en orden — el riel que ancla cada fila a la hoja del dueño. */
function visibleFolios(): string[] {
  return screen
    .getAllByRole("rowheader")
    .map((cell) => cell.textContent!.trim())
    .filter((text) => /^\d+$/.test(text));
}

const selectAll = () => screen.getByRole("checkbox", { name: /seleccionar todas/i });

describe("qué filas se ven", () => {
  it("con «Todas», las sin cambios salen del cuerpo principal y van a su grupo", () => {
    setup();
    expect(visibleFolios()).toEqual(["2", "3", "5"]);
    expect(screen.getByRole("button", { name: /1 fila sin cambios/i })).toBeInTheDocument();
  });

  it("el grupo pide abrirse al pulsarlo", async () => {
    const { user, onToggleUnchangedGroup } = setup();
    await user.click(screen.getByRole("button", { name: /1 fila sin cambios/i }));
    expect(onToggleUnchangedGroup).toHaveBeenCalledTimes(1);
  });

  it("el botón del grupo sigue montado abierto, para poder volver a cerrarlo", () => {
    // Si el grupo se derivara de "las filas que están ocultas", este botón se desmontaría al
    // expandirlo y ya no habría forma de volver a esconderlas.
    setup({ state: reduce(loadedState(PLAN), { type: "toggleUnchangedGroup" }) });
    expect(screen.getByRole("button", { name: /1 fila sin cambios/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("expandido, el grupo muestra sus filas", () => {
    setup({ state: reduce(loadedState(PLAN), { type: "toggleUnchangedGroup" }) });
    expect(visibleFolios()).toEqual(["2", "3", "5", "4"]);
  });

  it("un filtro explícito muestra solo esa acción, sin grupo aparte", () => {
    setup({ state: reduce(loadedState(PLAN), { type: "setFilter", filter: "unchanged" }) });
    expect(visibleFolios()).toEqual(["4"]);
    expect(screen.queryByRole("button", { name: /sin cambios$/i })).not.toBeInTheDocument();
  });

  it("anuncia el conteo al cambiar de filtro, para quien no ve la tabla", () => {
    setup({ state: reduce(loadedState(PLAN), { type: "setFilter", filter: "create" }) });
    expect(screen.getByText("Mostrando 1 fila de 4 filas.")).toBeInTheDocument();
  });

  it("dice que no hay nada en vez de dejar la tabla en blanco", () => {
    const empty = loadedState(makePlan([makePlanRow({ row: 2, action: "create" })]));
    setup({ state: { ...empty, filter: "error" } });
    expect(screen.getByText("No hay filas con este filtro")).toBeInTheDocument();
  });
});

describe("select-all", () => {
  it("se acota a las filas en pantalla, sin tocar las ocultas ni las que tienen error", () => {
    // Índices: 0 create, 1 update, 2 unchanged (agrupada y oculta), 3 error.
    // La fila con error del ARCHIVO sí es seleccionable (el backend la rechazará sola); lo que
    // nunca entra son las ocultas.
    const { onSetAll } = setup();
    selectAll().click();
    expect(onSetAll).toHaveBeenCalledWith([0, 1, 3], expect.any(Boolean));
  });

  it("incluye las sin cambios solo cuando el grupo está abierto", () => {
    const { onSetAll } = setup({
      state: reduce(loadedState(PLAN), { type: "toggleUnchangedGroup" }),
    });
    selectAll().click();
    expect(onSetAll).toHaveBeenCalledWith([0, 1, 3, 2], expect.any(Boolean));
  });

  it("deja fuera las filas ya aplicadas y las que tienen errores de captura", () => {
    const state = reduce(
      loadedState(PLAN),
      {
        type: "commitSucceeded",
        outcome: {
          response: makeCommitResponse([makeRowResult({ row: 2, status: "created" })]),
          sentIndices: [0],
          sentRows: [{ row: 2 }],
          sentAt: 0,
        },
      },
      { type: "backToReview" },
      { type: "editCell", index: 1, field: "salePrice", text: "no es número" }
    );
    const { onSetAll } = setup({ state });
    selectAll().click();
    expect(onSetAll).toHaveBeenCalledWith([3], expect.any(Boolean));
  });

  it("queda indeterminado con una selección parcial", () => {
    // `indeterminate` no es prop de React: se pone en el nodo por ref, así que se verifica ahí.
    setup();
    expect((selectAll() as HTMLInputElement).indeterminate).toBe(true);
    expect(selectAll()).not.toBeChecked();
  });

  it("queda marcado cuando todo lo visible está seleccionado", () => {
    const state = reduce(loadedState(PLAN), {
      type: "setRowsSelected",
      indexes: [0, 1, 3],
      selected: true,
    });
    setup({ state });
    expect(selectAll()).toBeChecked();
    expect((selectAll() as HTMLInputElement).indeterminate).toBe(false);
  });

  it("se apaga si no queda nada que marcar", () => {
    const state = loadedState(makePlan([makePlanRow({ row: 2, action: "unchanged" })]));
    setup({ state: { ...state, filter: "create" } });
    expect(selectAll()).toBeDisabled();
  });
});

describe("paso de datos a cada fila", () => {
  it("traduce el índice del proveedor a su FOLIO del Excel", () => {
    const chained = makePlan([
      makePlanRow({ row: 2, action: "create", code: "BTA-9", input: { code: "BTA-9" } }),
      makePlanRow({
        row: 9,
        action: "update",
        productId: null,
        code: "BTA-9",
        input: { code: "BTA-9" },
      }),
    ]);
    setup({ state: loadedState(chained) });
    expect(screen.getByText("Depende de la fila 2")).toBeInTheDocument();
  });

  it("pinta el resultado del commit en la fila que le corresponde", () => {
    setup({
      resultFor: (index) =>
        index === 1
          ? makeRowResult({ row: 3, status: "updated", message: "Se sumaron 2 piezas." })
          : undefined,
    });
    const row = screen.getByRole("rowheader", { name: "3" }).closest("tr")!;
    expect(within(row).getByText("Actualizado")).toBeInTheDocument();
    expect(within(row).getByText("Se sumaron 2 piezas.")).toBeInTheDocument();
  });

  it("propaga los errores de captura a la fila que los tiene", () => {
    const state = reduce(loadedState(PLAN), {
      type: "editCell",
      index: 1,
      field: "salePrice",
      text: "no es número",
    });
    setup({ state });
    const row = screen.getByRole("rowheader", { name: "3" }).closest("tr")!;
    expect(within(row).getByRole("checkbox")).toBeDisabled();
  });
});
