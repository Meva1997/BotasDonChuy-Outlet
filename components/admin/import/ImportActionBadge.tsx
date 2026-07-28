"use client";

import type { ImportAction } from "@/lib/api/adminProductImport";
import { ACTION_META, PILL_BASE, RESULT_META } from "./labels";

// Badges de la pantalla de importación. Todos llevan TEXTO, no solo color (mismo criterio que
// components/admin/orders/StatusBadges.tsx).

export function ImportActionBadge({
  action,
  muted = false,
}: {
  action: ImportAction;
  /** Fila editada: su acción es la que traía el ARCHIVO y puede haber cambiado. Se atenúa para
   *  que no se lea como el veredicto vigente. */
  muted?: boolean;
}) {
  const meta = ACTION_META[action];
  return (
    <span
      className={`${PILL_BASE} ${meta.classes} ${muted ? "opacity-45" : ""}`}
      title={muted ? `${meta.description} (según el archivo, antes de tu edición)` : meta.description}
    >
      {meta.label}
      {muted && " (original)"}
    </span>
  );
}

export function ImportResultBadge({ status }: { status: string }) {
  const meta = RESULT_META[status] ?? {
    label: status,
    classes: "border-stone-500 text-stone-400",
  };
  return <span className={`${PILL_BASE} ${meta.classes}`}>{meta.label}</span>;
}

/** La fila fue modificada a mano: su diff con el catálogo ya no es de fiar. */
export function EditedBadge() {
  return (
    <span
      className={`${PILL_BASE} border-amber-400/60 text-amber-400 bg-amber-400/10`}
      title="Editaste esta fila; el resultado real se calcula al aplicar"
    >
      Editada
    </span>
  );
}

/**
 * Un producto descontinuado vuelve al catálogo PÚBLICO. Ese efecto no aparece en `changes`, así
 * que sin este badge se aplicaría sin que nadie lo viera venir.
 */
export function ReactivatedBadge() {
  return (
    <span
      className={`${PILL_BASE} border-amber-400/60 text-amber-400 bg-amber-400/10`}
      title="Este producto estaba descontinuado y volverá al catálogo público"
    >
      Se reactivará
    </span>
  );
}

/** Candado: la fila ya se aplicó y no puede reenviarse (el restock sumaría de nuevo). */
export function AppliedBadge() {
  return (
    <span
      className={`${PILL_BASE} border-emerald-400/50 text-emerald-400/80 bg-emerald-400/5`}
      title="Esta fila ya se aplicó; no se puede volver a enviar porque el stock se sumaría otra vez"
    >
      Ya aplicada
    </span>
  );
}

/** Chip de dependencia con otra fila del mismo archivo. */
export function DependencyBadge({
  providerRow,
  satisfied,
}: {
  providerRow: number | null;
  satisfied: boolean;
}) {
  return (
    <span
      className={`${PILL_BASE} ${
        satisfied
          ? "border-stone-500 text-stone-400"
          : "border-red-400/60 text-red-400 bg-red-500/10"
      }`}
      title={
        satisfied
          ? "Este producto lo crea una fila anterior de este mismo archivo"
          : "La fila que crea este producto no se va a aplicar"
      }
    >
      {providerRow === null ? "Sin fila que lo cree" : `Depende de la fila ${providerRow}`}
    </span>
  );
}
