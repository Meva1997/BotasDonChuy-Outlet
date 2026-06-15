import { DashboardData, RevenuePoint } from "../components/admin/data/types";
import { MOCK_PRODUCTS } from "./mockProducts";

function buildRevenueSeries(days: number): RevenuePoint[] {
  const base = new Date("2026-05-17");
  const peaks: Record<number, number> = { 26: 28457, 23: 11200, 18: 10500 };
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label = d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
    const revenue = peaks[i] ?? 7000 + Math.round(Math.random() * 4000);
    return { date: label, revenue };
  });
}

// Gastos fijos mensuales de operación
const TOTAL_GASTOS = 2000; // dominio $150 + comisión pasarela est. $1,850

const TOTAL_INGRESOS = 245506;
const TOTAL_COGS = 103100; // costo de adquisición de las 151 piezas vendidas
const GANANCIA_BRUTA = TOTAL_INGRESOS - TOTAL_COGS; // $142,406
const MARGEN_BRUTO = Math.round((GANANCIA_BRUTA / TOTAL_INGRESOS) * 100); // 58%
const GANANCIA_NETA = GANANCIA_BRUTA - TOTAL_GASTOS; // $140,406

export const MOCK_DASHBOARD: DashboardData = {
  kpis: [
    {
      label: "INGRESOS",
      value: "$245,506",
      trend: { label: "+21% vs periodo anterior", positive: true },
    },
    { label: "PIEZAS VENDIDAS", value: "151" },
    { label: "TICKET PROMEDIO", value: "$1,626" },
    { label: "MEJOR DÍA", value: "$28,457", subtitle: "12 jun" },
  ],

  profitKpis: [
    {
      label: "GANANCIA BRUTA",
      value: `$${GANANCIA_BRUTA.toLocaleString("es-MX")}`,
      trend: { label: "+19% vs periodo anterior", positive: true },
    },
    {
      label: "MARGEN BRUTO",
      value: `${MARGEN_BRUTO}%`,
      subtitle: "sobre precio de venta outlet",
    },
    {
      label: "GASTOS FIJOS / MES",
      value: `$${TOTAL_GASTOS.toLocaleString("es-MX")}`,
      subtitle: "dominio · comisión pasarela",
    },
    {
      label: "GANANCIA NETA",
      value: `$${GANANCIA_NETA.toLocaleString("es-MX")}`,
      trend: { label: "+18% vs periodo anterior", positive: true },
    },
  ],

  revenueByPeriod: {
    "7": buildRevenueSeries(7),
    "30": buildRevenueSeries(30),
    "90": buildRevenueSeries(90),
  },

  recentSales: [
    {
      id: "1",
      date: "12 jun · 07:33",
      pieces: 1,
      items: "Bota Exótica de Avestruz",
      savings: 4320,
      total: 2880,
      costoTotal: 1400,
    },
    {
      id: "2",
      date: "12 jun · 07:19",
      pieces: 3,
      items: "Bota Ranchera 1972, Bota Exótica de Avestruz ×2",
      savings: 11520,
      total: 7680,
      costoTotal: 3600,
    },
    {
      id: "3",
      date: "12 jun · 07:17",
      pieces: 3,
      items: "Bota Ranchera 1972, Bota Exótica de Avestruz ×2",
      savings: 11520,
      total: 7680,
      costoTotal: 3600,
    },
    {
      id: "4",
      date: "11 jun · 18:45",
      pieces: 2,
      items: "Sombrero Vaquero Fino, Bota Cuero Nogal",
      savings: 3200,
      total: 4800,
      costoTotal: 2050,
    },
    {
      id: "5",
      date: "11 jun · 14:22",
      pieces: 1,
      items: "Bota Piel de Víbora",
      savings: 5600,
      total: 3920,
      costoTotal: 950,
    },
  ],

  inventory: MOCK_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    stock: p.stock,
    salePrice: p.salePrice,
    costoUnitario: p.costoUnitario,
    valorInventario: p.stock * p.costoUnitario,
  })),
};
