import { render, screen } from "@testing-library/react";
import PaymentSection from "../PaymentSection";
import { isStripeTestMode } from "@/lib/stripe/client";

/**
 * El panel de pago es casi todo marco, pero decide dos cosas que sí importan:
 * qué se le promete al comprador sobre el cobro (el sello "Modo de prueba" y el
 * número de la tarjeta de prueba NO pueden aparecer en producción), y que un
 * checkout sin llave publicable lo diga en vez de dejar un hueco donde debería
 * ir el formulario.
 *
 * El Payment Element real es un iframe de Stripe: en jsdom no monta nada, así
 * que se sustituye por un marcador. Lo que se prueba aquí es qué se renderiza,
 * no lo que hace Stripe dentro del iframe.
 */
jest.mock("@stripe/react-stripe-js", () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
}));

// Ruta relativa: jest.mock() la resuelve con el resolver de Jest, que no conoce
// el alias "@/" (ver la nota en CLAUDE.md).
jest.mock("../../../lib/stripe/client", () => ({
  isStripeTestMode: jest.fn(),
}));

const isStripeTestModeMock = isStripeTestMode as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("modo de prueba", () => {
  it("con llave de prueba, muestra el sello y la tarjeta de prueba", () => {
    isStripeTestModeMock.mockReturnValue(true);
    render(<PaymentSection state="ready" />);

    expect(screen.getByText("Modo de prueba")).toBeInTheDocument();
    expect(screen.getByText("4242 4242 4242 4242")).toBeInTheDocument();
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
  });

  // Lo que este test protege es una promesa: en producción nadie debe leer que
  // su pago es de mentira, ni un número de tarjeta que no es el suyo.
  it("con llave viva, no aparece ni el sello ni la tarjeta de prueba", () => {
    isStripeTestModeMock.mockReturnValue(false);
    render(<PaymentSection state="ready" />);

    expect(screen.queryByText("Modo de prueba")).not.toBeInTheDocument();
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
  });
});

describe("pasarela no configurada", () => {
  it("avisa en vez de dejar el hueco del formulario", () => {
    isStripeTestModeMock.mockReturnValue(false);
    render(<PaymentSection state="unavailable" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Los pagos no están disponibles en este momento."
    );
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
  });

  // El hint de la tarjeta de prueba cuelga del Element: sin formulario que
  // rellenar, dar un número que teclear no tendría a dónde ir.
  it("sin pasarela, tampoco ofrece la tarjeta de prueba", () => {
    isStripeTestModeMock.mockReturnValue(true);
    render(<PaymentSection state="unavailable" />);

    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
  });
});
