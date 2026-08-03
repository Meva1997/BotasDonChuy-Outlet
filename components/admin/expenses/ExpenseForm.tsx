"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_FREQUENCIES,
  type Expense,
} from "@/lib/api/adminExpenses";
import {
  emptyExpenseForm,
  expenseFormSchema,
  type ExpenseFormData,
} from "@/schemas/expenses";
import { formatPrice } from "@/lib/utils";
import { LABEL_BASE, inputCls, FieldError } from "../config/formUi";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_FREQUENCY_LABEL,
} from "./expenseStatus";

/**
 * Alta y edición de un gasto. **El monto solo se captura en el alta**: en la
 * edición vive en `ExpenseAmountForm`, porque en el backend cambiarlo agrega una
 * versión fechada en vez de sobrescribir. Ver el comentario de `schemas/expenses.ts`.
 */

/**
 * Gasto de la API → formulario (todo strings). Las fechas se siembran **tal cual**:
 * son días de calendario (`DATEONLY`), no instantes, así que no hay zona horaria
 * que corregir — a diferencia de los cupones, donde `storeDayISO` es obligatorio.
 */
function toFormData(expense: Expense): ExpenseFormData {
  return {
    concept: expense.concept,
    vendor: expense.vendor ?? "",
    category: expense.category,
    frequency: expense.frequency,
    startsAt: expense.startsAt,
    endsAt: expense.endsAt ?? "",
    active: expense.active,
    notes: expense.notes ?? "",
    amount: "",
    amountEffectiveFrom: "",
  };
}

interface ExpenseFormProps {
  /** Gasto a editar, o `null` para dar de alta uno nuevo. */
  editing: Expense | null;
  isSaving: boolean;
  errorMessage?: string | null;
  onSubmit: (data: ExpenseFormData) => void;
  onCancel: () => void;
}

export default function ExpenseForm({
  editing,
  isSaving,
  errorMessage,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema(!editing)),
    mode: "onBlur",
    defaultValues: editing ? toFormData(editing) : emptyExpenseForm,
  });

  // useWatch y no watch() por el mismo motivo que ProductForm y CouponForm:
  // `watch` devuelve una función que el React Compiler no puede memoizar y deja
  // de optimizar el componente entero.
  const frequency = useWatch({ control, name: "frequency" });
  const isOnce = frequency === "once";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-amber-50 text-xl">
          {editing ? `Editar ${editing.concept}` : "Nuevo gasto"}
        </h3>
        {editing && (
          <span className="text-amber-100/40 text-xs tabular-nums">
            {formatPrice(editing.currentAmount)} vigente
          </span>
        )}
      </div>

      {/* El campo de monto no está en este formulario cuando se edita. Decirlo
          explícitamente evita que el dueño lo busque y concluya que no se puede
          cambiar el precio. */}
      {editing && (
        <p className="text-[12px] leading-relaxed text-amber-100/45 border border-amber-400/15 bg-amber-400/5 px-3 py-2">
          El monto no se edita aquí: cambiarlo guarda un precio nuevo{" "}
          <strong className="text-amber-100/70 font-medium">
            a partir de una fecha
          </strong>{" "}
          y no reescribe lo que costaba antes. Usa{" "}
          <strong className="text-amber-100/70 font-medium">
            Cambiar precio
          </strong>{" "}
          en la tabla.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={LABEL_BASE} htmlFor="expense-form-concept">
            Concepto
          </label>
          <input
            id="expense-form-concept"
            type="text"
            placeholder="Render — Web Service"
            className={inputCls(!!errors.concept)}
            {...register("concept")}
          />
          <FieldError message={errors.concept?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="expense-form-vendor">
            Proveedor
          </label>
          <input
            id="expense-form-vendor"
            type="text"
            placeholder="Render"
            className={inputCls(!!errors.vendor)}
            {...register("vendor")}
          />
          <FieldError message={errors.vendor?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Opcional. A quién se le paga.
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="expense-form-category">
            Categoría
          </label>
          <select
            id="expense-form-category"
            className={`${inputCls(!!errors.category)} appearance-none cursor-pointer`}
            {...register("category")}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="expense-form-frequency">
            Frecuencia
          </label>
          <select
            id="expense-form-frequency"
            className={`${inputCls(!!errors.frequency)} appearance-none cursor-pointer`}
            {...register("frequency")}
          >
            {EXPENSE_FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {EXPENSE_FREQUENCY_LABEL[frequency]}
              </option>
            ))}
          </select>
          <FieldError message={errors.frequency?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            {isOnce
              ? "Se cobra una sola vez. No suma a la carga mensual, pero sí cuenta completo en su mes."
              : "Define cada cuándo se genera un cargo desde la fecha del primero."}
          </p>
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="expense-form-starts-at">
            {isOnce ? "Fecha del cargo" : "Primer cargo"}
          </label>
          <input
            id="expense-form-starts-at"
            type="date"
            className={`${inputCls(!!errors.startsAt)} scheme-dark`}
            {...register("startsAt")}
          />
          <FieldError message={errors.startsAt?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Puede ser pasada: si la suscripción arrancó en marzo, ponla en marzo
            y el historial la contará desde ahí.
          </p>
        </div>

        {/* Un `once` no lleva fecha de término (el backend lo rechaza con 400):
            se oculta en vez de deshabilitarlo para no dejar un control muerto. */}
        {!isOnce && (
          <div>
            <label className={LABEL_BASE} htmlFor="expense-form-ends-at">
              Fecha de término
            </label>
            <input
              id="expense-form-ends-at"
              type="date"
              className={`${inputCls(!!errors.endsAt)} scheme-dark`}
              {...register("endsAt")}
            />
            <FieldError message={errors.endsAt?.message} />
            <p className="mt-1.5 text-[11px] text-amber-100/30">
              {editing
                ? "Opcional. Vaciarla no la borra: el guardado conservaría la fecha actual."
                : "Opcional. Déjala vacía si no tiene fecha de fin."}
            </p>
          </div>
        )}

        {/* Solo en el alta: es la primera versión de monto. En la edición, este
            camino es ExpenseAmountForm. */}
        {!editing && (
          <>
            <div>
              <label className={LABEL_BASE} htmlFor="expense-form-amount">
                Monto
              </label>
              {/* type="text" + inputMode="decimal", nunca type="number": ése
                  devuelve "" ante basura, se traga la coma decimal y cambia el
                  valor al hacer scroll. */}
              <input
                id="expense-form-amount"
                type="text"
                inputMode="decimal"
                placeholder="340"
                className={inputCls(!!errors.amount)}
                {...register("amount")}
              />
              <FieldError message={errors.amount?.message} />
              <p className="mt-1.5 text-[11px] text-amber-100/30">
                En pesos. Si el proveedor cobra en dólares, captura lo que cobró
                la tarjeta.
              </p>
            </div>

            <div>
              <label
                className={LABEL_BASE}
                htmlFor="expense-form-amount-effective-from"
              >
                Ese monto rige desde
              </label>
              <input
                id="expense-form-amount-effective-from"
                type="date"
                className={`${inputCls(!!errors.amountEffectiveFrom)} scheme-dark`}
                {...register("amountEffectiveFrom")}
              />
              <FieldError message={errors.amountEffectiveFrom?.message} />
              <p className="mt-1.5 text-[11px] text-amber-100/30">
                Opcional. Vacío = la fecha del primer cargo, para que los meses
                anteriores no queden en cero.
              </p>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className={LABEL_BASE} htmlFor="expense-form-notes">
            Notas
          </label>
          <input
            id="expense-form-notes"
            type="text"
            placeholder="Plan Starter · se renueva solo"
            className={inputCls(!!errors.notes)}
            {...register("notes")}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500 cursor-pointer"
          {...register("active")}
        />
        <span className="text-xs leading-relaxed text-amber-100/60">
          Gasto activo
          <span className="block text-[11px] text-amber-100/30 mt-0.5">
            Al desactivarlo deja de generar cargos desde hoy. No se borra ni se
            toca el historial de lo que ya se pagó.
          </span>
        </span>
      </label>

      {errorMessage && (
        <p role="alert" className="text-[12px] text-red-400/90">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-amber-700/80 border border-amber-600/80 text-amber-50 uppercase tracking-[0.25em] text-[10px] px-8 py-3 hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Guardando…" : editing ? "Guardar cambios" : "Crear gasto"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
