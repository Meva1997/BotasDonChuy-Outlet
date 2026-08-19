import { screen } from "@testing-library/react";
import { useCartStore } from "@/store/cartStore";
import OrderSummary from "../OrderSummary";
import { makeCartItem } from "./helpers/factories";
import { renderWithCheckout } from "./helpers/render";

// La casilla de aceptación es la puerta del checkout: mientras no se marque, no se
// avanza, y desde la Fase 27 su valor viaja al backend como constancia. Este spec
// cubre esa compuerta, que hasta entonces no tenía ninguna prueba.
//
// El `<input type="checkbox">` no tiene `id`/`htmlFor` (el `<label>` lo envuelve),
// así que se busca por rol y no por nombre accesible.

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  useCartStore.setState({ items: [makeCartItem()] });
});

afterEach(() => {
  useCartStore.setState({ items: [] });
});

function continueButton() {
  return screen.getByRole("button", { name: /continuar a datos de envío/i });
}

describe("OrderSummary — aceptación de términos", () => {
  it("arranca desmarcada y con el botón de continuar deshabilitado", () => {
    renderWithCheckout(<OrderSummary />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(continueButton()).toBeDisabled();
  });

  it("marcar la casilla habilita el botón, y desmarcarla lo vuelve a bloquear", async () => {
    const { user } = renderWithCheckout(<OrderSummary />);
    const checkbox = screen.getByRole("checkbox");

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(continueButton()).toBeEnabled();

    // Desmarcar tiene que revertir el permiso: `acceptedTerms` es lo que después
    // se manda como constancia, y un botón que se queda habilitado dejaría la
    // interfaz afirmando algo que el comprador acaba de retirar.
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(continueButton()).toBeDisabled();
  });

  it("enlaza a los dos documentos que se aceptan, en pestaña aparte", () => {
    // Se abren en otra pestaña a propósito: mandar al comprador fuera del
    // checkout le costaría el carrito y el paso en el que iba.
    renderWithCheckout(<OrderSummary />);

    const terminos = screen.getByRole("link", { name: /términos y condiciones/i });
    const privacidad = screen.getByRole("link", { name: /política de privacidad/i });

    expect(terminos).toHaveAttribute("href", "/terminos");
    expect(privacidad).toHaveAttribute("href", "/privacidad");
    expect(terminos).toHaveAttribute("target", "_blank");
    expect(privacidad).toHaveAttribute("target", "_blank");
  });

  it("con el carrito vacío no hay casilla que marcar", () => {
    useCartStore.setState({ items: [] });

    renderWithCheckout(<OrderSummary />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/tu carrito está vacío/i)).toBeInTheDocument();
  });
});
