import { act, renderHook } from "@testing-library/react";
import { CheckoutProvider, useCheckout } from "../CheckoutContext";
import { useCartStore } from "@/store/cartStore";
import { makeCartItem, makeOrderResponse, makeShippingData, makeSelectedRate } from "./helpers/factories";

// El checkout desmonta cada paso al navegar (CheckoutFlow los renderiza
// condicionalmente), así que todo lo que debe sobrevivir a "ir y volver" vive aquí y
// no en el componente del paso: la dirección validada, las tarifas/cupón/orden
// cacheados por firma, y el borrador sin validar. Esta suite verifica justo esa
// supervivencia y las reglas de invalidación cruzada documentadas en el CLAUDE.md
// del proyecto (Fase 2 del roadmap de tests).

function renderCheckout() {
  return renderHook(() => useCheckout(), {
    wrapper: ({ children }) => <CheckoutProvider>{children}</CheckoutProvider>,
  });
}

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false });
});

describe("useCheckout fuera de un CheckoutProvider", () => {
  it("lanza en vez de devolver un contexto vacío en silencio", () => {
    expect(() => renderHook(() => useCheckout())).toThrow(
      "useCheckout debe usarse dentro de <CheckoutProvider>"
    );
  });
});

describe("estado inicial", () => {
  it("arranca en el paso 0, sin nada visitado más allá, ni pedido, ni cliente confirmado", () => {
    const { result } = renderCheckout();
    expect(result.current.step).toBe(0);
    expect(result.current.maxVisitedStep).toBe(0);
    expect(result.current.acceptedTerms).toBe(false);
    expect(result.current.order).toBeNull();
    expect(result.current.confirmedCustomer).toBeNull();
  });
});

describe("navegación (goTo/goToReview/goToDetails)", () => {
  it("goTo amplía maxVisitedStep solo cuando el destino es más avanzado", () => {
    const { result } = renderCheckout();
    act(() => result.current.goTo(2));
    expect(result.current.step).toBe(2);
    expect(result.current.maxVisitedStep).toBe(2);

    act(() => result.current.goTo(0));
    expect(result.current.step).toBe(0);
    // Retroceder no reduce el tope hasta donde puede saltar el Stepper.
    expect(result.current.maxVisitedStep).toBe(2);
  });

  it("goToReview va al paso 0 sin tocar maxVisitedStep", () => {
    const { result } = renderCheckout();
    act(() => result.current.goTo(2));
    act(() => result.current.goToReview());
    expect(result.current.step).toBe(0);
    expect(result.current.maxVisitedStep).toBe(2);
  });

  it("goToDetails visita el paso 1", () => {
    const { result } = renderCheckout();
    act(() => result.current.goToDetails());
    expect(result.current.step).toBe(1);
    expect(result.current.maxVisitedStep).toBe(1);
  });
});

describe("borrador de envío (sin validar)", () => {
  it("sobrevive a un remount del formulario: se guarda y se puede releer", () => {
    const { result } = renderCheckout();
    act(() => result.current.setShippingDraft({ fullName: "Ana" }));
    expect(result.current.getShippingDraft()).toEqual({ fullName: "Ana" });
  });

  it("empieza en null cuando nunca se ha escrito nada", () => {
    const { result } = renderCheckout();
    expect(result.current.getShippingDraft()).toBeNull();
  });
});

describe("confirmShipping", () => {
  it("guarda al cliente validado, invalida la tarifa elegida y avanza al paso 2", () => {
    const { result } = renderCheckout();
    const customer = makeShippingData();
    const signature = "sig-1";
    act(() => result.current.setSelectedRate(signature, makeSelectedRate()));
    expect(result.current.getSelectedRate(signature)).not.toBeNull();

    act(() => result.current.confirmShipping(customer));

    expect(result.current.confirmedCustomer).toEqual(customer);
    expect(result.current.step).toBe(2);
    expect(result.current.maxVisitedStep).toBe(2);
    // Una dirección nueva puede cotizar distinto: cualquier tarifa elegida antes
    // se descarta sin condición, sin importar bajo qué firma se había guardado.
    expect(result.current.getSelectedRate(signature)).toBeNull();
  });
});

describe("cupón aplicado, cacheado por firma", () => {
  it("solo se devuelve si la firma coincide", () => {
    const { result } = renderCheckout();
    const coupon = {
      code: "VERANO25",
      discount: 100,
      description: null,
      oncePerCustomer: false,
      perCustomerChecked: false,
      checkedEmail: null,
    };
    act(() => result.current.setAppliedCoupon("cart-sig-1", coupon));
    expect(result.current.getAppliedCoupon("cart-sig-1")).toEqual(coupon);
    // Firma distinta (p. ej. el carrito cambió): no corresponde, se lee como ausente.
    expect(result.current.getAppliedCoupon("cart-sig-2")).toBeNull();
  });

  it("pasar null limpia el cupón aplicado", () => {
    const { result } = renderCheckout();
    const coupon = {
      code: "VERANO25",
      discount: 100,
      description: null,
      oncePerCustomer: false,
      perCustomerChecked: false,
      checkedEmail: null,
    };
    act(() => result.current.setAppliedCoupon("cart-sig-1", coupon));
    act(() => result.current.setAppliedCoupon("cart-sig-1", null));
    expect(result.current.getAppliedCoupon("cart-sig-1")).toBeNull();
  });
});

describe("tarifa de envío elegida, cacheada por firma", () => {
  it("solo se devuelve si la firma (carrito+cliente) coincide", () => {
    const { result } = renderCheckout();
    const rate = makeSelectedRate();
    act(() => result.current.setSelectedRate("ship-sig-1", rate));
    expect(result.current.getSelectedRate("ship-sig-1")).toEqual(rate);
    expect(result.current.getSelectedRate("ship-sig-2")).toBeNull();
  });
});

describe("clave de idempotencia", () => {
  it("la misma firma reutiliza la misma clave", () => {
    const { result } = renderCheckout();
    const a = result.current.getIdempotencyKey("sig-1");
    const b = result.current.getIdempotencyKey("sig-1");
    expect(a).toBe(b);
  });

  it("una firma distinta rota la clave sola, sin resetIdempotencyKey", () => {
    const { result } = renderCheckout();
    const a = result.current.getIdempotencyKey("sig-1");
    const b = result.current.getIdempotencyKey("sig-2");
    expect(a).not.toBe(b);
  });

  it("resetIdempotencyKey descarta la clave: la misma firma genera una nueva", () => {
    const { result } = renderCheckout();
    const a = result.current.getIdempotencyKey("sig-1");
    act(() => result.current.resetIdempotencyKey());
    const b = result.current.getIdempotencyKey("sig-1");
    expect(a).not.toBe(b);
  });
});

describe("orden pendiente, cacheada por firma", () => {
  it("solo se devuelve si la firma coincide", () => {
    const { result } = renderCheckout();
    const pending = { order: makeOrderResponse(), clientSecret: "secret_1" };
    act(() => result.current.setPendingOrder("sig-1", pending));
    expect(result.current.getPendingOrder("sig-1")).toEqual(pending);
    expect(result.current.getPendingOrder("sig-2")).toBeNull();
  });
});

describe("completeOrder", () => {
  it("congela el snapshot, vacía el carrito y avanza al paso 3", () => {
    const item = makeCartItem();
    useCartStore.setState({ items: [item] });
    const { result } = renderCheckout();
    const customer = makeShippingData();
    const order = makeOrderResponse({
      id: 55,
      couponCode: "VERANO25",
      couponDiscount: 100,
      packageCount: 2,
      publicToken: "tok-123",
    });

    act(() => result.current.completeOrder(customer, order));

    expect(result.current.order).toEqual({
      orderId: 55,
      items: [item],
      totals: {
        subtotal: order.subtotal,
        savings: order.savings,
        shipping: order.shipping,
        total: order.total,
      },
      customer,
      couponCode: "VERANO25",
      couponDiscount: 100,
      packageCount: 2,
      publicToken: "tok-123",
    });
    expect(useCartStore.getState().items).toEqual([]);
    expect(result.current.step).toBe(3);
    expect(result.current.maxVisitedStep).toBe(3);
  });

  it("limpia el borrador de envío, la clave de idempotencia y el cupón aplicado", () => {
    const { result } = renderCheckout();
    act(() => result.current.setShippingDraft({ fullName: "Ana" }));
    const keyBefore = result.current.getIdempotencyKey("sig-1");
    act(() =>
      result.current.setAppliedCoupon("cart-sig", {
        code: "VERANO25",
        discount: 100,
        description: null,
        oncePerCustomer: false,
        perCustomerChecked: false,
        checkedEmail: null,
      })
    );

    act(() => result.current.completeOrder(makeShippingData(), makeOrderResponse()));

    expect(result.current.getShippingDraft()).toBeNull();
    expect(result.current.getAppliedCoupon("cart-sig")).toBeNull();
    // Misma firma que antes: si la clave sobreviviera, sería igual a `keyBefore`.
    const keyAfter = result.current.getIdempotencyKey("sig-1");
    expect(keyAfter).not.toBe(keyBefore);
  });

  it("con couponCode/packageCount/publicToken ausentes, cae a null/0 en vez de undefined", () => {
    const { result } = renderCheckout();
    const order = makeOrderResponse({
      couponCode: undefined,
      couponDiscount: undefined,
      packageCount: undefined,
      publicToken: undefined,
    });

    act(() => result.current.completeOrder(makeShippingData(), order));

    expect(result.current.order?.couponCode).toBeNull();
    expect(result.current.order?.couponDiscount).toBe(0);
    expect(result.current.order?.packageCount).toBeNull();
    expect(result.current.order?.publicToken).toBeNull();
  });
});
