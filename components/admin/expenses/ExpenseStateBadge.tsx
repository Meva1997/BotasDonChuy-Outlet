import { EXPENSE_STATE_LABEL, type ExpenseState } from "./expenseStatus";

// "cobrado" comparte familia con "terminado" (los dos son pasado) pero no tono:
// un `once` ya pagado no es un error ni una baja, solo dejó de generar cargos.
const STATE_CLASS: Record<ExpenseState, string> = {
  activo: "border-emerald-400/40 text-emerald-300 bg-emerald-500/10",
  programado: "border-sky-400/40 text-sky-300 bg-sky-500/10",
  cobrado: "border-violet-400/40 text-violet-300 bg-violet-500/10",
  terminado: "border-stone-400/30 text-stone-300 bg-stone-500/10",
  inactivo: "border-red-400/40 text-red-300 bg-red-500/10",
};

export default function ExpenseStateBadge({ state }: { state: ExpenseState }) {
  return (
    <span
      className={`inline-flex items-center border uppercase tracking-[0.18em] text-[9px] px-2.5 py-1 leading-none ${STATE_CLASS[state]}`}
    >
      {EXPENSE_STATE_LABEL[state]}
    </span>
  );
}
