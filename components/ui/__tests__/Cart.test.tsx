import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Cart from "../Cart";
import { useCartStore } from "@/store/cartStore";
import { makeCartItem, makeProduct } from "./helpers/factories";

// size === 0 es el centinela de un producto sin tallas (Fase 24) — la fila
// "Talla: N ·" debe desaparecer por completo, no mostrar "Talla: 0". La cantidad
// máxima por talla se deriva de `product.sizes.filter(s => s === item.size).length`
// (una talla repetida = más stock), así que el botón "+" debe deshabilitarse
// exactamente ahí, no en un tope fijo.

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function open(items: ReturnType<typeof makeCartItem>[] = []) {
  useCartStore.setState({ items, isOpen: true });
}

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false });
  pushMock.mockClear();
});

describe("Cart", () => {
  it("no renderiza nada cuando el carrito está cerrado", () => {
    useCartStore.setState({ items: [], isOpen: false });
    render(<Cart />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío y navega a /outlet cerrando el carrito", async () => {
    const user = userEvent.setup();
    open([]);
    render(<Cart />);

    expect(screen.getByText("vacío", { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver outlet" }));

    expect(pushMock).toHaveBeenCalledWith("/outlet");
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("no muestra el resumen de totales cuando el carrito está vacío", () => {
    open([]);
    render(<Cart />);

    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("pluraliza el contador de artículos", () => {
    open([makeCartItem({ quantity: 1 }), makeCartItem({ id: "2-27", size: 27, quantity: 1 })]);
    render(<Cart />);

    expect(screen.getByText("(2 artículos)")).toBeInTheDocument();
  });

  it("no pluraliza con un solo artículo", () => {
    open([makeCartItem({ quantity: 1 })]);
    render(<Cart />);

    expect(screen.getByText("(1 artículo)")).toBeInTheDocument();
  });

  it("muestra la talla cuando size > 0", () => {
    open([makeCartItem({ size: 26 })]);
    render(<Cart />);

    expect(screen.getByText(/Talla: 26/)).toBeInTheDocument();
  });

  it("oculta la talla cuando size es el centinela 0 (producto sin tallas)", () => {
    open([
      makeCartItem({
        size: 0,
        product: makeProduct({ hasSizes: false, sizes: [0, 0, 0] }),
      }),
    ]);
    render(<Cart />);

    expect(screen.queryByText(/Talla:/)).not.toBeInTheDocument();
  });

  it("usa la imagen del producto cuando existe", () => {
    open([
      makeCartItem({
        product: makeProduct({ imageSrc: "https://cdn.example.com/bota.jpg" }),
      }),
    ]);
    render(<Cart />);

    const img = screen.getByAltText("Bota vaquera");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/bota.jpg");
  });

  it.each([
    ["bota", "B"],
    ["sombrero", "S"],
    ["ropa", "R"],
  ] as const)(
    "placeholder de tipo %s muestra la inicial %s cuando no hay imagen",
    (type, initial) => {
      open([makeCartItem({ product: makeProduct({ imageSrc: null, type }) })]);
      render(<Cart />);

      expect(screen.queryByAltText("Bota vaquera")).not.toBeInTheDocument();
      expect(screen.getByText(initial)).toBeInTheDocument();
    },
  );

  it("deshabilita '+' al llegar al stock disponible de la talla", () => {
    // sizes: [26, 26] → stock de talla 26 es 2; quantity ya está en el tope.
    open([
      makeCartItem({
        size: 26,
        quantity: 2,
        product: makeProduct({ sizes: [26, 26] }),
      }),
    ]);
    render(<Cart />);

    expect(screen.getByRole("button", { name: "Aumentar cantidad" })).toBeDisabled();
  });

  it("'+' incrementa la cantidad cuando aún no llega al stock", async () => {
    const user = userEvent.setup();
    open([
      makeCartItem({
        size: 26,
        quantity: 1,
        product: makeProduct({ sizes: [26, 26] }),
      }),
    ]);
    render(<Cart />);

    const plus = screen.getByRole("button", { name: "Aumentar cantidad" });
    expect(plus).not.toBeDisabled();
    await user.click(plus);

    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("'−' hasta 0 elimina el artículo del carrito", async () => {
    const user = userEvent.setup();
    open([makeCartItem({ quantity: 1 })]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: "Disminuir cantidad" }));

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(screen.getByText("vacío", { exact: false })).toBeInTheDocument();
  });

  it("el botón de basura quita el artículo directamente", async () => {
    const user = userEvent.setup();
    open([makeCartItem({ quantity: 3 })]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: "Quitar Bota vaquera" }));

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("muestra precio original tachado, precio outlet y descuento en los totales", () => {
    open([makeCartItem({ quantity: 2 })]); // 1000/800 c/u
    render(<Cart />);

    expect(screen.getByText("Precio original")).toBeInTheDocument();
    expect(screen.getAllByText("$2,000.00").length).toBeGreaterThan(0); // subtotal (aparece también en la fila del item)
    expect(screen.getAllByText("$1,600.00").length).toBeGreaterThan(0); // total
    expect(screen.getByText("−$400.00")).toBeInTheDocument(); // savings
  });

  it("el botón de checkout navega a /checkout y cierra el carrito", async () => {
    const user = userEvent.setup();
    open([makeCartItem()]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: /Proceder al checkout/ }));

    expect(pushMock).toHaveBeenCalledWith("/checkout");
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  it("el botón de cerrar (X) cierra el carrito sin navegar", async () => {
    const user = userEvent.setup();
    open([makeCartItem()]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: "Cerrar carrito" }));

    expect(useCartStore.getState().isOpen).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("el clic en checkout nunca llega a pintar el estado de carga", async () => {
    // Hallazgo documentado en el README de esta carpeta: `setNavigating(true)`,
    // `closeCart()` y `router.push()` viajan en el mismo handler síncrono, así
    // que `isOpen` ya es false en el primer render posterior al clic y
    // AnimatePresence anima la salida con el ÚLTIMO árbol pintado (de antes del
    // clic, con `navigating: false`). El botón sigue diciendo "Proceder al
    // checkout" hasta el final de la animación.
    const user = userEvent.setup();
    open([makeCartItem()]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: /Proceder al checkout/ }));

    expect(
      screen.getByRole("button", { name: /Proceder al checkout/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });

  it("reabrir el carrito tras ir a checkout resetea el estado de carga", async () => {
    // Ejercita el ajuste de estado en render: `if (isOpen !== prevIsOpen) { ...
    // if (isOpen) setNavigating(false) }`. El clic deja `navigating` en true
    // (aunque no se pinte — ver el test anterior) y cierra el carrito; sin ese
    // reset, reabrir mostraría el botón deshabilitado y en "Cargando..." para
    // siempre. Verificado quitando la línea del fuente: este test falla.
    const user = userEvent.setup();
    open([makeCartItem()]);
    render(<Cart />);

    await user.click(screen.getByRole("button", { name: /Proceder al checkout/ }));
    expect(useCartStore.getState().isOpen).toBe(false);

    act(() => {
      useCartStore.setState({ isOpen: true });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Proceder al checkout/ }),
    ).not.toBeDisabled();
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });

  it("hacer clic en el backdrop cierra el carrito", async () => {
    const user = userEvent.setup();
    open([makeCartItem()]);
    const { container } = render(<Cart />);

    const backdrop = container.querySelector('[aria-hidden="true"].fixed.inset-0');
    expect(backdrop).toBeTruthy();
    await user.click(backdrop as Element);

    expect(useCartStore.getState().isOpen).toBe(false);
  });
});
