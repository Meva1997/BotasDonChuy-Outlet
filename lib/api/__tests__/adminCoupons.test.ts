import {
  adminCouponKeys,
  couponWriteErrorMessage,
  createCoupon,
  deleteCoupon,
  getAdminCoupons,
  updateCoupon,
} from "../adminCoupons";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import { makeAdminCoupon, makeCoupon, omit } from "./helpers/factories";
import { apiError, networkError } from "./helpers/apiError";

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

describe("getAdminCoupons", () => {
  it("lee la lista y la parsea", async () => {
    const coupons = [makeAdminCoupon(), makeAdminCoupon({ id: 2, code: "ENVIO50" })];
    mock.ok(coupons);

    await expect(getAdminCoupons()).resolves.toEqual(coupons);
    expect(mock.lastCall().url).toBe("/admin/coupons");
  });

  it("conserva `activeRedemptions` aparte de `redeemedCount`", async () => {
    // Normalmente coinciden; cuando no, hubo una intervención manual en la BD.
    // El backend expone las dos para que la divergencia se VEA, así que el
    // schema no puede colapsarlas ni descartar una.
    mock.ok([makeAdminCoupon({ redeemedCount: 5, activeRedemptions: 3 })]);

    const [coupon] = await getAdminCoupons();

    expect(coupon.redeemedCount).toBe(5);
    expect(coupon.activeRedemptions).toBe(3);
  });

  it("LANZA si falta activeRedemptions (solo viene en el GET, y la tabla lo pinta)", async () => {
    mock.ok([omit(makeAdminCoupon(), "activeRedemptions")]);

    await expect(getAdminCoupons()).rejects.toThrow();
  });

  it("LANZA si `type` cae fuera del enum percent|fixed", async () => {
    mock.ok([makeAdminCoupon({ type: "envio-gratis" as never })]);

    await expect(getAdminCoupons()).rejects.toThrow();
  });

  it("acepta los nulls de un cupón sin topes ni ventana de vigencia", async () => {
    mock.ok([
      makeAdminCoupon({
        maxDiscount: null,
        minSubtotal: null,
        maxRedemptions: null,
        startsAt: null,
        expiresAt: null,
        description: null,
      }),
    ]);

    await expect(getAdminCoupons()).resolves.toHaveLength(1);
  });
});

describe("createCoupon", () => {
  it("postea el alta y devuelve el cupón creado", async () => {
    const creado = makeCoupon({ id: 9, code: "VERANO20" });
    mock.ok(creado, { status: 201 });

    await expect(
      createCoupon({ code: "verano20", type: "percent", value: 20 })
    ).resolves.toEqual(creado);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/coupons");
    expect(mock.lastCall().body).toEqual({
      code: "verano20",
      type: "percent",
      value: 20,
    });
  });

  it("manda las fechas como YYYY-MM-DD, sin convertirlas a instante UTC", async () => {
    // El backend las interpreta en la zona de la tienda —inicio de día para el
    // inicio, FIN de día para el vencimiento—, que es lo que un dueño quiere
    // decir con "vence el 31". Mandar un instante UTC le recortaría la última
    // tarde de la promoción.
    mock.ok(makeCoupon(), { status: 201 });

    await createCoupon({
      code: "VERANO20",
      type: "percent",
      value: 20,
      startsAt: "2026-08-01",
      expiresAt: "2026-08-31",
    });

    expect(mock.lastCall().body).toMatchObject({
      startsAt: "2026-08-01",
      expiresAt: "2026-08-31",
    });
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // El cupón YA existe: lanzar invitaría a reintentar y crearía un segundo, o
    // chocaría con el 409 de código duplicado del que acaba de crearse.
    const crudo = { id: 9, codigo: "VERANO20" };
    mock.ok(crudo, { status: 201 });

    await expect(
      createCoupon({ code: "VERANO20", type: "percent", value: 20 })
    ).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "createCoupon: la respuesta 2xx no valida CouponSchema",
      expect.anything()
    );
  });
});

describe("updateCoupon", () => {
  it("cancela mandando SOLO { active: false } — nunca un DELETE", async () => {
    // Es el contrato entero de "cancelar" en esta pantalla: el histórico y la
    // posibilidad de reactivar dependen de que la fila siga existiendo.
    mock.ok(makeCoupon({ active: false }));

    await updateCoupon(3, { active: false });

    expect(mock.lastCall().method).toBe("put");
    expect(mock.lastCall().url).toBe("/admin/coupons/3");
    expect(mock.lastCall().body).toEqual({ active: false });
  });

  it("una clave ausente significa 'no toques ese campo'", async () => {
    mock.ok(makeCoupon({ value: 25 }));

    await updateCoupon(3, { value: 25 });

    expect(mock.lastCall().body).toEqual({ value: 25 });
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    const crudo = { id: 3 };
    mock.ok(crudo);

    await expect(updateCoupon(3, { active: false })).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "updateCoupon: la respuesta 2xx no valida CouponSchema",
      expect.anything()
    );
  });
});

describe("deleteCoupon", () => {
  it("reporta `deactivated: true` cuando el backend desactivó en vez de borrar", async () => {
    // La UI dice lo que el backend HIZO, no lo que se le pidió: un cupón con
    // canjes se desactiva para no romper el histórico de esas ventas.
    mock.ok({ ok: true, deactivated: true });

    await expect(deleteCoupon(3)).resolves.toEqual({ ok: true, deactivated: true });
    expect(mock.lastCall().method).toBe("delete");
    expect(mock.lastCall().url).toBe("/admin/coupons/3");
  });

  it("reporta `deactivated: false` cuando sí se borró", async () => {
    mock.ok({ ok: true, deactivated: false });

    await expect(deleteCoupon(3)).resolves.toEqual({ ok: true, deactivated: false });
  });

  it("LANZA si falta `deactivated`: es el dato que decide el aviso al dueño", async () => {
    mock.ok({ ok: true });

    await expect(deleteCoupon(3)).rejects.toThrow();
  });
});

describe("couponWriteErrorMessage", () => {
  it("prefiere el mensaje del backend, que ya dice qué regla se rompió", () => {
    expect(
      couponWriteErrorMessage(
        apiError(400, "Un cupón de porcentaje no puede pasar de 100.")
      )
    ).toBe("Un cupón de porcentaje no puede pasar de 100.");
  });

  it("usa el mensaje del backend en el 409 de código duplicado", () => {
    expect(
      couponWriteErrorMessage(apiError(409, "Ya existe un cupón con el código VERANO20."))
    ).toBe("Ya existe un cupón con el código VERANO20.");
  });

  it("tiene copia propia para un 404 sin mensaje", () => {
    expect(couponWriteErrorMessage(apiError(404))).toMatch(/Ese cupón ya no existe/);
  });

  it("distingue 'no pudimos conectar' cuando la petición nunca llegó", () => {
    expect(couponWriteErrorMessage(networkError())).toMatch(/No pudimos conectar/);
  });

  it("cae al genérico ante un status sin mensaje", () => {
    expect(couponWriteErrorMessage(apiError(500))).toBe(
      "No pudimos guardar el cupón. Inténtalo de nuevo."
    );
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(couponWriteErrorMessage(new Error("boom"))).toBe(
      "No pudimos guardar el cupón. Inténtalo de nuevo."
    );
  });
});

describe("adminCouponKeys", () => {
  it("expone una key estable", () => {
    expect(adminCouponKeys.all).toEqual(["adminCoupons"]);
  });
});
