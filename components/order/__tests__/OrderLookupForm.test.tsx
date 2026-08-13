import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderLookupForm from "../OrderLookupForm";

// Único punto de entrada sin token en la URL. Lo único que decide localmente es la
// FORMA de lo pegado (`extractPublicOrderToken`) — nunca si el pedido existe, eso
// es el 404 del backend. Debe aceptar tanto el código pelón como un enlace viejo
// completo, porque los correos ya enviados solo traen el enlace.

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const TOKEN = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

beforeEach(() => {
  pushMock.mockClear();
});

describe("OrderLookupForm", () => {
  it("navega a /pedido/<token> cuando se pega el código pelón", async () => {
    const user = userEvent.setup();
    render(<OrderLookupForm />);

    await user.type(screen.getByLabelText("Código de tu pedido"), TOKEN);
    await user.click(screen.getByRole("button", { name: "Ver mi pedido" }));

    expect(pushMock).toHaveBeenCalledWith(`/pedido/${TOKEN}`);
  });

  it("extrae el token de un enlace completo (correos viejos)", async () => {
    const user = userEvent.setup();
    render(<OrderLookupForm />);

    await user.type(
      screen.getByLabelText("Código de tu pedido"),
      `https://botasdonchuy.com/pedido/${TOKEN}`
    );
    await user.click(screen.getByRole("button", { name: "Ver mi pedido" }));

    expect(pushMock).toHaveBeenCalledWith(`/pedido/${TOKEN}`);
  });

  it("muestra un error y no navega si lo pegado no tiene forma de token", async () => {
    const user = userEvent.setup();
    render(<OrderLookupForm />);

    await user.type(screen.getByLabelText("Código de tu pedido"), "no-es-un-token");
    await user.click(screen.getByRole("button", { name: "Ver mi pedido" }));

    expect(
      screen.getByText(
        "Ese código no parece completo. Cópialo entero desde el correo de confirmación."
      )
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("limpia el error en cuanto se corrige lo pegado", async () => {
    const user = userEvent.setup();
    render(<OrderLookupForm />);

    const input = screen.getByLabelText("Código de tu pedido");
    await user.type(input, "no-es-un-token");
    await user.click(screen.getByRole("button", { name: "Ver mi pedido" }));
    expect(screen.getByText(/no parece completo/)).toBeInTheDocument();

    await user.type(input, "x");

    expect(screen.queryByText(/no parece completo/)).not.toBeInTheDocument();
  });
});
