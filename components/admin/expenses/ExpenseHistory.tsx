"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminExpenseKeys, getExpenseHistory } from "@/lib/api/adminExpenses";
import { formatPrice } from "@/lib/utils";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_FREQUENCY_LABEL,
  dayLabel,
  monthLabelShort,
  priceChangeDelta,
  priceChangeLabel,
} from "./expenseStatus";

/**
 * Historial de gasto mes con mes. Dueño de su propia query para montarse **lazy**
 * al abrir la pestaña (precedente: `ReplenishmentReport`): mientras el dueño está
 * revisando la lista de gastos, este historial no se pide.
 *
 * Los totales y los desgloses vienen calculados del backend. Lo único que se deriva
 * aquí es el delta de cada cambio de precio, que el contrato deja explícitamente al
 * front (`priceChangeDelta`).
 */

function formatY(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export default function ExpenseHistory() {
  const {
    data: months,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: adminExpenseKeys.history(),
    queryFn: () => getExpenseHistory(),
    staleTime: 60 * 1000,
  });

  // El mes elegido no puede inicializarse desde datos async: se guarda como `null`
  // hasta que el usuario elige, y se cae al último mes mientras tanto (mismo
  // patrón que ReportesSection).
  const [selected, setSelected] = useState<string | null>(null);

  if (isPending) {
    return <p className="text-amber-100/40 text-sm py-4">Cargando historial…</p>;
  }

  if (isError) {
    return (
      <div className="space-y-4 py-4">
        <p role="alert" className="text-red-400/90 text-sm">
          No pudimos cargar el historial de gastos.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (months.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <p className="font-serif text-amber-50/80 text-lg">
          Todavía no hay historial
        </p>
        <p className="text-amber-100/40 text-sm">
          Da de alta un gasto y aquí vas a ver en qué se te fue cada mes.
        </p>
      </div>
    );
  }

  // Reconciliar el mes elegido contra los datos actuales: si un refetch cambia el
  // set de meses y el seleccionado ya no existe, caemos al último en vez de dejar
  // el detalle en blanco.
  const activeMonth =
    months.find((m) => m.isoMonth === selected) ?? months[months.length - 1];

  const chartData = months.map((month) => ({
    isoMonth: month.isoMonth,
    label: monthLabelShort(month.isoMonth),
    total: month.total,
    partial: month.partial,
  }));

  return (
    <div className="space-y-8">
      {/* ── Gráfica ── */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h3 className="font-serif text-amber-50 text-xl">Gasto por mes</h3>
          <p className="text-[11px] text-amber-100/30">
            Toca una barra para ver el detalle de ese mes
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#44403c" strokeOpacity={0.3} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{
                fill: "#a8967a",
                fontSize: 11,
                fontFamily: "var(--font-jost)",
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatY}
              tick={{
                fill: "#a8967a",
                fontSize: 11,
                fontFamily: "var(--font-jost)",
              }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: "#1c1917",
                border: "1px solid rgba(180,83,9,0.3)",
                borderRadius: 6,
                color: "#fef9ef",
                fontFamily: "var(--font-jost)",
                fontSize: 12,
              }}
              formatter={(value) => [formatPrice(Number(value)), "Gasto"]}
              labelStyle={{ color: "#a8967a", marginBottom: 4 }}
              cursor={{ fill: "#b45309", fillOpacity: 0.08 }}
            />
            <Bar
              dataKey="total"
              fill="#d97706"
              radius={[2, 2, 0, 0]}
              // Por índice y no por el payload de la barra: recharts tipa ese
              // argumento como su propio `BarRectangleItem` (geometría del rect),
              // no como la fila de datos, así que leer `isoMonth` de ahí sería
              // apostarle a un campo que el tipo no promete.
              onClick={(_, index) => setSelected(chartData[index].isoMonth)}
              className="cursor-pointer"
            >
              {chartData.map((point) => (
                // El mes en curso va translúcido: pintarlo lleno lo haría leer
                // como un mes cerrado y parecería una caída del gasto.
                <Cell
                  key={point.isoMonth}
                  fillOpacity={
                    point.partial
                      ? 0.35
                      : point.isoMonth === activeMonth.isoMonth
                        ? 1
                        : 0.7
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Selector de mes ── */}
      <div className="flex gap-1 flex-wrap">
        {months.map((month) => (
          <button
            key={month.isoMonth}
            type="button"
            onClick={() => setSelected(month.isoMonth)}
            className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-sans rounded border transition-colors cursor-pointer ${
              activeMonth.isoMonth === month.isoMonth
                ? "border-amber-400 text-amber-400 bg-amber-400/10"
                : "border-amber-400/20 text-amber-100/35 hover:border-amber-400/50 hover:text-amber-100/60"
            }`}
          >
            {month.label}
            {month.partial && (
              <span className="ml-1 text-amber-100/25 normal-case tracking-normal">
                *
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Detalle del mes ── */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-serif text-amber-50 text-xl">
            {activeMonth.label}
          </h3>
          <p className="text-amber-50 text-lg tabular-nums">
            {formatPrice(activeMonth.total)}
          </p>
        </div>

        {activeMonth.partial && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded border border-amber-400/15 bg-amber-400/5">
            <span className="text-amber-400/60 text-[10px]">*</span>
            <p className="text-[10px] tracking-widest text-amber-100/40 font-sans">
              {activeMonth.label} es un mes en curso — el total todavía va a subir.
            </p>
          </div>
        )}

        {/* Los cambios de precio van PRIMERO: son la respuesta a "¿por qué este
            mes salió más caro?", que es la pregunta que trae al dueño aquí. */}
        {activeMonth.changes.length > 0 && (
          <div className="border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-amber-400/70 mb-3">
              Cambios de precio este mes
            </p>
            <ul className="space-y-2.5">
              {activeMonth.changes.map((change) => {
                const { direction } = priceChangeDelta(
                  change.previousAmount,
                  change.amount
                );
                return (
                  <li
                    key={`${change.expenseId}-${change.effectiveFrom}`}
                    className="text-xs"
                  >
                    <span className="text-amber-50">{change.concept}</span>
                    <span className="text-amber-100/50 tabular-nums">
                      : {formatPrice(change.previousAmount)} →{" "}
                      {formatPrice(change.amount)}
                    </span>
                    <span
                      className={`ml-2 tabular-nums ${
                        direction === "up"
                          ? "text-red-400/80"
                          : direction === "down"
                            ? "text-emerald-400/80"
                            : "text-amber-100/40"
                      }`}
                    >
                      {priceChangeLabel(change.previousAmount, change.amount)}
                    </span>
                    <span className="block text-[11px] text-amber-100/30 mt-0.5">
                      Desde {dayLabel(change.effectiveFrom)}
                      {change.note ? ` · ${change.note}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-8">
          {/* Por categoría */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/35 mb-3">
              Por categoría
            </p>
            {activeMonth.byCategory.length === 0 ? (
              <p className="text-amber-100/30 text-sm">Sin gastos este mes.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeMonth.byCategory.map((row) => (
                  <li
                    key={row.category}
                    className="flex items-baseline justify-between gap-4 text-xs"
                  >
                    <span className="text-amber-100/50">
                      {EXPENSE_CATEGORY_LABEL[row.category]}
                    </span>
                    <span className="text-amber-100/70 tabular-nums">
                      {formatPrice(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Por gasto */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/35 mb-3">
              Por gasto
            </p>
            {activeMonth.byExpense.length === 0 ? (
              <p className="text-amber-100/30 text-sm">Sin gastos este mes.</p>
            ) : (
              <ul className="space-y-2">
                {activeMonth.byExpense.map((row) => (
                  <li
                    key={row.expenseId}
                    className="flex items-baseline justify-between gap-4 text-xs border-b border-amber-400/5 pb-2 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="text-amber-100/70 wrap-break-word">
                        {row.concept}
                      </span>
                      <span className="block text-[11px] text-amber-100/30 mt-0.5">
                        {EXPENSE_CATEGORY_LABEL[row.category]} ·{" "}
                        {EXPENSE_FREQUENCY_LABEL[row.frequency]}
                        {/* Solo un semanal cae más de una vez en un mes; decirlo
                            explica un total que si no parece mal calculado. */}
                        {row.occurrences > 1
                          ? ` · ${row.occurrences} cargos`
                          : ""}
                      </span>
                    </span>
                    <span className="text-amber-100/70 tabular-nums shrink-0">
                      {formatPrice(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
