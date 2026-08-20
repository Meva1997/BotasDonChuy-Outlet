import {
  adminUserKeys,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
} from "../adminUsers";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeAdminUser, omit } from "./helpers/factories";

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

describe("getAdminUsers", () => {
  it("lee la lista y la parsea", async () => {
    const users = [makeAdminUser(), makeAdminUser({ id: 2, role: "admin" })];
    mock.ok(users);

    await expect(getAdminUsers()).resolves.toEqual(users);
    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/admin/users");
  });

  it("acepta usuarios sin createdAt/updatedAt", async () => {
    const sinFechas = omit(makeAdminUser(), "createdAt", "updatedAt");
    mock.ok([sinFechas]);

    await expect(getAdminUsers()).resolves.toEqual([sinFechas]);
  });

  it("LANZA si un usuario trae un rol fuera del enum (parse estricto: es lectura)", async () => {
    // Un rol desconocido no se puede pintar bien, y pintarlo mal decidiría mal
    // qué botones ve el dueño. Un parse fallido aquí es reintentable sin riesgo
    // (no escribe nada), así que conviene fallar ruidoso.
    mock.ok([makeAdminUser({ role: "invitado" as never })]);

    await expect(getAdminUsers()).rejects.toThrow();
  });

  it("LANZA si la respuesta no es un array", async () => {
    mock.ok({ users: [makeAdminUser()] });

    await expect(getAdminUsers()).rejects.toThrow();
  });
});

describe("createAdminUser", () => {
  it("postea el alta y devuelve el usuario creado", async () => {
    const creado = makeAdminUser({ id: 3, name: "Luis", role: "admin" });
    mock.ok(creado, { status: 201 });

    await expect(
      createAdminUser({
        name: "Luis",
        email: "luis@ejemplo.com",
        tempPassword: "Temporal1!",
        role: "admin",
      })
    ).resolves.toEqual(creado);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/users");
    expect(mock.lastCall().body).toEqual({
      name: "Luis",
      email: "luis@ejemplo.com",
      tempPassword: "Temporal1!",
      role: "admin",
    });
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // El usuario YA existe: lanzar invitaría a reintentar y crearía un segundo.
    // La invalidación de la lista revalida después con datos ya parseados.
    const crudo = { id: "3", nombre: "Luis" };
    mock.ok(crudo, { status: 201 });

    await expect(
      createAdminUser({
        name: "Luis",
        email: "luis@ejemplo.com",
        tempPassword: "Temporal1!",
      })
    ).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "createAdminUser: la respuesta 2xx no valida AdminUserSchema",
      expect.anything()
    );
  });

  it("propaga el 409 de correo duplicado", async () => {
    mock.httpError(409, { message: "Ese correo ya está registrado" });

    await expect(
      createAdminUser({
        name: "Luis",
        email: "ana@ejemplo.com",
        tempPassword: "Temporal1!",
      })
    ).rejects.toMatchObject({ response: { status: 409 } });
  });
});

describe("deleteAdminUser", () => {
  it("borra por id y parsea { ok }", async () => {
    mock.ok({ ok: true });

    await expect(deleteAdminUser(7)).resolves.toEqual({ ok: true });
    expect(mock.lastCall().method).toBe("delete");
    expect(mock.lastCall().url).toBe("/admin/users/7");
  });

  it("propaga el 400 de borrar la propia cuenta o al único propietario", async () => {
    mock.httpError(400, { message: "No puedes eliminar tu propia cuenta" });

    await expect(deleteAdminUser(1)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

describe("adminUserKeys", () => {
  it("expone una key estable", () => {
    expect(adminUserKeys.all).toEqual(["adminUsers"]);
  });
});
