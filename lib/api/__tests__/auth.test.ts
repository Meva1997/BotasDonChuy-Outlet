import {
  authKeys,
  forgotPassword,
  getMe,
  login,
  resetPassword,
  verifyResetCode,
} from "../auth";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeAuthUser } from "./helpers/factories";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
});

afterEach(() => {
  mock.restore();
});

describe("login", () => {
  it("postea las credenciales y devuelve { token, user } parseado", async () => {
    const user = makeAuthUser();
    mock.ok({ token: "tok-1", user });

    const result = await login({ email: "ana@ejemplo.com", password: "Secreta1!" });

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/auth/login");
    expect(mock.lastCall().body).toEqual({
      email: "ana@ejemplo.com",
      password: "Secreta1!",
    });
    expect(result).toEqual({ token: "tok-1", user });
  });

  it("lanza si el cuerpo no trae token (parse estricto: es una lectura)", async () => {
    // Un login sin token no es un login: seguir adelante dejaría la sesión en un
    // estado a medias (usuario sí, credencial no) y el fallo se vería mucho
    // después, en el primer 401 de una pantalla cualquiera del panel.
    mock.ok({ user: makeAuthUser() });

    await expect(
      login({ email: "ana@ejemplo.com", password: "Secreta1!" })
    ).rejects.toThrow();
  });

  it("lanza si el rol no es uno de los del enum", async () => {
    mock.ok({ token: "tok-1", user: makeAuthUser({ role: "superadmin" as never }) });

    await expect(
      login({ email: "ana@ejemplo.com", password: "Secreta1!" })
    ).rejects.toThrow();
  });

  it("propaga el 429 de rate-limit sin traducirlo (lo mapea LoginForm)", async () => {
    // Este módulo no traduce errores a propósito: la copia de credenciales vs.
    // rate-limit vive en el formulario, junto al campo que la muestra. Aquí solo
    // se comprueba que el status llega intacto a la mutación.
    // (El 401 y su cierre de sesión se ejercitan en client.test.ts, donde el
    // `window.location` es controlable.)
    mock.httpError(429, { message: "Demasiados intentos" });

    await expect(
      login({ email: "ana@ejemplo.com", password: "mala" })
    ).rejects.toMatchObject({ response: { status: 429 } });
  });
});

describe("recuperación de contraseña", () => {
  it("forgotPassword postea el correo y no devuelve nada", async () => {
    mock.ok({ ok: true });

    await expect(forgotPassword({ email: "ana@ejemplo.com" })).resolves.toBeUndefined();

    expect(mock.lastCall().url).toBe("/auth/forgot-password");
    expect(mock.lastCall().body).toEqual({ email: "ana@ejemplo.com" });
  });

  it("verifyResetCode postea correo + código y no devuelve nada", async () => {
    // No hay payload que parsear a propósito: la ruta valida SIN consumir el
    // código, así que su única respuesta útil es el status.
    mock.ok({ ok: true });

    await expect(
      verifyResetCode({ email: "ana@ejemplo.com", code: "12345" })
    ).resolves.toBeUndefined();

    expect(mock.lastCall().url).toBe("/auth/verify-reset-code");
    expect(mock.lastCall().body).toEqual({ email: "ana@ejemplo.com", code: "12345" });
  });

  it("resetPassword postea el paso final y no devuelve nada", async () => {
    mock.ok({ ok: true });

    await expect(
      resetPassword({
        email: "ana@ejemplo.com",
        code: "12345",
        newPassword: "Nueva1!aa",
        confirmPassword: "Nueva1!aa",
      })
    ).resolves.toBeUndefined();

    expect(mock.lastCall().url).toBe("/auth/reset-password");
  });

  it("propaga el 400 de código inválido/expirado", async () => {
    mock.httpError(400, { message: "Código inválido o expirado" });

    await expect(
      verifyResetCode({ email: "ana@ejemplo.com", code: "00000" })
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

describe("getMe", () => {
  it("desenvuelve `user` de la respuesta", async () => {
    // El backend responde `{ user }` pero el resto de la app consume un AuthUser
    // pelón: si esto devolviera el envoltorio, AdminGuard guardaría `{ user }` en
    // el store y `user.role` sería `undefined` en todas las pantallas.
    const user = makeAuthUser({ role: "admin" });
    mock.ok({ user });

    await expect(getMe()).resolves.toEqual(user);
    expect(mock.lastCall().url).toBe("/auth/me");
  });

  it("lanza si falta el envoltorio `user`", async () => {
    mock.ok(makeAuthUser());

    await expect(getMe()).rejects.toThrow();
  });
});

describe("authKeys", () => {
  it("expone una key estable para /auth/me", () => {
    expect(authKeys.me).toEqual(["auth", "me"]);
  });
});
