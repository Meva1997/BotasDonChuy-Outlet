import type { AdminCoupon } from "@/lib/api/adminCoupons";
import {
  couponState,
  couponUsageLabel,
  couponValueLabel,
  couponWindowLabel,
  hasRedemptionDivergence,
  storeDayISO,
} from "../couponStatus";

// "¿este cupón está vivo?" sale de cinco campos (active, la ventana de vigencia y
// el tope global contra el contador), y el ORDEN en que se evalúan cambia lo que
// el dueño lee en la tabla. Esto fija ese orden.

function coupon(overrides: Partial<AdminCoupon> = {}): AdminCoupon {
  return {
    id: 1,
    code: "VERANO25",
    type: "percent",
    value: 20,
    maxDiscount: null,
    minSubtotal: null,
    maxRedemptions: null,
    redeemedCount: 0,
    oncePerCustomer: true,
    startsAt: null,
    expiresAt: null,
    active: true,
    description: null,
    activeRedemptions: 0,
    ...overrides,
  };
}

const NOW = new Date("2026-08-15T12:00:00.000Z");

describe("couponState", () => {
  it("un cupón sin restricciones está activo", () => {
    expect(couponState(coupon(), NOW)).toBe("activo");
  });

  it("cancelado gana sobre todo lo demás", () => {
    // Es la única acción deliberada del dueño: si él lo apagó, eso es lo que
    // tiene que ver, aunque además esté vencido y agotado.
    const dead = coupon({
      active: false,
      maxRedemptions: 5,
      redeemedCount: 5,
      expiresAt: "2026-01-01T00:00:00.000Z",
      startsAt: "2027-01-01T00:00:00.000Z",
    });
    expect(couponState(dead, NOW)).toBe("cancelado");
  });

  it("agotado gana sobre vencido", () => {
    // "Se consumió" y "se le pasó la fecha" cuentan historias distintas sobre si
    // la promoción funcionó; con el tope alcanzado, esa es la noticia.
    const spent = coupon({
      maxRedemptions: 3,
      redeemedCount: 3,
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    expect(couponState(spent, NOW)).toBe("agotado");
  });

  it("cuenta como agotado si el contador rebasó el tope", () => {
    // Bajar maxRedemptions por debajo de redeemedCount es válido en el backend:
    // es cómo se detiene una promoción en caliente.
    expect(
      couponState(coupon({ maxRedemptions: 2, redeemedCount: 7 }), NOW)
    ).toBe("agotado");
  });

  it("con tope todavía disponible sigue activo", () => {
    expect(
      couponState(coupon({ maxRedemptions: 10, redeemedCount: 9 }), NOW)
    ).toBe("activo");
  });

  it("distingue vencido de programado", () => {
    expect(
      couponState(coupon({ expiresAt: "2026-08-14T23:59:59.999Z" }), NOW)
    ).toBe("vencido");
    expect(
      couponState(coupon({ startsAt: "2026-09-01T00:00:00.000Z" }), NOW)
    ).toBe("programado");
  });

  it("vence EN el instante de expiración, no después", () => {
    // Espeja el guard del backend (`expiresAt <= now` ya no canjea): con un `<`
    // el panel diría "activo" justo cuando la tienda ya lo rechaza.
    const exact = coupon({ expiresAt: NOW.toISOString() });
    expect(couponState(exact, NOW)).toBe("vencido");
  });

  it("dentro de la ventana está activo", () => {
    const running = coupon({
      startsAt: "2026-08-01T00:00:00.000Z",
      expiresAt: "2026-08-31T23:59:59.999Z",
    });
    expect(couponState(running, NOW)).toBe("activo");
  });
});

describe("couponValueLabel", () => {
  it("un monto fijo se muestra en pesos", () => {
    expect(couponValueLabel(coupon({ type: "fixed", value: 150 }))).toBe(
      "$150.00"
    );
  });

  it("un porcentaje muestra su tope cuando lo tiene", () => {
    // El tope es lo que evita que un 50% sobre un carrito grande se lleve media
    // tienda, así que no puede quedar escondido en el formulario.
    expect(couponValueLabel(coupon({ value: 20, maxDiscount: 300 }))).toBe(
      "20% · máx. $300.00"
    );
    expect(couponValueLabel(coupon({ value: 20, maxDiscount: null }))).toBe("20%");
  });
});

describe("couponUsageLabel", () => {
  it("sin tope global el denominador es infinito", () => {
    expect(couponUsageLabel(coupon({ redeemedCount: 4 }))).toBe("4 / ∞");
  });

  it("con tope muestra los dos números", () => {
    expect(
      couponUsageLabel(coupon({ redeemedCount: 4, maxRedemptions: 10 }))
    ).toBe("4 / 10");
  });
});

describe("hasRedemptionDivergence", () => {
  it("marca cuando el contador guardado no cuadra con los canjes vivos", () => {
    // Solo pasa si alguien tocó la BD a mano; a partir de ahí el tope global deja
    // de contar lo que el dueño cree que cuenta, así que se ve en vez de
    // esconderse.
    expect(
      hasRedemptionDivergence(coupon({ redeemedCount: 5, activeRedemptions: 3 }))
    ).toBe(true);
    expect(
      hasRedemptionDivergence(coupon({ redeemedCount: 3, activeRedemptions: 3 }))
    ).toBe(false);
  });
});

describe("storeDayISO", () => {
  it("no corre el día al leer un vencimiento de fin de día", () => {
    // LA trampa de la sección: el backend guarda "31 de agosto" como
    // 2026-08-31T23:59:59.999-06:00, o sea 2026-09-01T05:59Z. Con un slice(0,10)
    // el formulario se sembraría con el 1 de septiembre y abrir el cupón para
    // cambiarle otra cosa le correría la vigencia un día — y otro en cada guardado.
    expect(storeDayISO("2026-09-01T05:59:59.999Z")).toBe("2026-08-31");
    expect("2026-09-01T05:59:59.999Z".slice(0, 10)).toBe("2026-09-01");
  });

  it("lee el inicio de día sin adelantarlo", () => {
    expect(storeDayISO("2026-08-01T06:00:00.000Z")).toBe("2026-08-01");
  });

  it("devuelve cadena vacía para null o una fecha ilegible", () => {
    // El <input type="date"> necesita "" para quedar en blanco; un "Invalid Date"
    // lo dejaría en un estado que React no puede controlar.
    expect(storeDayISO(null)).toBe("");
    expect(storeDayISO("no es una fecha")).toBe("");
  });
});

describe("couponWindowLabel", () => {
  it("describe cada combinación de la ventana", () => {
    expect(couponWindowLabel(coupon())).toBe("Sin límite");
    expect(
      couponWindowLabel(coupon({ expiresAt: "2026-09-01T05:59:59.999Z" }))
    ).toMatch(/^Hasta 31 ago/);
    expect(
      couponWindowLabel(coupon({ startsAt: "2026-08-01T06:00:00.000Z" }))
    ).toMatch(/^Desde 1 ago/);
    expect(
      couponWindowLabel(
        coupon({
          startsAt: "2026-08-01T06:00:00.000Z",
          expiresAt: "2026-09-01T05:59:59.999Z",
        })
      )
    ).toMatch(/1 ago.+–.+31 ago/);
  });
});
