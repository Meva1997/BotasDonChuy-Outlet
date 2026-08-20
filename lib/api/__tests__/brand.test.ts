import { brandKeys, getBrandSettings, updateBrandSettings } from "../brand";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeBrandSettings, omit } from "./helpers/factories";
import { useAuthStore } from "../../../store/authStore";

let mock: MockApi;
let warn: jest.SpyInstance;

beforeEach(() => {
  mock = installMockApi();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
  mock.restore();
  warn.mockRestore();
  useAuthStore.setState({ token: null, user: null });
});

describe("getBrandSettings", () => {
  it("lee la marca y la parsea", async () => {
    const brand = makeBrandSettings();
    mock.ok(brand);

    await expect(getBrandSettings()).resolves.toEqual(brand);
    expect(mock.lastCall().method).toBe("get");
    expect(mock.lastCall().url).toBe("/admin/brand");
  });

  it("va como skipAuth y NO lleva el Bearer aunque haya sesión", async () => {
    // La ruta es pública y la consume el root layout del storefront. Si llevara
    // el token, un Bearer viejo en localStorage devolvería 401 y el interceptor
    // mandaría a /login a un visitante que ni cuenta tiene — en la home.
    useAuthStore.setState({ token: "tok-viejo", user: null });
    mock.ok(makeBrandSettings());

    await getBrandSettings();

    expect(mock.lastCall().config.skipAuth).toBe(true);
    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });

  it("acepta logoUrl ausente (el backend no siempre lo manda)", async () => {
    const sinLogo = omit(makeBrandSettings(), "logoUrl");
    mock.ok(sinLogo);

    await expect(getBrandSettings()).resolves.toEqual(sinLogo);
  });

  it("LANZA si falta un campo de copia requerido (parse estricto: es lectura)", async () => {
    mock.ok(omit(makeBrandSettings(), "heroText"));

    await expect(getBrandSettings()).rejects.toThrow();
  });
});

describe("updateBrandSettings", () => {
  it("hace PUT parcial y devuelve el objeto completo del backend", async () => {
    const actualizado = makeBrandSettings({ brandName: "Don Chuy Outlet" });
    mock.ok(actualizado);

    await expect(
      updateBrandSettings({ brandName: "Don Chuy Outlet" })
    ).resolves.toEqual(actualizado);

    expect(mock.lastCall().method).toBe("put");
    expect(mock.lastCall().url).toBe("/admin/brand");
    expect(mock.lastCall().body).toEqual({ brandName: "Don Chuy Outlet" });
  });

  it("SÍ lleva el Bearer (es la ruta protegida, no la pública)", async () => {
    useAuthStore.setState({ token: "tok-1", user: null });
    mock.ok(makeBrandSettings());

    await updateBrandSettings({ brandName: "X" });

    expect(mock.lastCall().config.skipAuth).toBeUndefined();
    expect(mock.lastCall().headers.Authorization).toBe("Bearer tok-1");
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // El guardado YA surtió efecto: lanzar marcaría como error un autosave
    // exitoso y el editor mostraría un fallo sobre datos que sí se guardaron.
    const crudo = { brandName: 42 };
    mock.ok(crudo);

    await expect(updateBrandSettings({ brandName: "X" })).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "updateBrandSettings: respuesta inesperada del backend",
      expect.anything()
    );
  });
});

describe("brandKeys", () => {
  it("cuelga `detail` de `all` para que una invalidación de raíz la alcance", () => {
    expect(brandKeys.all).toEqual(["brand"]);
    expect(brandKeys.detail()).toEqual(["brand", "detail"]);
  });
});
