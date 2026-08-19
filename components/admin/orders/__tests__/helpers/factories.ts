import type { AdminOrder, AdminOrderItem } from "@/lib/api/adminOrders";

// Fixtures compartidas por components/admin/orders/__tests__/ — mismo criterio que
// components/checkout/__tests__/helpers/factories.ts: defaults mínimos válidos +
// `overrides`, para que ninguna suite invente su propia forma de `AdminOrder`
// (contrato grande — status/paymentStatus/shipmentStatus/skydropx* — que diverge en
// silencio si cada test lo arma a mano). El default es un pedido `paid` con tarifa
// de Skydropx y sin guía, porque es el estado donde más ramas están disponibles
// (cancelable, marcable como enviado, reintentable la guía).

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
    // Constancia de aceptación de términos (Fase 27). El default es `null` —el
    // pedido anterior al registro— y no una constancia plausible: es el caso que
    // debe pintarse como "sin constancia", y tenerlo por defecto obliga a que
    // cualquier test que afirme lo contrario lo declare explícitamente.
    termsAcceptedAt: null,
    termsVersion: null,
    termsAcceptedIp: null,
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z",
    items: [makeAdminOrderItem()],
    ...overrides,
  };
}
