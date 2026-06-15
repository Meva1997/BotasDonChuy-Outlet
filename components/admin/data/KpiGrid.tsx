"use client";

import { KpiData } from "./types";

function KpiCard({ label, value, trend, subtitle }: KpiData) {
  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-5 flex flex-col gap-2">
      <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/50 font-sans">
        {label}
      </span>
      <span className="font-serif text-3xl text-amber-50">{value}</span>
      {trend && (
        <span className={`text-xs font-sans ${trend.positive ? "text-emerald-400" : "text-red-400"}`}>
          {trend.positive ? "▲" : "▼"} {trend.label}
        </span>
      )}
      {subtitle && (
        <span className="text-xs text-amber-100/40 font-sans">{subtitle}</span>
      )}
    </div>
  );
}

export default function KpiGrid({ kpis }: { kpis: KpiData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
