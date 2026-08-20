import {
  couponKeys,
  isCouponRejection,
  validateCoupon,
  validateCouponErrorMessage,
} from "../coupons";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeCartItem, makeCouponPreview, omit } from "./helpers/factories";
import { apiError, networkError } from "./helpers/apiError";
import { useAuthStore } from "../../../store/authStore";

let mock: MockApi;

beforeEach(() => {
  mock = installMockApi();
  useAuthStore.setState({ token: null, user: null });
});

afterEach(() => {
  mock.restore();
  useAuthStore.setState({ token: null, user: null });
});

describe("validateCoupon", () => {
  it("postea código + carrito mapeado y devuelve el cupón desenvuelto", async () => {
    const coupon = makeCouponPreview();
    mock.ok({ coupon });

    await expect(
      validateCoupon({ code: "VERANO20", items: [makeCartItem({ quantity: 2 })] })
    ).resolves.toEqual(coupon);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/coupons/validate");
    expect(mock.lastCall().body).toEqual({
      code: "VERANO20",
      items: [{ productId: 1, size: 26, quantity: 2 }],
    });
  });

  it("OMITE `email` cuando no se pasa (no lo manda como cadena vacía)", async () => {
    mock.ok({ coupon: makeCouponPreview() });

    await validateCoupon({ code: "VERANO20", items: [makeCartItem()] });

    expect(mock.lastCall().body).not.toHaveProperty("email");
  });

  it("incluye `email` cuando sí se pasa — es lo único que habilita el 'un uso por cliente'", async () => {
    mock.ok({ coupon: makeCouponPreview({ perCustomerChecked: true }) });

    const coupon = await validateCoupon({
      code: "VERANO20",
      items: [makeCartItem()],
      email: "juan@ejemplo.com",
    });

    expect((mock.lastCall().body as { email?: string }).email).toBe("juan@ejemplo.com");
    expect(coupon.perCustomerChecked).toBe(true);
  });

  it("va como skipAuth y NO lleva el Bearer aunque haya sesión", async () => {
    // La ruta es del comprador. Un token de admin viejo en localStorage no tiene
    // nada que hacer aquí, y su 401 mandaría a /login a media compra.
    useAuthStore.setState({ token: "tok-admin", user: null });
    mock.ok({ coupon: makeCouponPreview() });

    await validateCoupon({ code: "VERANO20", items: [makeCartItem()] });

    expect(mock.lastCall().config.skipAuth).toBe(true);
    expect(mock.lastCall().headers.Authorization).toBeUndefined();
  });

  it("nunca recalcula el descuento: devuelve el del servidor tal cual", async () => {
    // El front no tiene la fórmula a propósito — duplicarla garantizaría que un
    // día el descuento mostrado y el cobrado difieran.
    mock.ok({ coupon: makeCouponPreview({ discount: 137.5, netMerchandise: 550 }) });

    const coupon = await validateCoupon({ code: "VERANO20", items: [makeCartItem()] });

    expect(coupon.discount).toBe(137.5);
  });

  it("LANZA si el cuerpo no valida (parse estricto: no escribe nada, es reintentable)", async () => {
    mock.ok({ coupon: omit(makeCouponPreview(), "discount") });

    await expect(
      validateCoupon({ code: "VERANO20", items: [makeCartItem()] })
    ).rejects.toThrow();
  });

  it("LANZA si falta el envoltorio `coupon`", async () => {
    mock.ok(makeCouponPreview());

    await expect(
      validateCoupon({ code: "VERANO20", items: [makeCartItem()] })
    ).rejects.toThrow();
  });
});

describe("isCouponRejection", () => {
  // La distinción decide si se BLOQUEA el pago. Bloquear de más le quita un
  // descuento válido a alguien que sí podía pagar; bloquear de menos lo lleva al
  // mismo error, ya en el cobro.

  it.each([400, 404, 409, 422])("un %i es un rechazo del cupón", (status) => {
    expect(isCouponRejection(apiError(status))).toBe(true);
  });

  it("un 429 NO es rechazo: es 'pregunta luego', no un veredicto", () => {
    expect(isCouponRejection(apiError(429))).toBe(false);
  });

  it.each([500, 502, 503])("un %i NO es rechazo: el backend no llegó a opinar", (status) => {
    expect(isCouponRejection(apiError(status))).toBe(false);
  });

  it("un fallo de red NO es rechazo", () => {
    expect(isCouponRejection(networkError())).toBe(false);
  });

  it("algo que no es un AxiosError NO es rechazo", () => {
    expect(isCouponRejection(new Error("boom"))).toBe(false);
    expect(isCouponRejection(null)).toBe(false);
    expect(isCouponRejection("400")).toBe(false);
  });
});

describe("validateCouponErrorMessage", () => {
  it("prefiere SIEMPRE el mensaje del backend", () => {
    // Los textos de esta ruta son deliberadamente específicos —cuánto falta para
    // el mínimo, cuándo venció, que ya se agotó— y reescribirlos aquí perdería
    // justo la información que hace usable un cupón tecleado a mano.
    expect(
      validateCouponErrorMessage(
        apiError(400, "Te faltan $150.00 de mercancía para usar este cupón.")
      )
    ).toBe("Te faltan $150.00 de mercancía para usar este cupón.");
  });

  it("usa el mensaje del backend incluso en un 429", () => {
    expect(validateCouponErrorMessage(apiError(429, "Espera 30 segundos."))).toBe(
      "Espera 30 segundos."
    );
  });

  it("tiene copia propia para un 429 sin mensaje", () => {
    expect(validateCouponErrorMessage(apiError(429))).toMatch(/Demasiados intentos/);
  });

  it("distingue 'no pudimos conectar' cuando la petición nunca llegó", () => {
    // Es el único caso donde el backend no tiene copia que ofrecer: decirle
    // "cupón inválido" a alguien sin internet lo haría descartar un cupón bueno.
    expect(validateCouponErrorMessage(networkError())).toMatch(/No pudimos conectar/);
  });

  it("cae al genérico ante un status sin mensaje", () => {
    expect(validateCouponErrorMessage(apiError(500))).toBe(
      "No pudimos validar el cupón. Inténtalo de nuevo."
    );
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(validateCouponErrorMessage(new Error("boom"))).toBe(
      "No pudimos validar el cupón. Inténtalo de nuevo."
    );
  });
});

describe("couponKeys", () => {
  it("mete código, carrito mapeado y correo en la key", () => {
    // El correo entra porque cambia el resultado (habilita el "un uso por
    // cliente"): sin él en la key, la revalidación del paso 3 leería la
    // respuesta cacheada del paso 0 y el `perCustomerChecked: false` se
    // quedaría para siempre.
    expect(
      couponKeys.validate("VERANO20", [makeCartItem()], "juan@ejemplo.com")
    ).toEqual([
      "coupons",
      "validate",
      "VERANO20",
      [{ productId: 1, size: 26, quantity: 1 }],
      "juan@ejemplo.com",
    ]);
  });

  it("usa null (no undefined) cuando no hay correo, para que la key serialice igual siempre", () => {
    expect(couponKeys.validate("VERANO20", [makeCartItem()])).toEqual([
      "coupons",
      "validate",
      "VERANO20",
      [{ productId: 1, size: 26, quantity: 1 }],
      null,
    ]);
  });
});
