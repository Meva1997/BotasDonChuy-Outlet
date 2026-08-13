import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatPrice } from "@/lib/utils";
import ProductDetailModal from "../ProductDetailModal";
import { makeAdminProduct } from "./helpers/factories";

// Vista de solo lectura del catálogo — no dispara mutations, no necesita
// QueryClientProvider. La rama que importa: `hasSizes: false` debe esconder el
// bloque "Tallas" COMPLETO (Fase 24) — mostrar un bloque vacío ahí sería mentir
// sobre por qué la existencia es 0 tallas pero N piezas.

function setup(overrides: Parameters<typeof makeAdminProduct>[0] = {}) {
  const product = makeAdminProduct(overrides);
  const onClose = jest.fn();
  const onEdit = jest.fn();
  const utils = render(<ProductDetailModal product={product} onClose={onClose} onEdit={onEdit} />);
  return { product, onClose, onEdit, user: userEvent.setup(), ...utils };
}

describe("ProductDetailModal — precios y negocio", () => {
  it("muestra precio original, outlet, descuento, costo, margen y existencia", () => {
    setup({
      originalPrice: 1500,
      salePrice: 900,
      discountPercent: 40,
      unitCost: 500,
      stock: 3,
    });
    expect(screen.getByText(formatPrice(1500))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(900))).toBeInTheDocument();
    expect(screen.getByText("−40%")).toBeInTheDocument();
    expect(screen.getByText(formatPrice(500))).toBeInTheDocument();
    // Margen = salePrice - unitCost = 400
    expect(screen.getByText(formatPrice(400))).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("un margen negativo se pinta distinto (mismo texto, otra clase)", () => {
    setup({ salePrice: 300, unitCost: 500 });
    const margin = screen.getByText(formatPrice(-200));
    expect(margin).toHaveClass("text-red-400");
  });
});

describe("ProductDetailModal — tallas (Fase 24)", () => {
  it("con hasSizes true, agrupa las tallas repetidas en 'talla ×unidades'", () => {
    setup({ hasSizes: true, sizes: [26, 26, 27] });
    expect(screen.getByText("Tallas (unidades)")).toBeInTheDocument();
    expect(screen.getByText("26")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(screen.getByText("27")).toBeInTheDocument();
    expect(screen.getByText("×1")).toBeInTheDocument();
  });

  it("con hasSizes true y sin tallas capturadas, muestra un guion", () => {
    setup({ hasSizes: true, sizes: [] });
    expect(screen.getByText("Tallas (unidades)")).toBeInTheDocument();
    const field = screen.getByText("Tallas (unidades)").closest("div")!;
    expect(within(field).getByText("—")).toBeInTheDocument();
  });

  it("con hasSizes false, NO renderiza el bloque de Tallas — ni siquiera vacío", () => {
    setup({ hasSizes: false, sizes: [], stock: 6 });
    expect(screen.queryByText("Tallas (unidades)")).not.toBeInTheDocument();
    // La existencia sigue visible en su propio campo (arriba, en "Negocio").
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});

describe("ProductDetailModal — visibilidad, código y descripción", () => {
  it("badge de visible/oculto refleja product.visible", () => {
    const { rerender } = setup({ visible: true });
    expect(screen.getByText("Visible en catálogo")).toBeInTheDocument();

    rerender(
      <ProductDetailModal
        product={makeAdminProduct({ visible: false })}
        onClose={jest.fn()}
        onEdit={jest.fn()}
      />
    );
    expect(screen.getByText("Oculto")).toBeInTheDocument();
  });

  it("código ausente cae a un guion", () => {
    setup({ code: null });
    const field = screen.getByText("Código / SKU").closest("div")!;
    expect(within(field).getByText("—")).toBeInTheDocument();
  });

  it("descripción ausente muestra el aviso 'Sin descripción'", () => {
    setup({ description: null });
    expect(screen.getByText("Sin descripción")).toBeInTheDocument();
  });

  it("con descripción, la muestra tal cual", () => {
    setup({ description: "Piel genuina, hecho a mano" });
    expect(screen.getByText("Piel genuina, hecho a mano")).toBeInTheDocument();
  });
});

describe("ProductDetailModal — fechas", () => {
  it("muestra creado y actualizado cuando ambos existen", () => {
    setup({ createdAt: "2026-01-05T12:00:00.000Z", updatedAt: "2026-02-10T12:00:00.000Z" });
    expect(screen.getByText(/Creado/)).toBeInTheDocument();
    expect(screen.getByText(/actualizado/)).toBeInTheDocument();
  });

  it("sin createdAt/updatedAt, no muestra la línea de fechas", () => {
    setup({ createdAt: undefined, updatedAt: undefined });
    expect(screen.queryByText(/Creado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/actualizado/)).not.toBeInTheDocument();
  });

  it("una fecha inválida se trata como ausente", () => {
    setup({ createdAt: "no-es-una-fecha", updatedAt: undefined });
    expect(screen.queryByText(/Creado/)).not.toBeInTheDocument();
  });
});

describe("ProductDetailModal — cierre e interacción", () => {
  it("cerrar con el botón X invoca onClose", async () => {
    // Dos botones comparten el nombre accesible "Cerrar" (la X del encabezado y
    // el del footer) — la X es el primero en el DOM.
    const { onClose, user } = setup();
    await user.click(screen.getAllByRole("button", { name: "Cerrar" })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cerrar con el botón del footer invoca onClose", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getAllByRole("button", { name: "Cerrar" })[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic en el backdrop invoca onClose", () => {
    const { onClose, container } = setup();
    fireEvent.click(container.querySelector('[aria-hidden="true"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic dentro del panel NO invoca onClose (stopPropagation)", async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("tecla Escape invoca onClose", () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("otra tecla no invoca onClose", () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("'Editar' invoca onEdit", async () => {
    const { onEdit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("desmontar quita el listener de teclado (Escape no hace nada después)", () => {
    const { onClose, unmount } = setup();
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ProductDetailModal — imagen", () => {
  it("con imageSrc, muestra la foto del producto", () => {
    setup({ imageSrc: "https://img/1.png", name: "Bota vaquera" });
    expect(screen.getByAltText("Bota vaquera")).toHaveAttribute("src", "https://img/1.png");
  });

  it("sin imageSrc, cae al placeholder cruzado", () => {
    const { container } = setup({ imageSrc: null });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("ProductDetailModal — categoría y código en el encabezado", () => {
  it("con código, lo concatena tras la categoría", () => {
    setup({ type: "sombrero", code: "SOM-9" });
    expect(screen.getByText("Sombrero · SOM-9")).toBeInTheDocument();
  });

  it("sin código, solo muestra la categoría", () => {
    setup({ type: "sombrero", code: null });
    expect(screen.getByText("Sombrero")).toBeInTheDocument();
  });
});
