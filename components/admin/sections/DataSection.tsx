"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardKeys, getAdminDashboard } from "@/lib/api/dashboard";
import { Period } from "../data/types";
import KpiGrid from "../data/KpiGrid";
import RevenueChart from "../data/RevenueChart";
import SalesTable from "../data/SalesTable";
import InventoryTable from "../data/InventoryTable";

const PERIODS: { label: string; value: Period }[] = [
  { label: "7 días", value: "7" },
  { label: "30 días", value: "30" },
  { label: "90 días", value: "90" },
];

export default function DataSection() {
  const [period, setPeriod] = useState<Period>("30");
  const {
    data,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: dashboardKeys.all,
    queryFn: getAdminDashboard,
  });

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl text-amber-50">Datos</h1>
        <span className="text-xs text-amber-100/40 font-sans">
          últimos {period} días · compras reales del carrito
        </span>
      </div>

      {data && (
        <div className="flex gap-1 self-start">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-xs font-sans tracking-wide rounded border transition-colors cursor-pointer ${
                period === p.value
                  ? "border-amber-400 text-amber-400 bg-amber-400/10"
                  : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/50 hover:text-amber-100/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {isPending && (
        <p className="text-amber-100/40 text-sm tracking-[0.15em] uppercase">
          Cargando métricas…
        </p>
      )}

      {isError && (
        <div className="max-w-md space-y-4">
          <p className="text-red-400/90 text-sm border border-red-500/30 bg-red-500/5 rounded-md px-4 py-3">
            No pudimos cargar las métricas. Revisa tu conexión e inténtalo de nuevo.
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

      {data && (
        <>
          <section className="flex flex-col gap-3">
            <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 font-sans">
              Ventas · últimos {period} días
            </span>
            <KpiGrid kpis={data.kpisByPeriod[period]} />
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 font-sans">
              Rentabilidad · últimos {period} días
            </span>
            <KpiGrid kpis={data.profitKpisByPeriod[period]} />
          </section>

          <RevenueChart dataByPeriod={data.revenueByPeriod} />
          <SalesTable sales={data.recentSales} />
          <InventoryTable rows={data.inventory} />
        </>
      )}
    </div>
  );
}
