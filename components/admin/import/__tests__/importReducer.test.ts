import type {
  ImportPreviewResponse,
  ImportRowPlan,
  ImportCommitResponse,
} from "@/lib/api/adminProductImport";
import {
  buildCommitRows,
  canReanalyze,
  countByAction,
  importReducer,
  initialImportState,
  isSameBatchAsLast,
  localErrorsFor,
  selectableIndexes,
  type ImportEvent,
} from "../importReducer";
import { analyzeDependencies } from "../dependencies";
import type { ImportState } from "../types";

// El invariante que más importa aquí: una fila aplicada con éxito NUNCA puede volver al
// payload. El restock SUMA stock, así que reenviarla duplica piezas y no hay forma de
// deshacerlo desde el panel.

function planRow(overrides: Partial<ImportRowPlan> & Pick<ImportRowPlan, "row" | "action">): ImportRowPlan {
  return {
    code: null,
    name: null,
    productId: null,
    before: null,
    after: null,
    changes: [],
    sizeChanges: [],
    reactivated: false,
    warnings: [],
    message: "",
    input: {},
    ...overrides,
  };
}

function makePlan(rows: ImportRowPlan[]): ImportPreviewResponse {
  return {
    summary: {
      total: rows.length,
      created: rows.filter((r) => r.action === "create").length,
      updated: rows.filter((r) => r.action === "update").length,
      unchanged: rows.filter((r) => r.action === "unchanged").length,
      failed: rows.filter((r) => r.action === "error").length,
    },
    warnings: [],
    rows,
  };
}

function reduce(state: ImportState, ...events: ImportEvent[]): ImportState {
  return events.reduce(importReducer, state);
}

function loaded(plan: ImportPreviewResponse): ImportState {
  const withFile = importReducer(initialImportState, {
    type: "fileAccepted",
    file: new File([""], "x.xlsx"),
  });
  return importReducer(withFile, {
    type: "previewLoaded",
    plan,
    analysisId: withFile.analysisId,
  });
}

describe("selección por defecto", () => {
  it("marca create y update, deja fuera error y unchanged", () => {
    const state = loaded(
      makePlan([
        planRow({ row: 2, action: "create" }),
        planRow({ row: 3, action: "update" }),
        planRow({ row: 4, action: "unchanged" }),
        planRow({ row: 5, action: "error" }),
      ])
    );
    expect(state.selected).toEqual({ 0: true, 1: true, 2: false, 3: false });
  });

  it("auto-expande el grupo si TODO el archivo queda igual (si no, pantalla en blanco)", () => {
    const state = loaded(makePlan([planRow({ row: 2, action: "unchanged" })]));
    expect(state.showUnchanged).toBe(true);
  });

  it("descarta un preview de un análisis ya abandonado", () => {
    const state = loaded(makePlan([planRow({ row: 2, action: "create" })]));
    const stale = importReducer(state, {
      type: "previewLoaded",
      plan: makePlan([planRow({ row: 9, action: "error" })]),
      analysisId: state.analysisId - 1,
    });
    expect(stale.plan?.rows[0].row).toBe(2);
  });
});

describe("candado de filas ya aplicadas", () => {
  const plan = makePlan([
    planRow({ row: 2, action: "create", name: "Bota" }),
    planRow({ row: 3, action: "update", name: "Sombrero" }),
  ]);

  const response: ImportCommitResponse = {
    summary: { total: 2, created: 1, updated: 0, unchanged: 0, failed: 1 },
    rows: [
      { row: 2, status: "created", code: null, name: "Bota", message: "creado" },
      { row: 3, status: "error", code: null, name: "Sombrero", message: "falló" },
    ],
  };

  it("bloquea la fila que tuvo éxito y deja reintentar la que falló", () => {
    const state = reduce(loaded(plan), {
      type: "commitSucceeded",
      outcome: { response, sentIndices: [0, 1], sentRows: [{ row: 2 }, { row: 3 }], sentAt: 0 },
    });

    expect(state.applied).toEqual([0]);
    expect(state.selected[0]).toBe(false);
    // Reintentar solo las fallidas nunca puede arrastrar la que ya se aplicó.
    const retry = importReducer(state, { type: "selectOnly", indexes: [0, 1] });
    expect(selectableIndexes(retry, {})).toEqual([1]);
  });

  it("mantiene el candado aunque se edite la fila después", () => {
    let state = reduce(loaded(plan), {
      type: "commitSucceeded",
      outcome: { response, sentIndices: [0, 1], sentRows: [{ row: 2 }, { row: 3 }], sentAt: 0 },
    });
    state = reduce(
      state,
      { type: "editCell", index: 0, field: "salePrice", text: "999" },
      { type: "toggleRow", index: 0 }
    );
    expect(selectableIndexes(state, {})).not.toContain(0);
  });

  it("no pone candado a un `unchanged` (no escribió), pero sí lo deselecciona", () => {
    const withUnchanged = makePlan([
      planRow({ row: 2, action: "update", name: "Bota" }),
      planRow({ row: 3, action: "update", name: "Sombrero" }),
    ]);
    const state = reduce(loaded(withUnchanged), {
      type: "commitSucceeded",
      outcome: {
        response: {
          summary: { total: 2, created: 0, updated: 1, unchanged: 1, failed: 0 },
          rows: [
            { row: 2, status: "updated", code: null, name: "Bota", message: "ok" },
            { row: 3, status: "unchanged", code: null, name: "Sombrero", message: "igual" },
          ],
        },
        sentIndices: [0, 1],
        sentRows: [{ row: 2 }, { row: 3 }],
        sentAt: 0,
      },
    });

    // Solo la que escribió queda con candado; bloquear la otra impediría corregirla y
    // reenviarla, y el motivo del candado sería falso justo para ella.
    expect(state.applied).toEqual([0]);
    expect(state.selected[1]).toBe(false);
    // Pero sigue siendo re-seleccionable si el dueño lo decide.
    expect(selectableIndexes(reduce(state, { type: "toggleRow", index: 1 }), {})).toEqual([1]);
  });

  it("no deja releer el archivo mientras haya filas aplicadas", () => {
    const fresh = loaded(plan);
    expect(canReanalyze(fresh)).toBe(true);

    const applied = reduce(fresh, {
      type: "commitSucceeded",
      outcome: { response, sentIndices: [0, 1], sentRows: [{ row: 2 }, { row: 3 }], sentAt: 0 },
    });
    // Un re-análisis recalcularía el plan contra el catálogo ya actualizado y volvería a
    // proponer el restock que acaba de sumarse, sin poder conservar el candado.
    expect(canReanalyze(applied)).toBe(false);
  });
});

describe("ediciones", () => {
  const plan = makePlan([planRow({ row: 2, action: "update", input: { code: "A", sizes: "26" } })]);

  it("editar marca la celda como presente", () => {
    const state = importReducer(loaded(plan), {
      type: "editCell",
      index: 0,
      field: "salePrice",
      text: "150",
    });
    expect(state.edits[0].cells.salePrice).toEqual({ presence: "present", text: "150" });
    expect(buildCommitRows(state, [0]).at(0)).toHaveProperty("salePrice", 150);
  });

  it("«No tocar» conserva el texto pero saca la clave del payload", () => {
    const state = reduce(
      loaded(plan),
      { type: "editCell", index: 0, field: "salePrice", text: "150" },
      { type: "setCellPresence", index: 0, field: "salePrice", present: false }
    );
    expect(state.edits[0].cells.salePrice.text).toBe("150");
    expect(buildCommitRows(state, [0]).at(0)).not.toHaveProperty("salePrice");
  });

  it("deshacer devuelve la fila al estado del archivo", () => {
    const state = reduce(
      loaded(plan),
      { type: "editCell", index: 0, field: "salePrice", text: "150" },
      { type: "revertRow", index: 0 }
    );
    expect(state.edits[0]).toBeUndefined();
    expect(buildCommitRows(state, [0]).at(0)).toEqual({ row: 2, code: "A", sizes: "26" });
  });

  it("una fila con error de captura no se puede enviar, pero no bloquea al resto", () => {
    const twoRows = makePlan([
      planRow({ row: 2, action: "update", input: { code: "A" } }),
      planRow({ row: 3, action: "update", input: { code: "B" } }),
    ]);
    const state = importReducer(loaded(twoRows), {
      type: "editCell",
      index: 0,
      field: "salePrice",
      text: "no es número",
    });
    const errors = localErrorsFor(state);
    expect(errors[0]?.salePrice).toBeDefined();
    expect(selectableIndexes(state, errors)).toEqual([1]);
  });
});

describe("dependencias entre filas del mismo archivo", () => {
  // La fila 2 crea BTA-9 y la fila 5 le suma stock: el preview resolvió la segunda contra la
  // proyección de la primera, así que `productId` es null aunque sea un "update".
  const plan = makePlan([
    planRow({ row: 2, action: "create", code: "BTA-9", input: { code: "BTA-9" } }),
    planRow({ row: 5, action: "update", code: "BTA-9", productId: null, input: { code: "BTA-9" } }),
  ]);

  it("no alarma mientras la fila que crea el producto siga seleccionada", () => {
    const report = analyzeDependencies(loaded(plan));
    expect(report.byIndex[1].providerIndex).toBe(0);
    expect(report.byIndex[1].satisfied).toBe(true);
    expect(report.broken).toHaveLength(0);
  });

  it("detecta la dependencia rota al deseleccionar la fila que crea", () => {
    const state = importReducer(loaded(plan), { type: "toggleRow", index: 0 });
    const report = analyzeDependencies(state);
    expect(report.broken.map((d) => d.index)).toEqual([1]);
    expect(report.missingProviders).toEqual([0]);
  });

  it("editar el código de la fila que crea también rompe la dependencia", () => {
    const state = importReducer(loaded(plan), {
      type: "editCell",
      index: 0,
      field: "code",
      text: "BTA-8",
    });
    expect(analyzeDependencies(state).broken.map((d) => d.index)).toEqual([1]);
  });

  it("no alarma si la fila dependiente tampoco se va a aplicar", () => {
    const state = reduce(
      loaded(plan),
      { type: "toggleRow", index: 0 },
      { type: "toggleRow", index: 1 }
    );
    expect(analyzeDependencies(state).broken).toHaveLength(0);
  });

  it("señala dos altas del mismo producto en el mismo archivo", () => {
    const duped = makePlan([
      planRow({ row: 2, action: "create", input: { code: "BTA-9" } }),
      planRow({ row: 3, action: "create", input: { code: "bta-9" } }),
    ]);
    expect(analyzeDependencies(loaded(duped)).duplicateCreates).toEqual([[0, 1]]);
  });
});

describe("protección contra el 409 de doble envío", () => {
  it("reconoce el mismo lote aunque cambie el orden de las claves o el folio", () => {
    const result = {
      response: { summary: { total: 1, created: 1, updated: 0, unchanged: 0, failed: 0 }, rows: [] },
      sentIndices: [0],
      sentRows: [{ row: 2, code: "A", sizes: "26x2" }],
      sentAt: 0,
    };
    expect(isSameBatchAsLast([{ sizes: "26x2", code: "A", row: 9 }], result)).toBe(true);
    expect(isSameBatchAsLast([{ code: "A", sizes: "26x3" }], result)).toBe(false);
  });
});

describe("conteos", () => {
  it("se derivan de las filas, no del summary del backend", () => {
    // Un summary mentiroso no debe cambiar lo que dice el toolbar: la tabla es lo auditable.
    const plan = makePlan([
      planRow({ row: 2, action: "create" }),
      planRow({ row: 3, action: "update" }),
    ]);
    plan.summary.created = 99;
    expect(countByAction(plan)).toEqual({
      create: 1,
      update: 1,
      unchanged: 0,
      error: 0,
      total: 2,
    });
  });
});
