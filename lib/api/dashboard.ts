import { z } from "zod";
import { api } from "@/lib/api/client";
import type { DashboardData } from "@/components/admin/data/types";

// Schemas Zod que reflejan los tipos de `components/admin/data/types.ts` y la
// forma que devuelve `dashboard.service.ts` del backend (GET /api/admin/dashboard).
// Los valores de KPI llegan como strings ya formateados (es-MX); las filas de
// tablas llegan como números crudos que el front formatea al pintar.
const KpiDataSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.object({ label: z.string(), positive: z.boolean() }).optional(),
  subtitle: z.string().optional(),
});

const RevenuePointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
});

// `shipping` es el envío COBRADO en ese pedido, que ya viene sumado dentro de
// `total`. Va en la fila porque sin él la ganancia real no se puede sacar: es
// `total − shipping − costoTotal` (`costoTotal` es solo producto).
const SaleRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  day: z.string(),
  pieces: z.number(),
  items: z.string(),
  savings: z.number(),
  total: z.number(),
  shipping: z.number(),
  costoTotal: z.number(),
});

const InventoryRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  stock: z.number(),
  salePrice: z.number(),
  unitCost: z.number(),
  valorInventario: z.number(),
});

// `kpisByPeriod`/`profitKpisByPeriod`/`revenueByPeriod` traen las tres ventanas
// (7/30/90) ya calculadas por el backend; el front solo alterna en cliente.
//
// El KPI `COSTO DE ENVÍO` (Fase 22) no necesitó nada aquí: `KpiGrid` los pinta
// genéricamente por `label`, así que un KPI nuevo aparece solo (igual que pasó con
// `GASTOS` en la Fase 20). Su `trend` viene INVERTIDO a propósito desde el backend
// (`positive: true` = el costo bajó); con la regla normal, "el envío subió 40%"
// saldría en verde. No hace falta lógica especial: `KpiCard` ya pinta por `positive`.
export const DashboardSchema = z.object({
  kpisByPeriod: z.object({
    "7": z.array(KpiDataSchema),
    "30": z.array(KpiDataSchema),
    "90": z.array(KpiDataSchema),
  }),
  profitKpisByPeriod: z.object({
    "7": z.array(KpiDataSchema),
    "30": z.array(KpiDataSchema),
    "90": z.array(KpiDataSchema),
  }),
  revenueByPeriod: z.object({
    "7": z.array(RevenuePointSchema),
    "30": z.array(RevenuePointSchema),
    "90": z.array(RevenuePointSchema),
  }),
  recentSales: z.array(SaleRowSchema),
  inventory: z.array(InventoryRowSchema),
});

// Query key factory (mismo patrón que adminProductKeys / productKeys).
export const dashboardKeys = {
  all: ["adminDashboard"] as const,
};

// GET /api/admin/dashboard — métricas del panel (KPIs, ingresos por periodo,
// ventas recientes e inventario). Ruta protegida (Bearer vía interceptor).
export async function getAdminDashboard(): Promise<DashboardData> {
  const { data } = await api.get("/admin/dashboard");
  return DashboardSchema.parse(data);
}
