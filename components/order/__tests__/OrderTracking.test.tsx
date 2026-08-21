import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lookupOrder } from "@/lib/api/orders";
import { useCartStore, type CartItem } from "@/store/cartStore";
import OrderTracking from "../OrderTracking";
import { apiError } from "../../checkout/__tests__/helpers/apiError";
import { makePublicOrder } from "./helpers/factories";

// Página pública: el token en la URL ES la credencial, y la ruta está limitada a
// 30 consultas/min por IP. Las dos cosas que este componente decide (a diferencia
// de cualquier otra query del panel) son deliberadamente restrictivas:
// `retry: false` (un 404 es definitivo, reintentar solo gasta presupuesto) y
// SIN `refetchInterval` (el refresco es manual, nunca automático por tiempo).

jest.mock("../../../lib/api/orders", () => ({
  ...jest.requireActual("../../../lib/api/orders"),
  lookupOrder: jest.fn(),
}));

const lookupOrderMock = lookupOrder as jest.Mock;

function renderTracking(token = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <OrderTracking token={token} />
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  lookupOrderMock.mockReset();
});

describe("OrderTracking", () => {
  it("muestra el estado de carga mientras la consulta está pendiente", () => {
    lookupOrderMock.mockReturnValue(new Promise(() => {}));
    renderTracking();

    expect(screen.getByText("Consultando tu pedido…")).toBeInTheDocument();
  });

  it("muestra el mensaje del backend y no reintenta ante un 404", async () => {
    lookupOrderMock.mockRejectedValue(apiError(404, "No encontramos ningún pedido."));
    renderTracking();

    await waitFor(() =>
      expect(screen.getByText("No encontramos ningún pedido.")).toBeInTheDocument()
    );

    // retry: false — un solo intento, no tres.
    expect(lookupOrderMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Buscar otro pedido" })).toHaveAttribute(
      "href",
      "/pedido"
    );
    expect(screen.getByRole("link", { name: "Volver a la tienda" })).toHaveAttribute(
      "href",
      "/outlet"
    );
  });

  it("renderiza el pedido cuando la consulta resuelve", async () => {
    lookupOrderMock.mockResolvedValue(
      makePublicOrder({ customerName: "Juan Pérez", status: "shipped", paymentStatus: "paid" })
    );
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());

    expect(screen.getByText("Resumen de tu compra")).toBeInTheDocument();
    expect(screen.getByText("Bota vaquera")).toBeInTheDocument();
    expect(screen.getByText(/Celaya, Guanajuato/)).toBeInTheDocument();
  });

  it("el botón 'Actualizar' dispara un refetch manual y muestra el ícono girando", async () => {
    const order = makePublicOrder({ customerName: "Juan Pérez" });
    let resolveRefetch!: (value: typeof order) => void;
    lookupOrderMock
      .mockResolvedValueOnce(order)
      .mockImplementationOnce(
        () => new Promise<typeof order>((resolve) => (resolveRefetch = resolve))
      );
    const { user } = renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(lookupOrderMock).toHaveBeenCalledTimes(1);

    const button = screen.getByRole("button", { name: /Actualizar/ });
    await user.click(button);

    expect(lookupOrderMock).toHaveBeenCalledTimes(2);
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();

    resolveRefetch(order);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(button.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("no vuelve a consultar automáticamente sin una acción del usuario", async () => {
    lookupOrderMock.mockResolvedValue(makePublicOrder({ customerName: "Juan Pérez" }));
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(lookupOrderMock).toHaveBeenCalledTimes(1);

    // Sin refetchInterval: dejar pasar tiempo de sobra en el event loop no debe
    // disparar una segunda consulta por sí solo.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lookupOrderMock).toHaveBeenCalledTimes(1);
  });

  it("incluye la fila de cupón cuando el pedido lo tuvo", async () => {
    lookupOrderMock.mockResolvedValue(
      makePublicOrder({
        customerName: "Juan Pérez",
        couponCode: "PROMO10",
        couponDiscount: 50,
      })
    );
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(screen.getByText("Cupón PROMO10")).toBeInTheDocument();
  });

  it("no revienta cuando couponDiscount viene ausente en la respuesta", async () => {
    const order = makePublicOrder({ customerName: "Juan Pérez" });
    const withoutCouponDiscount: Partial<typeof order> = { ...order };
    delete withoutCouponDiscount.couponDiscount;
    lookupOrderMock.mockResolvedValue(withoutCouponDiscount);
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(screen.queryByText(/Cupón/)).not.toBeInTheDocument();
  });

  it("pinta las referencias de la dirección solo cuando vienen con valor", async () => {
    lookupOrderMock.mockResolvedValue(
      makePublicOrder({
        customerName: "Juan Pérez",
        shippingAddress: {
          street: "Calle 1",
          neighborhood: "Centro",
          city: "Celaya",
          state: "Guanajuato",
          postalCode: "38000",
          references: "Portón negro, junto a la tienda",
        },
      })
    );
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(
      screen.getByText(/Referencias: Portón negro, junto a la tienda/)
    ).toBeInTheDocument();
  });

  it("omite el renglón de referencias cuando vienen en null", async () => {
    lookupOrderMock.mockResolvedValue(makePublicOrder({ customerName: "Juan Pérez" }));
    renderTracking();

    await waitFor(() => expect(screen.getByText("Hola, Juan")).toBeInTheDocument());
    expect(screen.queryByText(/Referencias:/)).not.toBeInTheDocument();
  });

  it("muestra un mensaje genérico cuando el backend nunca respondió (sin response)", async () => {
    const { AxiosError } = await import("axios");
    lookupOrderMock.mockRejectedValue(new AxiosError("Network Error"));
    renderTracking();

    await waitFor(() =>
      expect(
        screen.getByText(/No pudimos conectar con el servidor/)
      ).toBeInTheDocument()
    );
  });
});

// El 3D Secure normalmente sale en un modal y el comprador nunca abandona el
// checkout, donde `completeOrder()` vacía el carrito. Pero algunos emisores
// obligan a salir del sitio: el estado del wizard (que vive en memoria) se
// pierde en el viaje y Stripe devuelve al comprador AQUÍ, con el pago hecho y el
// carrito todavía lleno. Esta página es el único punto donde eso se puede cerrar.
describe("vuelta desde el pago (redirect del 3D Secure)", () => {
  function setSearch(search: string) {
    window.history.replaceState({}, "", `/pedido/token${search}`);
  }

  // Solo importa que el carrito NO esté vacío: estos tests miran su longitud,
  // nunca el contenido. De ahí el artículo mínimo en vez de una factory —
  // los __tests__/ hermanos no comparten helpers (ver CLAUDE.md).
  const cartItem = { id: "1", size: 26, quantity: 1 } as CartItem;

  beforeEach(() => {
    useCartStore.setState({ items: [cartItem] });
  });

  afterEach(() => {
    setSearch("");
    useCartStore.setState({ items: [] });
  });

  it("con redirect_status=succeeded, vacía el carrito", async () => {
    setSearch("?payment_intent=pi_1&redirect_status=succeeded");
    lookupOrderMock.mockResolvedValue(makePublicOrder());
    renderTracking();

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
  });

  // `failed` significa que el pago NO se hizo: el carrito tiene que seguir lleno
  // para poder reintentar. Vaciarlo aquí borraría la compra que se está por
  // rehacer.
  it("con redirect_status=failed, NO toca el carrito", async () => {
    setSearch("?payment_intent=pi_1&redirect_status=failed");
    lookupOrderMock.mockResolvedValue(makePublicOrder());
    renderTracking();

    await waitFor(() => expect(lookupOrderMock).toHaveBeenCalled());
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  // La entrada normal: el enlace del correo, sin parámetros de Stripe.
  it("entrando por el enlace del correo, NO toca el carrito", async () => {
    lookupOrderMock.mockResolvedValue(makePublicOrder());
    renderTracking();

    await waitFor(() => expect(lookupOrderMock).toHaveBeenCalled());
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
