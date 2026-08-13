import {
  CATEGORIES,
  DEFAULT_DIMENSIONS,
  categoryHref,
  categoryPlural,
  categorySingular,
} from "../categories";

// Fuente única de categorías que reemplazó ~10 copias duplicadas del mismo mapa
// singular/plural — el riesgo real aquí es el fallback silencioso ante un `type`
// desconocido (dato corrupto/legacy), no el happy path.

describe("CATEGORIES", () => {
  it("define las tres categorías del catálogo con su ruta dedicada", () => {
    expect(CATEGORIES.map((c) => c.type)).toEqual(["bota", "sombrero", "ropa"]);
    expect(CATEGORIES.map((c) => c.href)).toEqual(["/botas", "/sombreros", "/ropa"]);
  });
});

describe("DEFAULT_DIMENSIONS", () => {
  it("define dimensiones de empaque para cada categoría", () => {
    for (const { type } of CATEGORIES) {
      expect(DEFAULT_DIMENSIONS[type]).toBeDefined();
    }
  });
});

describe("categoryPlural / categorySingular / categoryHref", () => {
  it("resuelven la etiqueta y ruta de una categoría conocida", () => {
    expect(categoryPlural("bota")).toBe("Botas");
    expect(categorySingular("bota")).toBe("Bota");
    expect(categoryHref("bota")).toBe("/botas");
  });

  it("categoryPlural/categorySingular caen al propio valor si la categoría no existe", () => {
    expect(categoryPlural("gorra")).toBe("gorra");
    expect(categorySingular("gorra")).toBe("gorra");
  });

  it("categoryHref cae a /outlet si la categoría no existe", () => {
    expect(categoryHref("gorra")).toBe("/outlet");
  });
});
