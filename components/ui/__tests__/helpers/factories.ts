import type { Product } from "@/lib/api/products";
import type { CartItem } from "@/store/cartStore";

// Fixtures compartidas por components/ui/__tests__/ — mismo criterio que
// outlet/checkout/order: defaults mínimos válidos + `overrides`.

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Bota vaquera",
    originalPrice: 1000,
    salePrice: 800,
    discountPercent: 20,
    stock: 5,
    type: "bota",
    sizes: [26, 26, 27],
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

export function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const product = overrides.product ?? makeProduct();
  const size = overrides.size ?? 26;
  return {
    id: `${product.id}-${size}`,
    product,
    size,
    quantity: 1,
    ...overrides,
  };
}
