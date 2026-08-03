import {
  MAX_SEARCH_LENGTH,
  ORDEN_OPTIONS,
  hasActiveFilters,
  isInvertedPriceRange,
  parseOrdenParam,
  parsePageParam,
  parsePriceParam,
  parseSearchParam,
  parseTallaParam,
} from "../catalogFilters";

// Estos parsers son la frontera entre una URL que cualquiera puede escribir a mano
// y el `queryKey` de TanStack Query + los params que viajan al backend. Lo que
// tienen que garantizar: que la basura se convierta en `undefined` (el backend la
// ignora en silencio, así que mandarla solo fragmenta la caché) y que los valores
// legítimos que PARECEN basura —el `0` de `precioMin`— sobrevivan.

describe("parseSearchParam", () => {
  it("devuelve el término recortado", () => {
    expect(parseSearchParam("  bota  ")).toBe("bota");
  });

  it("trata como ausente lo vacío, lo blanco y lo que no es string", () => {
    expect(parseSearchParam("")).toBeUndefined();
    expect(parseSearchParam("   ")).toBeUndefined();
    expect(parseSearchParam(null)).toBeUndefined();
    expect(parseSearchParam(undefined)).toBeUndefined();
  });

  it("acota al mismo tope que el backend", () => {
    const largo = "a".repeat(MAX_SEARCH_LENGTH + 50);
    expect(parseSearchParam(largo)).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it("NO escapa los comodines de SQL: el backend los busca como texto literal", () => {
    expect(parseSearchParam("100%")).toBe("100%");
    expect(parseSearchParam("BTA_9")).toBe("BTA_9");
  });
});

describe("parseOrdenParam", () => {
  it("acepta los tres órdenes del backend", () => {
    for (const { value } of ORDEN_OPTIONS) {
      expect(parseOrdenParam(value)).toBe(value);
    }
  });

  it("colapsa a undefined cualquier valor fuera de la whitelist", () => {
    // Sin esto, cada `?orden=` inventado sería otra entrada de caché con el mismo
    // catálogo dentro.
    expect(parseOrdenParam("basura")).toBeUndefined();
    expect(parseOrdenParam("PRECIO_ASC")).toBeUndefined();
    expect(parseOrdenParam("")).toBeUndefined();
    expect(parseOrdenParam(null)).toBeUndefined();
  });
});

describe("parsePriceParam", () => {
  it("acepta números no negativos, incluido el cero", () => {
    expect(parsePriceParam("1500")).toBe(1500);
    expect(parsePriceParam("1500.5")).toBe(1500.5);
    expect(parsePriceParam("0")).toBe(0);
  });

  it("descarta lo que no es un número finito y no negativo", () => {
    expect(parsePriceParam("abc")).toBeUndefined();
    expect(parsePriceParam("-5")).toBeUndefined();
    expect(parsePriceParam("Infinity")).toBeUndefined();
    expect(parsePriceParam("")).toBeUndefined();
    expect(parsePriceParam("   ")).toBeUndefined();
    expect(parsePriceParam(null)).toBeUndefined();
  });
});

describe("parseTallaParam", () => {
  it("acepta enteros positivos", () => {
    expect(parseTallaParam("28")).toBe(28);
  });

  it("descarta el vacío, el cero, los negativos y los decimales", () => {
    // `?talla=` daba Number("") === 0, que Number.isInteger acepta: filtraba por
    // talla 0 y devolvía el catálogo vacío.
    expect(parseTallaParam("")).toBeUndefined();
    expect(parseTallaParam("0")).toBeUndefined();
    expect(parseTallaParam("-3")).toBeUndefined();
    expect(parseTallaParam("28.5")).toBeUndefined();
    expect(parseTallaParam("grande")).toBeUndefined();
  });
});

describe("parsePageParam", () => {
  it("lee la página pedida", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("cae a 1 ante cualquier valor que no sea una página", () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });
});

describe("hasActiveFilters", () => {
  it("es falso sin filtros", () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it("detecta cada filtro por separado", () => {
    expect(hasActiveFilters({ categoria: "bota" })).toBe(true);
    expect(hasActiveFilters({ talla: 28 })).toBe(true);
    expect(hasActiveFilters({ q: "bota" })).toBe(true);
    expect(hasActiveFilters({ orden: "precio_asc" })).toBe(true);
    expect(hasActiveFilters({ precioMin: 500 })).toBe(true);
    expect(hasActiveFilters({ precioMax: 500 })).toBe(true);
  });

  it("cuenta un precio en 0 como filtro activo", () => {
    expect(hasActiveFilters({ precioMin: 0 })).toBe(true);
  });

  it("ignora la categoría en las rutas que la fijan", () => {
    // En /botas la categoría la pone la ruta: ni es un filtro que el comprador
    // haya elegido, ni "Limpiar filtros" debe quitarla.
    expect(hasActiveFilters({ categoria: "bota" }, { ignoreCategoria: true })).toBe(
      false,
    );
    expect(
      hasActiveFilters({ categoria: "bota", q: "cuadra" }, { ignoreCategoria: true }),
    ).toBe(true);
  });
});

describe("isInvertedPriceRange", () => {
  it("solo es cierto con los dos extremos y el mínimo arriba", () => {
    expect(isInvertedPriceRange(2000, 500)).toBe(true);
    expect(isInvertedPriceRange(500, 2000)).toBe(false);
    expect(isInvertedPriceRange(500, 500)).toBe(false);
    expect(isInvertedPriceRange(2000, undefined)).toBe(false);
    expect(isInvertedPriceRange(undefined, 500)).toBe(false);
    expect(isInvertedPriceRange(undefined, undefined)).toBe(false);
  });
});
