import type { Product } from "@/lib/api/products";
import type { CartItem } from "@/store/cartStore";

// Fixtures de components/home/__tests__/ — duplicadas a propósito de las de
// components/ui/__tests__/helpers/: un `__tests__/` no importa de una carpeta
// hermana (mismo criterio que el `apiError.ts` duplicado entre checkout/ y
// auth/). Aquí solo hacen falta para el conteo del carrito en NavHeader, así
// que el producto se queda en lo mínimo válido.

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
