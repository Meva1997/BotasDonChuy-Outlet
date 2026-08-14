import { screen, waitFor } from "@testing-library/react";
import type { AdminProduct } from "@/lib/api/adminProducts";
import { getAdminOrders } from "@/lib/api/adminOrders";
import { getAdminProducts } from "@/lib/api/adminProducts";
import PrintPendingOrders from "../PrintPendingOrders";
import { apiError } from "./helpers/apiError";
import { makeAdminOrder, makeAdminOrderItem } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — rutas relativas a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminOrders", () => ({
  ...jest.requireActual("../../../../lib/api/adminOrders"),
  getAdminOrders: jest.fn(),
}));

jest.mock("../../../../lib/api/adminProducts", () => ({
  ...jest.requireActual("../../../../lib/api/adminProducts"),
  getAdminProducts: jest.fn(),
}));

const mockGetOrders = getAdminOrders as jest.MockedFunction<typeof getAdminOrders>;
const mockGetProducts = getAdminProducts as jest.MockedFunction<typeof getAdminProducts>;

// El botón dispara un fetch "todo, sin paginar" (no la página que se ve en
// pantalla) y arma una hoja imprimible en blanco/negro — lo que importa no es
// el estilo sino que: (1) de verdad pida TODOS los pendientes en una sola
// llamada, (2) resuelva el código de producto cruzando contra el catálogo
// completo, y (3) omita el código cuando el producto no tiene uno.

function makeAdminProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: 1,
    name: "Bota vaquera",
    description: null,
    originalPrice: 1000,
    salePrice: 800,
    discountPercent: 20,
    unitCost: 500,
    stock: 3,
    type: "bota",
    sizes: [26],
    hasSizes: true,
    images: [],
    imageSrc: null,
    code: "BV-001",
    weightKg: 1.5,
    lengthCm: 35,
    widthCm: 25,
    heightCm: 15,
    visible: true,
    deletedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetOrders.mockReset();
  mockGetProducts.mockReset();
  window.print = jest.fn();
});

describe("PrintPendingOrders", () => {
  it("al hacer clic pide TODOS los pendientes de enviar en una sola llamada, sin paginar", async () => {
    mockGetOrders.mockResolvedValue({
      orders: [makeAdminOrder()],
      total: 1,
      page: 1,
      perPage: 10_000,
      totalPages: 1,
    });
    mockGetProducts.mockResolvedValue([makeAdminProduct()]);

    const { user } = renderWithQueryClient(<PrintPendingOrders />);
    await user.click(screen.getByRole("button", { name: "Imprimir pendientes" }));

    await waitFor(() =>
      expect(mockGetOrders).toHaveBeenCalledWith(1, 10_000, undefined, "pendientes_envio"),
    );
    expect(mockGetProducts).toHaveBeenCalled();
  });

  it("arma la hoja con cliente, dirección, artículos, código, costo de envío y total", async () => {
    const order = makeAdminOrder({
      items: [
        makeAdminOrderItem({
          productId: 1,
          nameSnapshot: "Bota vaquera",
          size: 26,
          quantity: 2,
          unitSalePrice: 800,
          unitCost: 500,
        }),
      ],
      shipping: 160,
      total: 960,
    });
    mockGetOrders.mockResolvedValue({
      orders: [order],
      total: 1,
      page: 1,
      perPage: 10_000,
      totalPages: 1,
    });
    mockGetProducts.mockResolvedValue([makeAdminProduct({ id: 1, code: "BV-001" })]);

    const { user } = renderWithQueryClient(<PrintPendingOrders />);
    await user.click(screen.getByRole("button", { name: "Imprimir pendientes" }));

    expect(await screen.findByText(`Pedido #${order.id}`)).toBeInTheDocument();
    expect(screen.getByText("03 jul 2026", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(order.customerName, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(order.customerEmail, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(order.customerPhone, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Cód\. BV-001/)).toBeInTheDocument();
    expect(screen.getByText("Costo de envío: $160.00")).toBeInTheDocument();
    expect(screen.getByText("Total: $960.00")).toBeInTheDocument();

    await waitFor(() => expect(window.print).toHaveBeenCalled());
  });

  it("omite el código cuando el producto no tiene uno", async () => {
    const order = makeAdminOrder({
      items: [makeAdminOrderItem({ productId: 2, nameSnapshot: "Corbatín" })],
    });
    mockGetOrders.mockResolvedValue({
      orders: [order],
      total: 1,
      page: 1,
      perPage: 10_000,
      totalPages: 1,
    });
    mockGetProducts.mockResolvedValue([
      makeAdminProduct({ id: 2, name: "Corbatín", code: null }),
    ]);

    const { user } = renderWithQueryClient(<PrintPendingOrders />);
    await user.click(screen.getByRole("button", { name: "Imprimir pendientes" }));

    await screen.findByText(`Pedido #${order.id}`);
    expect(screen.queryByText(/Cód\./)).not.toBeInTheDocument();
  });

  it("muestra un estado de carga mientras prepara el listado", async () => {
    mockGetOrders.mockReturnValue(new Promise(() => {}));
    mockGetProducts.mockReturnValue(new Promise(() => {}));

    const { user } = renderWithQueryClient(<PrintPendingOrders />);
    await user.click(screen.getByRole("button", { name: "Imprimir pendientes" }));

    expect(screen.getByRole("button", { name: "Preparando…" })).toBeDisabled();
  });

  it("si falla el fetch, avisa y no imprime", async () => {
    mockGetOrders.mockRejectedValue(apiError(500));
    mockGetProducts.mockResolvedValue([]);

    const { user } = renderWithQueryClient(<PrintPendingOrders />);
    await user.click(screen.getByRole("button", { name: "Imprimir pendientes" }));

    expect(
      await screen.findByText("No pudimos preparar el listado. Inténtalo de nuevo."),
    ).toBeInTheDocument();
    expect(window.print).not.toHaveBeenCalled();
  });
});
