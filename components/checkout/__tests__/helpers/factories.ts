import type { CartItem } from "@/store/cartStore";
import type { Product } from "@/lib/api/products";
import type { ShippingData } from "@/schemas/checkout";
import type { ShippingRate, SelectedShippingRate } from "@/lib/api/shipping";
import type { OrderResponse } from "@/lib/api/orders";

// Fixtures compartidas por todas las suites de components/checkout/__tests__/. Mismo
// criterio que components/admin/import/__tests__/helpers/factories.ts: defaults
// mínimos válidos + `overrides`, para que ninguna suite invente su propia forma de
// Product/ShippingData/ShippingRate/OrderResponse — contratos grandes que divergen en
// silencio si cada test los arma a mano.

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
    email: "juan@example.com",
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
  return {
    ...makeShippingRate(),
    quotationId: "quotation-1",
    ...overrides,
  };
}

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
    customerEmail: "juan@example.com",
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
