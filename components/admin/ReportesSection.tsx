"use client";

import { useState } from "react";
import { MOCK_MONTHLY_REPORTS } from "@/db/mockData";
import SalesReport from "./reportes/SalesReport";
import ReplenishmentReport from "./reportes/ReplenishmentReport";

type Tab = "ventas" | "reposicion";

const TABS: { id: Tab; label: string }[] = [
  { id: "ventas", label: "Ventas" },
  { id: "reposicion", label: "Reposición" },
];

export default function ReportesSection() {
  // Abrir en el último mes completo (no el parcial) para no comparar datos a medias.
  const completeMonths = MOCK_MONTHLY_REPORTS.filter((r) => !r.partial);
  const defaultMonth = (completeMonths.at(-1) ?? MOCK_MONTHLY_REPORTS.at(-1))!
    .key;
  const [tab, setTab] = useState<Tab>("ventas");
  const [monthKey, setMonthKey] = useState(defaultMonth);

  const selectedReport = MOCK_MONTHLY_REPORTS.find((r) => r.key === monthKey);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-amber-50">Reportes</h1>
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-100/30 font-sans mt-1">
            análisis mensual · ventas y reposición
          </p>
        </div>

        {/* Selector de mes — solo aplica a la pestaña Ventas */}
        <div
          className={`flex gap-1 flex-wrap ${tab === "ventas" ? "" : "hidden"}`}
        >
          {MOCK_MONTHLY_REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setMonthKey(r.key)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-sans rounded border transition-colors cursor-pointer ${
                monthKey === r.key
                  ? "border-amber-400 text-amber-400 bg-amber-400/10"
                  : "border-amber-400/20 text-amber-100/35 hover:border-amber-400/50 hover:text-amber-100/60"
              }`}
            >
              {r.label}
              {r.partial && (
                <span className="ml-1 text-amber-100/25 normal-case tracking-normal">
                  *
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-amber-400/15">
        {TABS.map((t) => (
          <button
            key={t.id}
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

      {/* Nota mes parcial */}
      {tab === "ventas" && selectedReport?.partial && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded border border-amber-400/15 bg-amber-400/5">
          <span className="text-amber-400/60 text-[10px]">*</span>
          <p className="text-[10px] tracking-widest text-amber-100/40 font-sans">
            {selectedReport.label} es un mes en curso — los datos son parciales.
          </p>
        </div>
      )}

      {/* Contenido según tab */}
      {tab === "ventas" && <SalesReport monthKey={monthKey} />}
      {tab === "reposicion" && <ReplenishmentReport />}
    </div>
  );
}
