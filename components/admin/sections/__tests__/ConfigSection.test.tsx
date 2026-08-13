import { screen } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import ConfigSection from "../ConfigSection";
import { renderWithQueryClient } from "./helpers/render";

const mockPush = jest.fn();

// `jest.mock("@/...")` no resuelve — rutas relativas a propósito (ver CLAUDE.md).
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../../../../lib/api/adminUsers", () => ({
  ...jest.requireActual("../../../../lib/api/adminUsers"),
  getAdminUsers: jest.fn().mockResolvedValue([]),
}));

// El contenedor de configuración no decide casi nada —`AccountCard` y
// `AdminsCard` tienen sus propias suites— salvo una cosa que sí importa: cerrar
// sesión tiene que **limpiar el store y además navegar**. Con solo el `logout()`,
// el panel se queda pintado sin token hasta que algo dispare una petición y el
// interceptor de axios redirija; con solo el `push`, la sesión sigue viva.

beforeEach(() => {
  mockPush.mockReset();
  useAuthStore.setState({
    token: "token-de-prueba",
    user: { id: "1", name: "Don Chuy", email: "duenio@botasdonchuy.com", role: "owner" },
  });
});

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

describe("ConfigSection", () => {
  it("monta las dos tarjetas de configuración", async () => {
    renderWithQueryClient(<ConfigSection />);

    expect(screen.getByText("Mi cuenta")).toBeInTheDocument();
    expect(screen.getByText("Administradores")).toBeInTheDocument();
  });

  it("«Cerrar Sesión» limpia el store y manda a /login", async () => {
    const { user } = renderWithQueryClient(<ConfigSection />);

    await user.click(screen.getByRole("button", { name: "Cerrar Sesión" }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
