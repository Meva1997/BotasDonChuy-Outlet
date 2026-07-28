import { analyzeDependencies } from "../../dependencies";
import { initialImportState } from "../../importReducer";
import {
  loadedState as loaded,
  makeCommitResponse,
  makePlan,
  makePlanRow as planRow,
  makeRowResult,
  reduce,
} from "../helpers/factories";

// El preview no resuelve cada fila contra la base de datos a secas, sino contra un catálogo
// VIRTUAL: lo que hay más lo que las filas anteriores del archivo ya proyectaron. Por eso la
// fila 2 puede crear BTA-9 y la fila 5 restockearlo — y por eso deseleccionar la fila 2 cambia
// el resultado de la 5 sin que el preview pueda saberlo (se calculó antes).
//
// La señal que lo detecta es exacta: `action === "update"` con `productId === null` significa
// que la fila emparejó con algo que todavía no existe en la base.

/** El caso canónico: la fila 2 crea BTA-9, la fila 5 le suma stock. */
const chained = makePlan([
  planRow({ row: 2, action: "create", code: "BTA-9", input: { code: "BTA-9" } }),
  planRow({ row: 5, action: "update", code: "BTA-9", productId: null, input: { code: "BTA-9" } }),
]);

describe("detección de la dependencia", () => {
  it("no alarma mientras la fila que crea el producto siga seleccionada", () => {
    const report = analyzeDependencies(loaded(chained));
    expect(report.byIndex[1].providerIndex).toBe(0);
    expect(report.byIndex[1].satisfied).toBe(true);
    expect(report.broken).toHaveLength(0);
  });

  it("detecta la dependencia rota al deseleccionar la fila que crea", () => {
    const state = reduce(loaded(chained), { type: "toggleRow", index: 0 });
    const report = analyzeDependencies(state);
    expect(report.broken.map((d) => d.index)).toEqual([1]);
    expect(report.missingProviders).toEqual([0]);
  });

  it("no alarma si la fila dependiente tampoco se va a aplicar", () => {
    const state = reduce(
      loaded(chained),
      { type: "toggleRow", index: 0 },
      { type: "toggleRow", index: 1 }
    );
    expect(analyzeDependencies(state).broken).toHaveLength(0);
  });

  it("ignora un update que SÍ empareja con un producto real de la base", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 5, action: "update", productId: 42, input: { code: "BTA-9" } }),
    ]);
    const state = reduce(loaded(plan), { type: "toggleRow", index: 0 });
    expect(analyzeDependencies(state).byIndex[1]).toBeUndefined();
    expect(analyzeDependencies(state).broken).toHaveLength(0);
  });

  it("sin plan devuelve un reporte vacío en vez de reventar", () => {
    expect(analyzeDependencies(initialImportState)).toEqual({
      byIndex: {},
      broken: [],
      missingProviders: [],
      duplicateCreates: [],
    });
  });
});

describe("identidad efectiva", () => {
  it("empareja por código sin distinguir mayúsculas ni espacios", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: { code: " bta-9 " } }),
      planRow({ row: 5, action: "update", productId: null, input: { code: "BTA-9" } }),
    ]);
    expect(analyzeDependencies(loaded(plan)).byIndex[1].providerIndex).toBe(0);
  });

  it("cae al nombre cuando la fila no trae código (igual que el backend)", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: { name: "Bota de avestruz" } }),
      planRow({ row: 5, action: "update", productId: null, input: { name: "bota de avestruz" } }),
    ]);
    expect(analyzeDependencies(loaded(plan)).byIndex[1].providerIndex).toBe(0);
  });

  it("editar el código de la fila que crea también rompe la dependencia", () => {
    const state = reduce(loaded(chained), {
      type: "editCell",
      index: 0,
      field: "code",
      text: "BTA-8",
    });
    expect(analyzeDependencies(state).broken.map((d) => d.index)).toEqual([1]);
  });

  it("editar el código de la fila dependiente la despega de su proveedor", () => {
    const state = reduce(loaded(chained), {
      type: "editCell",
      index: 1,
      field: "code",
      text: "OTRO-1",
    });
    const report = analyzeDependencies(state);
    expect(report.byIndex[1].providerIndex).toBeNull();
    expect(report.broken.map((d) => d.index)).toEqual([1]);
    // Sin proveedor que reseleccionar, el botón «Seleccionar las filas faltantes» no aplica.
    expect(report.missingProviders).toEqual([]);
  });

  it("poner el código en «No tocar» deja la fila sin identidad", () => {
    const state = reduce(loaded(chained), {
      type: "setCellPresence",
      index: 0,
      field: "code",
      present: false,
    });
    expect(analyzeDependencies(state).broken.map((d) => d.index)).toEqual([1]);
  });
});

describe("orden y filas ya aplicadas", () => {
  it("un proveedor POSTERIOR no cubre la dependencia (el backend proyecta en orden)", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "update", productId: null, input: { code: "BTA-9" } }),
      planRow({ row: 5, action: "create", input: { code: "BTA-9" } }),
    ]);
    const report = analyzeDependencies(loaded(plan));
    expect(report.byIndex[0].providerIndex).toBe(1);
    expect(report.byIndex[0].satisfied).toBe(false);
  });

  it("una fila ya aplicada satisface la dependencia aunque esté deseleccionada", () => {
    // Tras aplicarse, el producto existe de verdad en la base: la dependencia dejó de importar.
    const applied = reduce(loaded(chained), {
      type: "commitSucceeded",
      outcome: {
        response: makeCommitResponse([makeRowResult({ row: 2, status: "created" })]),
        sentIndices: [0],
        sentRows: [{ row: 2 }],
        sentAt: 0,
      },
    });
    expect(applied.selected[0]).toBe(false);
    expect(analyzeDependencies(applied).byIndex[1].satisfied).toBe(true);
    expect(analyzeDependencies(applied).broken).toHaveLength(0);
  });

  it("gana el PRIMER proveedor cuando dos filas crean el mismo producto", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 3, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 4, action: "update", productId: null, input: { code: "BTA-9" } }),
    ]);
    expect(analyzeDependencies(loaded(plan)).byIndex[2].providerIndex).toBe(0);
  });
});

describe("altas duplicadas en el mismo archivo", () => {
  it("señala dos altas del mismo producto", () => {
    const duped = makePlan([
      planRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 3, action: "create", input: { code: "bta-9" } }),
    ]);
    expect(analyzeDependencies(loaded(duped)).duplicateCreates).toEqual([[0, 1]]);
  });

  it("no confunde dos altas distintas", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 3, action: "create", input: { code: "BTA-8" } }),
    ]);
    expect(analyzeDependencies(loaded(plan)).duplicateCreates).toEqual([]);
  });

  it("una fila create sin código ni nombre no cuenta como proveedor de nada", () => {
    const plan = makePlan([
      planRow({ row: 2, action: "create", input: {} }),
      planRow({ row: 3, action: "create", input: {} }),
    ]);
    const report = analyzeDependencies(loaded(plan));
    expect(report.duplicateCreates).toEqual([]);
  });
});
