"use client";

import type { ExpenseSummary } from "@/lib/api/adminExpenses";
import { formatPrice } from "@/lib/utils";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_FREQUENCY_LABEL,
  dayLabelShort,
} from "./expenseStatus";

interface ExpenseSummaryCardProps {
  summary: ExpenseSummary | undefined;
  isPending: boolean;
  isError: boolean;
}

/**
 * La respuesta a "¿cuánto tengo que apartar de lo que vendí?".
 *
 * Los dos números NO son el mismo y por eso se pintan separados: `monthlyRunRate`
 * es la **carga mensual normalizada** (una anualidad cuenta 1/12, una semanal
 * 52/12) y deja fuera los gastos de única vez; `upcomingTotal` es lo que de verdad
 * va a salir de la tarjeta en los próximos días, donde los `once` sí entran. Sumar
 * los dos sería contar dos veces.
 */
export default function ExpenseSummaryCard({
  summary,
  isPending,
  isError,
}: ExpenseSummaryCardProps) {
  if (isPending) {
    return (
      <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
        <p className="text-amber-100/40 text-sm">Calculando…</p>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
        <p role="alert" className="text-red-400/90 text-sm">
          No pudimos calcular el resumen de gastos.
        </p>
      </div>
    );
  }

  const topCategories = summary.byCategory
    .filter((row) => row.monthlyRunRate > 0)
    .slice(0, 4);
  const oneTimeCount =
    summary.byFrequency.find((row) => row.frequency === "once")?.count ?? 0;

  return (
    <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8">
        {/* ── Cuánto apartar ── */}
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
            Hay que apartar al mes
          </p>
          <p className="font-serif text-amber-50 text-4xl sm:text-5xl mt-2 tabular-nums">
            {formatPrice(summary.monthlyRunRate)}
          </p>
          <p className="text-amber-100/40 text-sm mt-2 tabular-nums">
            {formatPrice(summary.annualRunRate)} al año ·{" "}
            {summary.activeCount} gasto{summary.activeCount === 1 ? "" : "s"}{" "}
            activo{summary.activeCount === 1 ? "" : "s"}
          </p>
          {/* Sin esta línea, un gasto de única vez de $8,000 que no movió el
              número de arriba parece un error de suma. */}
          {oneTimeCount > 0 && (
            <p className="text-[11px] text-amber-100/30 mt-3 leading-relaxed max-w-xs">
              No incluye {oneTimeCount} gasto
              {oneTimeCount === 1 ? "" : "s"} de única vez: no son carga mensual,
              se cobran completos en su fecha.
            </p>
          )}

          {topCategories.length > 0 && (
            <ul className="mt-6 space-y-1.5">
              {topCategories.map((row) => (
                <li
                  key={row.category}
                  className="flex items-baseline justify-between gap-4 text-xs"
                >
                  <span className="text-amber-100/50">
                    {EXPENSE_CATEGORY_LABEL[row.category]}
                  </span>
                  <span className="text-amber-100/70 tabular-nums">
                    {formatPrice(row.monthlyRunRate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Próximos cargos ── */}
        <div className="lg:border-l lg:border-amber-400/10 lg:pl-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
              Próximos {summary.upcomingDays} días
            </p>
            <p className="text-amber-50 text-sm tabular-nums">
              {formatPrice(summary.upcomingTotal)}
            </p>
          </div>

          {summary.upcomingCharges.length === 0 ? (
            <p className="text-amber-100/35 text-sm mt-4">
              No hay cargos programados en la ventana.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
              {summary.upcomingCharges.map((charge, index) => (
                // Un mismo gasto puede cobrarse varias veces en la ventana (un
                // semanal cae ~8 veces en 60 días), así que el expenseId no es
                // clave única: va con la fecha.
                <li
                  key={`${charge.expenseId}-${charge.date}-${index}`}
                  className="flex items-baseline justify-between gap-3 text-xs border-b border-amber-400/5 pb-2 last:border-0"
                >
                  <span className="min-w-0">
                    <span className="text-amber-100/35 tabular-nums">
                      {dayLabelShort(charge.date)}
                    </span>
                    <span className="text-amber-100/70 ml-2 wrap-break-word">
                      {charge.concept}
                    </span>
                    <span className="block text-[10px] text-amber-100/25 mt-0.5">
                      {EXPENSE_FREQUENCY_LABEL[charge.frequency]}
                      {charge.vendor ? ` · ${charge.vendor}` : ""}
                    </span>
                  </span>
                  <span className="text-amber-100/70 tabular-nums shrink-0">
                    {formatPrice(charge.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
