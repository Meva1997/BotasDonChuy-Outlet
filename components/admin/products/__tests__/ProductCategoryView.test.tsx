import { screen, within } from "@testing-library/react";
import { deleteProduct } from "@/lib/api/adminProducts";
import { CATEGORIES } from "@/lib/domain/categories";
import { formatPrice } from "@/lib/utils";
import ProductCategoryView from "../ProductCategoryView";
import { apiError } from "./helpers/apiError";
import { makeAdminProduct } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// El listado por categoría: paginación "cargar más", el atajo a ver/editar/eliminar un
// producto, y el borrado inline (sin window.confirm). Monta ProductForm/ProductDetailModal
// de verdad al navegar — por eso también mockea create/update/imágenes, no solo delete.

jest.mock("../../../../lib/api/adminProducts", () => ({
  ...jest.requireActual("../../../../lib/api/adminProducts"),
  deleteProduct: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  addProductImages: jest.fn(),
  deleteProductImage: jest.fn(),
}));

const deleteProductMock = deleteProduct as jest.Mock;

const BOTA = CATEGORIES.find((c) => c.type === "bota")!;

beforeEach(() => {
  jest.clearAllMocks();
});

function renderView(products = [makeAdminProduct()], onBack = jest.fn()) {
  const utils = renderWithQueryClient(
    <ProductCategoryView category={BOTA} products={products} onBack={onBack} />
  );
  return { onBack, ...utils };
}

describe("ProductCategoryView — listado", () => {
  it("muestra el estado vacío sin productos", () => {
    renderView([]);
    expect(screen.getByText("Sin productos en esta categoría")).toBeInTheDocument();
  });

  it("lista nombre, precios, descuento y existencia por renglón", () => {
    const product = makeAdminProduct({
      name: "Bota vaquera",
      originalPrice: 1500,
      salePrice: 900,
      discountPercent: 40,
      stock: 5,
    });
    renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    expect(within(row).getByText(formatPrice(1500))).toBeInTheDocument();
    expect(within(row).getByText(formatPrice(900))).toBeInTheDocument();
    expect(within(row).getByText("−40%")).toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
  });

  it("el encabezado suma el total de productos y de existencia", () => {
    renderView([
      makeAdminProduct({ id: 1, name: "A", stock: 3 }),
      makeAdminProduct({ id: 2, name: "B", stock: 4 }),
    ]);
    expect(screen.getByText("2 productos · 7 en existencia")).toBeInTheDocument();
  });

  it("muestra la foto cuando el producto tiene imageSrc", () => {
    renderView([makeAdminProduct({ name: "Con foto", imageSrc: "https://img/1.png" })]);
    const row = screen.getByText("Con foto").closest("tr")!;
    // El thumbnail usa alt="" (decorativo) — sin rol "img" accesible, se busca en el DOM.
    expect(row.querySelector("img")).toHaveAttribute("src", "https://img/1.png");
  });

  it("cae al placeholder cruzado sin imageSrc", () => {
    renderView([makeAdminProduct({ name: "Sin foto", imageSrc: null })]);
    const row = screen.getByText("Sin foto").closest("tr")!;
    expect(row.querySelector("img")).not.toBeInTheDocument();
    expect(row.querySelector("svg")).toBeInTheDocument();
  });
});

describe("ProductCategoryView — paginación", () => {
  const many = Array.from({ length: 15 }, (_, i) =>
    makeAdminProduct({ id: i + 1, name: `Producto ${i + 1}` })
  );

  it("no muestra 'Cargar más' con 10 o menos productos", () => {
    renderView(many.slice(0, 10));
    expect(screen.queryByText(/Cargar más/)).not.toBeInTheDocument();
  });

  it("muestra 'Cargar más' con el resto pendiente, y crece de 10 en 10", async () => {
    const { user } = renderView(many);
    expect(screen.getByText("Cargar más · 5 restantes")).toBeInTheDocument();
    expect(screen.queryByText("Producto 11")).not.toBeInTheDocument();

    await user.click(screen.getByText("Cargar más · 5 restantes"));

    expect(screen.getByText("Producto 11")).toBeInTheDocument();
    expect(screen.getByText("Producto 15")).toBeInTheDocument();
    expect(screen.queryByText(/Cargar más/)).not.toBeInTheDocument();
  });
});

describe("ProductCategoryView — navegación a detalle/edición", () => {
  it("clic en el nombre (dentro del renglón) abre el modal de detalle (solo lectura)", async () => {
    const { user } = renderView([makeAdminProduct({ name: "Bota vaquera" })]);
    await user.click(screen.getByText("Bota vaquera"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Bota vaquera")).toBeInTheDocument();
  });

  it("clic en cualquier otra parte del renglón (no solo el nombre) también abre el detalle", async () => {
    // El botón del nombre hace stopPropagation — este caso ejercita el onClick
    // del <tr> mismo, no el del botón.
    const product = makeAdminProduct({ name: "Bota vaquera" });
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getAllByRole("cell")[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Bota vaquera")).toBeInTheDocument();
  });

  it("cerrar el modal de detalle lo desmonta", async () => {
    const { user } = renderView([makeAdminProduct({ name: "Bota vaquera" })]);
    await user.click(screen.getByText("Bota vaquera"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getAllByRole("button", { name: "Cerrar" })[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el botón Editar de un renglón abre el form en modo edición, sin abrir el detalle", async () => {
    const product = makeAdminProduct({ name: "Bota vaquera" });
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'+ Agregar producto' abre el form en modo creación", async () => {
    const { user } = renderView([]);
    await user.click(screen.getByRole("button", { name: "+ Agregar producto" }));
    expect(screen.getByRole("button", { name: "Crear producto" })).toBeInTheDocument();
  });

  it("editar desde el modal de detalle abre el form con ese producto", async () => {
    const product = makeAdminProduct({ name: "Bota vaquera" });
    const { user } = renderView([product]);
    await user.click(screen.getByText("Bota vaquera"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Bota vaquera");
  });

  it("volver del form sin guardar no deja ningún aviso", async () => {
    const { user } = renderView([]);
    await user.click(screen.getByRole("button", { name: "+ Agregar producto" }));
    await user.click(screen.getByRole("button", { name: "Productos" }));

    expect(screen.getByText("Sin productos en esta categoría")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ProductCategoryView — eliminar inline", () => {
  it("cancelar la confirmación no llama a deleteProduct", async () => {
    const product = makeAdminProduct({ name: "Bota vaquera" });
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Eliminar" }));
    await user.click(within(row).getByRole("button", { name: "No" }));

    expect(deleteProductMock).not.toHaveBeenCalled();
    expect(within(row).getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("mientras la eliminación está en curso, el renglón dice 'Eliminando…'", async () => {
    const product = makeAdminProduct({ name: "Bota vaquera" });
    let resolveDelete!: (value: { ok: boolean; softDeleted: boolean }) => void;
    deleteProductMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Eliminar" }));
    await user.click(within(row).getByRole("button", { name: "Sí" }));

    expect(within(row).getByText("Eliminando…")).toBeInTheDocument();

    resolveDelete({ ok: true, softDeleted: false });
    await screen.findByRole("status");
  });

  it("confirmar elimina y muestra el aviso de éxito", async () => {
    const product = makeAdminProduct({ id: 3, name: "Bota vaquera" });
    deleteProductMock.mockResolvedValue({ ok: true, softDeleted: false });
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Eliminar" }));
    await user.click(within(row).getByRole("button", { name: "Sí" }));

    expect(deleteProductMock.mock.calls[0][0]).toBe(3);
    expect(await screen.findByRole("status")).toHaveTextContent("«Bota vaquera» se eliminó.");
  });

  it("un error al eliminar muestra un aviso genérico", async () => {
    const product = makeAdminProduct({ name: "Bota vaquera" });
    deleteProductMock.mockRejectedValue(apiError(500));
    const { user } = renderView([product]);
    const row = screen.getByText("Bota vaquera").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Eliminar" }));
    await user.click(within(row).getByRole("button", { name: "Sí" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos eliminar el producto. Inténtalo de nuevo."
    );
  });

  it("abrir 'Eliminar' en un renglón limpia el aviso de una acción previa", async () => {
    const productA = makeAdminProduct({ id: 1, name: "Producto A" });
    const productB = makeAdminProduct({ id: 2, name: "Producto B" });
    deleteProductMock.mockResolvedValue({ ok: true, softDeleted: false });
    const { user } = renderView([productA, productB]);

    const rowA = screen.getByText("Producto A").closest("tr")!;
    await user.click(within(rowA).getByRole("button", { name: "Eliminar" }));
    await user.click(within(rowA).getByRole("button", { name: "Sí" }));
    expect(await screen.findByRole("status")).toHaveTextContent("«Producto A» se eliminó.");

    const rowB = screen.getByText("Producto B").closest("tr")!;
    await user.click(within(rowB).getByRole("button", { name: "Eliminar" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
