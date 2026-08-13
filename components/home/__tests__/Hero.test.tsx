import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Hero from "../Hero";
import { getProducts } from "@/lib/api/products";

// Hero pide un `getProducts({ categoria, perPage: 1 })` POR categoría — tres
// queries independientes, una por hook `useCategoryCount` — y solo le importa
// `total` de la respuesta (perPage:1 la mantiene liviana). Antes de que resuelva,
// el conteo cae a 0 vía `data?.total ?? 0`, no a un estado de carga separado.

jest.mock("../../../lib/api/products", () => ({
  ...jest.requireActual("../../../lib/api/products"),
  getProducts: jest.fn(),
}));

const getProductsMock = getProducts as jest.Mock;

const COUNTS: Record<string, number> = { bota: 12, sombrero: 4, ropa: 7 };

function renderHero() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Hero />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getProductsMock.mockReset();
  getProductsMock.mockImplementation(async (filters: { categoria: string }) => ({
    products: [],
    total: COUNTS[filters.categoria] ?? 0,
    page: 1,
    perPage: 1,
    totalPages: 1,
    availableSizes: [],
  }));
});

describe("Hero", () => {
  it("renderiza el eyebrow, el título y la tagline de la marca", () => {
    renderHero();

    expect(
      screen.getByText("Liquidación final · Sin reposición")
    ).toBeInTheDocument();
    expect(screen.getByText("Botas Don Chuy")).toBeInTheDocument();
    expect(screen.getByText("Outlet")).toBeInTheDocument();
    expect(
      screen.getByText("Piezas únicas. Sin reposición.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cuando se acaba, se acaba.")
    ).toBeInTheDocument();
  });

  it("el CTA enlaza a /outlet", () => {
    renderHero();

    expect(screen.getByRole("link", { name: "Ver Outlet" })).toHaveAttribute(
      "href",
      "/outlet"
    );
  });

  it("pide getProducts con { categoria, perPage: 1 } por cada categoría", async () => {
    renderHero();

    await waitFor(() => expect(getProductsMock).toHaveBeenCalledTimes(3));
    expect(getProductsMock).toHaveBeenCalledWith({ categoria: "bota", perPage: 1 });
    expect(getProductsMock).toHaveBeenCalledWith({ categoria: "sombrero", perPage: 1 });
    expect(getProductsMock).toHaveBeenCalledWith({ categoria: "ropa", perPage: 1 });
  });

  it("muestra el conteo de piezas (total) resuelto por categoría", async () => {
    renderHero();

    expect(await screen.findByText("12 Piezas")).toBeInTheDocument();
    expect(await screen.findByText("4 Piezas")).toBeInTheDocument();
    expect(await screen.findByText("7 Piezas")).toBeInTheDocument();
  });

  it("antes de resolver la query, el conteo parte de 0 (no un loader aparte)", () => {
    getProductsMock.mockImplementation(() => new Promise(() => {})); // nunca resuelve
    renderHero();

    expect(screen.getAllByText("0 Piezas")).toHaveLength(3);
  });

  it("renderiza una tarjeta por categoría enlazando a su ruta dedicada", () => {
    renderHero();

    expect(screen.getByRole("link", { name: /Botas/ })).toHaveAttribute("href", "/botas");
    expect(screen.getByRole("link", { name: /Sombreros/ })).toHaveAttribute(
      "href",
      "/sombreros"
    );
    expect(screen.getByRole("link", { name: /Ropa/ })).toHaveAttribute("href", "/ropa");
  });
});
