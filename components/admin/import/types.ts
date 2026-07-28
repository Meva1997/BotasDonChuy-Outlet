import type {
  ImportAction,
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportRowInput,
} from "@/lib/api/adminProductImport";

// Tipos del flujo de importación por Excel. Sin React y sin I/O — se comparten entre el
// reducer, los helpers puros y los componentes.

/**
 * Campos editables de una fila. El `satisfies` es la red de seguridad contra el `.strict()`
 * del backend: si alguien agrega aquí una clave que `ImportRowInput` no tiene, el build falla
 * en vez de que el lote entero muera con un 400 en producción.
 *
 * `row` NO es editable (es el folio del Excel, no un dato del producto).
 */
export const EDITABLE_FIELDS = [
  "code",
  "name",
  "type",
  "description",
  "originalPrice",
  "salePrice",
  "unitCost",
  "sizes",
  "weightKg",
  "lengthCm",
  "widthCm",
  "heightCm",
  "visible",
] as const satisfies readonly (keyof ImportRowInput)[];

export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Campos que identifican con qué producto empareja la fila. Editarlos invalida TODO el diff. */
export const IDENTITY_FIELDS = ["code", "name"] as const satisfies readonly EditableField[];

/**
 * Una celda del editor.
 *
 * `presence` existe porque en el contrato "clave ausente" ≠ "valor vacío": ausente significa
 * "no toques esa columna", pero `description: ""` SÍ borra la descripción. El valor de un
 * `<input>` siempre es un string, así que inferir "ausente" de un string vacío rompería ese
 * caso. Al llevar la presencia por separado, teclear y borrar significa `""`, y a "ausente"
 * solo se llega por el control explícito "No tocar".
 *
 * `text` se conserva aunque `presence` sea "absent", para que alternar no pierda lo tecleado.
 */
export interface Cell {
  presence: "absent" | "present";
  text: string;
}

export interface RowEdit {
  /** DENSO: todos los campos editables, siempre. Nunca `undefined`. */
  cells: Record<EditableField, Cell>;
  /** El `input` original del preview, congelado — para "deshacer" y para el diff local. */
  origin: ImportRowInput;
}

/**
 * Qué tan desactualizado quedó el diff del preview tras editar la fila.
 *
 * El endpoint de preview solo acepta un ARCHIVO, así que no hay forma de re-previsualizar
 * filas editadas: el diff (`before`/`after`/`changes`/`sizeChanges`) queda viejo y no se puede
 * refrescar. En vez de fingirlo, se suprime lo que dejó de ser cierto.
 */
export type Staleness = "fresh" | "partial" | "identity";

/** Error de captura local (antes de enviar). La fila no se puede seleccionar. */
export type RowFieldErrors = Partial<Record<EditableField, string>>;

export type ImportFilter = ImportAction | "all";

export interface CommitOutcome {
  response: ImportCommitResponse;
  /** Índices de `plan.rows` enviados, en orden — el merge del resultado es POSICIONAL. */
  sentIndices: number[];
  /** Copia de lo enviado, para detectar un reintento idéntico antes de comerse un 409. */
  sentRows: ImportRowInput[];
  sentAt: number;
}

export interface ImportState {
  phase: "idle" | "reviewing" | "results";
  /** Se retiene para "volver a analizar" (el mismo archivo, contra el catálogo de ahora). */
  file: File | null;
  /** Rechazo local (tamaño/extensión), antes de gastar una petición. */
  fileError: string | null;
  /** Respuesta del preview. INMUTABLE — única fuente del diff. */
  plan: ImportPreviewResponse | null;
  /** Generación del análisis, para descartar la respuesta de uno abandonado. */
  analysisId: number;
  /** SPARSE: solo las filas tocadas. Clave = índice de `plan.rows`, nunca el folio `row`. */
  edits: Record<number, RowEdit>;
  selected: Record<number, boolean>;
  /** Filas ya aplicadas con éxito. NUNCA se re-envían: el restock suma. */
  applied: number[];
  filter: ImportFilter;
  expanded: Record<number, boolean>;
  showUnchanged: boolean;
  result: CommitOutcome | null;
}
