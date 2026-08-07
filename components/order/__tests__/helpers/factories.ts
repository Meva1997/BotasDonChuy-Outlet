import type { PublicOrder, PublicOrderItem } from "@/lib/api/orders";

// Fixtures compartidas por components/order/__tests__/ — mismo criterio que
// components/checkout/__tests__/helpers/factories.ts: defaults mínimos válidos +
// `overrides`, para que ninguna suite invente su propia forma de `PublicOrder`.

export function makePublicOrderItem(
  overrides: Partial<PublicOrderItem> = {}
): PublicOrderItem {
  return {
    nameSnapshot: "Bota vaquera",
    size: 26,
    quantity: 1,
    unitOriginalPrice: 1000,
    unitSalePrice: 800,
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
    items: [makePublicOrderItem()],
    ...overrides,
  };
}
