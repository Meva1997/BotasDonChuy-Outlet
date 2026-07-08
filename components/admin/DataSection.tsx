"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys, getAdminDashboard } from "@/lib/api/dashboard";
import KpiGrid from "./data/KpiGrid";
import RevenueChart from "./data/RevenueChart";
import SalesTable from "./data/SalesTable";
import InventoryTable from "./data/InventoryTable";

export default function DataSection() {
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
          últimos 30 días · compras reales del carrito
        </span>
      </div>

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
              Ventas · últimos 30 días
            </span>
            <KpiGrid kpis={data.kpis} />
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 font-sans">
              Rentabilidad · últimos 30 días
            </span>
            <KpiGrid kpis={data.profitKpis} />
          </section>

          <RevenueChart dataByPeriod={data.revenueByPeriod} />
          <SalesTable sales={data.recentSales} />
          <InventoryTable rows={data.inventory} />
        </>
      )}
    </div>
  );
}
