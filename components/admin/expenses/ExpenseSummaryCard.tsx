"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ExpenseSummary } from "@/lib/api/adminExpenses";
import { formatPrice } from "@/lib/utils";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_FREQUENCY_LABEL,
  dayLabelShort,
  groupUpcomingChargesByDate,
  upcomingWindowRangeLabel,
} from "./expenseStatus";

interface ExpenseSummaryCardProps {
  summary: ExpenseSummary | undefined;
  isPending: boolean;
  isError: boolean;
}

/** Cuántas fechas se muestran antes de ofrecer "ver más" — evita repetir el scrollbar
 *  interno que esta tarjeta tenía antes: en vez de recortar la altura de la caja, se
 *  recorta la lista misma y se ofrece expandirla completa. */
const DEFAULT_VISIBLE_GROUPS = 5;

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
  const [expanded, setExpanded] = useState(false);

  if (isPending) {
    return (
      <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
        <p className="text-amber-100/40 text-base">Calculando…</p>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
        <p role="alert" className="text-red-400/90 text-base">
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

  const groups = groupUpcomingChargesByDate(summary.upcomingCharges);
  const visibleGroups = expanded ? groups : groups.slice(0, DEFAULT_VISIBLE_GROUPS);
  const hasMoreGroups = groups.length > DEFAULT_VISIBLE_GROUPS;
  const hiddenChargeCount = groups
    .slice(DEFAULT_VISIBLE_GROUPS)
    .reduce((acc, group) => acc + group.charges.length, 0);

  return (
    <div className="bg-stone-900 border border-amber-400/10 p-5 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8">
        {/* ── Cuánto apartar ── */}
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-amber-100/40">
            Hay que apartar al mes
          </p>
          <p className="font-serif text-amber-50 text-4xl sm:text-5xl mt-2 tabular-nums">
            {formatPrice(summary.monthlyRunRate)}
          </p>
          <p className="text-amber-100/50 text-sm mt-2 tabular-nums">
            {formatPrice(summary.annualRunRate)} al año ·{" "}
            {summary.activeCount} gasto{summary.activeCount === 1 ? "" : "s"}{" "}
            activo{summary.activeCount === 1 ? "" : "s"}
          </p>
          {/* Sin esta línea, un gasto de única vez de $8,000 que no movió el
              número de arriba parece un error de suma. */}
          {oneTimeCount > 0 && (
            <p className="text-xs text-amber-100/40 mt-3 leading-relaxed max-w-xs">
              No incluye {oneTimeCount} gasto
              {oneTimeCount === 1 ? "" : "s"} de única vez: no son carga mensual,
              se cobran completos en su fecha.
            </p>
          )}

          {topCategories.length > 0 && (
            <ul className="mt-6 space-y-2">
              {topCategories.map((row) => (
                <li
                  key={row.category}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-amber-100/60">
                    {EXPENSE_CATEGORY_LABEL[row.category]}
                  </span>
                  <span className="text-amber-100/80 tabular-nums">
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
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-amber-100/40">
                Próximos cargos
              </p>
              {/* "Próximos 30 días" por sí solo no dice qué fechas cubre — y sin
                  eso, un gasto mensual con dos fechas de cobro dentro de la
                  ventana se lee como el mismo cargo repetido en vez de dos
                  cargos reales distintos. */}
              <p className="text-amber-100/40 text-xs mt-0.5">
                {upcomingWindowRangeLabel(summary.upcomingDays)} · próximos{" "}
                {summary.upcomingDays} días
              </p>
            </div>
            <p className="text-amber-50 text-base tabular-nums">
              {formatPrice(summary.upcomingTotal)}
            </p>
          </div>

          {groups.length === 0 ? (
            <p className="text-amber-100/45 text-sm mt-4">
              No hay cargos programados en la ventana.
            </p>
          ) : (
            <>
              {/* Timeline: un punto + fecha por día, con los cargos de ese día
                  debajo. Reemplaza la lista plana "una fila por cargo" (que con
                  varias suscripciones el mismo día repetía la fecha línea tras
                  línea) y la caja con scroll interno que tenía antes — la lista
                  ahora se recorta de verdad (ver `DEFAULT_VISIBLE_GROUPS`) en vez
                  de esconderse detrás de una barra de scroll. */}
              <ol className="mt-5">
                {visibleGroups.map((group, index) => (
                  <li key={group.date} className="relative pl-6 pb-5 last:pb-0">
                    {index < visibleGroups.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1.25 top-3 bottom-0 w-px bg-amber-400/10"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 h-2.75 w-2.75 rounded-full border-2 border-amber-400/70 bg-stone-900"
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-amber-50 text-sm font-medium tabular-nums">
                        {dayLabelShort(group.date)}
                      </span>
                      <span className="text-amber-100/70 text-sm tabular-nums shrink-0">
                        {formatPrice(group.total)}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-1.5">
                      {group.charges.map((charge) => (
                        <li
                          key={`${charge.expenseId}-${charge.date}`}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 text-amber-100/60 wrap-break-word">
                            {charge.concept}
                            <span className="text-amber-100/35 text-xs">
                              {" "}
                              · {EXPENSE_FREQUENCY_LABEL[charge.frequency]}
                              {charge.vendor ? ` · ${charge.vendor}` : ""}
                            </span>
                          </span>
                          {/* Con un solo cargo el total del día ya ES este monto —
                              repetirlo sería la misma cifra dos veces. */}
                          {group.charges.length > 1 && (
                            <span className="text-amber-100/50 tabular-nums shrink-0">
                              {formatPrice(charge.amount)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>

              {hasMoreGroups && (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  aria-expanded={expanded}
                  className="w-full flex items-center justify-between gap-4 px-3 py-2.5 border-t border-amber-400/10 text-left hover:bg-stone-800/40 transition-colors cursor-pointer"
                >
                  <span className="text-xs text-amber-100/45">
                    {expanded
                      ? "Mostrar menos"
                      : `Ver ${hiddenChargeCount} cargo${hiddenChargeCount === 1 ? "" : "s"} más`}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-amber-100/35">
                    {expanded ? "Ocultar" : "Mostrar"}
                    <ChevronDown
                      className={`size-4 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                      strokeWidth={1.5}
                    />
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
