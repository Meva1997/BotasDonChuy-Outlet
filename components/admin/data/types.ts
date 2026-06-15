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
  pieces: number;
  items: string;
  savings: number;
  total: number;
  costoTotal: number;
}

export interface InventoryRow {
  id: number;
  name: string;
  type: string;
  stock: number;
  salePrice: number;
  costoUnitario: number;
  valorInventario: number; // stock × costoUnitario
}

export interface DashboardData {
  kpis: KpiData[];
  profitKpis: KpiData[];
  revenueByPeriod: Record<Period, RevenuePoint[]>;
  recentSales: SaleRow[];
  inventory: InventoryRow[];
}
