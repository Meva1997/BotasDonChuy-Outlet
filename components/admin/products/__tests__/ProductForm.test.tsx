import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  addProductImages,
  createProduct,
  deleteProduct,
  deleteProductImage,
  updateProduct,
} from "@/lib/api/adminProducts";
import { CATEGORIES, DEFAULT_DIMENSIONS } from "@/lib/domain/categories";
import ProductForm from "../ProductForm";
import { apiError } from "./helpers/apiError";
import { makeAdminProduct, makeImageFile } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// El único lugar donde se crea/edita/borra un producto real (y su galería, que se
// cobra en Cloudinary). Las ramas que importan: el toggle "Maneja tallas" nunca debe
// mandar los dos campos a la vez (el backend 400ea), el tope de 3 imágenes, y que un
// reintento tras un fallo de imágenes actualice en vez de recrear (evita duplicados).

jest.mock("../../../../lib/api/adminProducts", () => ({
  ...jest.requireActual("../../../../lib/api/adminProducts"),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  addProductImages: jest.fn(),
  deleteProductImage: jest.fn(),
}));

const createProductMock = createProduct as jest.Mock;
const updateProductMock = updateProduct as jest.Mock;
const deleteProductMock = deleteProduct as jest.Mock;
const addProductImagesMock = addProductImages as jest.Mock;
const deleteProductImageMock = deleteProductImage as jest.Mock;

const BOTA = CATEGORIES.find((c) => c.type === "bota")!;

// jsdom no implementa URL.createObjectURL/revokeObjectURL — el form los usa para
// previsualizar imágenes nuevas antes de subirlas.
beforeAll(() => {
  let n = 0;
  URL.createObjectURL = jest.fn(() => `blob:mock-${n++}`);
  URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

describe("ProductForm — valores por defecto", () => {
  it("crear: nombre/precios/dimensiones parten de los defaults de la categoría", () => {
    renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Nueva pieza");
    expect(screen.getByLabelText("Precio original")).toHaveValue(1000);
    expect(screen.getByLabelText("Precio outlet")).toHaveValue(400);
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(DEFAULT_DIMENSIONS.bota.weightKg);
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeInTheDocument();
    expect(screen.getByText("Sin imágenes — el producto se mostrará con un degradado.")).toBeInTheDocument();
  });

  it("los tres atajos de 'volver' llaman a onBack sin aviso", async () => {
    const onBack = jest.fn();
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: "Productos" }));
    await user.click(screen.getByRole("button", { name: "Botas" }));
    await user.click(screen.getByRole("button", { name: /Volver a Botas/ }));
    expect(onBack).toHaveBeenCalledTimes(3);
    expect(onBack).toHaveBeenCalledWith();
  });

  it("editar: los campos parten del producto, no de los defaults", () => {
    const product = makeAdminProduct({ name: "Bota café", weightKg: 2.2 });
    renderWithQueryClient(<ProductForm category={BOTA} product={product} onBack={jest.fn()} />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Bota café");
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(2.2);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });
});

describe("ProductForm — toggle Maneja tallas", () => {
  it("con tallas: muestra el input de tallas y calcula la existencia derivada", () => {
    const product = makeAdminProduct({ hasSizes: true, sizes: [26, 26, 27] });
    renderWithQueryClient(<ProductForm category={BOTA} product={product} onBack={jest.fn()} />);
    expect(screen.getByLabelText(/Tallas — repite una talla/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Cantidad en existencia")).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("sin tallas: muestra 'Cantidad en existencia' en vez del input de tallas", () => {
    const product = makeAdminProduct({ hasSizes: false, sizes: [], stock: 7 });
    renderWithQueryClient(<ProductForm category={BOTA} product={product} onBack={jest.fn()} />);
    expect(screen.getByLabelText("Cantidad en existencia")).toHaveValue(7);
    expect(screen.queryByLabelText(/Tallas — repite una talla/)).not.toBeInTheDocument();
  });

  it("apagar el toggle intercambia el input y el submit manda solo stockQuantity", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 55 }));
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);

    await user.click(screen.getByRole("checkbox", { name: "Maneja tallas" }));
    expect(screen.getByLabelText("Cantidad en existencia")).toBeInTheDocument();

    const stockInput = screen.getByLabelText("Cantidad en existencia");
    await user.clear(stockInput);
    await user.type(stockInput, "5");

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(createProductMock).toHaveBeenCalled());
    const input = createProductMock.mock.calls[0][0];
    expect(input.hasSizes).toBe(false);
    expect(input.stockQuantity).toBe(5);
    expect(input).not.toHaveProperty("sizes");
  });

  it("prender el toggle intercambia de vuelta y el submit manda solo sizes", async () => {
    // Es edición: el flujo va por updateProduct, no por createProduct.
    updateProductMock.mockResolvedValue(makeAdminProduct({ id: 56 }));
    const product = makeAdminProduct({ hasSizes: false, sizes: [], stock: 4 });
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );

    await user.click(screen.getByRole("checkbox", { name: "Maneja tallas" }));
    const sizesInput = screen.getByLabelText(/Tallas — repite una talla/);
    await user.type(sizesInput, "30, 31");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalled());
    const input = updateProductMock.mock.calls[0][1];
    expect(input.hasSizes).toBe(true);
    expect(input.sizes).toBe("30, 31");
    expect(input).not.toHaveProperty("stockQuantity");
  });
});

describe("ProductForm — validación", () => {
  it("precio outlet mayor al original bloquea el submit", async () => {
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    const sale = screen.getByLabelText("Precio outlet");
    await user.clear(sale);
    await user.type(sale, "9999");
    // Al menos una talla, para aislar el error que se está probando.
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(
      await screen.findByText("El precio outlet no puede superar el precio original")
    ).toBeInTheDocument();
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("con tallas activado, sin ninguna talla capturada bloquea el submit", async () => {
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "Crear producto" }));
    expect(await screen.findByText("Agrega al menos una talla")).toBeInTheDocument();
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("sin tallas (toggle apagado), un input vacío de tallas no bloquea el submit", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 57 }));
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    await user.click(screen.getByRole("checkbox", { name: "Maneja tallas" }));

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(createProductMock).toHaveBeenCalled());
  });

  it("cantidad en existencia no entera muestra su propio error, distinto al de tallas", async () => {
    const { user, container } = renderWithQueryClient(
      <ProductForm category={BOTA} onBack={jest.fn()} />
    );
    await user.click(screen.getByRole("checkbox", { name: "Maneja tallas" }));

    const stockInput = screen.getByLabelText("Cantidad en existencia");
    await user.clear(stockInput);
    await user.type(stockInput, "2.5");
    // El input tiene `step={1}`: un clic normal en "Crear producto" dispara la
    // validación NATIVA del navegador (stepMismatch), que cancela el submit
    // ANTES de que React lo vea — nunca llegaría a la validación de zod. Se
    // dispara el evento `submit` directo para probar la rama de zod en sí.
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByText("Debe ser un número entero")).toBeInTheDocument();
    expect(createProductMock).not.toHaveBeenCalled();
  });
});

describe("ProductForm — descuento calculado", () => {
  it("con precio original vacío (NaN), el descuento cae a 0 y muestra un guion", async () => {
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    const original = screen.getByLabelText("Precio original");
    await user.clear(original);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/% de descuento/)).not.toBeInTheDocument();
  });
});

describe("ProductForm — dimensiones por categoría", () => {
  it("crear: cambiar de categoría resetea las dimensiones NO editadas", async () => {
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(DEFAULT_DIMENSIONS.bota.weightKg);

    await user.selectOptions(screen.getByLabelText("Categoría"), "sombrero");

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(DEFAULT_DIMENSIONS.sombrero.weightKg);
    expect(screen.getByLabelText("Largo (cm)")).toHaveValue(DEFAULT_DIMENSIONS.sombrero.lengthCm);
  });

  it("crear: un campo ya editado a mano NO se pisa al cambiar de categoría", async () => {
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    const weight = screen.getByLabelText("Peso (kg)");
    await user.clear(weight);
    await user.type(weight, "9.9");

    await user.selectOptions(screen.getByLabelText("Categoría"), "sombrero");

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(9.9);
    // Un campo intacto sí se resetea al default de la nueva categoría.
    expect(screen.getByLabelText("Largo (cm)")).toHaveValue(DEFAULT_DIMENSIONS.sombrero.lengthCm);
  });

  it("editar: cambiar de categoría NO toca las dimensiones del producto", async () => {
    const product = makeAdminProduct({ weightKg: 2.2 });
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );

    await user.selectOptions(screen.getByLabelText("Categoría"), "sombrero");

    expect(screen.getByLabelText("Peso (kg)")).toHaveValue(2.2);
  });
});

describe("ProductForm — galería de imágenes", () => {
  it("el tile 'Subir foto' abre el selector de archivos oculto", async () => {
    const { container, user } = renderWithQueryClient(
      <ProductForm category={BOTA} onBack={jest.fn()} />
    );
    const clickSpy = jest.spyOn(fileInput(container), "click");
    await user.click(screen.getByRole("button", { name: "Subir foto" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("rechaza un tipo no permitido", () => {
    const { container } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    fireEvent.change(fileInput(container), {
      target: { files: [makeImageFile({ type: "image/gif" })] },
    });
    expect(screen.getByText("Formato no permitido. Usa PNG, JPG o WEBP.")).toBeInTheDocument();
  });

  it("rechaza un archivo mayor a 5 MB", () => {
    const { container } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    fireEvent.change(fileInput(container), {
      target: { files: [makeImageFile({ size: 5 * 1024 * 1024 + 1 })] },
    });
    expect(screen.getByText("Cada imagen debe pesar 5 MB o menos.")).toBeInTheDocument();
  });

  it("con tipo Y tamaño inválidos a la vez, el mensaje de tipo tiene precedencia", () => {
    const { container } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    fireEvent.change(fileInput(container), {
      target: {
        files: [
          makeImageFile({ type: "image/gif" }),
          makeImageFile({ size: 5 * 1024 * 1024 + 1 }),
        ],
      },
    });
    expect(screen.getByText("Formato no permitido. Usa PNG, JPG o WEBP.")).toBeInTheDocument();
    expect(screen.queryByText("Cada imagen debe pesar 5 MB o menos.")).not.toBeInTheDocument();
  });

  it("con la galería llena (3/3), rechaza cualquier archivo nuevo", () => {
    const product = makeAdminProduct({
      images: [
        { url: "https://img/1.png", publicId: "p1" },
        { url: "https://img/2.png", publicId: "p2" },
        { url: "https://img/3.png", publicId: "p3" },
      ],
    });
    const { container } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );
    expect(screen.queryByRole("button", { name: "Subir foto" })).not.toBeInTheDocument();
    fireEvent.change(fileInput(container), { target: { files: [makeImageFile()] } });
    expect(screen.getByText("Máximo 3 imágenes por producto.")).toBeInTheDocument();
  });

  it("acepta solo hasta el cupo disponible y avisa cuántas se agregaron", () => {
    const product = makeAdminProduct({
      images: [
        { url: "https://img/1.png", publicId: "p1" },
        { url: "https://img/2.png", publicId: "p2" },
      ],
    });
    const { container } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );
    fireEvent.change(fileInput(container), {
      target: { files: [makeImageFile({ name: "a.png" }), makeImageFile({ name: "b.png" })] },
    });
    expect(
      screen.getByText("Solo se agregaron 1 — máximo 3 en total.")
    ).toBeInTheDocument();
    expect(screen.getByText("3/3 · PNG/JPG/WEBP · ≤ 5 MB")).toBeInTheDocument();
  });

  it("quitar una imagen existente la saca de la galería (y limpia el error previo)", () => {
    const product = makeAdminProduct({
      images: [{ url: "https://img/1.png", publicId: "p1" }],
    });
    const { container } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );
    // Deja un error visible primero, para confirmar que quitar la imagen lo limpia.
    fireEvent.change(fileInput(container), {
      target: { files: [makeImageFile({ type: "image/gif" })] },
    });
    expect(screen.getByText("Formato no permitido. Usa PNG, JPG o WEBP.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar imagen" }));

    expect(screen.queryByText("Formato no permitido. Usa PNG, JPG o WEBP.")).not.toBeInTheDocument();
    expect(screen.getByText("0/3 · PNG/JPG/WEBP · ≤ 5 MB")).toBeInTheDocument();
  });

  it("quitar una imagen nueva revoca su blob: preview", () => {
    const { container } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    fireEvent.change(fileInput(container), { target: { files: [makeImageFile()] } });
    expect(screen.getByText("1/3 · PNG/JPG/WEBP · ≤ 5 MB")).toBeInTheDocument();

    const preview = (URL.createObjectURL as jest.Mock).mock.results[0].value;
    fireEvent.click(screen.getByRole("button", { name: "Quitar imagen" }));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
    expect(screen.getByText("0/3 · PNG/JPG/WEBP · ≤ 5 MB")).toBeInTheDocument();
  });

  it("al desmontar, revoca los previews de las imágenes nuevas que quedaron", () => {
    const { container, unmount } = renderWithQueryClient(
      <ProductForm category={BOTA} onBack={jest.fn()} />
    );
    fireEvent.change(fileInput(container), {
      target: { files: [makeImageFile({ name: "a.png" }), makeImageFile({ name: "b.png" })] },
    });
    (URL.revokeObjectURL as jest.Mock).mockClear();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe("ProductForm — guardar", () => {
  it("apagar 'Visible' manda visible: false en el payload", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 11 }));
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");

    const visible = screen.getByRole("checkbox", { name: "Visible" });
    expect(visible).toBeChecked();
    await user.click(visible);
    expect(visible).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(createProductMock).toHaveBeenCalled());
    expect(createProductMock.mock.calls[0][0].visible).toBe(false);
  });

  it("crear sin imágenes: solo llama createProduct", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 10, name: "Nueva pieza" }));
    const onBack = jest.fn();
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={onBack} />);
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(onBack).toHaveBeenCalledWith("«Nueva pieza» se agregó al catálogo."));
    expect(createProductMock).toHaveBeenCalledTimes(1);
    expect(addProductImagesMock).not.toHaveBeenCalled();
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it("crear con una imagen nueva: crea el producto y luego sube la imagen con SU id", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 99, name: "Nueva pieza" }));
    addProductImagesMock.mockResolvedValue(makeAdminProduct({ id: 99 }));
    const { container, user } = renderWithQueryClient(
      <ProductForm category={BOTA} onBack={jest.fn()} />
    );
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");
    const file = makeImageFile();
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(addProductImagesMock).toHaveBeenCalledWith(99, [file]));
  });

  it("editar: borra imágenes quitadas, sube las nuevas y actualiza con PUT", async () => {
    const product = makeAdminProduct({
      id: 42,
      images: [{ url: "https://img/1.png", publicId: "p1" }],
    });
    updateProductMock.mockResolvedValue(product);
    deleteProductImageMock.mockResolvedValue(product);
    addProductImagesMock.mockResolvedValue(product);
    const { container, user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar imagen" }));
    const file = makeImageFile();
    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledWith(42, expect.anything()));
    expect(deleteProductImageMock).toHaveBeenCalledWith(42, "p1");
    expect(addProductImagesMock).toHaveBeenCalledWith(42, [file]);
    expect(createProductMock).not.toHaveBeenCalled();
    // El borrado va ANTES de la subida a propósito: libera cupo dentro del tope
    // de 3. Al revés, cambiar una imagen por otra en una galería llena fallaría.
    expect(deleteProductImageMock.mock.invocationCallOrder[0]).toBeLessThan(
      addProductImagesMock.mock.invocationCallOrder[0]
    );
  });

  it("un reintento tras fallar en la subida de imágenes actualiza, no vuelve a crear", async () => {
    createProductMock.mockResolvedValue(makeAdminProduct({ id: 77 }));
    addProductImagesMock.mockRejectedValueOnce(apiError(502));
    const { container, user } = renderWithQueryClient(
      <ProductForm category={BOTA} onBack={jest.fn()} />
    );
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");
    fireEvent.change(fileInput(container), { target: { files: [makeImageFile()] } });

    await user.click(screen.getByRole("button", { name: "Crear producto" }));
    await screen.findByRole("alert");
    expect(createProductMock).toHaveBeenCalledTimes(1);

    addProductImagesMock.mockResolvedValueOnce(makeAdminProduct({ id: 77 }));
    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledWith(77, expect.anything()));
    // El id ya estaba fijado — el reintento nunca vuelve a crear.
    expect(createProductMock).toHaveBeenCalledTimes(1);
  });

  it("un reintento no vuelve a borrar una imagen que ya se borró", async () => {
    // El borrado de imágenes ocurre ANTES de la subida: si la subida falla, el
    // publicId ya no existe en Cloudinary. Reintentar debe saltárselo — repetirlo
    // pegaría contra una imagen fantasma (404) y dejaría el guardado atorado.
    const product = makeAdminProduct({
      id: 42,
      images: [{ url: "https://img/1.png", publicId: "p1" }],
    });
    updateProductMock.mockResolvedValue(product);
    deleteProductImageMock.mockResolvedValue(product);
    addProductImagesMock.mockRejectedValueOnce(apiError(502));
    const { container, user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Quitar imagen" }));
    fireEvent.change(fileInput(container), { target: { files: [makeImageFile()] } });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await screen.findByRole("alert");
    expect(deleteProductImageMock).toHaveBeenCalledTimes(1);

    addProductImagesMock.mockResolvedValueOnce(product);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(addProductImagesMock).toHaveBeenCalledTimes(2));
    expect(deleteProductImageMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, "Dato inválido", "Dato inválido"],
    [400, undefined, "Revisa los datos del producto e inténtalo de nuevo."],
    [404, undefined, "El producto ya no existe. Vuelve al listado."],
    [502, undefined, "El producto se guardó, pero no pudimos subir las imágenes. Vuelve a intentarlo."],
  ])("mapea el error %i → %s", async (status, message, expected) => {
    createProductMock.mockRejectedValue(apiError(status, message));
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
  });

  it("un error que no es de axios cae al mensaje genérico", async () => {
    createProductMock.mockRejectedValue(new Error("boom"));
    const { user } = renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    await user.type(screen.getByLabelText(/Tallas — repite una talla/), "26");

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el producto. Inténtalo de nuevo."
    );
  });
});

describe("ProductForm — eliminar (solo en edición)", () => {
  it("no ofrece eliminar al crear", () => {
    renderWithQueryClient(<ProductForm category={BOTA} onBack={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("cancelar la confirmación no llama a deleteProduct", async () => {
    const product = makeAdminProduct();
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("¿Eliminar?")).not.toBeInTheDocument();
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it("confirmar elimina y reporta el aviso al volver (hard delete)", async () => {
    const product = makeAdminProduct({ id: 8, name: "Sombrero charro" });
    deleteProductMock.mockResolvedValue({ ok: true, softDeleted: false });
    const onBack = jest.fn();
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={onBack} />
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    await waitFor(() => expect(deleteProductMock).toHaveBeenCalledWith(8));
    expect(onBack).toHaveBeenCalledWith("«Sombrero charro» se eliminó.");
  });

  it("soft-delete avisa que se ocultó en vez de eliminarse", async () => {
    const product = makeAdminProduct({ id: 9, name: "Bota rústica" });
    deleteProductMock.mockResolvedValue({ ok: true, softDeleted: true });
    const onBack = jest.fn();
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={onBack} />
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    await waitFor(() =>
      expect(onBack).toHaveBeenCalledWith(
        "«Bota rústica» se ocultó del catálogo porque tiene pedidos asociados (se conserva para el historial)."
      )
    );
  });

  it("mientras elimina, el botón de confirmación dice 'Eliminando…'", async () => {
    const product = makeAdminProduct();
    let resolveDelete!: (value: { ok: boolean; softDeleted: boolean }) => void;
    deleteProductMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={jest.fn()} />
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    expect(screen.getByText("Eliminando…")).toBeInTheDocument();

    resolveDelete({ ok: true, softDeleted: false });
    await waitFor(() => expect(deleteProductMock).toHaveBeenCalled());
  });

  it("un error al eliminar muestra el aviso y no navega", async () => {
    const product = makeAdminProduct();
    deleteProductMock.mockRejectedValue(apiError(404));
    const onBack = jest.fn();
    const { user } = renderWithQueryClient(
      <ProductForm category={BOTA} product={product} onBack={onBack} />
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El producto ya no existe. Vuelve al listado."
    );
    expect(onBack).not.toHaveBeenCalled();
  });
});
