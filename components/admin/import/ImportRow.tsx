"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import type { ImportRowPlan } from "@/lib/api/adminProductImport";
import ImportRowDetail from "./ImportRowDetail";
import {
  AppliedBadge,
  DependencyBadge,
  EditedBadge,
  ImportActionBadge,
  ImportResultBadge,
  ReactivatedBadge,
} from "./ImportActionBadge";
import type { EditableField, RowEdit, RowFieldErrors, Staleness } from "./types";
import { pieceCount } from "./labels";

// Una fila de la revisión: la línea colapsada (barata, es lo que se pinta 500 veces) y, cuando
// se expande, el detalle completo en una fila extra con colSpan para no romper la tabla.

const COLUMN_COUNT = 5;

interface ImportRowProps {
  index: number;
  planRow: ImportRowPlan;
  edit: RowEdit;
  errors: RowFieldErrors;
  editedFields: EditableField[];
  staleness: Staleness;
  selected: boolean;
  applied: boolean;
  expanded: boolean;
  hasDependency: boolean;
  dependencySatisfied: boolean;
  providerRow: number | null;
  disabled: boolean;
  resultStatus?: string;
  resultMessage?: string;
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
  onChange: (field: EditableField, text: string) => void;
  onPresenceChange: (field: EditableField, present: boolean) => void;
  onRevert: () => void;
}

export default function ImportRow({
  index,
  planRow,
  edit,
  errors,
  editedFields,
  staleness,
  selected,
  applied,
  expanded,
  hasDependency,
  dependencySatisfied,
  providerRow,
  disabled,
  resultStatus,
  resultMessage,
  onToggleSelected,
  onToggleExpanded,
  onChange,
  onPresenceChange,
  onRevert,
}: ImportRowProps) {
  const hasLocalErrors = Object.keys(errors).length > 0;
  const edited = editedFields.length > 0;
  const dependencyBroken = hasDependency && !dependencySatisfied && selected && !applied;

  // Una fila con errores de captura no se puede enviar, pero NO bloquea al resto del lote:
  // mismo criterio de éxito parcial que el backend.
  const selectable = !applied && !hasLocalErrors && !disabled;

  const label = planRow.name ?? planRow.code ?? "(sin nombre)";
  const detailId = `import-row-detail-${index}`;

  const addedPieces = planRow.sizeChanges.reduce((sum, change) => sum + change.added, 0);
  const changeCount = planRow.changes.length;

  // Resumen de una línea. Tras editar, el resumen del preview puede ser falso, así que se
  // sustituye por lo único cierto: que la fila cambió.
  const summary = edited
    ? `${editedFields.length} ${editedFields.length === 1 ? "campo editado" : "campos editados"} · se recalcula al aplicar`
    : [
        addedPieces !== 0
          ? `${addedPieces > 0 ? "+" : "−"}${pieceCount(Math.abs(addedPieces))}`
          : null,
        changeCount > 0
          ? `${changeCount} ${changeCount === 1 ? "campo" : "campos"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const warningCount = planRow.warnings.length;

  return (
    <>
      <tr
        className={[
          "border-b border-amber-400/10 transition-colors",
          expanded ? "bg-stone-800/30" : "hover:bg-amber-400/5",
          applied ? "opacity-60" : "",
        ].join(" ")}
      >
        <td className="py-3 pl-1 pr-2 align-middle">
          <input
            type="checkbox"
            checked={selected && !applied}
            disabled={!selectable}
            onChange={onToggleSelected}
            aria-label={`Aplicar la fila ${planRow.row}, «${label}»`}
            title={
              applied
                ? "Ya se aplicó; volver a enviarla duplicaría lo que se guardó"
                : hasLocalErrors
                  ? "Corrige los errores de esta fila para poder aplicarla"
                  : undefined
            }
            className="size-4 accent-amber-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          />
        </td>

        {/* Riel de folio: ancla cada fila a la hoja que el dueño tiene abierta. */}
        <th
          scope="row"
          className="py-3 pr-4 align-middle text-left font-mono text-xs text-amber-100/35 tabular-nums font-normal"
        >
          {planRow.row}
        </th>

        <td className="py-3 pr-4 align-middle min-w-0">
          <p className="text-amber-50 text-sm truncate max-w-70" title={label}>
            {label}
          </p>
          {planRow.code && (
            <p className="text-amber-100/30 text-xs font-mono truncate">{planRow.code}</p>
          )}
        </td>

        <td className="py-3 pr-4 align-middle">
          <div className="flex flex-wrap items-center gap-1.5">
            {resultStatus ? (
              <ImportResultBadge status={resultStatus} />
            ) : (
              <ImportActionBadge action={planRow.action} muted={edited} />
            )}
            {edited && <EditedBadge />}
            {applied && <AppliedBadge />}
            {planRow.reactivated && !edited && <ReactivatedBadge />}
            {hasDependency && (
              <DependencyBadge providerRow={providerRow} satisfied={dependencySatisfied || applied} />
            )}
          </div>
        </td>

        <td className="py-3 pr-2 align-middle text-right">
          <div className="flex items-center justify-end gap-3">
            <div className="hidden sm:block text-right min-w-0">
              {(resultMessage || summary) && (
                <p className="text-amber-100/40 text-xs truncate max-w-70">
                  {resultMessage ?? summary}
                </p>
              )}
              {(warningCount > 0 || hasLocalErrors) && (
                <p
                  className={`text-xs flex items-center justify-end gap-1 ${
                    hasLocalErrors ? "text-red-400/80" : "text-amber-400/70"
                  }`}
                >
                  <AlertTriangle className="size-3" strokeWidth={1.5} />
                  {hasLocalErrors
                    ? "Revisa los campos marcados"
                    : `${warningCount} ${warningCount === 1 ? "aviso" : "avisos"}`}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              aria-controls={detailId}
              aria-label={`${expanded ? "Ocultar" : "Ver"} el detalle de la fila ${planRow.row}`}
              className="shrink-0 p-1.5 text-amber-100/30 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <ChevronDown
                className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr id={detailId}>
          <td colSpan={COLUMN_COUNT} className="p-0">
            <ImportRowDetail
              planRow={planRow}
              edit={edit}
              errors={errors}
              editedFields={editedFields}
              staleness={staleness}
              providerRow={providerRow}
              dependencyBroken={dependencyBroken}
              disabled={disabled || applied}
              onChange={onChange}
              onPresenceChange={onPresenceChange}
              onRevert={onRevert}
            />
          </td>
        </tr>
      )}
    </>
  );
}
