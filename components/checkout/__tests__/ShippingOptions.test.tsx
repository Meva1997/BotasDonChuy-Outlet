import { useEffect, useRef } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import { useCartStore } from "@/store/cartStore";
import { cartLineSignature, shippingSignature } from "@/lib/domain/cart";
import { getShippingRates, shippingKeys, type ShippingRatesResponse } from "@/lib/api/shipping";
import { validateCoupon, type CouponPreview } from "@/lib/api/coupons";
import { createOrder } from "@/lib/api/orders";
import { getStripe } from "@/lib/stripe/client";
import {
  useCheckout,
  type AppliedCoupon,
} from "../CheckoutContext";
import ShippingOptions from "../ShippingOptions";
import { apiError } from "./helpers/apiError";
import {
  makeCartItem,
  makeOrderResponse,
  makeShippingData,
  makeShippingRate,
} from "./helpers/factories";
import { renderWithCheckout } from "./helpers/render";

// El paso más intrincado del checkout: cotiza envío en vivo, revalida el cupón
// contra el correo YA confirmado (el único punto donde el "un uso por cliente" se
// puede verificar), reconcilia la tarifa elegida con cada cotización nueva, y
// finalmente cobra. `packageCount` sale del MÁXIMO de `data.rates`, no de
// `rates[0]` — hoy da igual, pero leer el primero es apostarle a una casualidad.

jest.mock("../../../lib/api/shipping", () => ({
  ...jest.requireActual("../../../lib/api/shipping"),
  getShippingRates: jest.fn(),
}));
jest.mock("../../../lib/api/coupons", () => ({
  ...jest.requireActual("../../../lib/api/coupons"),
  validateCoupon: jest.fn(),
}));
jest.mock("../../../lib/api/orders", () => ({
  ...jest.requireActual("../../../lib/api/orders"),
  createOrder: jest.fn(),
}));
jest.mock("../../../lib/stripe/client", () => ({ getStripe: jest.fn() }));

const getShippingRatesMock = getShippingRates as jest.Mock;
const validateCouponMock = validateCoupon as jest.Mock;
const createOrderMock = createOrder as jest.Mock;
const getStripeMock = getStripe as jest.Mock;

type Ctx = ReturnType<typeof useCheckout>;

const customer = makeShippingData();
const items = [makeCartItem()];

function Harness({
  onContext,
  confirmed = true,
  coupon,
}: {
  onContext: (ctx: Ctx) => void;
  confirmed?: boolean;
  coupon?: AppliedCoupon;
}) {
  const ctx = useCheckout();
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      if (coupon) ctx.setAppliedCoupon(cartLineSignature(items), coupon);
      if (confirmed) ctx.confirmShipping(customer);
      seeded.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  onContext(ctx);
  return <ShippingOptions />;
}

function renderShipping(options: { confirmed?: boolean; coupon?: AppliedCoupon } = {}) {
  let ctx!: Ctx;
  const utils = renderWithCheckout(
    <Harness {...options} onContext={(c) => (ctx = c)} />
  );
  return { ...utils, getCtx: () => ctx };
}

function ratesResponse(overrides: Partial<ShippingRatesResponse> = {}): ShippingRatesResponse {
  return { quotationId: "quotation-1", rates: [makeShippingRate()], ...overrides };
}

function makeCoupon(overrides: Partial<AppliedCoupon> = {}): AppliedCoupon {
  return {
    code: "VERANO25",
    discount: 100,
    description: null,
    oncePerCustomer: false,
    perCustomerChecked: false,
    checkedEmail: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ items });
  getShippingRatesMock.mockResolvedValue(ratesResponse());
});

describe("sin dirección confirmada", () => {
  it("muestra el aviso de dirección faltante y no cotiza", () => {
    renderShipping({ confirmed: false });
    expect(screen.getByText("Falta tu dirección de envío")).toBeInTheDocument();
    expect(getShippingRatesMock).not.toHaveBeenCalled();
  });

  it("'Volver a dirección' regresa al paso 1", async () => {
    const { user, getCtx } = renderShipping({ confirmed: false });
    await user.click(screen.getByRole("button", { name: "Volver a dirección" }));
    expect(getCtx().step).toBe(1);
  });
});

describe("estados de carga y error de la cotización", () => {
  it("muestra el estado de carga mientras se cotiza", () => {
    getShippingRatesMock.mockReturnValue(new Promise(() => {}));
    renderShipping();
    expect(screen.getByText("Buscando paqueterías")).toBeInTheDocument();
  });

  it("ante un fallo, ofrece reintentar (y reintentar vuelve a llamar a la API)", async () => {
    getShippingRatesMock.mockRejectedValueOnce(new Error("boom"));
    const { user } = renderShipping();

    await screen.findByText("No pudimos calcular las opciones de envío.");
    getShippingRatesMock.mockResolvedValueOnce(ratesResponse());
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(getShippingRatesMock).toHaveBeenCalledTimes(2));
  });
});

describe("selección de tarifa", () => {
  it("con una sola tarifa, se autoselecciona sin interacción del usuario", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({ rates: [makeShippingRate({ total: 150 })] })
    );
    renderShipping();

    const radio = await screen.findByRole("radio");
    await waitFor(() => expect(radio).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByRole("button", { name: /Pagar y confirmar/ })).toBeEnabled();
  });

  it("con la tarifa plana de respaldo (rateId/quotationId null), igual se autoselecciona", async () => {
    // Skydropx falló y el backend cayó a SHIPPING_BY_TYPE: `rateId` y la
    // `quotationId` de la respuesta vienen null, y el front debe seguir
    // pudiendo elegirla y cobrarla como cualquier otra.
    getShippingRatesMock.mockResolvedValueOnce({
      quotationId: null,
      rates: [makeShippingRate({ rateId: null, carrier: "Estándar", total: 160 })],
    } satisfies ShippingRatesResponse);
    renderShipping();

    const radio = await screen.findByRole("radio");
    await waitFor(() => expect(radio).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByText("Estándar")).toBeInTheDocument();
  });

  it("con varias tarifas, ninguna se preselecciona hasta que el usuario elige", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", total: 150, days: 3 }),
          makeShippingRate({ rateId: "b", carrier: "DHL", total: 250, days: 1 }),
        ],
      })
    );
    const { user } = renderShipping();

    const radios = await screen.findAllByRole("radio");
    expect(radios).toHaveLength(2);
    radios.forEach((r) => expect(r).toHaveAttribute("aria-checked", "false"));
    expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeDisabled();

    await user.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
  });

  it("marca 'Más económico' y 'Más rápido' comparando SOLO cuando hay más de una opción", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", total: 250, days: 1 }),
          makeShippingRate({ rateId: "b", carrier: "DHL", total: 150, days: 3 }),
        ],
      })
    );
    renderShipping();

    await screen.findAllByRole("radio");
    expect(screen.getByText("Más económico")).toBeInTheDocument();
    expect(screen.getByText("Más rápido")).toBeInTheDocument();
  });

  it("con una sola tarifa, no hay distintivos de comparación", async () => {
    renderShipping();
    await screen.findByRole("radio");
    expect(screen.queryByText("Más económico")).not.toBeInTheDocument();
    expect(screen.queryByText("Más rápido")).not.toBeInTheDocument();
  });
});

describe("reconciliación de la tarifa elegida con una cotización nueva", () => {
  it("si la tarifa elegida ya no está en la cotización nueva, se descarta (obliga a re-elegir)", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        quotationId: "q1",
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", service: "Terrestre" }),
          makeShippingRate({ rateId: "b", carrier: "DHL", service: "Express" }),
          makeShippingRate({ rateId: "c", carrier: "FedEx", service: "Ground" }),
        ],
      })
    );
    const utils = renderShipping();
    const { user } = utils;
    const radios = await screen.findAllByRole("radio");
    await user.click(radios[1]); // selecciona 'b'
    expect(radios[1]).toHaveAttribute("aria-checked", "true");

    // Nueva cotización sin 'b' (p. ej. el carrito cambió de forma sutil): la
    // tarifa elegida ya no corresponde a nada en la respuesta fresca.
    act(() => {
      utils.queryClient.setQueryData(shippingKeys.rates(items, customer), {
        quotationId: "q2",
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", service: "Terrestre" }),
          makeShippingRate({ rateId: "c", carrier: "FedEx", service: "Ground" }),
        ],
      } satisfies ShippingRatesResponse);
    });

    await waitFor(() =>
      expect(utils.getCtx().getSelectedRate(shippingSignature(items, customer))).toBeNull()
    );
  });

  it("si la tarifa elegida sigue presente pero la quotationId cambió, se resincroniza (no se descarta)", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        quotationId: "q1",
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", service: "Terrestre" }),
          makeShippingRate({ rateId: "b", carrier: "DHL", service: "Express" }),
        ],
      })
    );
    const utils = renderShipping();
    const { user } = utils;
    const radios = await screen.findAllByRole("radio");
    await user.click(radios[0]); // selecciona 'a'
    await waitFor(() =>
      expect(utils.getCtx().getSelectedRate(shippingSignature(items, customer))?.quotationId).toBe(
        "q1"
      )
    );

    act(() => {
      utils.queryClient.setQueryData(shippingKeys.rates(items, customer), {
        quotationId: "q2",
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", service: "Terrestre" }),
          makeShippingRate({ rateId: "b", carrier: "DHL", service: "Express" }),
        ],
      } satisfies ShippingRatesResponse);
    });

    await waitFor(() =>
      expect(utils.getCtx().getSelectedRate(shippingSignature(items, customer))?.quotationId).toBe(
        "q2"
      )
    );
    // Sigue siendo 'a': no se limpió por el simple hecho de haber una cotización nueva.
    expect(utils.getCtx().getSelectedRate(shippingSignature(items, customer))?.rateId).toBe("a");
  });
});

describe("packageCount: se toma el máximo de data.rates, no rates[0]", () => {
  it("con la primera tarifa en 1 caja y la segunda en 3, el banner dice 3", async () => {
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        rates: [
          makeShippingRate({ rateId: "a", packageCount: 1 }),
          makeShippingRate({ rateId: "b", packageCount: 3 }),
        ],
      })
    );
    renderShipping();

    expect(await screen.findByText(/Tu pedido va en/)).toHaveTextContent("3 cajas");
  });

  it("con packageCount = 1 en todas las tarifas, no muestra el banner de multi-caja", async () => {
    renderShipping();
    await screen.findByRole("radio");
    expect(screen.queryByText(/Tu pedido va en/)).not.toBeInTheDocument();
  });

  it("una vez elegida una tarifa, el aviso de la lista y el resumen dicen el MISMO número", async () => {
    // Los dos avisos describen el mismo envío, así que salen de un solo cálculo:
    // sin elegir, el máximo de la cotización; con una tarifa elegida, la suya —que
    // es la que se va a cobrar—. Con dos cálculos distintos, dos paqueterías que
    // empacaran diferente harían que la misma pantalla mostrara dos números.
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({
        rates: [
          makeShippingRate({ rateId: "a", carrier: "Estafeta", packageCount: 2 }),
          makeShippingRate({ rateId: "b", carrier: "DHL", packageCount: 3 }),
        ],
      })
    );
    const listNote = () =>
      within(screen.getByRole("radiogroup")).getByText(/Tu pedido va en/);
    const summaryNote = () =>
      within(screen.getByRole("complementary")).getByText(/Tu pedido va en/);

    const { user } = renderShipping();
    const radios = await screen.findAllByRole("radio");
    // Sin elegir todavía no hay "la que se va a cobrar": manda el máximo.
    expect(listNote()).toHaveTextContent("3 cajas");

    await user.click(radios[0]); // Estafeta, 2 cajas

    await waitFor(() => expect(listNote()).toHaveTextContent("2 cajas"));
    expect(summaryNote()).toHaveTextContent("2 cajas");
    expect(screen.queryAllByText(/3 cajas/)).toHaveLength(0);
  });
});

describe("invariante del total que se muestra", () => {
  it("total = subtotal − savings − couponDiscount + shipping, con el descuento fuera del envío", async () => {
    // Aquí es donde vive la aritmética (OrderTotals solo pinta lo que recibe), así
    // que es el único lugar donde el invariante se puede afirmar de verdad.
    // Carrito: una pieza de $1,000 de lista a $800 de outlet → subtotal 1000,
    // ahorro 200. Con un cupón de $100 y una guía de $150:
    //   1000 − 200 − 100 + 150 = 850.
    getShippingRatesMock.mockResolvedValueOnce(
      ratesResponse({ rates: [makeShippingRate({ total: 150 })] })
    );
    // `checkedEmail` ya coincide con el correo confirmado: no se dispara la
    // revalidación, así que el descuento no puede cambiar a media prueba.
    renderShipping({
      coupon: makeCoupon({ discount: 100, checkedEmail: customer.email }),
    });

    await screen.findByText("$850.00");
    const summary = within(screen.getByRole("complementary"));
    expect(summary.getByText("$1,000.00")).toBeInTheDocument(); // precio original
    expect(summary.getByText("$800.00")).toBeInTheDocument(); // precio outlet
    expect(summary.getByText("−$100.00")).toBeInTheDocument(); // cupón
    // El cupón NUNCA toca el envío: la guía sigue costando lo cotizado.
    expect(summary.getByText("$150.00")).toBeInTheDocument();
    expect(summary.getByText("Total")).toBeInTheDocument();
    expect(validateCouponMock).not.toHaveBeenCalled();
  });
});

describe("revalidación del cupón contra el correo confirmado", () => {
  it("sin cupón aplicado, no dispara ninguna revalidación", async () => {
    renderShipping();
    await screen.findByRole("radio");
    expect(validateCouponMock).not.toHaveBeenCalled();
  });

  it("con un cupón aplicado desde el paso 0 (checkedEmail null), revalida con el correo confirmado", async () => {
    validateCouponMock.mockResolvedValueOnce({
      code: "VERANO25",
      type: "percent",
      value: 25,
      description: null,
      discount: 100,
      netMerchandise: 800,
      remainingRedemptions: 5,
      oncePerCustomer: true,
      perCustomerChecked: true,
      expiresAt: null,
    } satisfies CouponPreview);

    const { getCtx } = renderShipping({ coupon: makeCoupon({ checkedEmail: null, discount: 100 }) });

    await waitFor(() =>
      expect(validateCouponMock).toHaveBeenCalledWith(
        expect.objectContaining({ code: "VERANO25", email: customer.email })
      )
    );

    // Se re-guarda con el correo ya verificado y el descuento FRESCO del
    // servidor (100 → 100 en este caso, pero es el valor devuelto, no el que ya
    // traía cacheado) — así la revalidación no vuelve a dispararse en cada render.
    await waitFor(() => {
      const applied = getCtx().getAppliedCoupon(cartLineSignature(items));
      expect(applied?.checkedEmail).toBe(customer.email);
      expect(applied?.discount).toBe(100);
    });
  });

  it("un rechazo 4xx bloquea el pago y ofrece quitar el cupón", async () => {
    validateCouponMock.mockRejectedValueOnce(
      apiError(409, 'El cupón "VERANO25" ya lo usaste con ese correo. Quítalo del checkout.')
    );
    const { user, getCtx } = renderShipping({ coupon: makeCoupon() });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/ya lo usaste con ese correo/);
    expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Quitar cupón y continuar" }));
    expect(getCtx().getAppliedCoupon(cartLineSignature(items))).toBeNull();
  });

  it("un error de red/429 NO bloquea el pago (no es un rechazo del cupón)", async () => {
    const networkError = new Error("Network Error");
    Object.assign(networkError, { isAxiosError: true, response: undefined });
    validateCouponMock.mockRejectedValueOnce(networkError);

    renderShipping({ coupon: makeCoupon() });

    await waitFor(() => expect(validateCouponMock).toHaveBeenCalled());
    // No hay alerta de cupón bloqueado, y la tarifa única ya se autoseleccionó.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeEnabled()
    );
  });
});

describe("pagar y confirmar", () => {
  function setUpSuccessfulPayment() {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    const stripe = {
      confirmCardPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: "succeeded" } }),
      retrievePaymentIntent: jest.fn(),
    };
    getStripeMock.mockReturnValue(Promise.resolve(stripe));
    return stripe;
  }

  it("con una tarifa autoseleccionada, cobra y avanza a Confirmación", async () => {
    setUpSuccessfulPayment();
    const { user, getCtx } = renderShipping();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeEnabled()
    );
    await user.click(screen.getByRole("button", { name: "Pagar y confirmar" }));

    await waitFor(() => expect(getCtx().step).toBe(3));
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it("mientras procesa, deshabilita el botón y muestra 'Procesando…'", async () => {
    createOrderMock.mockResolvedValueOnce({
      order: makeOrderResponse(),
      clientSecret: "secret_1",
      replayed: false,
    });
    let resolveConfirm: (v: unknown) => void = () => {};
    const stripe = {
      confirmCardPayment: jest.fn(
        () => new Promise((res) => (resolveConfirm = res))
      ),
      retrievePaymentIntent: jest.fn(),
    };
    getStripeMock.mockReturnValue(Promise.resolve(stripe));

    const { user } = renderShipping();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeEnabled()
    );
    await user.click(screen.getByRole("button", { name: "Pagar y confirmar" }));

    expect(await screen.findByText("Procesando…")).toBeInTheDocument();
    resolveConfirm({ paymentIntent: { status: "succeeded" } });
  });

  it("un cupón rechazado justo al cobrar ofrece 'Quitar cupón y reintentar' sin tocar la orden", async () => {
    createOrderMock.mockRejectedValueOnce(
      apiError(409, 'El cupón "VERANO25" se agotó justo antes de que confirmaras.')
    );
    validateCouponMock.mockResolvedValueOnce({
      code: "VERANO25",
      type: "percent",
      value: 25,
      description: null,
      discount: 100,
      netMerchandise: 800,
      remainingRedemptions: 5,
      oncePerCustomer: false,
      perCustomerChecked: true,
      expiresAt: null,
    } satisfies CouponPreview);

    const { user, getCtx } = renderShipping({ coupon: makeCoupon({ checkedEmail: customer.email }) });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pagar y confirmar" })).toBeEnabled()
    );
    await user.click(screen.getByRole("button", { name: "Pagar y confirmar" }));

    const retryButton = await screen.findByRole("button", {
      name: "Quitar cupón y reintentar",
    });
    await user.click(retryButton);
    expect(getCtx().getAppliedCoupon(cartLineSignature(items))).toBeNull();
  });
});
