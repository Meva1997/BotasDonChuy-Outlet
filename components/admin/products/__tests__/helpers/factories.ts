import type { AdminProduct } from "@/lib/api/adminProducts";

// Fixtures compartidas por components/admin/products/__tests__/ — mismo criterio que
// orders/__tests__/helpers/factories.ts: defaults mínimos válidos + `overrides`, para
// que ningún test invente su propia forma de `AdminProduct`. El default maneja tallas
// (hasSizes: true) con dos tallas capturadas, porque es el estado donde más ramas del
// form están disponibles (toggle a "Cantidad en existencia" es la rama alterna).

/** `File` de imagen de mentira con el peso/tipo pedido — `size` es de solo lectura,
 *  así que se redefine (mismo patrón que `makeXlsxFile` de import/__tests__/). */
export function makeImageFile({
  name = "foto.png",
  size = 1024,
  type = "image/png",
}: { name?: string; size?: number; type?: string } = {}): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

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
