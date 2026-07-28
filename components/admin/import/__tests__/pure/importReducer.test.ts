import type { ImportCommitResponse } from "@/lib/api/adminProductImport";
import {
  buildCommitRows,
  canReanalyze,
  countByAction,
  duplicateCooldownSeconds,
  importReducer,
  isSameBatchAsLast,
  localErrorsFor,
  resultForIndex,
  selectableIndexes,
  DUPLICATE_WINDOW_MS,
} from "../../importReducer";
import {
  loadedState as loaded,
  makePlan,
  makePlanRow as planRow,
  makeCommitResponse,
  makeRowResult,
  reduce,
} from "../helpers/factories";

// El invariante que más importa aquí: una fila aplicada con éxito NUNCA puede volver al
// payload. El restock SUMA stock, así que reenviarla duplica piezas y no hay forma de
// deshacerlo desde el panel.
//
// Las dependencias entre filas del mismo archivo se prueban aparte, en dependencies.test.ts.

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

describe("navegación de la revisión", () => {
  const plan = makePlan([
    planRow({ row: 2, action: "create" }),
    planRow({ row: 3, action: "unchanged" }),
  ]);

  it("expande y colapsa una fila sin tocar a las demás", () => {
    const state = reduce(loaded(plan), { type: "toggleExpanded", index: 0 });
    expect(state.expanded).toEqual({ 0: true });
    expect(reduce(state, { type: "toggleExpanded", index: 0 }).expanded[0]).toBe(false);
  });

  it("cambia el filtro y alterna el grupo sin cambios", () => {
    const state = reduce(
      loaded(plan),
      { type: "setFilter", filter: "update" },
      { type: "toggleUnchangedGroup" }
    );
    expect(state.filter).toBe("update");
    // El plan no es solo-unchanged, así que arrancó cerrado y este evento lo abre.
    expect(state.showUnchanged).toBe(true);
  });

  it("«selectOnly» reemplaza la selección entera, no la suma", () => {
    const state = reduce(loaded(plan), { type: "selectOnly", indexes: [1] });
    expect(state.selected).toEqual({ 0: false, 1: true });
  });

  it("«setRowsSelected» solo toca los índices que recibe", () => {
    const state = reduce(loaded(plan), {
      type: "setRowsSelected",
      indexes: [1],
      selected: true,
    });
    expect(state.selected).toEqual({ 0: true, 1: true });
  });

  it("empezar de nuevo vacía todo y sube el analysisId (descarta un preview en vuelo)", () => {
    const before = reduce(loaded(plan), { type: "toggleExpanded", index: 0 });
    const after = reduce(before, { type: "reset" });
    expect(after.plan).toBeNull();
    expect(after.file).toBeNull();
    expect(after.phase).toBe("idle");
    expect(after.analysisId).toBe(before.analysisId + 1);
  });
});

describe("protección contra el 409 de doble envío", () => {
  const result = {
    response: makeCommitResponse([]),
    sentIndices: [0],
    sentRows: [{ row: 2, code: "A", sizes: "26x2" }],
    sentAt: 0,
  };

  it("reconoce el mismo lote aunque cambie el orden de las claves o el folio", () => {
    expect(isSameBatchAsLast([{ sizes: "26x2", code: "A", row: 9 }], result)).toBe(true);
    expect(isSameBatchAsLast([{ code: "A", sizes: "26x3" }], result)).toBe(false);
  });

  it("un subconjunto (reintentar solo las fallidas) NO es el mismo lote", () => {
    const twoRows = { ...result, sentRows: [{ row: 2, code: "A" }, { row: 3, code: "B" }] };
    expect(isSameBatchAsLast([{ code: "B" }], twoRows)).toBe(false);
  });

  it("sin un envío previo nunca hay lote repetido", () => {
    expect(isSameBatchAsLast([{ code: "A" }], null)).toBe(false);
  });

  it("la cuenta regresiva se agota al cerrarse la ventana del backend", () => {
    expect(duplicateCooldownSeconds(result, 0)).toBe(DUPLICATE_WINDOW_MS / 1000);
    expect(duplicateCooldownSeconds(result, DUPLICATE_WINDOW_MS + 1)).toBe(0);
    expect(duplicateCooldownSeconds(null, 0)).toBe(0);
  });
});

describe("emparejamiento del resultado con las filas del plan", () => {
  const plan = makePlan([
    planRow({ row: 2, action: "create" }),
    planRow({ row: 7, action: "update" }),
  ]);

  it("empareja por POSICIÓN, no por folio (los folios pueden repetirse)", () => {
    // Ambas filas del archivo traen el mismo folio: solo la posición desambigua.
    const dupedFolios = makePlan([
      planRow({ row: 2, action: "create" }),
      planRow({ row: 2, action: "update" }),
    ]);
    const outcome = {
      response: makeCommitResponse([
        makeRowResult({ row: 2, status: "created", message: "creado" }),
        makeRowResult({ row: 2, status: "error", message: "falló" }),
      ]),
      sentIndices: [0, 1],
      sentRows: [{ row: 2 }, { row: 2 }],
      sentAt: 0,
    };
    expect(resultForIndex(outcome, dupedFolios, 1)?.status).toBe("error");
  });

  it("cae al folio si los largos no cuadran, y no inventa nada si tampoco existe", () => {
    const outcome = {
      response: makeCommitResponse([makeRowResult({ row: 7, status: "updated" })]),
      sentIndices: [0, 1],
      sentRows: [{ row: 2 }, { row: 7 }],
      sentAt: 0,
    };
    expect(resultForIndex(outcome, plan, 1)?.status).toBe("updated");
    expect(resultForIndex(outcome, plan, 0)).toBeUndefined();
  });

  it("una fila que no se envió no tiene resultado", () => {
    const outcome = {
      response: makeCommitResponse([makeRowResult({ row: 2, status: "created" })]),
      sentIndices: [0],
      sentRows: [{ row: 2 }],
      sentAt: 0,
    };
    expect(resultForIndex(outcome, plan, 1)).toBeUndefined();
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
