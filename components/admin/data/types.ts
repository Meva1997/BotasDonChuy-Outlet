export interface KpiData {
  label: string;
  value: string;
  trend?: { label: string; positive: boolean };
  subtitle?: string;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export type Period = "7" | "30" | "90";

export interface SaleRow {
  id: string;
  date: string;
  day: string; // clave ISO en UTC ("2026-07-13"), para filtrar por día en SalesTable
  pieces: number;
  items: string;
  savings: number;
  total: number;
  /** Envío cobrado en el pedido, YA sumado dentro de `total`. Es costo de venta:
   *  la ganancia real de la fila es `total − shipping − costoTotal`. */
  shipping: number;
  /** Solo costo de producto. El envío va aparte, en `shipping`. */
  costoTotal: number;
}

export interface InventoryRow {
  id: number;
  name: string;
  type: string;
  stock: number;
  salePrice: number;
  unitCost: number;
  valorInventario: number; // stock × unitCost
}

export interface DashboardData {
  kpisByPeriod: Record<Period, KpiData[]>;
  profitKpisByPeriod: Record<Period, KpiData[]>;
  revenueByPeriod: Record<Period, RevenuePoint[]>;
  recentSales: SaleRow[];
  inventory: InventoryRow[];
}

export interface MonthlyProductSales {
  productId: number;
  name: string;
  type: string;
  unitsSold: number;
  revenue: number;
  unitCost: number;
}

export interface MonthlyCategoryBreakdown {
  category: string;
  label: string;
  revenue: number;
  units: number;
}

export interface MonthlyReport {
  key: string;
  label: string;
  partial?: boolean;
  totalRevenue: number;
  totalUnits: number;
  byProduct: MonthlyProductSales[];
  byCategory: MonthlyCategoryBreakdown[];
}

export interface ReplenishmentRow {
  productId: number;
  name: string;
  type: string;
  currentStock: number;
  forecastNextMonth: number;
  forecastMethod: "promedio-simple" | "tendencia" | "suavizacion-exponencial";
  forecastMethodLabel: string;
  trend: "creciendo" | "estable" | "bajando";
  confidence: "baja" | "media" | "alta";
  diasCobertura: number;
  ingresoMensual: number; // ingreso promedio mensual del producto (uds prom. × precio venta)
  margenMensual: number; // margen promedio mensual (uds prom. × (precio − costo))
  suggestedOrder: number;
  costoEstimadoPedido: number;
  priority: "urgente" | "pronto" | "ok";
}
