import { screen, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import AccountCard from "../AccountCard";
import { apiError } from "./helpers/apiError";
import { makeAuthUser } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/account", () => ({
  updateOwnAccount: jest.fn(),
}));

import { updateOwnAccount } from "@/lib/api/account";

const mockUpdate = updateOwnAccount as jest.MockedFunction<typeof updateOwnAccount>;

// La regla que define esta tarjeta: **`currentPassword` es obligatoria para
// CUALQUIER cambio**, incluso para corregir una letra del correo. Es lo único
// que impide que una sesión abierta y desatendida se convierta en una cuenta
// secuestrada, y por eso el payload se arma a mano en vez de mandar el
// formulario entero:
//
//  - `newPassword`/`confirmPassword` viajan SOLO si se escribió una contraseña
//    nueva; mandarlas vacías haría que el backend intentara cambiarla a "".
//  - el 401 de esta ruta significa "contraseña actual incorrecta", NO "sesión
//    expirada" (`skipAuthRedirect` en lib/api/account.ts), así que se muestra
//    inline y no cierra la sesión.

function fillCurrentPassword(user: ReturnType<typeof renderWithQueryClient>["user"], value = "Actual123!") {
  return user.type(screen.getByLabelText("Contraseña Actual"), value);
}

function seedSession(overrides = {}) {
  useAuthStore.setState({
    token: "token-de-prueba",
    user: makeAuthUser(overrides),
  });
}

beforeEach(() => {
  mockUpdate.mockReset();
  mockUpdate.mockResolvedValue({ ok: true });
  seedSession();
});

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

describe("AccountCard", () => {
  it("siembra el correo de la sesión en el formulario", () => {
    renderWithQueryClient(<AccountCard />);
    expect(screen.getByLabelText("Correo")).toHaveValue("duenio@botasdonchuy.com");
  });

  it("sin sesión el correo arranca vacío en vez de reventar", () => {
    useAuthStore.setState({ token: null, user: null });
    renderWithQueryClient(<AccountCard />);
    expect(screen.getByLabelText("Correo")).toHaveValue("");
  });

  it("no envía nada sin la contraseña actual, y lo dice", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(
      await screen.findByText("La contraseña actual es requerida"),
    ).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rechaza un correo mal formado sin llamar al backend", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "no-es-un-correo");
    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(
      await screen.findByText("Ingresa un correo electrónico válido"),
    ).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  // Solo cambiar el correo: sin `newPassword` en el payload el backend no toca
  // la contraseña. Mandarla vacía sería pedirle que la cambie a "".
  it("solo con el correo manda correo + contraseña actual, nunca las claves nuevas", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "nuevo@botasdonchuy.com");
    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    // Solo el primer argumento: TanStack Query 5 le pasa además su propio
    // contexto de mutation, que no dice nada del payload.
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      currentPassword: "Actual123!",
      email: "nuevo@botasdonchuy.com",
    });
  });

  it("con contraseña nueva agrega las dos claves al payload", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.type(screen.getByLabelText("Nueva Contraseña (opcional)"), "Nueva123!");
    await user.type(screen.getByLabelText("Confirmar Nueva Contraseña"), "Nueva123!");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      currentPassword: "Actual123!",
      email: "duenio@botasdonchuy.com",
      newPassword: "Nueva123!",
      confirmPassword: "Nueva123!",
    });
  });

  it("una contraseña nueva que no cumple la complejidad no se envía", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.type(screen.getByLabelText("Nueva Contraseña (opcional)"), "minusculas1!");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByText("Al menos una mayúscula")).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("una confirmación que no coincide se rechaza en el cliente", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.type(screen.getByLabelText("Nueva Contraseña (opcional)"), "Nueva123!");
    await user.type(screen.getByLabelText("Confirmar Nueva Contraseña"), "Otra456!");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("al guardar refleja el correo nuevo en la sesión y limpia solo las contraseñas", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);

    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "nuevo@botasdonchuy.com");
    await fillCurrentPassword(user);
    await user.type(screen.getByLabelText("Nueva Contraseña (opcional)"), "Nueva123!");
    await user.type(screen.getByLabelText("Confirmar Nueva Contraseña"), "Nueva123!");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    // El correo se refleja de inmediato: el backend no devuelve el usuario.
    expect(useAuthStore.getState().user?.email).toBe("nuevo@botasdonchuy.com");
    // Y el formulario conserva el correo pero deja de tener las contraseñas.
    expect(screen.getByLabelText("Correo")).toHaveValue("nuevo@botasdonchuy.com");
    expect(screen.getByLabelText("Contraseña Actual")).toHaveValue("");
    expect(screen.getByLabelText("Nueva Contraseña (opcional)")).toHaveValue("");
  });

  it("guardar sin cambiar el correo no reescribe la sesión", async () => {
    const { user } = renderWithQueryClient(<AccountCard />);
    const before = useAuthStore.getState().user;

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBe(before);
  });

  // El guard `variables.email && user && …` existe para esto: sin sesión en el
  // store no hay a quién reescribirle el correo, y `{...user}` sobre `null`
  // reventaría el onSuccess entero (incluidas las invalidaciones que van después).
  it("guardar sin sesión en el store no intenta reescribir el usuario", async () => {
    useAuthStore.setState({ token: null, user: null });
    const { user } = renderWithQueryClient(<AccountCard />);

    await user.type(screen.getByLabelText("Correo"), "nuevo@botasdonchuy.com");
    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("invalida la sesión y la lista de administradores tras guardar", async () => {
    const { user, queryClient } = renderWithQueryClient(<AccountCard />);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    await screen.findByText("Cambios guardados.");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminUsers"] });
  });

  // ── Mapeo de errores del backend ──

  it("un 401 se lee como contraseña incorrecta, no como sesión expirada", async () => {
    mockUpdate.mockRejectedValue(apiError(401));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user, "Equivocada1!");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Contraseña actual incorrecta.",
    );
    // La sesión sigue viva: este 401 no cierra sesión (skipAuthRedirect).
    expect(useAuthStore.getState().token).toBe("token-de-prueba");
  });

  it("un 409 avisa que el correo ya está en uso", async () => {
    mockUpdate.mockRejectedValue(apiError(409));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese correo ya está en uso.",
    );
  });

  it("un 400 muestra el mensaje del backend tal cual", async () => {
    mockUpdate.mockRejectedValue(apiError(400, "El correo no puede repetirse"));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El correo no puede repetirse",
    );
  });

  it("un 400 sin mensaje cae en el texto genérico de datos", async () => {
    mockUpdate.mockRejectedValue(apiError(400));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Revisa los datos ingresados.",
    );
  });

  it("un status inesperado cae en el mensaje genérico", async () => {
    mockUpdate.mockRejectedValue(apiError(500, "Boom"));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar los cambios. Inténtalo de nuevo.",
    );
  });

  it("un error de red (sin respuesta) también cae en el mensaje genérico", async () => {
    mockUpdate.mockRejectedValue(new Error("Network Error"));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar los cambios. Inténtalo de nuevo.",
    );
  });

  it("deshabilita el botón mientras guarda", async () => {
    let resolve: (value: { ok: boolean }) => void = () => {};
    mockUpdate.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user } = renderWithQueryClient(<AccountCard />);

    await fillCurrentPassword(user);
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    const saving = await screen.findByRole("button", { name: "Guardando…" });
    expect(saving).toBeDisabled();

    resolve({ ok: true });
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });
});
