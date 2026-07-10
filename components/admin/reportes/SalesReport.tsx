"use client";

import { MonthlyReport } from "@/components/admin/data/types";
import { categorySingular } from "@/lib/domain/categories";

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
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

function trendVsPrev(current: MonthlyReport, reports: MonthlyReport[]) {
  const idx = reports.findIndex((r) => r.key === current.key);
  if (idx <= 0) return null;
  const prev = reports[idx - 1];
  const diff = current.totalRevenue - prev.totalRevenue;
  // Sin mes previo con ingresos no hay base de comparación (evita Infinity/NaN).
  if (prev.totalRevenue === 0) return null;
  const pctChange = Math.round((diff / prev.totalRevenue) * 100);
  return { pctChange, positive: diff >= 0 };
}

interface Props {
  monthKey: string;
  reports: MonthlyReport[];
}

export default function SalesReport({ monthKey, reports }: Props) {
  const report = reports.find((r) => r.key === monthKey);
  if (!report) return null;

  const trend = trendVsPrev(report, reports);
  const maxRevenue = Math.max(...report.byCategory.map((c) => c.revenue));
  const sortedProducts = [...report.byProduct].sort(
    (a, b) => b.unitsSold - a.unitsSold
  );

  // Utilidad bruta del mes = ingresos − costo (unitCost llega solo por rutas admin autenticadas).
  const totalCost = report.byProduct.reduce(
    (s, p) => s + p.unitCost * p.unitsSold,
    0
  );
  const utilidad = report.totalRevenue - totalCost;
  const margenPct = pct(utilidad, report.totalRevenue);

  function exportCSV() {
    const headers = [
      "Pos",
      "Producto",
      "Tipo",
      "Unidades",
      "Ingresos",
      "% del total",
      "Utilidad",
      "Margen %",
    ];
    const rows = sortedProducts.map((p, i) => {
      const utilidadProd = p.revenue - p.unitCost * p.unitsSold;
      return [
        i + 1,
        p.name,
        categorySingular(p.type),
        p.unitsSold,
        p.revenue,
        `${pct(p.revenue, report!.totalRevenue)}%`,
        utilidadProd,
        `${pct(utilidadProd, p.revenue)}%`,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map(csvField).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-${report!.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
            Ingresos
          </p>
          <p className="font-serif text-2xl text-amber-50">
            {fmtMXN(report.totalRevenue)}
          </p>
          {trend && (
            <p
              className={`text-xs font-sans mt-1 ${
                trend.positive ? "text-emerald-400/80" : "text-red-400/80"
              }`}
            >
              {trend.positive ? "+" : ""}
              {trend.pctChange}% vs mes anterior
            </p>
          )}
          {report.partial && (
            <p className="text-[10px] text-amber-100/30 font-sans mt-0.5">
              mes parcial
            </p>
          )}
        </div>

        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
            Utilidad del mes
          </p>
          <p className="font-serif text-2xl text-amber-50">{fmtMXN(utilidad)}</p>
          <p className="text-xs font-sans mt-1 text-amber-100/40">
            {margenPct}% de margen
          </p>
        </div>

        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
            Piezas vendidas
          </p>
          <p className="font-serif text-2xl text-amber-50">{report.totalUnits}</p>
        </div>

        <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-amber-100/40 font-sans mb-1.5">
            Precio promedio / pieza
          </p>
          <p className="font-serif text-2xl text-amber-50">
            {report.totalUnits > 0
              ? fmtMXN(Math.round(report.totalRevenue / report.totalUnits))
              : "—"}
          </p>
        </div>
      </div>

      {/* Top productos */}
      <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-400/10">
          <h3 className="font-serif text-lg text-amber-50">Productos más vendidos</h3>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-400/25 text-amber-400/70 hover:border-amber-400/60 hover:text-amber-400 transition-colors text-[10px] tracking-[0.2em] uppercase font-sans cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
        </div>

        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-amber-400/10">
              <th className="text-left px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 w-8">#</th>
              <th className="text-left px-3 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">Producto</th>
              <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30">Uds.</th>
              <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden sm:table-cell">Ingresos</th>
              <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden md:table-cell">% total</th>
              <th className="text-right px-5 py-3 text-[9px] tracking-[0.25em] uppercase text-amber-100/30 hidden lg:table-cell">Margen</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product, idx) => {
              const share = pct(product.revenue, report.totalRevenue);
              const margenProd = pct(
                product.revenue - product.unitCost * product.unitsSold,
                product.revenue
              );
              return (
                <tr
                  key={product.productId}
                  className="border-b border-amber-400/5 hover:bg-stone-800/40 transition-colors"
                >
                  <td className="px-5 py-3.5 text-amber-100/25 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-amber-50/90 text-[13px]">
                        {product.name}
                      </span>
                      <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-stone-700/60 text-amber-100/35 hidden sm:inline">
                        {categorySingular(product.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-amber-50/80 text-[13px]">
                    {product.unitsSold}
                  </td>
                  <td className="px-5 py-3.5 text-right text-amber-100/60 text-[13px] hidden sm:table-cell">
                    {fmtMXN(product.revenue)}
                  </td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1 rounded-full bg-stone-700 overflow-hidden">
                        <div
                          className="h-full bg-amber-500/60 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-amber-100/40 text-[11px] font-mono w-7 text-right">
                        {share}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                    <span className="text-amber-100/50 text-[13px] font-mono">
                      {margenProd}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Por categoría */}
      <div className="rounded-lg border border-amber-400/15 bg-stone-900/60 p-5">
        <h3 className="font-serif text-lg text-amber-50 mb-5">Por categoría</h3>
        <div className="flex flex-col gap-4">
          {report.byCategory.map((cat) => {
            const barWidth = pct(cat.revenue, maxRevenue);
            return (
              <div key={cat.category}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/50 font-sans">
                    {cat.label}
                  </span>
                  <span className="text-amber-50/80 font-mono text-sm">
                    {fmtMXN(cat.revenue)}
                    <span className="text-amber-100/30 text-xs ml-2">
                      · {cat.units} pzas
                    </span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-700 overflow-hidden">
                  <div
                    className="h-full bg-amber-500/70 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
