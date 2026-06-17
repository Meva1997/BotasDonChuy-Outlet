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
