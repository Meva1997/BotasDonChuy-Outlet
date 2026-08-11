import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/products";
import OutletView from "../OutletView";
import { makeProduct, makeProductsResult } from "./helpers/factories";

// OutletView es un client component (no un RSC async): lo que se prueba aquí es
// que la URL manda — nunca filtra/ordena del lado del cliente — y que el debounce
// de texto usa `replace` mientras los controles de un clic (categoría/talla/orden)
// usan `push`. El `<Suspense fallback={<OutletSkeleton />}>` que envuelve a este
// componente vive en las páginas de app/ (ver app/(public)/outlet/page.tsx), no
// aquí, así que no se prueba en esta suite.

jest.mock("../../../lib/api/products", () => ({
  ...jest.requireActual("../../../lib/api/products"),
  getProducts: jest.fn(),
}));

const getProductsMock = getProducts as jest.Mock;

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

function renderOutletView(props: { defaultCategoria?: string } = {}, search = "") {
  mockSearchParams = new URLSearchParams(search);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <OutletView {...props} />
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  getProductsMock.mockReset();
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("OutletView", () => {
  it("lee todos los filtros de la URL y se los pasa a getProducts, ya saneados", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    renderOutletView(
      {},
      "categoria=bota&talla=26&pagina=2&orden=precio_asc&q=vaquera&precioMin=100&precioMax=900"
    );

    await waitFor(() =>
      expect(getProductsMock).toHaveBeenCalledWith({
        categoria: "bota",
        talla: 26,
        page: 2,
        q: "vaquera",
        orden: "precio_asc",
        precioMin: 100,
        precioMax: 900,
      })
    );
  });

  it("defaultCategoria manda sobre la URL y oculta el select de categoría", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    renderOutletView({ defaultCategoria: "sombrero" }, "categoria=bota");

    await waitFor(() =>
      expect(getProductsMock).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "sombrero" })
      )
    );
    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
  });

  it("sin categoría activa no ofrece el select de talla", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());
    // Una talla sin categoría no significa nada: la 27 de bota no es la de sombrero.
    expect(screen.queryByLabelText("Talla")).not.toBeInTheDocument();
  });

  it("con categoría activa ofrece las tallas que devolvió el backend", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ availableSizes: [26, 28] })
    );
    renderOutletView({}, "categoria=bota");

    // El select existe desde el primer render (depende de la URL); las tallas
    // llegan con la respuesta, así que hay que esperar a los datos.
    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());
    const select = screen.getByLabelText("Talla") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "",
      "26",
      "28",
    ]);
  });

  it("en /botas la categoría de la ruta no cuenta como filtro activo", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    renderOutletView({ defaultCategoria: "bota" });

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());
    // `ignoreCategoria`: nada que limpiar, la categoría la fija la ruta.
    expect(
      screen.queryByRole("button", { name: /Limpiar filtros/ })
    ).not.toBeInTheDocument();
  });

  it("muestra el estado de carga mientras la consulta está pendiente", () => {
    getProductsMock.mockReturnValue(new Promise(() => {}));
    renderOutletView();

    expect(screen.getByText("Cargando piezas…")).toBeInTheDocument();
  });

  it("muestra un error con reintentar cuando el backend falla", async () => {
    getProductsMock.mockRejectedValue(new Error("network down"));
    const { user } = renderOutletView();

    await waitFor(() =>
      expect(screen.getByText("No se pudo cargar el inventario")).toBeInTheDocument()
    );
    expect(getProductsMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(getProductsMock).toHaveBeenCalledTimes(2));
  });

  it("un refetch fallido no borra la grilla ya cargada", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    const { queryClient } = renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());

    // El bloque de error es `isError && !result`: con datos previos en mano una
    // caída pasajera del backend no debe vaciar la pantalla que el comprador ya
    // estaba viendo.
    getProductsMock.mockRejectedValue(new Error("network down"));
    await act(async () => {
      await queryClient.refetchQueries();
      // TanStack Query avisa a sus suscriptores en un macrotask: sin este
      // segundo flush se asertaría contra el DOM anterior al error y la prueba
      // pasaría aunque alguien quitara el guard `!result`.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Sin esto la prueba se volvería vacua si el refetch dejara de fallar.
    expect(queryClient.getQueryCache().getAll()[0].state.status).toBe("error");
    expect(
      screen.queryByText("No se pudo cargar el inventario")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bota vaquera")).toBeInTheDocument();
  });

  it("estado vacío sin filtros muestra 'Sin productos disponibles' (Agotado)", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [], total: 0, totalPages: 1 })
    );
    renderOutletView();

    await waitFor(() =>
      expect(screen.getByText("Sin productos disponibles")).toBeInTheDocument()
    );
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Limpiar filtros/ })
    ).not.toBeInTheDocument();
  });

  it("estado vacío con filtros muestra 'No encontramos nada' y ofrece limpiar", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [], total: 0, totalPages: 1 })
    );
    const { user } = renderOutletView({}, "q=nada");

    await waitFor(() =>
      expect(screen.getByText("No encontramos nada")).toBeInTheDocument()
    );
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText(/«nada»/)).toBeInTheDocument();

    const clearButtons = screen.getAllByRole("button", { name: /Limpiar filtros/ });
    await user.click(clearButtons[0]);

    expect(mockPush).toHaveBeenCalled();
  });

  it("estado vacío con rango de precio invertido explica la causa primero", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [], total: 0, totalPages: 1 })
    );
    renderOutletView({}, "precioMin=900&precioMax=100");

    await waitFor(() =>
      expect(screen.getByText("No encontramos nada")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        "El precio mínimo es mayor que el máximo, así que ninguna pieza puede entrar en ese rango."
      )
    ).toBeInTheDocument();
  });

  it("estado vacío con filtros pero sin búsqueda usa el mensaje genérico", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [], total: 0, totalPages: 1 })
    );
    renderOutletView({}, "categoria=bota&talla=26");

    await waitFor(() =>
      expect(screen.getByText("No encontramos nada")).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        "Ninguna pieza coincide con los filtros que elegiste. Prueba quitando alguno."
      )
    ).toBeInTheDocument();
  });

  it("limpiar filtros conserva la categoría en las rutas /botas /sombreros /ropa", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [], total: 0, totalPages: 1 })
    );
    // Caso límite: categoria en la URL aunque la ruta ya la fija por defaultCategoria.
    const { user } = renderOutletView(
      { defaultCategoria: "bota" },
      "q=nada&categoria=bota"
    );

    await waitFor(() =>
      expect(screen.getByText("No encontramos nada")).toBeInTheDocument()
    );

    const clearButtons = screen.getAllByRole("button", { name: /Limpiar filtros/ });
    await user.click(clearButtons[0]);

    expect(mockPush.mock.calls[0][0]).not.toContain("q=");
    expect(mockPush.mock.calls[0][0]).toContain("categoria=bota");
  });

  it("renderiza una tarjeta por producto devuelto por el backend, en el orden recibido", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({
        products: [
          makeProduct({ id: 1, name: "Bota café" }),
          makeProduct({ id: 2, name: "Bota negra" }),
        ],
      })
    );
    renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota café")).toBeInTheDocument());
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Bota café");
    expect(links[1]).toHaveTextContent("Bota negra");
  });

  it("no reordena client-side aunque la respuesta contradiga el `orden` de la URL", async () => {
    // El backend resuelve el orden en SQL sobre TODO el catálogo; reordenar la
    // página que llegó rompería la paginación (la pieza más barata podría estar
    // en la página 3). Si alguien mete un sort local, este test lo caza.
    getProductsMock.mockResolvedValue(
      makeProductsResult({
        products: [
          makeProduct({ id: 1, name: "Pieza cara", salePrice: 900 }),
          makeProduct({ id: 2, name: "Pieza barata", salePrice: 100 }),
        ],
      })
    );
    renderOutletView({}, "orden=precio_asc");

    await waitFor(() => expect(screen.getByText("Pieza cara")).toBeInTheDocument());
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Pieza cara");
    expect(links[1]).toHaveTextContent("Pieza barata");
  });

  it("no filtra client-side: pinta todo lo que vino, aunque no empate con los filtros", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({
        products: [
          makeProduct({ id: 1, name: "Bota agotada", stock: 0 }),
          makeProduct({ id: 2, name: "Sombrero de palma", type: "sombrero" }),
        ],
      })
    );
    renderOutletView({}, "q=bota&categoria=bota&talla=26");

    await waitFor(() => expect(screen.getByText("Bota agotada")).toBeInTheDocument());
    expect(screen.getByText("Sombrero de palma")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("traduce stock === 1 al centinela 'última pieza' para OutletCard", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ products: [makeProduct({ stock: 1 })] })
    );
    renderOutletView();

    await waitFor(() => expect(screen.getByText("Última pieza")).toBeInTheDocument());
  });

  it("muestra la paginación solo cuando hay más de una página", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ page: 1, totalPages: 3 })
    );
    renderOutletView();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument()
    );
  });

  it("ir a una página > 1 pone `pagina` en la URL; volver a 1 la quita", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ page: 2, totalPages: 3 })
    );
    const { user } = renderOutletView({}, "pagina=2");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(mockPush).toHaveBeenLastCalledWith(expect.stringContaining("pagina=3"));

    await user.click(screen.getByRole("button", { name: "1" }));
    expect(mockPush).toHaveBeenLastCalledWith(
      expect.not.stringContaining("pagina")
    );
  });

  it("no muestra paginación con una sola página", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult({ totalPages: 1 }));
    renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();
  });

  it("cambiar la categoría empuja historial (push), no lo reemplaza", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    const { user } = renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText("Categoría"), "bota");

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("categoria=bota"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("cambiar cualquier filtro vuelve a la página 1", async () => {
    getProductsMock.mockResolvedValue(
      makeProductsResult({ page: 3, totalPages: 5 })
    );
    const { user } = renderOutletView({}, "pagina=3&categoria=bota");

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText("Categoría"), "sombrero");

    // La página 3 puede no existir en el resultado nuevo y el backend la clampea
    // sin avisar: quedaría un `pagina=3` en la URL que no describe lo que se ve.
    expect(mockPush).toHaveBeenLastCalledWith(
      expect.not.stringContaining("pagina")
    );
    expect(mockPush).toHaveBeenLastCalledWith(
      expect.stringContaining("categoria=sombrero")
    );
  });

  it("vaciar el buscador quita el param `q` en vez de dejarlo en blanco", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    const { user } = renderOutletView({}, "q=algo");

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());

    const input = screen.getByLabelText("Buscar en el catálogo");
    await user.clear(input);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenLastCalledWith(expect.not.stringContaining("q="))
    );
  });

  it("escribir en el buscador reemplaza la URL (replace), no empuja historial", async () => {
    getProductsMock.mockResolvedValue(makeProductsResult());
    const { user } = renderOutletView();

    await waitFor(() => expect(screen.getByText("Bota vaquera")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Buscar en el catálogo"), "b");

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("q=b"))
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
