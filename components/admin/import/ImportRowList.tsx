"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { ImportCommitResponse, ImportPreviewResponse } from "@/lib/api/adminProductImport";
import ImportRow from "./ImportRow";
import type { EditableField, ImportState, RowFieldErrors } from "./types";
import type { DependencyReport } from "./dependencies";
import { editedFields as computeEditedFields, ingestRow, stalenessOf } from "./rowInput";
import { rowCount } from "./labels";

// Tabla de la revisión. Es un <table> real (no divs) porque los datos son genuinamente
// tabulares y la asociación de columna importa para un lector de pantalla.
//
// Las filas `unchanged` van en su propio <tbody> colapsable: en un restock parcial de 200
// filas pueden ser la mayoría y enterrarían justo lo que hay que revisar.

const TH =
  "pb-2.5 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";

/** Columnas de la tabla — el colSpan de la fila del grupo colapsable debe cubrirlas todas. */
const COLUMN_COUNT = 5;

interface ImportRowListProps {
  plan: ImportPreviewResponse;
  state: ImportState;
  localErrors: Record<number, RowFieldErrors>;
  dependencies: DependencyReport;
  disabled: boolean;
  resultFor: (index: number) => ImportCommitResponse["rows"][number] | undefined;
  onToggleRow: (index: number) => void;
  onToggleExpanded: (index: number) => void;
  onToggleUnchangedGroup: () => void;
  onSetAll: (indexes: number[], selected: boolean) => void;
  onChange: (index: number, field: EditableField, text: string) => void;
  onPresenceChange: (index: number, field: EditableField, present: boolean) => void;
  onRevert: (index: number) => void;
}

export default function ImportRowList({
  plan,
  state,
  localErrors,
  dependencies,
  disabled,
  resultFor,
  onToggleRow,
  onToggleExpanded,
  onToggleUnchangedGroup,
  onSetAll,
  onChange,
  onPresenceChange,
  onRevert,
}: ImportRowListProps) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const appliedSet = new Set(state.applied);

  const allIndexes = plan.rows.map((_, index) => index);

  // Con el filtro "all" las `unchanged` viven SIEMPRE en su propio grupo (que se muestra u
  // oculta), nunca mezcladas en el tbody principal: agrupadas se pueden esconder y volver a
  // esconder, y el botón del grupo sigue montado en ambos estados. Con un filtro explícito de
  // "unchanged" el grupo no aplica — esas filas son justo lo que se pidió ver.
  const unchangedGrouped =
    state.filter === "all"
      ? allIndexes.filter((index) => plan.rows[index].action === "unchanged")
      : [];

  const visibleIndexes = allIndexes.filter((index) => {
    const action = plan.rows[index].action;
    if (state.filter !== "all") return action === state.filter;
    return action !== "unchanged";
  });

  const shownIndexes = state.showUnchanged
    ? [...visibleIndexes, ...unchangedGrouped]
    : visibleIndexes;

  // El select-all se acota a lo que ESTÁ EN PANTALLA: marcar todo mientras se ve solo "restock"
  // —o con el grupo sin cambios colapsado— no debe tocar filas que no se ven.
  const togglable = shownIndexes.filter(
    (index) => !appliedSet.has(index) && localErrors[index] === undefined
  );
  const selectedTogglable = togglable.filter((index) => state.selected[index]);
  const allSelected = togglable.length > 0 && selectedTogglable.length === togglable.length;
  const someSelected = selectedTogglable.length > 0 && !allSelected;

  // `indeterminate` no es una prop de React: hay que ponerlo en el nodo.
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const renderRow = (index: number) => {
    const planRow = plan.rows[index];
    const edit = state.edits[index] ?? ingestRow(planRow.input);
    const edited = state.edits[index] ? computeEditedFields(state.edits[index]) : [];
    const dependency = dependencies.byIndex[index];
    const result = resultFor(index);

    return (
      <ImportRow
        key={index}
        index={index}
        planRow={planRow}
        edit={edit}
        errors={localErrors[index] ?? {}}
        editedFields={edited}
        staleness={stalenessOf(edited)}
        selected={state.selected[index] === true}
        applied={appliedSet.has(index)}
        expanded={state.expanded[index] === true}
        hasDependency={dependency !== undefined}
        dependencySatisfied={dependency?.satisfied === true}
        providerRow={
          dependency?.providerIndex != null ? plan.rows[dependency.providerIndex].row : null
        }
        disabled={disabled}
        resultStatus={result?.status}
        resultMessage={result?.message}
        onToggleSelected={() => onToggleRow(index)}
        onToggleExpanded={() => onToggleExpanded(index)}
        onChange={(field, text) => onChange(index, field, text)}
        onPresenceChange={(field, present) => onPresenceChange(index, field, present)}
        onRevert={() => onRevert(index)}
      />
    );
  };

  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-2 sm:p-4">
      {/* Cambiar de filtro no puede ser silencioso para quien no ve la tabla. */}
      <p aria-live="polite" className="sr-only">
        Mostrando {rowCount(shownIndexes.length)} de {rowCount(plan.rows.length)}.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <caption className="sr-only">
            Filas del archivo y qué le pasaría a cada producto si se aplican
          </caption>
          <thead>
            <tr className="border-b border-amber-400/20">
              <th scope="col" className="pb-2.5 pl-1 pr-2 w-8">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={disabled || togglable.length === 0}
                  onChange={() => onSetAll(togglable, !allSelected)}
                  aria-label={
                    state.filter === "all"
                      ? "Seleccionar todas las filas visibles"
                      : "Seleccionar todas las filas visibles del filtro activo"
                  }
                  className="size-4 accent-amber-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                />
              </th>
              <th scope="col" className={`${TH} w-14`}>
                Fila
              </th>
              <th scope="col" className={TH}>
                Producto
              </th>
              <th scope="col" className={TH}>
                Qué pasará
              </th>
              <th scope="col" className={`${TH} text-right pr-2`}>
                Detalle
              </th>
            </tr>
          </thead>

          <tbody>{visibleIndexes.map(renderRow)}</tbody>

          {/* <details> no puede envolver un <tbody> sin romper la tabla, así que el grupo se
              hace con un botón + aria-expanded sobre las filas condicionales. El botón se
              renderiza en AMBOS estados: si solo existiera al estar colapsado, se desmontaría
              al abrirlo y ya no habría forma de volver a esconder el grupo. */}
          {unchangedGrouped.length > 0 && (
            <tbody>
              <tr>
                <td colSpan={COLUMN_COUNT} className="p-0">
                  <button
                    type="button"
                    onClick={onToggleUnchangedGroup}
                    aria-expanded={state.showUnchanged}
                    className="w-full flex items-center justify-between gap-4 px-3 py-3 text-left hover:bg-stone-800/40 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] tracking-[0.2em] uppercase text-amber-100/35">
                      {rowCount(unchangedGrouped.length)} sin cambios
                    </span>
                    <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-amber-100/25">
                      {state.showUnchanged ? "Ocultar" : "Mostrar"}
                      <ChevronDown
                        className={`size-4 transition-transform ${
                          state.showUnchanged ? "rotate-180" : ""
                        }`}
                        strokeWidth={1.5}
                      />
                    </span>
                  </button>
                </td>
              </tr>
              {state.showUnchanged && unchangedGrouped.map(renderRow)}
            </tbody>
          )}
        </table>
      </div>

      {visibleIndexes.length === 0 && unchangedGrouped.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-amber-100/30 text-sm">No hay filas con este filtro</p>
        </div>
      )}
    </div>
  );
}
