"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminExpenseKeys,
  createExpense,
  deleteExpense,
  expenseWriteErrorMessage,
  getAdminExpenses,
  getExpenseSummary,
  updateExpense,
  type Expense,
} from "@/lib/api/adminExpenses";
import { dashboardKeys } from "@/lib/api/dashboard";
import {
  amountChangeFromForm,
  expenseInputFromForm,
  expenseUpdateFromForm,
  type AmountChangeFormData,
  type ExpenseFormData,
} from "@/schemas/expenses";
import ExpenseAmountForm from "../expenses/ExpenseAmountForm";
import ExpenseForm from "../expenses/ExpenseForm";
import ExpenseHistory from "../expenses/ExpenseHistory";
import ExpenseSummaryCard from "../expenses/ExpenseSummaryCard";
import ExpensesTable from "../expenses/ExpensesTable";

type Tab = "gastos" | "historial";

const TABS: { id: Tab; label: string }[] = [
  { id: "gastos", label: "Gastos" },
  { id: "historial", label: "Historial" },
];

/**
 * Sección "Gastos" del panel (Fase 20) — dueña de todo el estado y de las
 * mutations; la tabla y los formularios son presentacionales y prop-driven, igual
 * que en `CouponsSection`.
 *
 * Los dos formularios son excluyentes y NO son el mismo: editar corrige los datos
 * del gasto, cambiar el precio agrega una versión fechada del monto. Ver
 * `ExpenseAmountForm`.
 */
export default function ExpensesSection() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("gastos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  /** Gasto con el formulario de cambio de precio abierto, o null. */
  const [repricing, setRepricing] = useState<Expense | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    data: expenses,
    isPending,
    isError,
  } = useQuery({
    queryKey: adminExpenseKeys.list(),
    queryFn: () => getAdminExpenses(),
    staleTime: 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: adminExpenseKeys.summary(),
    queryFn: getExpenseSummary,
    staleTime: 60 * 1000,
  });

  /**
   * A diferencia de un cupón, un gasto **sí mueve el dashboard**: el KPI `GASTOS`
   * y la `GANANCIA OPERATIVA` salen del mismo servicio que alimenta esta pantalla.
   * Sin invalidar `dashboardKeys`, la pestaña Datos seguiría mostrando el número
   * viejo — justo la incoherencia que esta fase vino a cerrar.
   */
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: adminExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const closeForms = () => {
    setFormOpen(false);
    setEditing(null);
    setRepricing(null);
  };

  const saveMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      editing
        ? updateExpense(editing.id, expenseUpdateFromForm(data))
        : createExpense(expenseInputFromForm(data)),
    onSuccess: (expense) => {
      setNotice(
        editing
          ? `Gasto "${expense.concept}" actualizado.`
          : `Gasto "${expense.concept}" dado de alta.`
      );
      closeForms();
      refreshAll();
    },
  });

  const amountMutation = useMutation({
    mutationFn: (data: AmountChangeFormData) =>
      updateExpense(repricing!.id, amountChangeFromForm(data)),
    onSuccess: (expense) => {
      // El backend no escribe nada si el monto vigente en esa fecha ya era el
      // mismo, así que el aviso se redacta sobre lo que quedó, no sobre lo que se
      // intentó: decir "precio actualizado" tras un no-op sería mentir.
      setNotice(
        `"${expense.concept}" quedó en $${expense.currentAmount.toLocaleString(
          "es-MX",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} vigente hoy. Los meses anteriores conservan lo que costaba entonces.`
      );
      closeForms();
      refreshAll();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (expense: Expense) =>
      updateExpense(expense.id, { active: !expense.active }),
    onSuccess: (expense) => {
      setNotice(
        expense.active
          ? `Gasto "${expense.concept}" reactivado.`
          : `Gasto "${expense.concept}" dado de baja: deja de generar cargos desde hoy.`
      );
      refreshAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (expense: Expense) => deleteExpense(expense.id),
    onSuccess: (result, expense) => {
      setNotice(
        result.deactivated
          ? `"${expense.concept}" no se pudo borrar porque ya generó cargos: se dio de baja para no romper el historial de los meses cerrados.`
          : `Gasto "${expense.concept}" eliminado.`
      );
      setConfirmingId(null);
      if (editing?.id === expense.id || repricing?.id === expense.id)
        closeForms();
      refreshAll();
    },
  });

  const busyId = toggleMutation.isPending
    ? (toggleMutation.variables?.id ?? null)
    : deleteMutation.isPending
      ? (deleteMutation.variables?.id ?? null)
      : null;

  const rowError =
    (toggleMutation.isError && expenseWriteErrorMessage(toggleMutation.error)) ||
    (deleteMutation.isError && expenseWriteErrorMessage(deleteMutation.error)) ||
    null;

  const openCreate = () => {
    setEditing(null);
    setRepricing(null);
    setNotice(null);
    saveMutation.reset();
    setFormOpen(true);
  };

  return (
    <div className="max-w-6xl">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h2 className="font-serif text-amber-50 text-2xl sm:text-3xl tracking-wide">
          Gastos
        </h2>
        {!formOpen && !repricing && (
          <button
            type="button"
            onClick={openCreate}
            className="border border-amber-400 text-amber-400 uppercase tracking-[0.25em] text-[10px] px-6 py-3 hover:bg-amber-400/10 active:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer"
          >
            Nuevo gasto
          </button>
        )}
      </div>
      <p className="text-amber-100/40 text-sm mb-8 max-w-2xl leading-relaxed">
        Lo que cuesta tener la tienda abierta: hosting, dominio, la base de datos,
        la renta, la paquetería. De aquí sale cuánto hay que apartar de cada venta
        — y es lo que el panel resta para calcular la ganancia real.
      </p>

      {notice && (
        <p
          role="status"
          className="mb-6 text-[12px] leading-relaxed text-amber-300/80 border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          {notice}
        </p>
      )}

      <div className="mb-8">
        <ExpenseSummaryCard
          summary={summaryQuery.data}
          isPending={summaryQuery.isPending}
          isError={summaryQuery.isError}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-amber-400/15 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-[10px] tracking-[0.25em] uppercase font-sans border-b-2 transition-colors cursor-pointer -mb-px ${
              tab === t.id
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-amber-100/35 hover:text-amber-100/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gastos" && (
        <>
          {formOpen && (
            <div className="mb-8">
              <ExpenseForm
                // Remontar el formulario al cambiar de gasto: sin la key, los
                // defaultValues del anterior se quedarían pegados.
                key={editing?.id ?? "nuevo"}
                editing={editing}
                isSaving={saveMutation.isPending}
                errorMessage={
                  saveMutation.isError
                    ? expenseWriteErrorMessage(saveMutation.error)
                    : null
                }
                onSubmit={(data) => saveMutation.mutate(data)}
                onCancel={closeForms}
              />
            </div>
          )}

          {repricing && (
            <div className="mb-8">
              <ExpenseAmountForm
                key={`precio-${repricing.id}`}
                expense={repricing}
                isSaving={amountMutation.isPending}
                errorMessage={
                  amountMutation.isError
                    ? expenseWriteErrorMessage(amountMutation.error)
                    : null
                }
                onSubmit={(data) => amountMutation.mutate(data)}
                onCancel={closeForms}
              />
            </div>
          )}

          <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
            {isPending && (
              <p className="text-amber-100/40 text-sm py-4">Cargando…</p>
            )}
            {isError && (
              <p role="alert" className="text-red-400/90 text-sm py-4">
                No pudimos cargar los gastos.
              </p>
            )}

            {expenses && expenses.length === 0 && (
              <div className="py-10 text-center space-y-2">
                <p className="font-serif text-amber-50/80 text-lg">
                  Todavía no hay gastos
                </p>
                <p className="text-amber-100/40 text-sm">
                  Da de alta lo que ya pagas cada mes para que la ganancia del
                  panel deje de ser una estimación.
                </p>
              </div>
            )}

            {expenses && expenses.length > 0 && (
              <ExpensesTable
                expenses={expenses}
                confirmingId={confirmingId}
                busyId={busyId}
                onEdit={(expense) => {
                  setEditing(expense);
                  setRepricing(null);
                  setNotice(null);
                  saveMutation.reset();
                  setFormOpen(true);
                }}
                onChangeAmount={(expense) => {
                  setFormOpen(false);
                  setEditing(null);
                  setNotice(null);
                  amountMutation.reset();
                  setRepricing(expense);
                }}
                onToggleActive={(expense) => {
                  setNotice(null);
                  toggleMutation.mutate(expense);
                }}
                onAskDelete={(id) => {
                  deleteMutation.reset();
                  setConfirmingId(id);
                }}
                onConfirmDelete={(expense) => deleteMutation.mutate(expense)}
              />
            )}

            {rowError && (
              <p role="alert" className="mt-4 text-[12px] text-red-400/90">
                {rowError}
              </p>
            )}
          </div>
        </>
      )}

      {tab === "historial" && (
        <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
          <ExpenseHistory />
        </div>
      )}
    </div>
  );
}
