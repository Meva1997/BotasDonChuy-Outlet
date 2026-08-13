import { screen, waitFor, within } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import AdminsCard from "../AdminsCard";
import { apiError } from "./helpers/apiError";
import { makeAdminUser, makeAuthUser } from "./helpers/factories";
import { renderWithQueryClient } from "./helpers/render";

// `jest.mock("@/...")` no resuelve — ruta relativa a propósito (ver CLAUDE.md).
jest.mock("../../../../lib/api/adminUsers", () => ({
  ...jest.requireActual("../../../../lib/api/adminUsers"),
  getAdminUsers: jest.fn(),
  createAdminUser: jest.fn(),
  deleteAdminUser: jest.fn(),
}));

import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
} from "@/lib/api/adminUsers";

const mockGet = getAdminUsers as jest.MockedFunction<typeof getAdminUsers>;
const mockCreate = createAdminUser as jest.MockedFunction<typeof createAdminUser>;
const mockDelete = deleteAdminUser as jest.MockedFunction<typeof deleteAdminUser>;

// AdminsCard decide quién puede entrar al panel, así que el borrado es la
// operación delicada: pide confirmación en la propia fila (no un modal) y NO
// ofrece el botón sobre la cuenta de quien está mirando.
//
// Esa comparación cruza dos tipos a propósito: `AuthUser.id` es **string** (sale
// del JWT) y `AdminUser.id` es **number** (sale de la tabla). Sin el
// `String(u.id)`, el `===` sería siempre falso y el dueño vería un botón para
// borrarse a sí mismo que el backend rechazaría con un 400.

function seedSession(overrides = {}) {
  useAuthStore.setState({
    token: "token-de-prueba",
    user: makeAuthUser(overrides),
  });
}

/** La fila de la lista que corresponde a ese correo. */
function rowOf(email: string) {
  return screen.getByText(email).closest("div.flex.flex-wrap") as HTMLElement;
}

beforeEach(() => {
  mockGet.mockReset();
  mockCreate.mockReset();
  mockDelete.mockReset();
  mockGet.mockResolvedValue([makeAdminUser()]);
  mockCreate.mockResolvedValue(makeAdminUser({ id: 2 }));
  mockDelete.mockResolvedValue({ ok: true });
  seedSession();
});

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

describe("AdminsCard", () => {
  it("muestra el estado de carga mientras pide la lista", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<AdminsCard />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("avisa si la lista no se pudo cargar", async () => {
    mockGet.mockRejectedValue(new Error("red caída"));
    renderWithQueryClient(<AdminsCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar los administradores.",
    );
  });

  it("pinta nombre, correo, inicial y rol de cada administrador", async () => {
    mockGet.mockResolvedValue([
      makeAdminUser({ id: 1, name: "Don Chuy", email: "duenio@botasdonchuy.com", role: "owner" }),
      makeAdminUser({ id: 2, name: "Ayudante", email: "ayuda@botasdonchuy.com", role: "admin" }),
    ]);
    renderWithQueryClient(<AdminsCard />);

    expect(await screen.findByText("Don Chuy")).toBeInTheDocument();
    // Acotado a la fila: "Propietario"/"Administrador" también son las opciones
    // del `<select>` de rol del formulario de alta, más abajo en la misma tarjeta.
    expect(
      within(rowOf("duenio@botasdonchuy.com")).getByText("Propietario"),
    ).toBeInTheDocument();
    expect(
      within(rowOf("ayuda@botasdonchuy.com")).getByText("Administrador"),
    ).toBeInTheDocument();
    // La inicial del avatar sale del nombre.
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("un nombre en blanco cae en «?» en vez de dejar el avatar vacío", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, name: "   ", email: "sin@nombre.com" })]);
    renderWithQueryClient(<AdminsCard />);

    expect(await screen.findByText("?")).toBeInTheDocument();
  });

  // La invariante del borrado: sobre la propia cuenta no hay botón que ofrecer.
  it("marca la propia cuenta con «Tú» y no ofrece borrarla", async () => {
    mockGet.mockResolvedValue([
      makeAdminUser({ id: 1, name: "Don Chuy", email: "duenio@botasdonchuy.com" }),
      makeAdminUser({ id: 2, name: "Ayudante", email: "ayuda@botasdonchuy.com" }),
    ]);
    renderWithQueryClient(<AdminsCard />);

    await screen.findByText("Don Chuy");
    const propia = within(rowOf("duenio@botasdonchuy.com"));
    expect(propia.getByText("Tú")).toBeInTheDocument();
    expect(propia.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();

    const otra = within(rowOf("ayuda@botasdonchuy.com"));
    expect(otra.queryByText("Tú")).not.toBeInTheDocument();
    expect(otra.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("sin sesión ninguna fila se marca como propia", async () => {
    useAuthStore.setState({ token: null, user: null });
    mockGet.mockResolvedValue([makeAdminUser({ id: 1, email: "duenio@botasdonchuy.com" })]);
    renderWithQueryClient(<AdminsCard />);

    await screen.findByText("duenio@botasdonchuy.com");
    expect(screen.queryByText("Tú")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  // ── Baja ──

  it("«Eliminar» pide confirmación antes de llamar al backend", async () => {
    mockGet.mockResolvedValue([
      makeAdminUser({ id: 2, name: "Ayudante", email: "ayuda@botasdonchuy.com" }),
    ]);
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    expect(mockDelete.mock.calls[0][0]).toBe(2);
  });

  it("«Cancelar» descarta la confirmación sin borrar nada", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("tras borrar, cierra la confirmación y revalida la lista", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    const { user, queryClient } = renderWithQueryClient(<AdminsCard />);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminUsers"] }),
    );
    expect(await screen.findByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("mientras borra, el botón de confirmar queda deshabilitado", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    let resolve: (value: { ok: boolean }) => void = () => {};
    mockDelete.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    const pending = await screen.findByRole("button", { name: "…" });
    expect(pending).toBeDisabled();

    resolve({ ok: true });
    expect(await screen.findByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  // El backend explica por qué no se puede (único propietario, cuenta propia…):
  // ese texto es más útil que cualquier genérico que pudiéramos inventar aquí.
  it("muestra verbatim el motivo del backend cuando el borrado se rechaza", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    mockDelete.mockRejectedValue(
      apiError(400, "No puedes eliminar al único propietario"),
    );
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No puedes eliminar al único propietario",
    );
  });

  it("un error sin mensaje del backend cae en el texto genérico", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    mockDelete.mockRejectedValue(apiError(500));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos eliminar al administrador.",
    );
  });

  it("un error de red (sin respuesta) también cae en el texto genérico", async () => {
    mockGet.mockResolvedValue([makeAdminUser({ id: 2, email: "ayuda@botasdonchuy.com" })]);
    mockDelete.mockRejectedValue(new Error("Network Error"));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos eliminar al administrador.",
    );
  });

  it("pedir confirmación en otra fila limpia el error anterior", async () => {
    mockGet.mockResolvedValue([
      makeAdminUser({ id: 2, name: "Ayudante", email: "ayuda@botasdonchuy.com" }),
      makeAdminUser({ id: 3, name: "Otro", email: "otro@botasdonchuy.com" }),
    ]);
    mockDelete.mockRejectedValue(apiError(400, "No puedes eliminar al único propietario"));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await screen.findByText("Ayudante");
    await user.click(
      within(rowOf("ayuda@botasdonchuy.com")).getByRole("button", { name: "Eliminar" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("alert");

    await user.click(
      within(rowOf("otro@botasdonchuy.com")).getByRole("button", { name: "Eliminar" }),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // ── Alta ──

  it("no envía el alta con datos inválidos", async () => {
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "A");
    await user.type(screen.getByLabelText("Correo"), "no-es-correo");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "corta");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByText("El nombre es muy corto")).toBeInTheDocument();
    expect(screen.getByText("Ingresa un correo electrónico válido")).toBeInTheDocument();
    expect(screen.getByText("Al menos 8 caracteres")).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("da de alta con el rol elegido y limpia el formulario", async () => {
    const { user, queryClient } = renderWithQueryClient(<AdminsCard />);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.selectOptions(screen.getByLabelText("Rol"), "owner");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toEqual({
      name: "Ayudante",
      email: "ayuda@botasdonchuy.com",
      tempPassword: "Temporal1!",
      role: "owner",
    });

    expect(await screen.findByText("Administrador agregado.")).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["adminUsers"] });
    // El formulario vuelve a cero, con el rol de vuelta en "admin".
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Correo")).toHaveValue("");
    expect(screen.getByLabelText("Rol")).toHaveValue("admin");
  });

  it("un 409 avisa que el correo ya está en uso", async () => {
    mockCreate.mockRejectedValue(apiError(409));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese correo ya está en uso.",
    );
  });

  it("un 400 muestra el mensaje del backend, y sin mensaje el genérico de datos", async () => {
    mockCreate.mockRejectedValueOnce(apiError(400, "Contraseña demasiado común"));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Contraseña demasiado común",
    );

    mockCreate.mockRejectedValueOnce(apiError(400));
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Revisa los datos ingresados.",
      ),
    );
  });

  it("un status inesperado cae en el mensaje genérico de alta", async () => {
    mockCreate.mockRejectedValue(apiError(500, "Boom"));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos crear al administrador. Inténtalo de nuevo.",
    );
  });

  it("un error de red en el alta también cae en el genérico", async () => {
    mockCreate.mockRejectedValue(new Error("Network Error"));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos crear al administrador. Inténtalo de nuevo.",
    );
  });

  it("deshabilita el botón mientras da de alta", async () => {
    let resolve: (value: ReturnType<typeof makeAdminUser>) => void = () => {};
    mockCreate.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user } = renderWithQueryClient(<AdminsCard />);

    await user.type(screen.getByLabelText("Nombre"), "Ayudante");
    await user.type(screen.getByLabelText("Correo"), "ayuda@botasdonchuy.com");
    await user.type(screen.getByLabelText("Contraseña Temporal"), "Temporal1!");
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    const pending = await screen.findByRole("button", { name: "Agregando…" });
    expect(pending).toBeDisabled();

    resolve(makeAdminUser({ id: 2 }));
    expect(await screen.findByText("Administrador agregado.")).toBeInTheDocument();
  });
});
