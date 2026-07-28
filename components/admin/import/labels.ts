import type { ImportAction } from "@/lib/api/adminProductImport";

// Copy es-MX centralizada de la importación (mismo criterio que products/notices.ts): varios
// componentes describen las mismas acciones y no pueden divergir.

/** Colores: emerald = alta, sky = restock, stone = sin cambios, red = error. Mismo vocabulario
 *  semántico que components/admin/orders/StatusBadges.tsx. */
export const ACTION_META: Record<
  ImportAction,
  { label: string; description: string; classes: string; dotClass: string }
> = {
  create: {
    label: "Nuevo",
    description: "Se dará de alta en el catálogo",
    classes: "border-emerald-400 text-emerald-400",
    dotClass: "bg-emerald-400",
  },
  update: {
    label: "Restock",
    description: "Se actualizará el producto existente",
    classes: "border-sky-400 text-sky-400",
    dotClass: "bg-sky-400",
  },
  unchanged: {
    label: "Sin cambios",
    description: "Empareja, pero no cambia nada",
    classes: "border-stone-500 text-stone-400",
    dotClass: "bg-stone-500",
  },
  error: {
    label: "Error",
    description: "No se puede aplicar tal como está",
    classes: "border-red-400 text-red-400",
    dotClass: "bg-red-400",
  },
};

/** Estado de una fila tras confirmar. `unchanged` aquí significa "se aplicó y no cambió nada". */
export const RESULT_META: Record<string, { label: string; classes: string }> = {
  created: { label: "Creado", classes: "border-emerald-400 text-emerald-400" },
  updated: { label: "Actualizado", classes: "border-sky-400 text-sky-400" },
  unchanged: { label: "Sin cambios", classes: "border-stone-500 text-stone-400" },
  error: { label: "Error", classes: "border-red-400 text-red-400" },
};

export const PILL_BASE =
  "inline-flex items-center gap-1.5 border uppercase tracking-[0.18em] text-[9px] px-2.5 py-1 whitespace-nowrap";

export const COPY = {
  sectionTitle: "Importar",
  sectionSubtitle:
    "Da de alta mercancía nueva y restockea la existente subiendo una hoja de cálculo.",

  dropzoneTitle: "Arrastra tu archivo de Excel",
  dropzoneHint: "o haz clic para elegirlo",
  dropzoneLimits: "Solo .xlsx · máximo 2 MB · hasta 500 filas",

  analyzing: "Analizando el archivo…",
  analyzingNote: "No se escribe nada todavía: primero vas a revisar lo que cambiaría.",

  /** El aviso más importante de la pantalla: es la operación irreversible. */
  restockWarning:
    "Al actualizar, las tallas SUMAN piezas al stock guardado — no lo reemplazan. Por eso revisas antes de aplicar: no hay forma de deshacerlo desde el panel.",

  staleDiff:
    "Editaste esta fila. La comparación de antes y después ya no aplica — el resultado real se calcula al aplicar.",
  staleDiffPartial:
    "Editaste esta fila. Lo que cambiaste ya no se compara contra el catálogo; el resto puede estar desactualizado.",

  projectedBefore: "Estado proyectado (según filas anteriores de este archivo)",
  storedBefore: "Actual en el catálogo",

  emptyFile:
    "El archivo no tiene filas de datos. Revisa que los productos empiecen en la fila 2, debajo del encabezado.",
  allErrors:
    "Ninguna fila se puede aplicar tal como está. Corrige las que necesites y vuelve a intentarlo.",
  allUnchanged:
    "El archivo no cambia nada del catálogo: todos los valores ya son los guardados.",

  hiddenProduct: "Este producto está oculto en el catálogo — restockearlo no lo pone a la venta.",
  reactivateNote:
    "Este producto estaba descontinuado y volverá al catálogo público al aplicarse.",

  clearsDescription: "Se borrará la descripción actual del producto.",

  sameBatchWarning:
    "Estás por enviar exactamente el mismo lote que acabas de aplicar. El servidor lo va a rechazar durante un minuto para que no dupliques stock.",
} as const;

/** Aviso de una dependencia rota entre filas del mismo archivo. */
export function brokenDependencyNotice(providerRow: number | null, productLabel: string): string {
  if (providerRow === null) {
    return `Ninguna fila seleccionada crea «${productLabel}». Si aplicas así, esta fila dará de alta un producto nuevo con solo sus piezas, o fallará.`;
  }
  return `La fila ${providerRow} (que crea «${productLabel}») está deseleccionada. Si aplicas así, esta fila dará de alta un producto nuevo con solo sus piezas, o fallará.`;
}

/** Resumen de una importación aplicada. */
export function commitSummaryNotice(summary: {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}): string {
  const parts: string[] = [];
  if (summary.created) parts.push(`${summary.created} ${summary.created === 1 ? "producto creado" : "productos creados"}`);
  if (summary.updated) parts.push(`${summary.updated} ${summary.updated === 1 ? "actualizado" : "actualizados"}`);
  if (summary.unchanged) parts.push(`${summary.unchanged} sin cambios`);
  if (summary.failed) parts.push(`${summary.failed} con error`);
  return parts.length ? parts.join(" · ") : "No se aplicó ninguna fila.";
}

/** Pluraliza "N fila(s)". */
export function rowCount(n: number): string {
  return `${n} ${n === 1 ? "fila" : "filas"}`;
}

export function pieceCount(n: number): string {
  return `${n} ${n === 1 ? "pieza" : "piezas"}`;
}
