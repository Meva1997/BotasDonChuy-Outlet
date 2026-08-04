"use client";

import { Pencil, RotateCcw, Tag, Trash2, XCircle } from "lucide-react";
import type { Expense } from "@/lib/api/adminExpenses";
import { formatPrice } from "@/lib/utils";
import ExpenseStateBadge from "./ExpenseStateBadge";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_FREQUENCY_LABEL,
  countsTowardRunRate,
  dayLabelShort,
  expenseState,
} from "./expenseStatus";

const th =
  "text-left text-[9px] uppercase tracking-[0.25em] text-amber-100/35 font-normal pb-3 px-3";
const td = "py-3.5 px-3 align-top text-sm text-amber-100/70";

interface ExpensesTableProps {
  expenses: Expense[];
  /** Id con la confirmación de borrado abierta, o null. */
  confirmingId: number | null;
  busyId: number | null;
  onEdit: (expense: Expense) => void;
  onChangeAmount: (expense: Expense) => void;
  onToggleActive: (expense: Expense) => void;
  onAskDelete: (id: number | null) => void;
  onConfirmDelete: (expense: Expense) => void;
}

/** Acciones de una fila, compartidas por la tabla y las tarjetas móviles. */
function RowActions({
  expense,
  confirmingId,
  busyId,
  onEdit,
  onChangeAmount,
  onToggleActive,
  onAskDelete,
  onConfirmDelete,
}: ExpensesTableProps & { expense: Expense }) {
  const isBusy = busyId === expense.id;

  if (confirmingId === expense.id) {
    return (
      <span className="flex items-center gap-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onConfirmDelete(expense)}
          className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer"
        >
          {isBusy ? "…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => onAskDelete(null)}
          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 cursor-pointer"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button
        type="button"
        onClick={() => onEdit(expense)}
        aria-label="Editar gasto"
        title="Editar"
        className="text-amber-100/40 hover:text-blue-400 transition-colors cursor-pointer"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      {/* Acción propia, y no un campo del formulario de edición: en el backend
          cambiar el monto AGREGA una versión fechada en vez de sobrescribir, así
          que repreciar no es lo mismo que corregir un typo en el concepto. */}
      <button
        type="button"
        onClick={() => onChangeAmount(expense)}
        aria-label="Cambiar el precio del gasto"
        title="Cambiar precio"
        className="text-amber-100/40 hover:text-amber-400 transition-colors cursor-pointer"
      >
        <Tag className="size-4" aria-hidden="true" />
      </button>
      {/* Dar de baja = PUT { active: false }. No borra: el histórico de los meses
          en que sí se pagó se conserva, y se puede reactivar. */}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => onToggleActive(expense)}
        aria-label={expense.active ? "Dar de baja el gasto" : "Reactivar el gasto"}
        title={expense.active ? "Dar de baja" : "Reactivar"}
        className="text-amber-100/40 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-50"
      >
        {expense.active ? (
          <XCircle className="size-4" aria-hidden="true" />
        ) : (
          <RotateCcw className="size-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onAskDelete(expense.id)}
        aria-label="Eliminar gasto"
        title="Eliminar"
        className="text-amber-100/40 hover:text-red-400 transition-colors cursor-pointer"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * La carga mensual de un gasto. Se pinta explícitamente como "—" cuando es 0 en
 * vez de "$0.00": un `once` de $8,000 con "$0.00" en esta columna se lee como un
 * gasto gratuito, no como uno que no es recurrente.
 */
function RunRateCell({ expense }: { expense: Expense }) {
  if (!countsTowardRunRate(expense)) {
    return (
      <span className="text-amber-100/30">
        —
        <span className="block text-[10px] mt-0.5">no es carga mensual</span>
      </span>
    );
  }
  return (
    <span className="tabular-nums">{formatPrice(expense.monthlyRunRate)}</span>
  );
}

/** Cuántas veces cambió de precio. Solo aparece si de verdad cambió alguna. */
function PriceHistoryHint({ expense }: { expense: Expense }) {
  const changes = expense.amounts.length - 1;
  if (changes < 1) return null;
  return (
    <span className="block text-[11px] text-amber-100/30 mt-1">
      {changes} cambio{changes === 1 ? "" : "s"} de precio
    </span>
  );
}

export default function ExpensesTable(props: ExpensesTableProps) {
  const { expenses } = props;

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Gastos y suscripciones</caption>
          <thead>
            <tr className="border-b border-amber-400/10">
              <th scope="col" className={th}>
                Concepto
              </th>
              <th scope="col" className={th}>
                Categoría
              </th>
              <th scope="col" className={th}>
                Frecuencia
              </th>
              <th scope="col" className={th}>
                Monto vigente
              </th>
              <th scope="col" className={th}>
                Carga mensual
              </th>
              <th scope="col" className={th}>
                Próximo cargo
              </th>
              <th scope="col" className={th}>
                Estado
              </th>
              <th scope="col" className={th}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-amber-400/10">
                <td className={td}>
                  <span className="text-amber-50 font-medium">
                    {expense.concept}
                  </span>
                  {expense.vendor && (
                    <span className="block text-[11px] text-amber-100/35 mt-1">
                      {expense.vendor}
                    </span>
                  )}
                  {expense.notes && (
                    <span className="block text-[11px] text-amber-100/30 mt-1 wrap-break-word max-w-xs">
                      {expense.notes}
                    </span>
                  )}
                </td>
                <td className={td}>
                  {EXPENSE_CATEGORY_LABEL[expense.category]}
                </td>
                <td className={td}>
                  {EXPENSE_FREQUENCY_LABEL[expense.frequency]}
                </td>
                <td className={td}>
                  <span className="tabular-nums text-amber-50">
                    {formatPrice(expense.currentAmount)}
                  </span>
                  <PriceHistoryHint expense={expense} />
                </td>
                <td className={td}>
                  <RunRateCell expense={expense} />
                </td>
                <td className={td}>
                  <span className="tabular-nums">
                    {dayLabelShort(expense.nextChargeDate)}
                  </span>
                </td>
                <td className={td}>
                  <ExpenseStateBadge state={expenseState(expense)} />
                </td>
                <td className={td}>
                  <RowActions {...props} expense={expense} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="lg:hidden space-y-3">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="border border-amber-400/10 bg-stone-900/60 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-amber-50 font-medium wrap-break-word">
                  {expense.concept}
                </p>
                <p className="text-amber-100/50 text-xs mt-1">
                  {EXPENSE_CATEGORY_LABEL[expense.category]} ·{" "}
                  {EXPENSE_FREQUENCY_LABEL[expense.frequency]}
                  {expense.vendor ? ` · ${expense.vendor}` : ""}
                </p>
              </div>
              <ExpenseStateBadge state={expenseState(expense)} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <dt className="text-amber-100/35">Monto vigente</dt>
                <dd className="text-amber-50 tabular-nums mt-0.5">
                  {formatPrice(expense.currentAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-amber-100/35">Carga mensual</dt>
                <dd className="text-amber-100/70 mt-0.5">
                  <RunRateCell expense={expense} />
                </dd>
              </div>
              <div>
                <dt className="text-amber-100/35">Próximo cargo</dt>
                <dd className="text-amber-100/70 tabular-nums mt-0.5">
                  {dayLabelShort(expense.nextChargeDate)}
                </dd>
              </div>
            </dl>

            <RowActions {...props} expense={expense} />
          </li>
        ))}
      </ul>
    </>
  );
}
