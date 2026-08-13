import type { AdminOrder, AdminOrderItem } from "@/lib/api/adminOrders";
import type { AdminCoupon } from "@/lib/api/adminCoupons";
import type { Expense, ExpenseSummary } from "@/lib/api/adminExpenses";

// Fixtures compartidas por components/admin/sections/__tests__/. Duplicadas (en
// versión mínima) respecto de las de `orders/`, `coupons/` y `expenses/` a
// propósito: un `__tests__/` no importa entre carpetas hermanas (ver CLAUDE.md).
// Aquí solo llevan lo que las SECCIONES leen —firma de pedido, código de cupón,
// concepto de gasto—, no lo que pintan sus subcomponentes, que ya tienen sus
// propias suites.

export function makeAdminOrderItem(
  overrides: Partial<AdminOrderItem> = {},
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
    customerEmail: "ana@example.com",
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
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z",
    items: [makeAdminOrderItem()],
    ...overrides,
  };
}

/** La respuesta paginada de `GET /admin/orders`, ya armada alrededor de `orders`. */
export function makeOrdersPage(
  orders: AdminOrder[],
  overrides: Partial<{ page: number; perPage: number; total: number; totalPages: number }> = {},
) {
  return {
    orders,
    page: 1,
    perPage: 20,
    total: orders.length,
    totalPages: 1,
    ...overrides,
  };
}

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
  overrides: Partial<ExpenseSummary> = {},
): ExpenseSummary {
  return {
    monthlyRunRate: 290,
    annualRunRate: 3480,
    activeCount: 1,
    byCategory: [{ category: "infraestructura", count: 1, monthlyRunRate: 290 }],
    byFrequency: [{ frequency: "monthly", count: 1, monthlyRunRate: 290 }],
    upcomingDays: 60,
    upcomingTotal: 0,
    upcomingCharges: [],
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
