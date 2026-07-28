"use client";

import { Undo2 } from "lucide-react";
import type { ImportRowPlan } from "@/lib/api/adminProductImport";
import EditableCell from "./EditableCell";
import { EDITABLE_FIELDS, type EditableField, type RowEdit, type RowFieldErrors } from "./types";
import { cellDisplay, FIELD_LABELS, ingestRow, snapshotDisplay } from "./rowInput";

// Formulario inline de una fila. Solo se monta cuando la fila está expandida: con 500 filas ×
// 13 campos serían 6 500 inputs montados a la vez.

interface ImportRowEditorProps {
  planRow: ImportRowPlan;
  edit: RowEdit;
  errors: RowFieldErrors;
  editedFields: EditableField[];
  disabled: boolean;
  onChange: (field: EditableField, text: string) => void;
  onPresenceChange: (field: EditableField, present: boolean) => void;
  onRevert: () => void;
}

export default function ImportRowEditor({
  planRow,
  edit,
  errors,
  editedFields,
  disabled,
  onChange,
  onPresenceChange,
  onRevert,
}: ImportRowEditorProps) {
  // `edit.origin` es el `input` del preview congelado al empezar a editar — la referencia
  // contra la que se mide qué cambió.
  const pristine = ingestRow(edit.origin);
  const hasEdits = editedFields.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/30">
          Editar la fila antes de aplicar
        </p>
        {hasEdits && (
          <button
            type="button"
            onClick={onRevert}
            disabled={disabled}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-amber-100/40 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 className="size-3.5" strokeWidth={1.5} />
            Deshacer cambios
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4">
        {EDITABLE_FIELDS.map((field) => {
          const cell = edit.cells[field];
          return (
            <div
              key={field}
              className={field === "description" ? "sm:col-span-2 xl:col-span-3" : undefined}
            >
              <EditableCell
                field={field}
                cell={cell}
                error={errors[field]}
                currentValue={snapshotDisplay(field, planRow.before)}
                wouldClearDescription={
                  field === "description" &&
                  cell.presence === "present" &&
                  cell.text.trim() === "" &&
                  !!planRow.before?.description
                }
                disabled={disabled}
                onChange={(text) => onChange(field, text)}
                onPresenceChange={(present) => onPresenceChange(field, present)}
              />
            </div>
          );
        })}
      </div>

      {/* Diff LOCAL de la instrucción (no del producto): qué cambiaste respecto a lo que traía
          el archivo. Es lo que reemplaza al diff del preview cuando éste queda desactualizado,
          y es lo único que sí podemos afirmar con certeza tras una edición. */}
      {hasEdits && (
        <div className="border-t border-stone-700/40 pt-4">
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-400/60 mb-3">
            Cambios que hiciste a la fila
          </p>
          <ul className="space-y-1.5">
            {editedFields.map((field) => (
              <li
                key={field}
                className="text-[13px] flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              >
                <span className="text-amber-100/45 min-w-32">{FIELD_LABELS[field]}</span>
                <span className="text-amber-100/35 tabular-nums">
                  {cellDisplay(field, pristine.cells[field])}
                </span>
                <span aria-hidden="true" className="text-amber-400/40">
                  →
                </span>
                <span className="text-amber-50 tabular-nums">
                  {cellDisplay(field, edit.cells[field])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
