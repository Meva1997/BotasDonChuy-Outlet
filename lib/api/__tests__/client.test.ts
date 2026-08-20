/**
 * @jest-environment node
 */
import { api } from "../client";
import { useAuthStore } from "../../../store/authStore";
import { installMockApi, type MockApi } from "./helpers/mockApi";

/**
 * Los interceptores de `lib/api/client.ts` son la única lógica no trivial de toda
 * la capa `lib/api/`: deciden qué petición lleva sesión y, sobre todo, cuál 401
 * expulsa al usuario. Equivocarse en cualquiera de las dos direcciones se ve en
 * producción como un bug de sesión que nadie asocia con este archivo — un
 * visitante público mandado a /login por un token viejo en localStorage, o un
 * admin al que un "contraseña actual incorrecta" le cierra la sesión mientras la
 * está corrigiendo.
 *
 * **Entorno `node`, no `jsdom`, a propósito.** Las dos ramas dependen de
 * `window.location`, y el `Location` de jsdom es no-configurable y de solo
 * lectura: no se puede espiar `assign` ni mover `pathname`, así que la
 * aserción "¿a dónde se mandó al usuario?" —la que de verdad importa— sería
 * imposible. En `node` no hay `window`, se fabrica uno mínimo (que es todo lo
 * que este módulo toca) y de paso quedan cubiertas las ramas de SSR, donde el
 * guard `typeof window !== "undefined"` es lo que evita reventar en el servidor.
 */

const assign = jest.fn();

/** Instala un `window` mínimo: exactamente lo que `client.ts` lee de él. */
function setWindow(pathname: string) {
  (globalThis as { window?: unknown }).window = {
    location: { pathname, assign },
  };
}

/** Vuelve al escenario SSR: sin `window` en absoluto. */
function clearWindow() {
  delete (globalThis as { window?: unknown }).window;
}

const session = {
  token: "tok-123",
  user: { id: "1", name: "Ana", email: "ana@ejemplo.com", role: "owner" as const },
};

let mock: MockApi;

// En `node` no hay localStorage, así que el middleware `persist` de authStore
// avisa en cada `set()`. Es ruido del entorno, no del código bajo prueba: se
// filtra ESE mensaje y se deja pasar cualquier otro, para no enmascarar avisos
// reales que sí valdría la pena ver.
const realWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("[zustand persist middleware]")) return;
    realWarn(...args);
  };
});
afterAll(() => {
  console.warn = realWarn;
});

beforeEach(() => {
  mock = installMockApi();
  assign.mockClear();
  setWindow("/admin");
  useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
  mock.restore();
  clearWindow();
});

describe("configuración de la instancia", () => {
  it("cae a /api cuando NEXT_PUBLIC_API_URL no está definida", () => {
    // El valor se congela al importar el módulo, así que se afirma contra la
    // misma expresión: en el entorno de pruebas no hay backend al que apuntar.
    expect(api.defaults.baseURL).toBe(process.env.NEXT_PUBLIC_API_URL ?? "/api");
  });

  it("manda JSON por defecto", () => {
    expect(api.defaults.headers["Content-Type"]).toBe("application/json");
  });
});

describe("interceptor de petición — Bearer", () => {
  it("adjunta el token de la sesión a una petición normal", async () => {
    useAuthStore.setState({ token: "tok-123", user: null });
    mock.ok({});

    await api.get("/admin/pedidos");

    expect(mock.lastCall().headers.Authorization).toBe("Bearer tok-123");
  });

  it("no adjunta nada cuando no hay sesión", async () => {
    mock.ok({});

    await api.get("/products");

    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });

  it("NUNCA adjunta el token a una petición skipAuth, aunque haya sesión", async () => {
    // Es el punto entero del flag: el storefront consume rutas públicas desde el
    // root layout, y un token viejo de admin en localStorage provocaría ahí un
    // 401 espurio que expulsaría a un visitante que ni cuenta tiene.
    useAuthStore.setState({ token: "tok-viejo", user: null });
    mock.ok({});

    await api.get("/admin/brand", { skipAuth: true });

    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });

  it("SÍ adjunta el token a una petición skipAuthRedirect (es autenticada)", async () => {
    // `skipAuthRedirect` solo cambia qué se hace con el 401; la petición sigue
    // necesitando la sesión (PUT /admin/account no funcionaría sin ella).
    useAuthStore.setState({ token: "tok-123", user: null });
    mock.ok({});

    await api.put("/admin/account", {}, { skipAuthRedirect: true });

    expect(mock.lastCall().headers.Authorization).toBe("Bearer tok-123");
  });

  it("en SSR no intenta leer el token (no hay localStorage que consultar)", async () => {
    useAuthStore.setState({ token: "tok-123", user: null });
    clearWindow();
    mock.ok({});

    await api.get("/products");

    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });
});

describe("interceptor de respuesta — 401", () => {
  it("cierra la sesión y manda a /login", async () => {
    useAuthStore.setState(session);
    mock.httpError(401);

    await expect(api.get("/admin/orders")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
  });

  it("no vuelve a navegar si ya se está en /login", async () => {
    // Sin este guard, un 401 de fondo en la propia pantalla de login (un
    // /auth/me rezagado, p. ej.) recargaría la página y borraría lo tecleado.
    setWindow("/login");
    useAuthStore.setState(session);
    mock.httpError(401);

    await expect(api.get("/auth/me")).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("un 401 en una petición skipAuth NO cierra la sesión ni redirige", async () => {
    useAuthStore.setState(session);
    mock.httpError(401);

    await expect(api.get("/admin/brand", { skipAuth: true })).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(assign).not.toHaveBeenCalled();
  });

  it("un 401 en una petición skipAuthRedirect NO cierra la sesión ni redirige", async () => {
    // Aquí el 401 significa "contraseña actual incorrecta". Cerrar la sesión
    // dejaría al admin fuera del panel por escribir mal su propia contraseña.
    useAuthStore.setState(session);
    mock.httpError(401);

    await expect(
      api.put("/admin/account", {}, { skipAuthRedirect: true })
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(assign).not.toHaveBeenCalled();
  });

  it("no reacciona a un status distinto de 401", async () => {
    // Un 403/500 puede ser un permiso o una caída del backend; ninguno significa
    // que el token esté vencido, y cerrar la sesión ahí perdería trabajo.
    useAuthStore.setState(session);
    mock.httpError(500);

    await expect(api.get("/admin/orders")).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(assign).not.toHaveBeenCalled();
  });

  it("no reacciona a un fallo de red (sin response)", async () => {
    useAuthStore.setState(session);
    mock.networkError();

    await expect(api.get("/admin/orders")).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(assign).not.toHaveBeenCalled();
  });

  it("en SSR un 401 no toca la sesión ni navega", async () => {
    useAuthStore.setState(session);
    clearWindow();
    mock.httpError(401);

    await expect(api.get("/admin/orders")).rejects.toBeDefined();

    expect(useAuthStore.getState().token).toBe("tok-123");
    expect(assign).not.toHaveBeenCalled();
  });

  it("deja pasar una respuesta exitosa sin tocarla", async () => {
    mock.ok({ hola: "mundo" });

    const res = await api.get("/products");

    expect(res.data).toEqual({ hola: "mundo" });
  });
});
