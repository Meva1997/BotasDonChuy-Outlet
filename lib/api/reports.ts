import { z } from "zod";
import { api } from "@/lib/api/client";
import type {
  MonthlyReport,
  ReplenishmentRow,
} from "@/components/admin/data/types";

// Schemas Zod que reflejan los tipos de `components/admin/data/types.ts` y la
// forma que devuelve `reports.service.ts` del backend. Ambos endpoints devuelven
// un array plano (sin envoltorio) y ya vienen ordenados/derivados por el backend:
//   GET /api/admin/reports/monthly       → MonthlyReport[]   (cronológico; mes en curso con partial=true)
//   GET /api/admin/reports/replenishment → ReplenishmentRow[] (urgencia de cobertura → margen mensual desc)
const MonthlyProductSalesSchema = z.object({
  productId: z.number(),
  name: z.string(),
  type: z.string(),
  unitsSold: z.number(),
  revenue: z.number(),
  unitCost: z.number(),
});

const MonthlyCategoryBreakdownSchema = z.object({
  category: z.string(),
  label: z.string(),
  revenue: z.number(),
  units: z.number(),
});

const MonthlyReportSchema = z.object({
  key: z.string(),
  label: z.string(),
  partial: z.boolean().optional(),
  totalRevenue: z.number(),
  totalUnits: z.number(),
  byProduct: z.array(MonthlyProductSalesSchema),
  byCategory: z.array(MonthlyCategoryBreakdownSchema),
});

const MonthlyReportsSchema = z.array(MonthlyReportSchema);

const ReplenishmentRowSchema = z.object({
  productId: z.number(),
  name: z.string(),
  type: z.string(),
  currentStock: z.number(),
  forecastNextMonth: z.number(),
  forecastMethod: z.enum([
    "promedio-simple",
    "tendencia",
    "suavizacion-exponencial",
  ]),
  forecastMethodLabel: z.string(),
  trend: z.enum(["creciendo", "estable", "bajando"]),
  confidence: z.enum(["baja", "media", "alta"]),
  diasCobertura: z.number(),
  ingresoMensual: z.number(),
  margenMensual: z.number(),
  suggestedOrder: z.number(),
  costoEstimadoPedido: z.number(),
  priority: z.enum(["urgente", "pronto", "ok"]),
});

const ReplenishmentRowsSchema = z.array(ReplenishmentRowSchema);

// Query key factory (mismo patrón que dashboardKeys / adminProductKeys).
export const reportKeys = {
  all: ["adminReports"] as const,
  monthly: () => [...reportKeys.all, "monthly"] as const,
  replenishment: () => [...reportKeys.all, "replenishment"] as const,
};

// GET /api/admin/reports/monthly — ventas por mes por producto (histórico).
// Ruta protegida (Bearer vía interceptor).
export async function getMonthlyReport(): Promise<MonthlyReport[]> {
  const { data } = await api.get("/admin/reports/monthly");
  return MonthlyReportsSchema.parse(data);
}

// GET /api/admin/reports/replenishment — pedido sugerido (forecast + cobertura + margen).
// Ruta protegida (Bearer vía interceptor).
export async function getReplenishmentReport(): Promise<ReplenishmentRow[]> {
  const { data } = await api.get("/admin/reports/replenishment");
  return ReplenishmentRowsSchema.parse(data);
}
