import {
  addProductImages,
  adminProductKeys,
  createProduct,
  deleteProduct,
  deleteProductImage,
  getAdminProducts,
  updateProduct,
  type AdminProductInput,
} from "../adminProducts";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeAdminProduct, makeFile, omit } from "./helpers/factories";

let mock: MockApi;
let warn: jest.SpyInstance;

beforeEach(() => {
  mock = installMockApi();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
  warn.mockRestore();
});

const conTallas: AdminProductInput = {
  name: "Bota vaquera",
  originalPrice: 1500,
  salePrice: 900,
  unitCost: 500,
  type: "bota",
  hasSizes: true,
  sizes: "26,26,27",
  weightKg: 1.5,
  lengthCm: 35,
  widthCm: 25,
  heightCm: 15,
  visible: true,
};

describe("getAdminProducts", () => {
  it("lee el array plano y lo parsea (incluye unitCost: es ruta de admin)", async () => {
    const products = [makeAdminProduct(), makeAdminProduct({ id: 2, visible: false })];
    mock.ok(products);

    const result = await getAdminProducts();

    expect(result).toEqual(products);
    expect(result[0].unitCost).toBe(500);
    expect(mock.lastCall().url).toBe("/admin/products");
  });

  it("rellena `images` a [] cuando el backend la omite", async () => {
    mock.ok([omit(makeAdminProduct(), "images")]);

    const [product] = await getAdminProducts();

    expect(product.images).toEqual([]);
  });

  it("conserva el publicId de cada imagen (la forma admin sí lo trae)", async () => {
    // Es lo único con lo que se puede borrar el asset en Cloudinary; la ruta
    // pública lo omite a propósito.
    mock.ok([
      makeAdminProduct({
        images: [{ url: "https://cdn/a.jpg", publicId: "botas/a" }],
        imageSrc: "https://cdn/a.jpg",
      }),
    ]);

    const [product] = await getAdminProducts();

    expect(product.images[0].publicId).toBe("botas/a");
  });

  it("LANZA si falta unitCost (parse estricto: es lectura)", async () => {
    mock.ok([omit(makeAdminProduct(), "unitCost")]);

    await expect(getAdminProducts()).rejects.toThrow();
  });

  it("LANZA si falta hasSizes", async () => {
    mock.ok([omit(makeAdminProduct(), "hasSizes")]);

    await expect(getAdminProducts()).rejects.toThrow();
  });
});

describe("createProduct", () => {
  it("postea el payload y devuelve el producto creado", async () => {
    const creado = makeAdminProduct({ id: 9 });
    mock.ok(creado, { status: 201 });

    await expect(createProduct(conTallas)).resolves.toEqual(creado);
    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/products");
    expect(mock.lastCall().body).toEqual(conTallas);
  });

  it("manda `sizes` y NO `stockQuantity` en modo con tallas", async () => {
    // El backend responde 400 si llega el campo del modo contrario, así que el
    // llamador arma el objeto con solo el que corresponde.
    mock.ok(makeAdminProduct(), { status: 201 });

    await createProduct(conTallas);

    expect(mock.lastCall().body).toHaveProperty("sizes");
    expect(mock.lastCall().body).not.toHaveProperty("stockQuantity");
  });

  it("manda `stockQuantity` y NO `sizes` en modo sin tallas", async () => {
    mock.ok(makeAdminProduct({ hasSizes: false }), { status: 201 });

    await createProduct({
      ...omit(conTallas, "sizes"),
      hasSizes: false,
      stockQuantity: 12,
    });

    expect(mock.lastCall().body).toHaveProperty("stockQuantity", 12);
    expect(mock.lastCall().body).not.toHaveProperty("sizes");
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // El producto YA se creó: lanzar invitaría a un reintento que crearía un
    // segundo producto duplicado en el catálogo.
    const crudo = { id: 9, nombre: "Bota" };
    mock.ok(crudo, { status: 201 });

    await expect(createProduct(conTallas)).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "createProduct: la respuesta 2xx no valida AdminProductSchema",
      expect.anything()
    );
  });

  it("propaga el 400 de validación", async () => {
    mock.httpError(400, { message: "El precio de venta no puede superar al original" });

    await expect(createProduct(conTallas)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

describe("updateProduct", () => {
  it("hace PUT al id correcto con el objeto completo", async () => {
    const actualizado = makeAdminProduct({ salePrice: 850 });
    mock.ok(actualizado);

    await expect(updateProduct(7, conTallas)).resolves.toEqual(actualizado);
    expect(mock.lastCall().method).toBe("put");
    expect(mock.lastCall().url).toBe("/admin/products/7");
    expect(mock.lastCall().body).toEqual(conTallas);
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    const crudo = { id: 7 };
    mock.ok(crudo);

    await expect(updateProduct(7, conTallas)).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "updateProduct: la respuesta 2xx no valida AdminProductSchema",
      expect.anything()
    );
  });

  it("propaga el 404 de producto que ya no existe", async () => {
    mock.httpError(404);

    await expect(updateProduct(7, conTallas)).rejects.toMatchObject({
      response: { status: 404 },
    });
  });
});

describe("deleteProduct", () => {
  it("borra por id y distingue el soft-delete", async () => {
    // `softDeleted: true` significa que el producto tiene pedidos y se ocultó en
    // vez de borrarse: es la diferencia entre "ya no está" y "sigue en el
    // histórico de una venta".
    mock.ok({ ok: true, softDeleted: true });

    await expect(deleteProduct(7)).resolves.toEqual({ ok: true, softDeleted: true });
    expect(mock.lastCall().method).toBe("delete");
    expect(mock.lastCall().url).toBe("/admin/products/7");
  });

  it("LANZA si falta softDeleted: el aviso al dueño depende de ese dato", async () => {
    mock.ok({ ok: true });

    await expect(deleteProduct(7)).rejects.toThrow();
  });
});

describe("addProductImages", () => {
  it("sube los archivos como multipart en el campo `images`", async () => {
    mock.ok(makeAdminProduct());

    await addProductImages(7, [
      makeFile({ name: "a.png", type: "image/png" }),
      makeFile({ name: "b.png", type: "image/png" }),
    ]);

    const call = mock.lastCall();
    expect(call.method).toBe("post");
    expect(call.url).toBe("/admin/products/7/images");
    expect(call.body).toBeInstanceOf(FormData);
    expect((call.body as FormData).getAll("images")).toHaveLength(2);
  });

  it("pide multipart para que axios ponga el boundary (pisa el JSON de la instancia)", async () => {
    mock.ok(makeAdminProduct());

    await addProductImages(7, [makeFile()]);

    expect(String(mock.lastCall().headers["Content-Type"])).toContain("multipart/form-data");
  });

  it("devuelve el producto con la galería actualizada", async () => {
    const conFoto = makeAdminProduct({
      images: [{ url: "https://cdn/a.jpg", publicId: "botas/a" }],
    });
    mock.ok(conFoto);

    await expect(addProductImages(7, [makeFile()])).resolves.toEqual(conFoto);
  });

  it("ante un 2xx con cuerpo inesperado avisa y no lanza (la imagen ya se subió)", async () => {
    mock.ok({ id: 7 });

    await expect(addProductImages(7, [makeFile()])).resolves.toEqual({ id: 7 });
    expect(warn).toHaveBeenCalledWith(
      "addProductImages: la respuesta 2xx no valida AdminProductSchema",
      expect.anything()
    );
  });

  it("propaga el 502 de Cloudinary caído", async () => {
    mock.httpError(502, { message: "No pudimos subir la imagen" });

    await expect(addProductImages(7, [makeFile()])).rejects.toMatchObject({
      response: { status: 502 },
    });
  });
});

describe("deleteProductImage", () => {
  it("manda el publicId en el CUERPO de un DELETE", async () => {
    // No va en la URL a propósito: un publicId de Cloudinary lleva `/`, que en la
    // ruta se leería como otro segmento.
    mock.ok(makeAdminProduct());

    await deleteProductImage(7, "botas/abc123");

    expect(mock.lastCall().method).toBe("delete");
    expect(mock.lastCall().url).toBe("/admin/products/7/images");
    expect(mock.lastCall().body).toEqual({ publicId: "botas/abc123" });
  });

  it("ante un 2xx con cuerpo inesperado avisa y no lanza (la imagen ya se borró)", async () => {
    mock.ok({ id: 7 });

    await expect(deleteProductImage(7, "botas/a")).resolves.toEqual({ id: 7 });
    expect(warn).toHaveBeenCalledWith(
      "deleteProductImage: la respuesta 2xx no valida AdminProductSchema",
      expect.anything()
    );
  });
});

describe("adminProductKeys", () => {
  it("expone una key estable, distinta de la del catálogo público", () => {
    expect(adminProductKeys.all).toEqual(["adminProducts"]);
  });
});
