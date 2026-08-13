import { screen } from "@testing-library/react";
import { useCartStore } from "@/store/cartStore";
import { validateCoupon, type CouponPreview } from "@/lib/api/coupons";
import CouponField from "../CouponField";
import { apiError } from "./helpers/apiError";
import { makeCartItem } from "./helpers/factories";
import { renderWithCheckout } from "./helpers/render";

// Es una mutation, no una query (aplicar es un clic deliberado, no un dato que la
// pantalla necesite de entrada — con una query, cada tecla mal escrita gastaría una
// de las 20 consultas/min de la ruta). Nunca calcula el descuento: siempre lo que
// diga /validate. El `message` del backend se pinta verbatim porque distingue la
// causa exacta (no existe, venció, se agotó, cuánto falta para el mínimo).

jest.mock("../../../lib/api/coupons", () => ({
  ...jest.requireActual("../../../lib/api/coupons"),
  validateCoupon: jest.fn(),
}));

const validateCouponMock = validateCoupon as jest.Mock;

function makePreview(overrides: Partial<CouponPreview> = {}): CouponPreview {
  return {
    code: "VERANO25",
    type: "percent",
    value: 25,
    description: null,
    discount: 200,
    netMerchandise: 800,
    remainingRedemptions: 10,
    oncePerCustomer: false,
    perCustomerChecked: false,
    expiresAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ items: [makeCartItem()] });
});

describe("estado inicial (sin cupón aplicado)", () => {
  it("el botón Aplicar empieza deshabilitado y se habilita al escribir", async () => {
    const { user } = renderWithCheckout(<CouponField />);
    const button = screen.getByRole("button", { name: "Aplicar" });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "VERANO25");
    expect(button).toBeEnabled();
  });
});

describe("aplicar un cupón", () => {
  it("al confirmar, muestra el descuento y la descripción que devolvió el backend, tal cual", async () => {
    validateCouponMock.mockResolvedValueOnce(
      makePreview({ discount: 233.5, description: "25% en toda la tienda" })
    );
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "verano25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    // El monto es el que dijo el servidor, no un recálculo local sobre el carrito.
    expect(await screen.findByText("Descuento de $233.50 aplicado.")).toBeInTheDocument();
    expect(screen.getByText("25% en toda la tienda")).toBeInTheDocument();
    expect(screen.getByText("VERANO25")).toBeInTheDocument();
  });

  it("sin descripción, no renderiza el párrafo de descripción", async () => {
    validateCouponMock.mockResolvedValueOnce(makePreview({ description: null }));
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "VERANO25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    // Se afirma el contenido COMPLETO del bloque, no la ausencia de un texto
    // inventado: un `queryByText` de una cadena que de todos modos nunca podría
    // aparecer pasaría igual aunque el componente pintara la descripción siempre.
    const block = (await screen.findByText("VERANO25")).closest("div")!;
    expect(block.textContent).toBe("VERANO25Descuento de $200.00 aplicado.");
  });

  it("Enter en el campo también envía, sin necesidad de apuntar al botón", async () => {
    validateCouponMock.mockResolvedValueOnce(makePreview());
    const { user } = renderWithCheckout(<CouponField />);

    const input = screen.getByLabelText("¿Tienes un cupón?");
    await user.type(input, "VERANO25{Enter}");

    expect(await screen.findByText(/Descuento de/)).toBeInTheDocument();
  });

  it("mientras la mutation está pendiente, el botón muestra '…' y queda deshabilitado", async () => {
    let resolve: (value: CouponPreview) => void = () => {};
    validateCouponMock.mockReturnValueOnce(
      new Promise<CouponPreview>((res) => {
        resolve = res;
      })
    );
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "VERANO25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(await screen.findByRole("button", { name: "…" })).toBeDisabled();
    resolve(makePreview());
    await screen.findByText(/Descuento de/);
  });

  it("con una mutation ya en curso, Enter no dispara una segunda petición", async () => {
    // El botón se deshabilita mientras `mutation.isPending`, pero el atajo de Enter
    // no pasa por el atributo `disabled` — pasa por el mismo guard en `submit()`.
    let resolve: (value: CouponPreview) => void = () => {};
    validateCouponMock.mockReturnValueOnce(
      new Promise<CouponPreview>((res) => {
        resolve = res;
      })
    );
    const { user } = renderWithCheckout(<CouponField />);
    const input = screen.getByLabelText("¿Tienes un cupón?");

    await user.type(input, "VERANO25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    await screen.findByRole("button", { name: "…" });

    await user.type(input, "{Enter}");
    resolve(makePreview());
    await screen.findByText(/Descuento de/);

    expect(validateCouponMock).toHaveBeenCalledTimes(1);
  });
});

describe("rechazo del backend", () => {
  it("muestra el mensaje del backend verbatim, no una copia genérica", async () => {
    validateCouponMock.mockRejectedValueOnce(
      apiError(404, 'El cupón "NOEXISTE" no existe o ya no está disponible.')
    );
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "NOEXISTE");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent('El cupón "NOEXISTE" no existe o ya no está disponible.');
  });

  it("un cupón rechazado no se autoremueve del campo: el texto tecleado se conserva para corregirlo", async () => {
    validateCouponMock.mockRejectedValueOnce(apiError(409, "Este cupón ya se agotó."));
    const { user } = renderWithCheckout(<CouponField />);

    const input = screen.getByLabelText("¿Tienes un cupón?") as HTMLInputElement;
    await user.type(input, "AGOTADO");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    await screen.findByRole("alert");
    expect(input.value).toBe("AGOTADO");
  });

  it("sin mensaje del backend (network error), cae a la copia de conexión", async () => {
    const networkError = new Error("Network Error");
    Object.assign(networkError, { isAxiosError: true, response: undefined });
    validateCouponMock.mockRejectedValueOnce(networkError);
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "VERANO25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/conectar con el servidor/i);
  });
});

describe("quitar un cupón aplicado", () => {
  it("vuelve al campo de captura, vacío, listo para un nuevo intento", async () => {
    validateCouponMock.mockResolvedValueOnce(makePreview());
    const { user } = renderWithCheckout(<CouponField />);

    await user.type(screen.getByLabelText("¿Tienes un cupón?"), "VERANO25");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));
    await screen.findByText(/Descuento de/);

    await user.click(screen.getByRole("button", { name: "Quitar el cupón VERANO25" }));

    expect(await screen.findByLabelText("¿Tienes un cupón?")).toHaveValue("");
    expect(screen.queryByText(/Descuento de/)).not.toBeInTheDocument();
  });
});
