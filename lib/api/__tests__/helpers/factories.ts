import type { AdminCoupon, Coupon } from "../../adminCoupons";
import type { AdminOrder, AdminOrderItem } from "../../adminOrders";
import type { Expense, ExpenseMonth, ExpenseSummary } from "../../adminExpenses";
import type { AdminProduct } from "../../adminProducts";
import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportRowPlan,
  ProductSnapshot,
} from "../../adminProductImport";
import type { AdminUser } from "../../adminUsers";
import type { AuthUser } from "../../auth";
import type { BrandSettings } from "../../brand";
import type { CouponPreview } from "../../coupons";
import type { OrderResponse, PublicOrder } from "../../orders";
import type { Product, ProductsResult } from "../../products";
import type { ShippingRate, SelectedShippingRate } from "../../shipping";
import type { CartItem } from "../../../../store/cartStore";
import type { ShippingData } from "../../../../schemas/checkout";
import type { DashboardData } from "../../../../components/admin/data/types";

/**
 * Fixtures compartidas por `lib/api/__tests__/` — defaults mínimos VÁLIDOS +
 * `overrides`, mismo criterio que los `helpers/factories.ts` del panel.
 *
 * Aquí tienen un papel algo distinto al de las suites de componentes: lo que se
 * prueba es el contrato, así que un default siempre representa "el cuerpo que el
 * backend manda hoy y que el schema debe aceptar". Cada suite construye a partir
 * de él tanto el caso feliz como el cuerpo deformado (quitando una clave, o
 * cambiándole el tipo) que dispara la rama de `parse` estricto o de `safeParse`.
 *
 * Son deliberadamente una copia de las de `components/**\/__tests__/helpers/` y no
 * un import: un `__tests__/` no importa de otro (misma regla que el `apiError.ts`
 * duplicado entre `checkout/` y `auth/`).
 */

/**
 * Devuelve una copia del cuerpo SIN las claves dadas — la forma de escribir "lo
 * que llegaría de un backend que dejó de mandar este campo", que es el caso que
 * ejercita cada rama de `parse` estricto.
 *
 * Existe en vez del `const { campo: _x, ...resto } = …` habitual porque ese
 * patrón deja una variable sin usar en cada suite (21 avisos de ESLint en la
 * primera versión de estos tests), y porque `omit(x, "total")` dice en la propia
 * llamada qué es lo que falta.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

// ── Catálogo público ─────────────────────────────────────────────────────────

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Bota vaquera",
    originalPrice: 1000,
    salePrice: 800,
    discountPercent: 20,
    stock: 5,
    type: "bota",
    sizes: [26, 27],
    hasSizes: true,
    images: [],
    imageSrc: null,
    code: null,
    weightKg: 1.5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 15,
    ...overrides,
  };
}

export function makeProductsResult(
  overrides: Partial<ProductsResult> = {}
): ProductsResult {
  return {
    products: [makeProduct()],
    total: 1,
    page: 1,
    perPage: 24,
    totalPages: 1,
    availableSizes: [26, 27],
    ...overrides,
  };
}

// ── Carrito y envío ──────────────────────────────────────────────────────────

export function makeCartItem(
  options: { product?: Partial<Product>; size?: number; quantity?: number } = {}
): CartItem {
  const product = makeProduct(options.product);
  const size = options.size ?? 26;
  return {
    id: `${product.id}-${size}`,
    product,
    size,
    quantity: options.quantity ?? 1,
  };
}

export function makeShippingData(overrides: Partial<ShippingData> = {}): ShippingData {
  return {
    fullName: "Juan Pérez",
    email: "juan@ejemplo.com",
    phone: "1234567890",
    street: "Calle 1",
    neighborhood: "Centro",
    city: "Celaya",
    state: "Guanajuato",
    postalCode: "38000",
    references: "",
    ...overrides,
  };
}

export function makeShippingRate(overrides: Partial<ShippingRate> = {}): ShippingRate {
  return {
    rateId: "rate-1",
    carrier: "Estafeta",
    service: "Terrestre",
    amount: 150,
    total: 150,
    days: 3,
    packageCount: 1,
    ...overrides,
  };
}

export function makeSelectedRate(
  overrides: Partial<SelectedShippingRate> = {}
): SelectedShippingRate {
  return { ...makeShippingRate(), quotationId: "quotation-1", ...overrides };
}

// ── Pedidos ──────────────────────────────────────────────────────────────────

export function makeOrderResponse(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 100,
    status: "pending",
    paymentStatus: "unpaid",
    subtotal: 800,
    savings: 200,
    shipping: 150,
    couponCode: null,
    couponDiscount: 0,
    total: 750,
    customerName: "Juan Pérez",
    customerEmail: "juan@ejemplo.com",
    customerPhone: "1234567890",
    street: "Calle 1",
    neighborhood: "Centro",
    city: "Celaya",
    state: "Guanajuato",
    postalCode: "38000",
    references: null,
    shippingCarrier: "Estafeta",
    packageCount: 1,
    publicToken: "public-token-1",
    items: [],
    ...overrides,
  };
}

export function makePublicOrder(overrides: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id: 100,
    status: "paid",
    paymentStatus: "paid",
    createdAt: "2026-07-03T12:00:00.000Z",
    subtotal: 800,
    savings: 200,
    shipping: 150,
    couponCode: null,
    couponDiscount: 0,
    total: 750,
    customerName: "Juan Pérez",
    shippingAddress: {
      street: "Calle 1",
      neighborhood: "Centro",
      city: "Celaya",
      state: "Guanajuato",
      postalCode: "38000",
      references: null,
    },
    shippingCarrier: null,
    trackingNumber: null,
    trackingUrl: null,
    shipmentStatus: null,
    refundedAt: null,
    items: [
      {
        nameSnapshot: "Bota vaquera",
        size: 26,
        quantity: 1,
        unitOriginalPrice: 1000,
        unitSalePrice: 800,
      },
    ],
    ...overrides,
  };
}

export function makeAdminOrderItem(
  overrides: Partial<AdminOrderItem> = {}
): AdminOrderItem {
  return {
    id: 1,
    orderId: 100,
    productId: 1,
    nameSnapshot: "Bota vaquera",
    size: 26,
    quantity: 1,
    unitOriginalPrice: 1000,
    unitSalePrice: 800,
    unitCost: 500,
    ...overrides,
  };
}

export function makeAdminOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 100,
    status: "paid",
    paymentStatus: "paid",
    subtotal: 800,
    savings: 200,
    shipping: 160,
    couponCode: null,
    couponDiscount: 0,
    total: 960,
    customerName: "Ana García",
    customerEmail: "ana@ejemplo.com",
    customerPhone: "4771234567",
    street: "Calle 1",
    neighborhood: "Centro",
    city: "Celaya",
    state: "Guanajuato",
    postalCode: "38000",
    references: null,
    shippingCarrier: null,
    shippingRequiresDropoff: null,
    paymentIntentId: null,
    skydropxShipmentId: null,
    skydropxQuotationId: "quo_1",
    skydropxRateId: "rate_1",
    trackingNumber: null,
    trackingUrl: null,
    labelUrl: null,
    shipmentStatus: null,
    refundId: null,
    refundedAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    termsAcceptedIp: null,
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z",
    items: [makeAdminOrderItem()],
    ...overrides,
  };
}

// ── Cupones ──────────────────────────────────────────────────────────────────

export function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
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
    ...overrides,
  };
}

export function makeAdminCoupon(overrides: Partial<AdminCoupon> = {}): AdminCoupon {
  return { ...makeCoupon(), activeRedemptions: 0, ...overrides };
}

export function makeCouponPreview(
  overrides: Partial<CouponPreview> = {}
): CouponPreview {
  return {
    code: "VERANO20",
    type: "percent",
    value: 20,
    description: null,
    discount: 160,
    netMerchandise: 800,
    remainingRedemptions: null,
    oncePerCustomer: true,
    perCustomerChecked: false,
    expiresAt: null,
    ...overrides,
  };
}

// ── Productos (admin) ────────────────────────────────────────────────────────

export function makeAdminProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
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

/** `File` de mentira: `size` es de solo lectura, así que se redefine. */
export function makeFile({
  name = "archivo.xlsx",
  type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  size = 1024,
}: { name?: string; type?: string; size?: number } = {}): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

// ── Importación por Excel ────────────────────────────────────────────────────

export function makeProductSnapshot(
  overrides: Partial<ProductSnapshot> = {}
): ProductSnapshot {
  return {
    id: 1,
    code: "BV-001",
    name: "Bota vaquera",
    type: "bota",
    description: null,
    originalPrice: 1500,
    salePrice: 900,
    unitCost: 500,
    weightKg: 1.5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 15,
    visible: true,
    discontinued: false,
    sizes: [{ size: 26, stock: 2 }],
    stock: 2,
    ...overrides,
  };
}

export function makeImportRowPlan(overrides: Partial<ImportRowPlan> = {}): ImportRowPlan {
  return {
    row: 2,
    action: "update",
    code: "BV-001",
    name: "Bota vaquera",
    productId: 1,
    before: makeProductSnapshot(),
    after: makeProductSnapshot({ stock: 5, sizes: [{ size: 26, stock: 5 }] }),
    changes: [],
    sizeChanges: [{ size: 26, before: 2, added: 3, after: 5 }],
    reactivated: false,
    warnings: [],
    message: "Se sumarán 3 piezas.",
    input: { row: 2, code: "BV-001", sizes: "26,26,26" },
    ...overrides,
  };
}

export function makeImportPreview(
  overrides: Partial<ImportPreviewResponse> = {}
): ImportPreviewResponse {
  return {
    summary: { total: 1, created: 0, updated: 1, unchanged: 0, failed: 0 },
    warnings: [],
    rows: [makeImportRowPlan()],
    ...overrides,
  };
}

export function makeImportCommit(
  overrides: Partial<ImportCommitResponse> = {}
): ImportCommitResponse {
  return {
    summary: { total: 1, created: 0, updated: 1, unchanged: 0, failed: 0 },
    rows: [
      {
        row: 2,
        status: "updated",
        code: "BV-001",
        name: "Bota vaquera",
        productId: 1,
        message: "Se sumaron 3 piezas.",
      },
    ],
    ...overrides,
  };
}

// ── Gastos ───────────────────────────────────────────────────────────────────

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    concept: "Render — Web Service",
    vendor: "Render",
    category: "infraestructura",
    frequency: "monthly",
    startsAt: "2026-03-01",
    endsAt: null,
    active: true,
    notes: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    currentAmount: 290,
    monthlyRunRate: 290,
    nextChargeDate: "2026-09-01",
    amounts: [{ id: 1, amount: 290, effectiveFrom: "2026-03-01", note: null }],
    ...overrides,
  };
}

export function makeExpenseSummary(
  overrides: Partial<ExpenseSummary> = {}
): ExpenseSummary {
  return {
    monthlyRunRate: 1200,
    annualRunRate: 14400,
    activeCount: 3,
    byCategory: [{ category: "infraestructura", count: 2, monthlyRunRate: 900 }],
    byFrequency: [{ frequency: "monthly", count: 3, monthlyRunRate: 1200 }],
    upcomingDays: 60,
    upcomingTotal: 290,
    upcomingCharges: [
      {
        expenseId: 1,
        concept: "Render — Web Service",
        vendor: "Render",
        category: "infraestructura",
        frequency: "monthly",
        date: "2026-09-01",
        amount: 290,
      },
    ],
    shippingCost: {
      category: "paqueteria",
      derived: true,
      includedInGrossProfit: true,
      from: "2026-08-01",
      to: "2026-08-12",
      partial: true,
      amount: 640,
      orders: 4,
    },
    ...overrides,
  };
}

export function makeExpenseMonth(overrides: Partial<ExpenseMonth> = {}): ExpenseMonth {
  return {
    isoMonth: "2026-08",
    label: "Agosto 2026",
    partial: false,
    total: 1200,
    byCategory: [{ category: "infraestructura", amount: 1200 }],
    byExpense: [
      {
        expenseId: 1,
        concept: "Render — Web Service",
        vendor: "Render",
        category: "infraestructura",
        frequency: "monthly",
        occurrences: 1,
        amount: 1200,
      },
    ],
    changes: [],
    shippingCost: {
      category: "paqueteria",
      derived: true,
      includedInGrossProfit: true,
      from: "2026-08-01",
      to: "2026-08-31",
      partial: false,
      amount: 640,
      orders: 4,
    },
    ...overrides,
  };
}

// ── Sesión y usuarios ────────────────────────────────────────────────────────

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "1",
    name: "Ana García",
    email: "ana@ejemplo.com",
    role: "owner",
    ...overrides,
  };
}

export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    name: "Ana García",
    email: "ana@ejemplo.com",
    role: "owner",
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

// ── Marca ────────────────────────────────────────────────────────────────────

export function makeBrandSettings(overrides: Partial<BrandSettings> = {}): BrandSettings {
  return {
    id: 1,
    brandName: "Botas Don Chuy",
    heroText: "Outlet de botas",
    tagline: "Piel genuina\nHecho en México",
    cartNotice: "Envíos a todo México",
    footerNote: "Celaya, Guanajuato",
    logoUrl: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    ...overrides,
  };
}

// ── Dashboard y reportes ─────────────────────────────────────────────────────

export function makeDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  const kpis = [{ label: "INGRESOS", value: "$12,500.00" }];
  const revenue = [{ date: "13 jul", revenue: 1000 }];
  return {
    kpisByPeriod: { 7: kpis, 30: kpis, 90: kpis },
    profitKpisByPeriod: { 7: kpis, 30: kpis, 90: kpis },
    revenueByPeriod: { 7: revenue, 30: revenue, 90: revenue },
    recentSales: [
      {
        id: "1",
        date: "13 jul, 10:30",
        day: "2026-07-13",
        pieces: 2,
        items: "Bota vaquera ×1",
        savings: 300,
        total: 2000,
        shipping: 160,
        costoTotal: 840,
      },
    ],
    inventory: [
      {
        id: 1,
        name: "Bota vaquera",
        type: "bota",
        stock: 5,
        salePrice: 900,
        unitCost: 500,
        valorInventario: 2500,
      },
    ],
    ...overrides,
  } as DashboardData;
}

export function makeMonthlyReport(overrides: Record<string, unknown> = {}) {
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
    ],
    byCategory: [{ category: "bota", label: "Botas", revenue: 6000, units: 5 }],
    ...overrides,
  };
}

export function makeReplenishmentRow(overrides: Record<string, unknown> = {}) {
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
