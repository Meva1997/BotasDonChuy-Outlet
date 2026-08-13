import type {
  MonthlyReport,
  ReplenishmentRow,
} from "@/components/admin/data/types";

// Fixtures compartidas por components/admin/reports/__tests__/ — defaults
// mínimos válidos + `overrides`, mismo criterio que el resto de `helpers/`
// del panel.
//
// El default es un mes COMPLETO (`partial` ausente, no `false`): el mes en curso
// es el caso especial, no el normal, y varias ramas de `ReportsSection` dependen
// de distinguirlos.

export function makeMonthlyReport(
  overrides: Partial<MonthlyReport> = {},
): MonthlyReport {
  return {
    key: "2026-07",
    label: "Julio 2026",
    totalRevenue: 10000,
    totalUnits: 8,
    byProduct: [
      {
        productId: 1,
        name: "Bota vaquera",
        type: "bota",
        unitsSold: 5,
        revenue: 6000,
        unitCost: 500,
      },
      {
        productId: 2,
        name: "Sombrero de palma",
        type: "sombrero",
        unitsSold: 3,
        revenue: 4000,
        unitCost: 400,
      },
    ],
    byCategory: [
      { category: "bota", label: "Botas", revenue: 6000, units: 5 },
      { category: "sombrero", label: "Sombreros", revenue: 4000, units: 3 },
    ],
    ...overrides,
  };
}

export function makeReplenishmentRow(
  overrides: Partial<ReplenishmentRow> = {},
): ReplenishmentRow {
  return {
    productId: 1,
    name: "Bota vaquera",
    type: "bota",
    currentStock: 12,
    forecastNextMonth: 6,
    forecastMethod: "suavizacion-exponencial",
    forecastMethodLabel: "Suavización exponencial",
    trend: "estable",
    confidence: "alta",
    diasCobertura: 60,
    ingresoMensual: 5400,
    margenMensual: 2400,
    suggestedOrder: 0,
    costoEstimadoPedido: 0,
    priority: "ok",
    ...overrides,
  };
}
