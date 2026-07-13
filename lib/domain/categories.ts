// Fuente única de las categorías de producto y sus etiquetas.
// Antes este mapa estaba duplicado en ~10 archivos, con singular ("Bota") vs
// plural ("Botas") inconsistentes. Todo el front lo lee desde aquí.
export type ProductType = "bota" | "sombrero" | "ropa";

export interface CategoryInfo {
  type: ProductType;
  /** Etiqueta en singular: "Bota". */
  label: string;
  /** Etiqueta en plural: "Botas". */
  plural: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { type: "bota", label: "Bota", plural: "Botas" },
  { type: "sombrero", label: "Sombrero", plural: "Sombreros" },
  { type: "ropa", label: "Ropa", plural: "Ropa" },
];

export interface PackageDimensions {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

// Defaults de empaque por categoría — pre-llenan el ProductForm al crear un
// producto (para no dejar las dimensiones en cero, que es tedioso). Son solo un
// punto de partida razonable: el admin puede editarlos por producto.
export const DEFAULT_DIMENSIONS: Record<ProductType, PackageDimensions> = {
  bota: { weightKg: 1.5, lengthCm: 35, widthCm: 25, heightCm: 15 },
  sombrero: { weightKg: 0.6, lengthCm: 40, widthCm: 40, heightCm: 20 },
  ropa: { weightKg: 0.5, lengthCm: 30, widthCm: 25, heightCm: 6 },
};

const PLURAL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.type, c.plural]),
);
const SINGULAR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.type, c.label]),
);

/** "bota" → "Botas" (cae al propio valor si la categoría no existe). */
export const categoryPlural = (type: string): string => PLURAL[type] ?? type;

/** "bota" → "Bota". */
export const categorySingular = (type: string): string => SINGULAR[type] ?? type;
