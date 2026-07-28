import type { ImportRowInput, ProductSnapshot } from "@/lib/api/adminProductImport";
import {
  EDITABLE_FIELDS,
  IDENTITY_FIELDS,
  type Cell,
  type EditableField,
  type RowEdit,
  type RowFieldErrors,
  type Staleness,
} from "./types";

// Traducción entre el `input` del backend y las celdas del editor inline, en ambos sentidos.
// Módulo puro (sin React, sin I/O) — es donde vive el riesgo real de esta pantalla, así que se
// mantiene testeable por separado.

/** Campos que el backend espera como número. */
const NUMERIC_FIELDS = new Set<EditableField>([
  "originalPrice",
  "salePrice",
  "unitCost",
  "weightKg",
  "lengthCm",
  "widthCm",
  "heightCm",
]);

/** Dimensiones de empaque: Skydropx no cotiza con un 0, así que exigen ser > 0. */
const POSITIVE_ONLY = new Set<EditableField>(["weightKg", "lengthCm", "widthCm", "heightCm"]);

/** El único campo donde `""` es un valor con significado: limpia la descripción. */
const CLEARABLE_FIELDS = new Set<EditableField>(["description"]);

export const FIELD_LABELS: Record<EditableField, string> = {
  code: "Código",
  name: "Nombre",
  type: "Categoría",
  description: "Descripción",
  originalPrice: "Precio original",
  salePrice: "Precio oferta",
  unitCost: "Costo unitario",
  sizes: "Tallas",
  weightKg: "Peso (kg)",
  lengthCm: "Largo (cm)",
  widthCm: "Ancho (cm)",
  heightCm: "Alto (cm)",
  visible: "Visible",
};

// ── Ingesta: input del preview → celdas ──────────────────────────────────────────────────

function cellText(field: EditableField, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (field === "visible") return value === true ? "true" : "false";
  // `sizes` puede llegar como number[] (una ocurrencia = una unidad). Se normaliza a string
  // porque la notación "26x20" no se puede escribir como array sin 20 entradas, y porque un
  // <input> de texto la round-trippea sin perder nada.
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Crea el estado editable de una fila a partir del `input` que devolvió el preview. */
export function ingestRow(input: ImportRowInput): RowEdit {
  const cells = {} as Record<EditableField, Cell>;
  for (const field of EDITABLE_FIELDS) {
    const value = input[field];
    cells[field] =
      value === null || value === undefined
        ? { presence: "absent", text: "" }
        : { presence: "present", text: cellText(field, value) };
  }
  return { cells, origin: input };
}

// ── Coerción ─────────────────────────────────────────────────────────────────────────────

export type Coerced =
  | { ok: true; value: string | number | boolean }
  | { ok: false; message: string };

// Mismos patrones que ../backend/src/utils/excelCell.ts, para que lo que se acepta al editar
// coincida con lo que se aceptó al leer el archivo.
const THOUSANDS_PATTERN = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;
const DECIMAL_COMMA_PATTERN = /^-?\d+,\d{1,2}$/;

/**
 * Números con la tolerancia de una hoja de cálculo mexicana: símbolo de moneda, espacios
 * (incluido el duro que mete Excel al formatear moneda), separador de miles y coma decimal.
 *
 * Nunca degrada a 0 ante algo ilegible: poner un precio en cero en silencio es el peor fallo
 * disponible en esta pantalla.
 */
export function parseNumberText(raw: string): { ok: true; value: number } | { ok: false } {
  const cleaned = raw.replace(/[$\s ]/g, "");
  if (cleaned.length === 0) return { ok: false };

  let normalized = cleaned;
  if (THOUSANDS_PATTERN.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else if (DECIMAL_COMMA_PATTERN.test(cleaned)) {
    normalized = cleaned.replace(",", ".");
  } else if (cleaned.includes(",")) {
    return { ok: false };
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? { ok: true, value: num } : { ok: false };
}

const TRUE_VALUES = new Set(["true", "si", "sí", "1", "verdadero", "x", "v"]);
const FALSE_VALUES = new Set(["false", "no", "0", "falso"]);

export function coerceField(field: EditableField, text: string): Coerced {
  const trimmed = text.trim();

  if (field === "visible") {
    const normalized = trimmed.toLowerCase();
    if (TRUE_VALUES.has(normalized)) return { ok: true, value: true };
    if (FALSE_VALUES.has(normalized)) return { ok: true, value: false };
    return { ok: false, message: "Elige Sí o No." };
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (trimmed.length === 0) {
      return {
        ok: false,
        message: 'Escribe un número, o deja el campo en «No tocar» para no cambiarlo.',
      };
    }
    const parsed = parseNumberText(trimmed);
    if (!parsed.ok) {
      return { ok: false, message: `"${trimmed}" no es un número válido.` };
    }
    if (POSITIVE_ONLY.has(field)) {
      if (parsed.value <= 0) {
        return { ok: false, message: "Debe ser mayor que 0 (el envío no se puede cotizar con 0)." };
      }
    } else if (parsed.value < 0) {
      return { ok: false, message: "No puede ser negativo." };
    }
    return { ok: true, value: parsed.value };
  }

  if (trimmed.length === 0 && !CLEARABLE_FIELDS.has(field)) {
    return {
      ok: false,
      message: 'Escribe un valor, o deja el campo en «No tocar» para no cambiarlo.',
    };
  }

  // `description` conserva el texto sin recortar bordes solo si trae contenido; una cadena de
  // espacios equivale a limpiarla (que es una acción válida y explícita para este campo).
  if (field === "description") return { ok: true, value: trimmed };
  return { ok: true, value: trimmed };
}

// ── Tallas ───────────────────────────────────────────────────────────────────────────────

/** `26x20`, `26 X 20`, `26*20`, `26×20`, o una talla suelta. Igual que el backend. */
const SIZE_ENTRY_PATTERN = /^(\d+)\s*(?:[x×*]\s*(\d+))?$/i;

const MAX_SIZE = 999;
const MAX_UNITS_PER_ENTRY = 9999;
const MAX_DISTINCT_SIZES = 60;
const MAX_TOTAL_UNITS = 10000;

export interface SizesBreakdown {
  rows: { size: number; stock: number }[];
  total: number;
}

/**
 * Espejo de `parseSizesSpec` del backend. Sirve para dos cosas: validar en cliente antes de
 * enviar, y —más importante— pintar el TOTAL derivado bajo el campo. Ese número es la mejor
 * defensa contra un `26x200` mal tecleado, porque el error se vuelve visible antes de aplicar.
 */
export function parseSizesSpec(
  input: string
): { ok: true; value: SizesBreakdown } | { ok: false; message: string } {
  const entries = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (entries.length === 0) {
    return { ok: false, message: 'Agrega al menos una talla (p. ej. "25, 26, 26" o "26x20").' };
  }

  const bySize = new Map<number, number>();
  let total = 0;

  for (const entry of entries) {
    const match = SIZE_ENTRY_PATTERN.exec(entry);
    if (!match) {
      return {
        ok: false,
        message: `"${entry}" no es una talla válida; usa "25, 26" o "26x20".`,
      };
    }
    const size = Number(match[1]);
    const quantity = match[2] === undefined ? 1 : Number(match[2]);

    if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) {
      return { ok: false, message: `La talla "${entry}" debe ser un número entre 1 y ${MAX_SIZE}.` };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_UNITS_PER_ENTRY) {
      return {
        ok: false,
        message: `La cantidad de la talla ${size} debe estar entre 1 y ${MAX_UNITS_PER_ENTRY}.`,
      };
    }

    bySize.set(size, (bySize.get(size) ?? 0) + quantity);
    total += quantity;

    if (bySize.size > MAX_DISTINCT_SIZES) {
      return { ok: false, message: `Hay demasiadas tallas distintas (máximo ${MAX_DISTINCT_SIZES}).` };
    }
    if (total > MAX_TOTAL_UNITS) {
      return {
        ok: false,
        message: `La fila suma más de ${MAX_TOTAL_UNITS} piezas; divídela en varias filas.`,
      };
    }
  }

  const rows = [...bySize.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, stock]) => ({ size, stock }));

  return { ok: true, value: { rows, total } };
}

// ── Validación de la fila completa ───────────────────────────────────────────────────────

/**
 * Errores de captura local. Una fila con errores no se puede seleccionar, pero NO bloquea al
 * resto del lote — mismo criterio de éxito parcial que el backend.
 */
export function validateRowEdit(edit: RowEdit): RowFieldErrors {
  const errors: RowFieldErrors = {};

  for (const field of EDITABLE_FIELDS) {
    const cell = edit.cells[field];
    if (cell.presence === "absent") continue;

    if (field === "sizes") {
      const parsed = parseSizesSpec(cell.text);
      if (!parsed.ok) errors.sizes = parsed.message;
      continue;
    }

    const coerced = coerceField(field, cell.text);
    if (!coerced.ok) errors[field] = coerced.message;
  }

  // Solo se compara cuando ambos están presentes y son válidos en ESTA fila. Si solo viene uno,
  // el backend lo contrasta contra el valor guardado y rechaza esa fila sola si no cuadra.
  const original = edit.cells.originalPrice;
  const sale = edit.cells.salePrice;
  if (
    original.presence === "present" &&
    sale.presence === "present" &&
    !errors.originalPrice &&
    !errors.salePrice
  ) {
    const a = parseNumberText(original.text);
    const b = parseNumberText(sale.text);
    if (a.ok && b.ok && b.value > a.value) {
      errors.salePrice = "El precio de oferta no puede ser mayor al precio original.";
    }
  }

  return errors;
}

// ── Serialización: celdas → input del backend ────────────────────────────────────────────

/**
 * Construye el `input` que se manda al confirmar.
 *
 * Invariantes (las tres importan):
 * - **Whitelist explícita.** Nunca se hace spread del row del plan: el body del commit es
 *   `.strict()`, así que una clave que el preview devuelva y el commit no acepte mataría el
 *   LOTE ENTERO con un 400.
 * - Una celda `absent` OMITE la clave (nunca se emite `null`, que es ruido equivalente).
 * - Nunca se emite `NaN`/`undefined`: los campos inválidos ya bloquearon la selección de la
 *   fila, pero por si acaso se omiten en vez de enviarse rotos.
 */
export function serializeRowEdit(edit: RowEdit, row: number): ImportRowInput {
  const out: ImportRowInput = { row };

  for (const field of EDITABLE_FIELDS) {
    const cell = edit.cells[field];
    if (cell.presence === "absent") continue;

    if (field === "sizes") {
      const trimmed = cell.text.trim();
      if (trimmed.length > 0) out.sizes = trimmed;
      continue;
    }

    const coerced = coerceField(field, cell.text);
    if (!coerced.ok) continue;
    // El índice es seguro: `field` viene de EDITABLE_FIELDS, que `satisfies` las claves de
    // ImportRowInput.
    (out as Record<string, unknown>)[field] = coerced.value;
  }

  return out;
}

/**
 * Serializa una fila NO editada. Pasa por la misma whitelist a propósito, en vez de reenviar
 * `plan.rows[i].input` crudo: si el preview algún día devuelve una clave que el commit no
 * acepta, el pass-through daría 400 al lote entero (ver arriba).
 */
export function serializePristine(input: ImportRowInput, row: number): ImportRowInput {
  return serializeRowEdit(ingestRow(input), row);
}

// ── Ediciones y frescura del diff ────────────────────────────────────────────────────────

/** Campos cuyo valor efectivo difiere del `input` original de la fila. */
export function editedFields(edit: RowEdit): EditableField[] {
  const pristine = ingestRow(edit.origin);
  return EDITABLE_FIELDS.filter((field) => {
    const now = edit.cells[field];
    const before = pristine.cells[field];
    if (now.presence !== before.presence) return true;
    // Si ambas están ausentes el texto es irrelevante (no se envía).
    if (now.presence === "absent") return false;
    return now.text.trim() !== before.text.trim();
  });
}

/**
 * Qué parte del diff del preview dejó de ser cierta.
 *
 * `identity` (se tocó código o nombre) invalida TODO: la fila puede emparejar ahora con otro
 * producto o con ninguno, así que el `before` mostrado ya no es necesariamente el suyo.
 */
export function stalenessOf(fields: EditableField[]): Staleness {
  if (fields.length === 0) return "fresh";
  const identity: readonly EditableField[] = IDENTITY_FIELDS;
  return fields.some((f) => identity.includes(f)) ? "identity" : "partial";
}

/** Valor mostrable de una celda ("—" para ausente). Usado por el diff local de la edición. */
export function cellDisplay(field: EditableField, cell: Cell): string {
  if (cell.presence === "absent") return "sin cambio";
  if (field === "visible") return cell.text === "true" ? "Sí" : "No";
  return cell.text.trim().length === 0 ? "«vacío»" : cell.text.trim();
}

/** Lo que el producto tiene hoy en ese campo — placeholder fantasma de una celda ausente. */
export function snapshotDisplay(
  field: EditableField,
  snapshot: ProductSnapshot | null
): string | null {
  if (!snapshot) return null;
  switch (field) {
    case "sizes":
      return snapshot.sizes.length
        ? snapshot.sizes.map((s) => `${s.size}x${s.stock}`).join(", ")
        : null;
    case "visible":
      return snapshot.visible ? "Sí" : "No";
    case "description":
      return snapshot.description ?? null;
    case "code":
      return snapshot.code ?? null;
    default: {
      const value = snapshot[field];
      return value === null || value === undefined ? null : String(value);
    }
  }
}
