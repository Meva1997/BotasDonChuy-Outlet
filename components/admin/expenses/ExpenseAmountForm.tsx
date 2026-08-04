"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Expense } from "@/lib/api/adminExpenses";
import {
  amountChangeFormSchema,
  type AmountChangeFormData,
} from "@/schemas/expenses";
import { formatPrice } from "@/lib/utils";
import { LABEL_BASE, inputCls, FieldError } from "../config/formUi";
import { dayLabel, priceChangeLabel, todayISO } from "./expenseStatus";

/**
 * Cambio de precio de un gasto — **una operación distinta de editarlo**, y por eso
 * un formulario aparte.
 *
 * En el backend el monto no es una columna del gasto: es una versión fechada en
 * `expense_amounts`. Guardar $340 con vigencia del 1 de agosto no reescribe lo que
 * costaba en julio, y eso es justo lo que hace que el historial siga siendo cierto
 * después de un aumento. Un campo "monto" dentro del formulario de edición
 * escondería esa diferencia y haría que corregir un typo repreciara el gasto.
 */

interface ExpenseAmountFormProps {
  expense: Expense;
  isSaving: boolean;
  errorMessage?: string | null;
  onSubmit: (data: AmountChangeFormData) => void;
  onCancel: () => void;
}

export default function ExpenseAmountForm({
  expense,
  isSaving,
  errorMessage,
  onSubmit,
  onCancel,
}: ExpenseAmountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AmountChangeFormData>({
    resolver: zodResolver(amountChangeFormSchema),
    mode: "onBlur",
    defaultValues: {
      amount: "",
      // Hoy es el default del backend cuando la clave no viaja; sembrarlo lo hace
      // visible y corregible en vez de implícito.
      effectiveFrom: todayISO(),
      note: "",
    },
  });

  // Del más nuevo al más viejo: lo que el dueño quiere ver primero es contra qué
  // está cambiando, no cómo empezó.
  const versions = [...expense.amounts].reverse();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8 space-y-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-serif text-amber-50 text-xl">
          Cambiar precio · {expense.concept}
        </h3>
        <span className="text-amber-100/40 text-xs tabular-nums">
          Hoy cuesta {formatPrice(expense.currentAmount)}
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-amber-100/45 border border-amber-400/15 bg-amber-400/5 px-3 py-2">
        Esto guarda un precio nuevo{" "}
        <strong className="text-amber-100/70 font-medium">
          a partir de la fecha que elijas
        </strong>
        : los meses anteriores conservan lo que costaba entonces y el historial no
        cambia. Si ya habías registrado un precio con esa misma fecha, se corrige
        ése en vez de agregar otro.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_BASE} htmlFor="expense-amount-value">
            Monto nuevo
          </label>
          {/* type="text" + inputMode="decimal", nunca type="number": ése devuelve
              "" ante basura, se traga la coma decimal y cambia el valor al hacer
              scroll. */}
          <input
            id="expense-amount-value"
            type="text"
            inputMode="decimal"
            placeholder={String(expense.currentAmount)}
            className={inputCls(!!errors.amount)}
            {...register("amount")}
          />
          <FieldError message={errors.amount?.message} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="expense-amount-effective-from">
            Aplica desde
          </label>
          <input
            id="expense-amount-effective-from"
            type="date"
            className={`${inputCls(!!errors.effectiveFrom)} scheme-dark`}
            {...register("effectiveFrom")}
          />
          <FieldError message={errors.effectiveFrom?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            La fecha del cargo en que empezó a costar esto, no la de hoy si el
            aumento fue antes.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL_BASE} htmlFor="expense-amount-note">
            Motivo
          </label>
          <input
            id="expense-amount-note"
            type="text"
            placeholder="Subió el dólar"
            className={inputCls(!!errors.note)}
            {...register("note")}
          />
          <FieldError message={errors.note?.message} />
          <p className="mt-1.5 text-[11px] text-amber-100/30">
            Opcional, pero es lo único que va a explicar el aumento cuando lo veas
            en el historial dentro de seis meses.
          </p>
        </div>
      </div>

      {/* El historial de precios de ESTE gasto. Sin él, el dueño cambia el monto
          sin saber cuántas veces ya lo hizo ni desde cuándo rige el actual. */}
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/35 mb-2">
          Precios registrados
        </p>
        <ul className="space-y-1.5">
          {versions.map((version, index) => {
            // `versions` está invertido, así que el anterior cronológico es el
            // siguiente del arreglo.
            const previous = versions[index + 1];
            return (
              <li
                key={version.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-xs border-b border-amber-400/5 pb-1.5 last:border-0"
              >
                <span className="text-amber-100/50">
                  Desde {dayLabel(version.effectiveFrom)}
                  {version.note && (
                    <span className="text-amber-100/30"> · {version.note}</span>
                  )}
                </span>
                <span className="text-amber-100/70 tabular-nums">
                  {formatPrice(version.amount)}
                  {previous && (
                    <span
                      className={
                        version.amount > previous.amount
                          ? "ml-2 text-red-400/70"
                          : "ml-2 text-emerald-400/70"
                      }
                    >
                      {priceChangeLabel(previous.amount, version.amount)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

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
          {isSaving ? "Guardando…" : "Guardar precio nuevo"}
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
