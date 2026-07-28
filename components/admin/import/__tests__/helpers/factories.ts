import type {
  FieldChange,
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportRowInput,
  ImportRowPlan,
  ImportRowResult,
  ProductSnapshot,
  SizeChange,
} from "@/lib/api/adminProductImport";
import { importReducer, initialImportState, type ImportEvent } from "../../importReducer";
import { ingestRow } from "../../rowInput";
import type { ImportState, RowEdit } from "../../types";

// Fixtures del dominio de la importación, compartidas por TODAS las suites (puras y de
// componentes). Viven aquí y no en cada archivo para que una suite nueva no invente su propia
// forma de `ImportRowPlan`: el contrato es grande y una fixture divergente hace que un test pase
// contra una forma que el backend nunca manda.
//
// Todas siguen el mismo patrón: defaults mínimos válidos + `overrides` para lo que el test
// realmente está probando, así cada test se lee como "esta fila es un update con estas tallas".

export function makeSnapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  return {
    id: 1,
    code: "BTA-1",
    name: "Bota de avestruz",
    type: "bota",
    description: "Bota de piel",
    originalPrice: 4200,
    salePrice: 2800,
    unitCost: 1500,
    weightKg: 1.6,
    lengthCm: 35,
    widthCm: 22,
    heightCm: 14,
    visible: true,
    discontinued: false,
    sizes: [{ size: 26, stock: 3 }],
    stock: 3,
    ...overrides,
  };
}

export function makeFieldChange(overrides: Partial<FieldChange> = {}): FieldChange {
  return {
    field: "salePrice",
    label: "Precio oferta",
    before: 2800,
    after: 2500,
    ...overrides,
  };
}

export function makeSizeChange(overrides: Partial<SizeChange> = {}): SizeChange {
  const before = overrides.before ?? 3;
  const added = overrides.added ?? 2;
  return { size: 26, before, added, after: before + added, ...overrides };
}

/** Fila del plan del preview. `row` y `action` son obligatorios: son lo que identifica el caso. */
export function makePlanRow(
  overrides: Partial<ImportRowPlan> & Pick<ImportRowPlan, "row" | "action">
): ImportRowPlan {
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

/** El `summary` se deriva de las filas: por defecto NO miente (los tests que quieran un summary
 *  mentiroso lo alteran a mano — es justo lo que prueba la verificación cruzada del toolbar). */
export function makePlan(
  rows: ImportRowPlan[],
  overrides: Partial<ImportPreviewResponse> = {}
): ImportPreviewResponse {
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
    ...overrides,
  };
}

export function makeRowResult(
  overrides: Partial<ImportRowResult> & Pick<ImportRowResult, "row" | "status">
): ImportRowResult {
  return { code: null, name: null, message: "", ...overrides };
}

export function makeCommitResponse(
  rows: ImportRowResult[],
  overrides: Partial<ImportCommitResponse> = {}
): ImportCommitResponse {
  return {
    summary: {
      total: rows.length,
      created: rows.filter((r) => r.status === "created").length,
      updated: rows.filter((r) => r.status === "updated").length,
      unchanged: rows.filter((r) => r.status === "unchanged").length,
      failed: rows.filter((r) => r.status === "error").length,
    },
    rows,
    ...overrides,
  };
}

// ── Estado ───────────────────────────────────────────────────────────────────────────────

/** Aplica una secuencia de eventos al reducer, en orden. */
export function reduce(state: ImportState, ...events: ImportEvent[]): ImportState {
  return events.reduce(importReducer, state);
}

/**
 * Estado "archivo elegido + preview cargado", que es donde vive toda la pantalla de revisión.
 * Se construye pasando por el reducer real (no a mano) para que las suites nunca prueben contra
 * un estado que el reducer no podría producir.
 */
export function loadedState(plan: ImportPreviewResponse, fileName = "productos.xlsx"): ImportState {
  const withFile = importReducer(initialImportState, {
    type: "fileAccepted",
    file: makeXlsxFile({ name: fileName }),
  });
  return importReducer(withFile, {
    type: "previewLoaded",
    plan,
    analysisId: withFile.analysisId,
  });
}

/** `RowEdit` a partir de un `input`, con las celdas indicadas ya modificadas. */
export function makeRowEdit(
  input: ImportRowInput,
  mutate: (edit: RowEdit) => void = () => {}
): RowEdit {
  const edit = ingestRow(input);
  mutate(edit);
  return edit;
}

// ── Archivos ─────────────────────────────────────────────────────────────────────────────

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** `File` de mentira con el peso pedido — `size` es de solo lectura, así que se redefine. */
export function makeXlsxFile({
  name = "productos.xlsx",
  size = 1024,
  type = XLSX_MIME,
}: { name?: string; size?: number; type?: string } = {}): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}
