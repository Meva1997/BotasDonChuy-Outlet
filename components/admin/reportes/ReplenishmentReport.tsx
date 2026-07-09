"use client";

import { useQuery } from "@tanstack/react-query";
import { MonthlyReport, ReplenishmentRow } from "@/components/admin/data/types";
import { reportKeys, getReplenishmentReport } from "@/lib/api/reports";
import { categorySingular } from "@/lib/categories";

const PRIORITY_STYLES = {
  urgente: {
    dot: "bg-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-400/25",
    label: "Urgente",
  },
  pronto: {
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-400/25",
    label: "Pronto",
  },
  ok: {
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-400/25",
    label: "OK",
  },
};

const METHOD_STYLES = {
  "promedio-simple": {
    label: "Nivel 1 · Promedio simple",
    detail: "1-2 meses de datos · confianza baja",
    color: "text-red-400/70 border-red-400/20 bg-red-500/5",
  },
  "tendencia": {
    label: "Nivel 2 · Prom. ponderado + tendencia",
    detail: "3 meses de datos · confianza media",
    color: "text-amber-400/80 border-amber-400/20 bg-amber-500/5",
  },
  "suavizacion-exponencial": {
    label: "Nivel 3 · Suavización exponencial",
    detail: "4+ meses de datos · confianza alta",
    color: "text-emerald-400/80 border-emerald-400/20 bg-emerald-500/5",
  },
};

const TREND_ICON: Record<string, { icon: string; color: string }> = {
  creciendo: { icon: "↑", color: "text-emerald-400" },
  estable:   { icon: "→", color: "text-amber-100/40" },
  bajando:   { icon: "↓", color: "text-red-400" },
};


function coverageColor(days: number) {
  if (days < 15) return "text-red-400";
  if (days < 45) return "text-amber-400";
  return "text-emerald-400";
}

function fmtMXN(n: number) {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Escapa un valor para CSV: si contiene coma, comilla o salto de línea,
// lo envuelve en comillas y duplica las comillas internas (RFC 4180).
function csvField(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(rows: ReplenishmentRow[]) {
  const headers = [
    "Producto",
    "Tipo",
    "Stock Actual",
    "Forecast Próx. Mes (uds)",
    "Tendencia",
    "Método",
    "Días Cobertura",
    "Ingreso Mensual (MXN)",
    "Margen Mensual (MXN)",
    "Prioridad",
    "Sugerido Comprar",
    "Costo Est. Pedido (MXN)",
  ];
  const data = rows.map((r) => [
    r.name,
    categorySingular(r.type),
    r.currentStock,
    r.forecastNextMonth,
    r.trend,
    r.forecastMethodLabel,
    r.diasCobertura === 999 ? "sin ventas" : r.diasCobertura,
    r.ingresoMensual,
    r.margenMensual,
    r.priority,
    r.suggestedOrder,
    r.costoEstimadoPedido,
  ]);
  const csv = [headers, ...data]
    .map((row) => row.map(csvField).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reposicion-${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  reports: MonthlyReport[];
}

export default function ReplenishmentReport({ reports }: Props) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: reportKeys.replenishment(),
    queryFn: getReplenishmentReport,
  });

  if (isPending) {
    return (
      <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
        Cargando reposición…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md space-y-4">
        <p className="text-red-400/90 text-sm border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
          No pudimos cargar la reposición. Revisa tu conexión e inténtalo de nuevo.
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

  const rows = data;
  const urgentes = rows.filter((r) => r.priority === "urgente").length;
  const totalCosto = rows.reduce((s, r) => s + r.costoEstimadoPedido, 0);

  // El método activo viene del primer producto (todos usan el mismo historial de meses)
  const activeMethod = rows[0]?.forecastMethod ?? "promedio-simple";
  const methodStyle = METHOD_STYLES[activeMethod];
  const fullMonths = reports.filter((r) => !r.partial);
  const fullMonthsCount = fullMonths.length;
  const historialRange =
    fullMonthsCount > 0
      ? `${fullMonths[0].label} – ${fullMonths[fullMonthsCount - 1].label}`
      : "sin historial";

  return (
    <div className="flex flex-col gap-5">
      {/* Banner: método activo */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded border ${methodStyle.color}`}>
        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-70" />
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase font-sans font-medium">
            {methodStyle.label}
          </p>
          <p className="text-[10px] font-sans mt-0.5 opacity-70">
            {fullMonthsCount} mes{fullMonthsCount !== 1 ? "es" : ""} de historial completo · {methodStyle.detail}
          </p>
        </div>
      </div>

      {/* Encabezado con export */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40 font-sans mb-1">
            Forecast basado en historial · {historialRange}
          </p>
          <p className="text-[11px] text-amber-100/30 font-sans">
            Objetivo: mantener 60 días de cobertura · el algoritmo mejora con más meses
          </p>
        </div>
        <button
          onClick={() => exportCSV(rows)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-400/25 text-amber-400/70 hover:border-amber-400/60 hover:text-amber-400 transition-colors text-[10px] tracking-[0.2em] uppercase font-sans cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-red-400/60 font-sans mb-1">
            Cobertura crítica
          </p>
          <p className="font-serif text-3xl text-red-400">{urgentes}</p>
          <p className="text-[10px] text-red-400/50 font-sans mt-0.5">
            producto{urgentes !== 1 ? "s" : ""} · menos de 15 días
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1">
            Inversión sugerida
          </p>
          <p className="font-serif text-3xl text-amber-50">
            {fmtMXN(totalCosto)}
          </p>
          <p className="text-[10px] text-amber-100/30 font-sans mt-0.5">
            costo total de reposición
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-400/10">
          <h3 className="font-serif text-lg text-amber-50">Pedido sugerido</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans min-w-[760px]">
            <thead>
              <tr className="border-b border-amber-400/10">
                <th className="text-left px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Producto
                </th>
                <th className="text-right px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Forecast / mes
                </th>
                <th className="text-right px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Stock
                </th>
                <th className="text-right px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Cobertura
                </th>
                <th className="text-right px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Margen / mes
                </th>
                <th className="text-center px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Prioridad
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Comprar
                </th>
                <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">
                  Costo est.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const p = PRIORITY_STYLES[row.priority];
                const t = TREND_ICON[row.trend] ?? TREND_ICON.estable;
                return (
                  <tr
                    key={row.productId}
                    className="border-b border-amber-400/5 hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                        <div>
                          <p className="text-amber-50/90 text-[13px] leading-snug">
                            {row.name}
                          </p>
                          <p className="text-[9px] tracking-[0.15em] uppercase text-amber-100/30 mt-0.5">
                            {categorySingular(row.type)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-sm font-medium ${t.color}`}>{t.icon}</span>
                        <span className="font-mono text-amber-100/70 text-[13px]">
                          {row.forecastNextMonth}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-100/60 text-[13px]">
                      {row.currentStock}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-[13px] font-medium ${coverageColor(row.diasCobertura)}`}>
                        {row.diasCobertura === 999 ? "—" : `${row.diasCobertura}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-100/60 text-[13px]">
                      {row.margenMensual > 0 ? fmtMXN(row.margenMensual) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block text-[9px] tracking-[0.15em] uppercase px-2 py-1 rounded border ${p.badge}`}>
                        {p.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-50 text-[13px] font-medium">
                      {row.suggestedOrder > 0 ? row.suggestedOrder : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-100/50 text-[13px]">
                      {row.costoEstimadoPedido > 0 ? fmtMXN(row.costoEstimadoPedido) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-amber-400/15">
                <td colSpan={6} className="px-5 py-3.5 text-[9px] tracking-[0.2em] uppercase text-amber-100/25 font-sans">
                  Total
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-amber-50/70 text-[13px]">
                  {rows.reduce((s, r) => s + r.suggestedOrder, 0)} pzas
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-amber-50/70 text-[13px]">
                  {fmtMXN(totalCosto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Nota contextual */}
      <p className="text-[10px] text-amber-100/25 font-sans leading-relaxed">
        Al ser un outlet de liquidación, «reposición» significa buscar lotes similares con tu proveedor.
        La lista se ordena por urgencia de cobertura y, dentro de cada nivel, por{" "}
        <span className="text-amber-400/70">margen mensual</span> — primero los productos
        que más ganancia te generan al mes. Empieza por los marcados como{" "}
        <span className="text-red-400/60">urgente</span>.
        {" "}Con más meses de historial el sistema subirá automáticamente al siguiente nivel de precisión.
      </p>
    </div>
  );
}
