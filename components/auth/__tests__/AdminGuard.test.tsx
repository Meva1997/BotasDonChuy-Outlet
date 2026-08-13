import { screen, waitFor } from "@testing-library/react";
import { getMe } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import AdminGuard from "../AdminGuard";
import { apiError } from "./helpers/apiError";
import { renderWithQueryClient } from "./helpers/render";

// Protege /admin. La distinción que importa aquí es 401 vs. no-401: un 401 real
// lo maneja el interceptor de lib/api/client.ts (cierra sesión → token → null →
// esta pantalla redirige por la rama de "sin token", fuera del alcance de este
// componente). Lo que SÍ decide AdminGuard es no bloquear el acceso ante un
// error no-401 (500/red) — una caída transitoria del backend no debe encerrar
// al admin fuera de su propio panel.

jest.mock("../../../lib/api/auth", () => ({
  ...jest.requireActual("../../../lib/api/auth"),
  getMe: jest.fn(),
}));

const getMeMock = getMe as jest.Mock;
const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const USER = { id: "1", name: "Dueño", email: "dueno@botasdonchuy.com", role: "owner" as const };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
});

describe("sin token", () => {
  it("no renderiza el panel y redirige a /login", async () => {
    renderWithQueryClient(
      <AdminGuard>
        <div>Panel</div>
      </AdminGuard>
    );

    expect(screen.getByText("Verificando sesión…")).toBeInTheDocument();
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(getMeMock).not.toHaveBeenCalled();
  });
});

describe("con token", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: "tok-123", user: null });
  });

  it("mientras /auth/me está pendiente, muestra el spinner y no el panel", async () => {
    let resolve: (value: typeof USER) => void = () => {};
    getMeMock.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      })
    );
    renderWithQueryClient(
      <AdminGuard>
        <div>Panel</div>
      </AdminGuard>
    );

    expect(screen.getByText("Verificando sesión…")).toBeInTheDocument();
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();

    resolve(USER);
    await screen.findByText("Panel");
  });

  it("con /auth/me exitoso, renderiza el panel y rehidrata el usuario", async () => {
    getMeMock.mockResolvedValueOnce(USER);
    renderWithQueryClient(
      <AdminGuard>
        <div>Panel</div>
      </AdminGuard>
    );

    expect(await screen.findByText("Panel")).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user).toEqual(USER));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("con un error NO-401 (red/500), no bloquea: igual renderiza el panel", async () => {
    getMeMock.mockRejectedValueOnce(apiError(500));
    renderWithQueryClient(
      <AdminGuard>
        <div>Panel</div>
      </AdminGuard>
    );

    expect(await screen.findByText("Panel")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
