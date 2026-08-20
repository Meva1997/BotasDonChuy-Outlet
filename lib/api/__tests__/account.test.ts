import { updateOwnAccount } from "../account";
import { installMockApi, type MockApi } from "./helpers/mockApi";

let mock: MockApi;
let warn: jest.SpyInstance;

beforeEach(() => {
  mock = installMockApi();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
  warn.mockRestore();
});

describe("updateOwnAccount", () => {
  it("hace PUT a /admin/account con el payload tal cual", async () => {
    mock.ok({ ok: true });

    await updateOwnAccount({
      currentPassword: "Actual1!",
      email: "ana@ejemplo.com",
      newPassword: "Nueva1!aa",
      confirmPassword: "Nueva1!aa",
    });

    expect(mock.lastCall().method).toBe("put");
    expect(mock.lastCall().url).toBe("/admin/account");
    expect(mock.lastCall().body).toEqual({
      currentPassword: "Actual1!",
      email: "ana@ejemplo.com",
      newPassword: "Nueva1!aa",
      confirmPassword: "Nueva1!aa",
    });
  });

  it("marca la petición como skipAuthRedirect", async () => {
    // Es la razón de ser de esta función frente a un `api.put` suelto: el 401 de
    // esta ruta significa "contraseña actual incorrecta", no "sesión expirada".
    // Sin el flag, el admin que se equivoca al escribir su propia contraseña
    // queda fuera del panel, y el mensaje inline que la UI iba a mostrar nunca
    // se ve porque la página ya navegó a /login.
    mock.ok({ ok: true });

    await updateOwnAccount({ currentPassword: "Actual1!" });

    expect(mock.lastCall().config.skipAuthRedirect).toBe(true);
  });

  it("devuelve el cuerpo parseado", async () => {
    mock.ok({ ok: true });

    await expect(updateOwnAccount({ currentPassword: "Actual1!" })).resolves.toEqual({
      ok: true,
    });
  });

  it("ante un 2xx con cuerpo inesperado avisa y reporta éxito, sin lanzar", async () => {
    // Convención de escrituras: un 2xx YA cambió la contraseña/correo. Lanzar
    // aquí le diría al admin que falló algo que sí ocurrió, y lo llevaría a
    // reintentar con la contraseña ANTERIOR, que ya no sirve.
    mock.ok({ resultado: "listo" });

    await expect(updateOwnAccount({ currentPassword: "Actual1!" })).resolves.toEqual({
      ok: true,
    });
    expect(warn).toHaveBeenCalledWith(
      "updateOwnAccount: respuesta 2xx inesperada del backend",
      expect.anything()
    );
  });

  it("propaga el 409 de correo en uso", async () => {
    mock.httpError(409, { message: "Ese correo ya está registrado" });

    await expect(
      updateOwnAccount({ currentPassword: "Actual1!", email: "otra@ejemplo.com" })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});
