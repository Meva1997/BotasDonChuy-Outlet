import type { Product, ProductsResult } from "@/lib/api/products";

// Fixtures compartidas por components/outlet/__tests__/ — mismo criterio que
// checkout/order/import: defaults mínimos válidos + `overrides`, para que ninguna
// suite invente su propia forma de Product/ProductsResult.

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
