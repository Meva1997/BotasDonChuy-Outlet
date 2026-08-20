import { getProductById, getProducts, productKeys } from "../products";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeProduct, makeProductsResult, omit } from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

describe("getProducts", () => {
  it("manda los filtros como query params y parsea el envoltorio paginado", async () => {
    const result = makeProductsResult();
    mock.ok(result);

    await expect(
      getProducts({ categoria: "bota", talla: 26, page: 2, perPage: 12 })
    ).resolves.toEqual(result);

    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/products");
    expect(mock.lastCall().params).toEqual({
      categoria: "bota",
      talla: 26,
      page: 2,
      perPage: 12,
    });
  });

  it("manda los filtros de la Fase 18 (q/orden/precioMin/precioMax) tal cual", async () => {
    // Van sin sanear a propósito: quien limpia es lib/domain/catalogFilters.ts
    // antes de llegar aquí, y el backend ignora en silencio lo que no entienda.
    mock.ok(makeProductsResult());

    await getProducts({
      q: "vaquera",
      orden: "precio_asc",
      precioMin: 500,
      precioMax: 1500,
    });

    expect(mock.lastCall().params).toEqual({
      q: "vaquera",
      orden: "precio_asc",
      precioMin: 500,
      precioMax: 1500,
    });
  });

  it("sin filtros manda un objeto de params vacío", async () => {
    mock.ok(makeProductsResult());

    await getProducts();

    expect(mock.lastCall().params).toEqual({});
  });

  it("rellena `images` a [] cuando el backend la omite", async () => {
    // El `.default([])` del schema es lo que evita un `.map` sobre `undefined`
    // en la galería de la ficha; sin él, un producto sin fotos revienta la página.
    const sinImagenes = omit(makeProduct(), "images");
    mock.ok(makeProductsResult({ products: [sinImagenes as never] }));

    const result = await getProducts();

    expect(result.products[0].images).toEqual([]);
  });

  it("LANZA si falta el total (parse estricto: es lectura)", async () => {
    // `total`/`totalPages` los calcula el backend YA acotados por los filtros;
    // sin ellos la paginación pintaría páginas que no existen.
    mock.ok(omit(makeProductsResult(), "total"));

    await expect(getProducts()).rejects.toThrow();
  });

  it("LANZA si un producto no trae dimensiones (las exige la cotización de envío)", async () => {
    const sinPeso = omit(makeProduct(), "weightKg");
    mock.ok(makeProductsResult({ products: [sinPeso as never] }));

    await expect(getProducts()).rejects.toThrow();
  });
});

describe("getProductById", () => {
  it("lee el producto por id y lo parsea", async () => {
    const product = makeProduct({ id: 42 });
    mock.ok(product);

    await expect(getProductById(42)).resolves.toEqual(product);
    expect(mock.lastCall().url).toBe("/products/42");
  });

  it("devuelve null en 404 (producto inexistente o no visible)", async () => {
    // Es lo que convierte una URL indexada de una pieza descontinuada en un 404
    // limpio de Next en vez de un 500 sin manejar.
    mock.httpError(404, { message: "No encontrado" });

    await expect(getProductById(999999)).resolves.toBeNull();
  });

  it("RELANZA cualquier otro error: solo el 404 significa 'no existe'", async () => {
    // Tragarse un 500 como `null` pintaría "producto no encontrado" sobre una
    // caída del backend, y la pieza quedaría de-indexada por un problema pasajero.
    mock.httpError(500);

    await expect(getProductById(1)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("RELANZA un fallo de red (sin response)", async () => {
    mock.networkError();

    await expect(getProductById(1)).rejects.toBeDefined();
  });

  it("RELANZA un cuerpo que no valida el schema", async () => {
    mock.ok({ id: 1, name: "Bota" });

    await expect(getProductById(1)).rejects.toThrow();
  });
});

describe("productKeys", () => {
  it("`filtered` mete los filtros en la key para que cada combinación cachee aparte", () => {
    expect(productKeys.all).toEqual(["products"]);
    expect(productKeys.filtered({ categoria: "bota", page: 2 })).toEqual([
      "products",
      { categoria: "bota", page: 2 },
    ]);
  });
});
