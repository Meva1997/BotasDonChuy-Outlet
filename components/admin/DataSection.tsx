"use client";

import KpiGrid from "./data/KpiGrid";
import RevenueChart from "./data/RevenueChart";
import SalesTable from "./data/SalesTable";
import InventoryTable from "./data/InventoryTable";
import { MOCK_DASHBOARD } from "../../db/mockData";
// TODO: replace MOCK_DASHBOARD with an API fetch:
// const data = await fetch("/api/admin/dashboard").then(r => r.json())

export default function DataSection() {
  const data = MOCK_DASHBOARD;

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl text-amber-50">Datos</h1>
        <span className="text-xs text-amber-100/40 font-sans">
          últimos 30 días · serie demo + compras reales del carrito
        </span>
      </div>

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
    </div>
  );
}
