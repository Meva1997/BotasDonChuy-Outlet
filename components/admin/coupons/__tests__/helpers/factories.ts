import type { AdminCoupon } from "@/lib/api/adminCoupons";
import type { AdminProduct } from "@/lib/api/adminProducts";

// Fixtures compartidas por components/admin/coupons/__tests__/ — mismo criterio que
// orders/products/__tests__/helpers/factories.ts: defaults mínimos válidos +
// `overrides`. El default es un cupón de porcentaje activo, sin tope de usos ni
// ventana de vigencia — el estado con más ramas disponibles a la vez (editable sin
// "unclearable", `couponState` cae directo en "activo").

export function makeAdminCoupon(overrides: Partial<AdminCoupon> = {}): AdminCoupon {
  return {
    id: 1,
    code: "VERANO20",
    type: "percent",
    value: 20,
    maxDiscount: null,
    minSubtotal: null,
    maxRedemptions: null,
    redeemedCount: 0,
    oncePerCustomer: true,
    startsAt: null,
    expiresAt: null,
    active: true,
    description: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    activeRedemptions: 0,
    ...overrides,
  };
}

// Duplicado (minimal) del homónimo de products/__tests__/helpers/factories.ts a
// propósito — un __tests__/ no importa entre carpetas hermanas. Solo lleva lo que
// CouponForm de verdad lee (`visible`, `stock`, `salePrice`) para el rango de
// precios del catálogo.
export function makeAdminProductForRange(
  overrides: Partial<AdminProduct> = {}
): AdminProduct {
  return {
    id: 1,
    name: "Bota vaquera",
    description: "Piel genuina",
    originalPrice: 1500,
    salePrice: 900,
    discountPercent: 40,
    unitCost: 500,
    stock: 3,
    type: "bota",
    sizes: [26, 26, 27],
    hasSizes: true,
    images: [],
    imageSrc: null,
    code: "BV-001",
    weightKg: 1.5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 15,
    visible: true,
    deletedAt: null,
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z",
    ...overrides,
  };
}
