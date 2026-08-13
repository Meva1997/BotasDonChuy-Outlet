import type {
  InventoryRow,
  KpiData,
  RevenuePoint,
  SaleRow,
} from "../../types";

// Fixtures compartidas por components/admin/data/__tests__/ — mismo criterio que
// orders/products/coupons/expenses/__tests__/helpers/factories.ts: defaults
// mínimos válidos + `overrides`.
//
// Los números NO son arbitrarios: `total`, `shipping` y `costoTotal` se eligen
// para que la ganancia de la fila (`total − shipping − costoTotal`) y el margen
// en porcentaje no coincidan con ningún otro número de la misma card, que si no
// una aserción de texto suelto pasaría contra el número equivocado (la trampa
// recurrente documentada en expenses/__tests__/README.md).

export function makeKpi(overrides: Partial<KpiData> = {}): KpiData {
  return {
    label: "INGRESOS",
    value: "$12,500.00",
    ...overrides,
  };
}

export function makeSaleRow(overrides: Partial<SaleRow> = {}): SaleRow {
  return {
    id: "1",
    date: "13 jul, 10:30",
    day: "2026-07-13",
    pieces: 2,
    items: "Bota vaquera ×1, Sombrero de palma ×1",
    savings: 300,
    total: 2000,
    shipping: 160,
    costoTotal: 840,
    ...overrides,
  };
}

/** N ventas con `id`/`day` distintos, para paginación y filtro por día. */
export function makeSaleRows(
  count: number,
  overridesFor: (i: number) => Partial<SaleRow> = () => ({}),
): SaleRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeSaleRow({
      id: String(i + 1),
      date: `${i + 1} jul, 10:30`,
      day: `2026-07-${String(i + 1).padStart(2, "0")}`,
      items: `Pieza ${i + 1}`,
      ...overridesFor(i),
    }),
  );
}

export function makeInventoryRow(
  overrides: Partial<InventoryRow> = {},
): InventoryRow {
  return {
    id: 1,
    name: "Bota vaquera",
    type: "bota",
    stock: 5,
    salePrice: 900,
    unitCost: 500,
    valorInventario: 2500,
    ...overrides,
  };
}

export function makeInventoryRows(count: number): InventoryRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeInventoryRow({
      id: i + 1,
      name: `Producto ${i + 1}`,
      stock: i + 3,
      valorInventario: (i + 3) * 500,
    }),
  );
}

export function makeRevenuePoints(
  count: number,
  prefix = "jul",
): RevenuePoint[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `${i + 1} ${prefix}`,
    revenue: (i + 1) * 1000,
  }));
}
