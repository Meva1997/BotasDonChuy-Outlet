import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import LoginForm from "../LoginForm";
import { apiError } from "./helpers/apiError";
import { renderWithQueryClient } from "./helpers/render";

// Login solo distingue 401 (credenciales) y 429 (rate-limit) del backend —
// cualquier otro fallo (red, 500) cae a la copia genérica. La complejidad de
// contraseña NO se valida aquí (ver schemas/auth.ts): un password válido pero
// mal tecleado debe llegar al backend para que sea ESE el que responda 401,
// no quedarse bloqueado por un regex de registro.

jest.mock("../../../lib/api/auth", () => ({
  ...jest.requireActual("../../../lib/api/auth"),
  login: jest.fn(),
}));

const loginMock = login as jest.Mock;
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Correo electrónico"), "dueno@botasdonchuy.com");
  await user.type(screen.getByLabelText("Contraseña"), "Sup3rSecret!");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

describe("envío exitoso", () => {
  it("guarda la sesión y navega a /admin", async () => {
    loginMock.mockResolvedValueOnce({
      token: "tok-123",
      user: { id: "1", name: "Dueño", email: "dueno@botasdonchuy.com", role: "owner" },
    });
    const { user } = renderWithQueryClient(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(useAuthStore.getState().user?.role).toBe("owner");
    expect(pushMock).toHaveBeenCalledWith("/admin");
  });
});

describe("mapeo de errores", () => {
  it("401 → credenciales incorrectas", async () => {
    loginMock.mockRejectedValueOnce(apiError(401));
    const { user } = renderWithQueryClient(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos."
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("429 → mensaje de rate-limit", async () => {
    loginMock.mockRejectedValueOnce(apiError(429));
    const { user } = renderWithQueryClient(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
    );
  });

  it("error genérico (red/500) → copia genérica", async () => {
    loginMock.mockRejectedValueOnce(apiError(500));
    const { user } = renderWithQueryClient(<LoginForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos iniciar sesión. Inténtalo de nuevo."
    );
  });
});

describe("estado del formulario", () => {
  it("mientras la mutation está pendiente, el botón se deshabilita", async () => {
    let resolve: (value: unknown) => void = () => {};
    loginMock.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      })
    );
    const { user } = renderWithQueryClient(<LoginForm />);

    await fillAndSubmit(user);

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
    resolve({
      token: "tok-1",
      user: { id: "1", name: "Dueño", email: "dueno@botasdonchuy.com", role: "owner" },
    });
    await screen.findByRole("button", { name: "Iniciar sesión" });
  });

  it("expone el enlace a recuperar contraseña", () => {
    renderWithQueryClient(<LoginForm />);
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });
});

describe("validación de campos", () => {
  it("correo con formato inválido muestra el error del campo al perder el foco", async () => {
    const { user } = renderWithQueryClient(<LoginForm />);

    await user.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await user.click(screen.getByLabelText("Contraseña"));
    await user.tab();

    expect(
      await screen.findByText("Ingresa un correo electrónico válido")
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("contraseña vacía muestra el error del campo al perder el foco", async () => {
    const { user } = renderWithQueryClient(<LoginForm />);

    await user.click(screen.getByLabelText("Contraseña"));
    await user.tab();

    expect(await screen.findByText("La contraseña es requerida")).toBeInTheDocument();
  });
});
