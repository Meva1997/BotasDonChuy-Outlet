"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportKeys, getMonthlyReport } from "@/lib/api/reports";
import SalesReport from "./reportes/SalesReport";
import ReplenishmentReport from "./reportes/ReplenishmentReport";

type Tab = "ventas" | "reposicion";

const TABS: { id: Tab; label: string }[] = [
  { id: "ventas", label: "Ventas" },
  { id: "reposicion", label: "Reposición" },
];

export default function ReportesSection() {
  const { data: reports, isPending, isError, refetch } = useQuery({
    queryKey: reportKeys.monthly(),
    queryFn: getMonthlyReport,
  });

  const [tab, setTab] = useState<Tab>("ventas");
  // El mes seleccionado no puede inicializarse desde datos async: se guarda como
  // `null` hasta que el usuario elige, y se cae al mes por defecto mientras tanto.
  const [monthKey, setMonthKey] = useState<string | null>(null);

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
      </div>

      {isPending && (
        <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
          Cargando reportes…
        </p>
      )}

      {isError && (
        <div className="max-w-md space-y-4">
          <p className="text-red-400/90 text-sm border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
            No pudimos cargar los reportes. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {reports && reports.length === 0 && (
        <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
          Aún no hay ventas registradas para reportar.
        </p>
      )}

      {reports && reports.length > 0 && (() => {
        // Abrir en el último mes completo (no el parcial) para no comparar datos a medias.
        const completeMonths = reports.filter((r) => !r.partial);
        const defaultMonth = (completeMonths.at(-1) ?? reports.at(-1))?.key ?? "";
        // Reconciliar el mes elegido contra los datos actuales: si un refetch en
        // segundo plano cambia el set de meses y el seleccionado ya no existe,
        // caemos al mes por defecto en vez de dejar la pestaña en blanco.
        const activeMonthKey =
          monthKey && reports.some((r) => r.key === monthKey)
            ? monthKey
            : defaultMonth;
        const selectedReport = reports.find((r) => r.key === activeMonthKey);

        return (
          <>
            {/* Selector de mes — solo aplica a la pestaña Ventas */}
            <div
              className={`flex gap-1 flex-wrap ${tab === "ventas" ? "" : "hidden"}`}
            >
              {reports.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setMonthKey(r.key)}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-sans rounded border transition-colors cursor-pointer ${
                    activeMonthKey === r.key
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
            {tab === "ventas" && (
              <SalesReport monthKey={activeMonthKey} reports={reports} />
            )}
            {tab === "reposicion" && <ReplenishmentReport reports={reports} />}
          </>
        );
      })()}
    </div>
  );
}
