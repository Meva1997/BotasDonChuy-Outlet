import {
  DashboardData,
  MonthlyCategoryBreakdown,
  MonthlyProductSales,
  MonthlyReport,
  ReplenishmentRow,
  RevenuePoint,
} from "../components/admin/data/types";
import { computeForecast } from "../lib/forecast";
import { categoryPlural } from "../lib/categories";
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

// ─── Reportes mensuales ────────────────────────────────────────────────────────
// Simulación de un outlet de liquidación: catálogo escaso, modelos pasados y
// volúmenes BAJOS por naturaleza. Cada producto tiene un comportamiento distinto
// para que el análisis de datos arroje señales reales:
//
//   • Avestruz (id 2)  → estrella: se mantiene, ligera tendencia al alza
//   • Víbora   (id 4)  → en declive: se está agotando, ventas a la baja
//   • Ranchera (id 1)  → clásico estable mes a mes
//   • Llanero  (id 3)  → sombrero de venta baja pero constante
//   • Bordada  (id 6)  → rotación lenta, errático (modelo de nicho)
//   • Norteño  (id 5)  → dead stock: casi no se mueve, candidato a descontinuar
//
// IMPORTANTE — mantenibilidad: aquí SOLO se editan las unidades vendidas por
// producto y mes. Ingresos, totales y desglose por categoría se DERIVAN de
// MOCK_PRODUCTS (precio y categoría reales), así no hay números a mano que
// puedan desincronizarse. En producción, esta matriz se reemplaza por un query
// agrupado por mes; el resto del archivo no cambia.

interface MonthlyUnitSales {
  key: string;
  label: string;
  partial?: boolean;
  /** productId → unidades vendidas en el mes */
  units: Record<number, number>;
}

const MONTHLY_UNIT_SALES: MonthlyUnitSales[] = [
  { key: "2026-01", label: "Enero 2026",   units: { 1: 3, 2: 4, 3: 2, 4: 6, 5: 1, 6: 1 } },
  { key: "2026-02", label: "Febrero 2026", units: { 1: 4, 2: 3, 3: 1, 4: 5, 5: 0, 6: 2 } },
  { key: "2026-03", label: "Marzo 2026",   units: { 1: 3, 2: 5, 3: 2, 4: 4, 5: 1, 6: 1 } },
  { key: "2026-04", label: "Abril 2026",   units: { 1: 4, 2: 4, 3: 3, 4: 4, 5: 0, 6: 1 } },
  { key: "2026-05", label: "Mayo 2026",    units: { 1: 4, 2: 6, 3: 2, 4: 3, 5: 1, 6: 2 } },
  { key: "2026-06", label: "Junio 2026", partial: true, units: { 1: 2, 2: 2, 3: 1, 4: 1, 5: 0, 6: 0 } },
];

// Deriva un MonthlyReport completo a partir de las unidades vendidas + el catálogo.
function buildMonthlyReports(): MonthlyReport[] {
  return MONTHLY_UNIT_SALES.map((month) => {
    const byProduct: MonthlyProductSales[] = MOCK_PRODUCTS.map((product) => {
      const unitsSold = month.units[product.id] ?? 0;
      return {
        productId: product.id,
        name: product.name,
        type: product.type,
        unitsSold,
        revenue: unitsSold * product.salePrice,
        costoUnitario: product.costoUnitario,
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold);

    // Agrupar por categoría
    const grouped = new Map<string, { revenue: number; units: number }>();
    for (const p of byProduct) {
      const agg = grouped.get(p.type) ?? { revenue: 0, units: 0 };
      agg.revenue += p.revenue;
      agg.units += p.unitsSold;
      grouped.set(p.type, agg);
    }
    const byCategory: MonthlyCategoryBreakdown[] = [...grouped.entries()]
      .map(([category, agg]) => ({
        category,
        label: categoryPlural(category),
        revenue: agg.revenue,
        units: agg.units,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      key: month.key,
      label: month.label,
      partial: month.partial,
      totalRevenue: byProduct.reduce((s, p) => s + p.revenue, 0),
      totalUnits: byProduct.reduce((s, p) => s + p.unitsSold, 0),
      byProduct,
      byCategory,
    };
  });
}

export const MOCK_MONTHLY_REPORTS: MonthlyReport[] = buildMonthlyReports();

// ─── Tabla de reposición ───────────────────────────────────────────────────────
// Usa solo meses completos como historial para computeForecast().
// computeForecast() selecciona el algoritmo según cuántos meses haya:
//   1-2 → promedio simple | 3 → prom. ponderado + tendencia | 4+ → suav. exponencial

const fullMonths = MOCK_MONTHLY_REPORTS.filter((r) => !r.partial);

// Orden de urgencia por cobertura. Dentro de cada nivel, el margen mensual
// desempata: primero los productos que más ganancia generan al mes.
const PRIORITY_RANK: Record<ReplenishmentRow["priority"], number> = {
  urgente: 0,
  pronto: 1,
  ok: 2,
};

function buildReplenishment(): ReplenishmentRow[] {
  return MOCK_PRODUCTS.map((product) => {
    const monthlySales = fullMonths.map(
      (m) => m.byProduct.find((p) => p.productId === product.id)?.unitsSold ?? 0
    );

    const forecast = computeForecast(monthlySales);

    // Promedio de unidades/mes sobre el historial completo → base de ingreso y margen.
    const avgUnits =
      monthlySales.length > 0
        ? monthlySales.reduce((a, b) => a + b, 0) / monthlySales.length
        : 0;
    const ingresoMensual = Math.round(avgUnits * product.salePrice);
    const margenMensual = Math.round(
      avgUnits * (product.salePrice - product.costoUnitario)
    );

    const diasCobertura =
      forecast.forecastNextMonth > 0
        ? Math.round((product.stock / forecast.forecastNextMonth) * 30)
        : 999;
    const suggestedOrder = Math.max(
      0,
      Math.round(forecast.forecastNextMonth * 2) - product.stock
    );
    const priority: ReplenishmentRow["priority"] =
      diasCobertura < 15 ? "urgente" : diasCobertura < 45 ? "pronto" : "ok";

    return {
      productId: product.id,
      name: product.name,
      type: product.type,
      currentStock: product.stock,
      forecastNextMonth: forecast.forecastNextMonth,
      forecastMethod: forecast.method,
      forecastMethodLabel: forecast.methodLabel,
      trend: forecast.trend,
      confidence: forecast.confidence,
      diasCobertura,
      ingresoMensual,
      margenMensual,
      suggestedOrder,
      costoEstimadoPedido: suggestedOrder * product.costoUnitario,
      priority,
    };
  }).sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.margenMensual - a.margenMensual
  );
}

export const MOCK_REPLENISHMENT: ReplenishmentRow[] = buildReplenishment();
