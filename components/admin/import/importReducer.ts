import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportRowInput,
} from "@/lib/api/adminProductImport";
import type {
  EditableField,
  ImportFilter,
  ImportState,
  RowEdit,
} from "./types";
import { ingestRow, serializePristine, serializeRowEdit, validateRowEdit } from "./rowInput";

// Reducer puro del flujo de importación. El estado vive en store/importStore.ts (Zustand sin
// persist) para que cambiar de sección del panel y volver no destruya una revisión a medias.
//
// TODO se clavea por el ÍNDICE de `plan.rows`, nunca por el folio `row` del Excel: `row` es
// dato externo, es opcional en el contrato y puede venir repetido. El índice es único por
// construcción y estable (nunca reordenamos ni empalmamos el array; el filtrado ocurre al
// pintar), así que el caso borde de folios duplicados desaparece en vez de tener que cubrirse.

export const initialImportState: ImportState = {
  phase: "idle",
  file: null,
  fileError: null,
  plan: null,
  analysisId: 0,
  edits: {},
  selected: {},
  applied: [],
  filter: "all",
  expanded: {},
  showUnchanged: false,
  result: null,
};

export type ImportEvent =
  | { type: "fileRejected"; message: string }
  | { type: "fileAccepted"; file: File }
  | { type: "previewFailed" }
  | { type: "previewLoaded"; plan: ImportPreviewResponse; analysisId: number }
  | { type: "toggleRow"; index: number }
  | { type: "setRowsSelected"; indexes: number[]; selected: boolean }
  | { type: "selectOnly"; indexes: number[] }
  | { type: "toggleExpanded"; index: number }
  | { type: "setFilter"; filter: ImportFilter }
  | { type: "toggleUnchangedGroup" }
  | { type: "editCell"; index: number; field: EditableField; text: string }
  | { type: "setCellPresence"; index: number; field: EditableField; present: boolean }
  | { type: "revertRow"; index: number }
  | { type: "revertAllEdits" }
  | { type: "commitSucceeded"; outcome: NonNullable<ImportState["result"]> }
  | { type: "backToReview" }
  | { type: "reset" };

/** Selección por defecto: todo menos `error` y `unchanged` (lo que pide el roadmap). */
function defaultSelection(plan: ImportPreviewResponse): Record<number, boolean> {
  const selected: Record<number, boolean> = {};
  plan.rows.forEach((row, index) => {
    selected[index] = row.action === "create" || row.action === "update";
  });
  return selected;
}

function ensureEdit(state: ImportState, index: number): RowEdit {
  const existing = state.edits[index];
  if (existing) return existing;
  const planRow = state.plan?.rows[index];
  return ingestRow(planRow?.input ?? {});
}

export function importReducer(state: ImportState, event: ImportEvent): ImportState {
  switch (event.type) {
    case "fileRejected":
      return { ...state, fileError: event.message };

    case "fileAccepted":
      // Se sube el `analysisId` para que una respuesta en vuelo del archivo anterior no
      // repueble la pantalla con un plan que ya no corresponde al archivo elegido.
      return {
        ...state,
        file: event.file,
        fileError: null,
        analysisId: state.analysisId + 1,
      };

    case "previewFailed":
      return { ...state, analysisId: state.analysisId + 1 };

    case "previewLoaded": {
      if (event.analysisId !== state.analysisId) return state;
      // `applied: []` es lo correcto AQUÍ: el plan nuevo es otro array y sus índices no tienen
      // por qué corresponder a los del anterior (el .xlsx pudo editarse entre un análisis y
      // otro), así que arrastrar el candado por índice pondría el candado en filas ajenas.
      //
      // Lo que no puede pasar es llegar aquí con filas ya aplicadas: un re-análisis del mismo
      // archivo contra el catálogo YA actualizado vuelve a marcar los restock como `update`
      // (el archivo sigue diciendo "suma 3 piezas") y los devolvería seleccionados, sumando
      // otra vez. Por eso el candado se protege en la ENTRADA — ver `canReanalyze`, que es lo
      // que impide que esta rama se alcance con `applied` no vacío.
      const onlyUnchanged =
        event.plan.rows.length > 0 && event.plan.rows.every((r) => r.action === "unchanged");
      return {
        ...state,
        phase: "reviewing",
        plan: event.plan,
        edits: {},
        selected: defaultSelection(event.plan),
        applied: [],
        filter: "all",
        expanded: {},
        // Si TODO el archivo queda igual, el grupo colapsado dejaría la pantalla en blanco.
        showUnchanged: onlyUnchanged,
        result: null,
        fileError: null,
      };
    }

    case "toggleRow":
      return {
        ...state,
        selected: { ...state.selected, [event.index]: !state.selected[event.index] },
      };

    case "setRowsSelected": {
      const selected = { ...state.selected };
      for (const index of event.indexes) selected[index] = event.selected;
      return { ...state, selected };
    }

    case "selectOnly": {
      const selected: Record<number, boolean> = {};
      state.plan?.rows.forEach((_row, index) => {
        selected[index] = false;
      });
      for (const index of event.indexes) selected[index] = true;
      return { ...state, selected };
    }

    case "toggleExpanded":
      return {
        ...state,
        expanded: { ...state.expanded, [event.index]: !state.expanded[event.index] },
      };

    case "setFilter":
      return { ...state, filter: event.filter };

    case "toggleUnchangedGroup":
      return { ...state, showUnchanged: !state.showUnchanged };

    case "editCell": {
      const edit = ensureEdit(state, event.index);
      return {
        ...state,
        edits: {
          ...state.edits,
          [event.index]: {
            ...edit,
            cells: {
              ...edit.cells,
              // Editar SIEMPRE marca la celda como presente: si el usuario está escribiendo,
              // quiere que ese valor viaje.
              [event.field]: { presence: "present", text: event.text },
            },
          },
        },
      };
    }

    case "setCellPresence": {
      const edit = ensureEdit(state, event.index);
      const cell = edit.cells[event.field];
      return {
        ...state,
        edits: {
          ...state.edits,
          [event.index]: {
            ...edit,
            cells: {
              ...edit.cells,
              // El `text` se conserva al pasar a "absent": alternar no debe perder lo tecleado.
              [event.field]: { presence: event.present ? "present" : "absent", text: cell.text },
            },
          },
        },
      };
    }

    case "revertRow": {
      const edits = { ...state.edits };
      delete edits[event.index];
      return { ...state, edits };
    }

    case "revertAllEdits":
      return { ...state, edits: {} };

    case "commitSucceeded": {
      // Invariante no negociable: una fila que se aplicó con éxito NUNCA vuelve al payload.
      // El restock SUMA stock, así que reenviarla duplicaría piezas. Se hace estructural (un
      // candado en el estado), no por convención de quien arme el siguiente lote.
      const applied = new Set(state.applied);
      // Todo lo que el servidor procesó sin error. Se deselecciona completo para que nada
      // vuelva a viajar sin que el dueño lo elija otra vez.
      const settled = new Set<number>();
      const { response, sentIndices } = event.outcome;
      const aligned = response.rows.length === sentIndices.length;
      response.rows.forEach((result, position) => {
        if (result.status === "error") return;
        const index = aligned
          ? sentIndices[position]
          : sentIndices.find((i) => state.plan?.rows[i]?.row === result.row);
        if (index === undefined) return;
        settled.add(index);
        // El candado es solo para lo que ESCRIBIÓ. Un `unchanged` no tocó stock ni campos, así
        // que bloquearlo impediría corregirlo y reenviarlo en la misma sesión — y el motivo del
        // candado ("volver a enviarla duplicaría lo guardado") sería falso justo para esa fila.
        if (result.status !== "unchanged") applied.add(index);
      });

      const selected = { ...state.selected };
      for (const index of settled) selected[index] = false;

      return { ...state, phase: "results", result: event.outcome, applied: [...applied], selected };
    }

    case "backToReview":
      return { ...state, phase: "reviewing" };

    case "reset":
      return { ...initialImportState, analysisId: state.analysisId + 1 };

    default:
      return state;
  }
}

// ── Selectores derivados ─────────────────────────────────────────────────────────────────

/**
 * Conteos por acción recalculados desde `rows`.
 *
 * El `summary` del backend se usa SOLO como verificación cruzada: un toolbar que dice "5
 * actualizaciones" sobre una tabla que muestra 4 destruye la confianza en la pantalla entera,
 * y es la tabla la que el dueño puede auditar.
 */
export function countByAction(plan: ImportPreviewResponse) {
  const counts = { create: 0, update: 0, unchanged: 0, error: 0, total: plan.rows.length };
  for (const row of plan.rows) counts[row.action] += 1;
  return counts;
}

/** Errores de captura local por índice. Solo se calculan para filas editadas. */
export function localErrorsFor(state: ImportState): Record<number, ReturnType<typeof validateRowEdit>> {
  const errors: Record<number, ReturnType<typeof validateRowEdit>> = {};
  for (const [key, edit] of Object.entries(state.edits)) {
    const found = validateRowEdit(edit);
    if (Object.keys(found).length > 0) errors[Number(key)] = found;
  }
  return errors;
}

/**
 * ¿Se puede volver a leer el archivo contra el catálogo de ahora?
 *
 * No, en cuanto alguna fila ya se aplicó. El preview recalcula el plan contra el catálogo YA
 * actualizado, pero el archivo sigue diciendo lo mismo ("suma 3 piezas"), así que las filas
 * que acaban de aplicarse reaparecen como `update` — y `previewLoaded` no puede conservar el
 * candado, porque los índices del plan nuevo no tienen por qué ser los mismos. Resultado: el
 * restock se ofrecería otra vez, preseleccionado, con el stock ya sumado. La salida en ese
 * estado es "Empezar de nuevo", que es explícita y obliga a volver a elegir el archivo.
 *
 * Es el mismo invariante que `commitSucceeded`, cubierto por el otro lado: una fila aplicada
 * con éxito NUNCA vuelve al payload.
 */
export function canReanalyze(state: ImportState): boolean {
  return state.file !== null && state.applied.length === 0;
}

/** Índices que se van a enviar: seleccionados, sin errores locales y no aplicados aún. */
export function selectableIndexes(
  state: ImportState,
  localErrors: Record<number, object>
): number[] {
  if (!state.plan) return [];
  const applied = new Set(state.applied);
  return state.plan.rows
    .map((_, index) => index)
    .filter(
      (index) =>
        state.selected[index] && !applied.has(index) && localErrors[index] === undefined
    );
}

/** Construye el payload del commit para los índices dados, respetando la whitelist. */
export function buildCommitRows(state: ImportState, indexes: number[]): ImportRowInput[] {
  if (!state.plan) return [];
  return indexes.map((index) => {
    const planRow = state.plan!.rows[index];
    const edit = state.edits[index];
    return edit
      ? serializeRowEdit(edit, planRow.row)
      : serializePristine(planRow.input, planRow.row);
  });
}

/**
 * ¿Es exactamente el mismo lote que el último enviado?
 *
 * El backend rechaza con 409 el mismo lote dos veces en menos de 60 s (hash sha256 del payload
 * con `row` descartado). Reenviar SOLO las filas que fallaron es un subconjunto → otro hash →
 * no se bloquea. Pero si fallaron TODAS y se reintenta el mismo conjunto, el hash es idéntico
 * y llega un 409 aunque no se haya escrito nada. Detectarlo aquí convierte ese 409 confuso en
 * una explicación antes de gastar la petición.
 */
export function isSameBatchAsLast(rows: ImportRowInput[], result: ImportState["result"]): boolean {
  if (!result) return false;
  const strip = (list: ImportRowInput[]) =>
    JSON.stringify(
      list.map((entry) =>
        // Se descarta `row` y se ordenan las claves, igual que el fingerprint del backend
        // (que también lo descarta): dos lotes iguales salvo el folio son el MISMO lote.
        Object.fromEntries(
          Object.entries(entry)
            .filter(([key]) => key !== "row")
            .sort(([a], [b]) => a.localeCompare(b))
        )
      )
    );
  return strip(rows) === strip(result.sentRows);
}

/** Segundos que faltan para que expire la ventana anti-duplicado del backend. */
export const DUPLICATE_WINDOW_MS = 60_000;

export function duplicateCooldownSeconds(result: ImportState["result"], now: number): number {
  if (!result) return 0;
  return Math.max(0, Math.ceil((result.sentAt + DUPLICATE_WINDOW_MS - now) / 1000));
}

/** Emparejamiento posicional del resultado con las filas del plan (ver comentario del reducer). */
export function resultForIndex(
  outcome: NonNullable<ImportState["result"]>,
  plan: ImportPreviewResponse,
  index: number
): ImportCommitResponse["rows"][number] | undefined {
  const { response, sentIndices } = outcome;
  const position = sentIndices.indexOf(index);
  if (position === -1) return undefined;
  if (response.rows.length === sentIndices.length) return response.rows[position];
  // Degradado: los largos no cuadran (no debería pasar; el backend devuelve uno por input).
  const folio = plan.rows[index]?.row;
  return response.rows.find((r) => r.row === folio);
}
