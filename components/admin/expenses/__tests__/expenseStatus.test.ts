import type { Expense, ExpenseSummary } from "@/lib/api/adminExpenses";
import {
  countsTowardRunRate,
  dayLabel,
  dayLabelShort,
  expenseState,
  groupUpcomingChargesByDate,
  monthLabelShort,
  priceChangeDelta,
  priceChangeLabel,
  upcomingWindowRangeLabel,
} from "../expenseStatus";

// "¿este gasto sigue costando?" sale de cuatro campos (active, startsAt, endsAt y
// frequency), y el ORDEN en que se evalúan cambia lo que el dueño lee en la tabla.
// Esto fija ese orden, y de paso fija que las fechas se leen en UTC —como el
// backend— y no en la zona de la tienda.

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 1,
    concept: "Render — Web Service",
    vendor: "Render",
    category: "infraestructura",
    frequency: "monthly",
    startsAt: "2026-03-01",
    endsAt: null,
    active: true,
    notes: null,
    currentAmount: 290,
    monthlyRunRate: 290,
    nextChargeDate: "2026-09-01",
    amounts: [
      { id: 1, amount: 290, effectiveFrom: "2026-03-01", note: null },
    ],
    ...overrides,
  };
}

const TODAY = "2026-08-15";

describe("expenseState", () => {
  it("un gasto recurrente vigente está activo", () => {
    expect(expenseState(expense(), TODAY)).toBe("activo");
  });

  it("inactivo gana sobre todo lo demás", () => {
    // Es la única acción deliberada del dueño: si él lo dio de baja, eso es lo
    // que tiene que ver, aunque la vigencia además ya hubiera terminado.
    const state = expenseState(
      expense({ active: false, endsAt: "2026-01-31" }),
      TODAY
    );
    expect(state).toBe("inactivo");
  });

  it("un gasto cuya vigencia ya pasó está terminado", () => {
    expect(expenseState(expense({ endsAt: "2026-07-31" }), TODAY)).toBe(
      "terminado"
    );
  });

  it("terminado exige que endsAt sea ANTERIOR a hoy, no igual", () => {
    // Un gasto que termina hoy todavía se cobra hoy: el backend incluye el
    // último día (`endsAt >= today` sigue vigente). Con `<=` aquí, el panel lo
    // daría por muerto la mañana de su último cargo.
    expect(expenseState(expense({ endsAt: TODAY }), TODAY)).toBe("activo");
  });

  it("un gasto que aún no empieza está programado", () => {
    expect(expenseState(expense({ startsAt: "2026-12-01" }), TODAY)).toBe(
      "programado"
    );
  });

  it("programado gana sobre cobrado en un gasto de única vez futuro", () => {
    const state = expenseState(
      expense({ frequency: "once", startsAt: "2026-12-01" }),
      TODAY
    );
    expect(state).toBe("programado");
  });

  it("un gasto de única vez ya pasado está cobrado, no activo", () => {
    // Su monthlyRunRate es 0 y no se va a volver a cobrar. Pintarlo "activo" lo
    // pondría a la par de la renta y el hosting en la lectura de un vistazo, que
    // es justo el número que esta pantalla existe para no confundir.
    const state = expenseState(
      expense({ frequency: "once", startsAt: "2026-04-10" }),
      TODAY
    );
    expect(state).toBe("cobrado");
  });

  it("un gasto que empieza hoy ya cuenta como activo", () => {
    expect(expenseState(expense({ startsAt: TODAY }), TODAY)).toBe("activo");
  });
});

describe("countsTowardRunRate", () => {
  it("un recurrente vigente suma a la carga mensual", () => {
    expect(countsTowardRunRate(expense())).toBe(true);
  });

  it("un gasto de única vez no suma, por caro que sea", () => {
    // El backend le pone monthlyRunRate 0 aunque el monto sea enorme; esto es lo
    // que deja explicarlo en la UI en vez de que parezca un número mal sumado.
    const oneTime = expense({
      frequency: "once",
      currentAmount: 8000,
      monthlyRunRate: 0,
    });
    expect(countsTowardRunRate(oneTime)).toBe(false);
  });
});

describe("priceChangeDelta", () => {
  it("un aumento da delta y porcentaje positivos", () => {
    const change = priceChangeDelta(290, 340);
    expect(change.delta).toBe(50);
    expect(change.percent).toBeCloseTo(17.24, 2);
    expect(change.direction).toBe("up");
  });

  it("una baja da delta negativo", () => {
    const change = priceChangeDelta(400, 340);
    expect(change.delta).toBe(-60);
    expect(change.percent).toBeCloseTo(-15, 5);
    expect(change.direction).toBe("down");
  });

  it("sin cambio, la dirección es 'same'", () => {
    expect(priceChangeDelta(290, 290).direction).toBe("same");
  });

  it("con monto anterior 0 el porcentaje es null, no Infinity", () => {
    // La implementación ingenua devuelve Infinity y la UI pintaría "+Infinity%".
    const change = priceChangeDelta(0, 340);
    expect(change.percent).toBeNull();
    expect((340 - 0) / 0).toBe(Infinity);
    expect(change.delta).toBe(340);
  });
});

describe("priceChangeLabel", () => {
  it("antepone el signo, que toLocaleString no pone", () => {
    // Sin el "+", un aumento y una corrección a la baja se leen igual de un
    // vistazo en la lista de cambios del mes.
    expect(priceChangeLabel(290, 340)).toBe("+$50.00 (+17.2%)");
    expect((340 - 290).toLocaleString("es-MX")).toBe("50");
  });

  it("usa el menos tipográfico en una baja", () => {
    expect(priceChangeLabel(400, 340)).toBe("−$60.00 (−15.0%)");
  });

  it("omite el porcentaje cuando no se puede expresar", () => {
    expect(priceChangeLabel(0, 340)).toBe("+$340.00");
  });
});

describe("etiquetas de fecha", () => {
  it("dayLabel no rueda el día en hosts al oeste de UTC", () => {
    // `new Date("2026-08-01")` es medianoche UTC; formatearlo sin fijar la zona
    // lo pinta como 31 de julio en America/Mexico_City, que es donde corre esto.
    expect(dayLabel("2026-08-01")).toBe("1 de agosto de 2026");
    expect(
      new Date("2026-08-01").toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Mexico_City",
      })
    ).toBe("31 de julio de 2026");
  });

  it("dayLabel devuelve un guion ante null o basura", () => {
    expect(dayLabel(null)).toBe("—");
    expect(dayLabel("no-es-fecha")).toBe("—");
  });

  it("dayLabelShort abrevia el mes", () => {
    expect(dayLabelShort("2026-08-01")).toBe("1 ago");
  });

  it("monthLabelShort formatea el mes del historial", () => {
    expect(monthLabelShort("2026-08")).toBe("ago 26");
    expect(monthLabelShort("basura")).toBe("basura");
  });

  it("upcomingWindowRangeLabel cubre de hoy a hoy + (days - 1)", () => {
    // 60 días desde el 3 de agosto de 2026 terminan el 1 de octubre — es lo que
    // explica que un gasto mensual (un cobro por mes) aparezca dos veces en la
    // ventana: hay dos fechas de cobro reales dentro de ese rango, no un
    // duplicado.
    expect(upcomingWindowRangeLabel(60, "2026-08-03")).toBe("3 ago – 1 oct");
  });

  it("upcomingWindowRangeLabel con 1 día es un solo punto", () => {
    expect(upcomingWindowRangeLabel(1, "2026-08-03")).toBe("3 ago – 3 ago");
  });
});

function upcomingCharge(
  overrides: Partial<ExpenseSummary["upcomingCharges"][number]> = {}
): ExpenseSummary["upcomingCharges"][number] {
  return {
    expenseId: 1,
    concept: "Render — Web Service",
    vendor: "Render",
    category: "infraestructura",
    frequency: "monthly",
    date: "2026-08-15",
    amount: 290,
    ...overrides,
  };
}

describe("groupUpcomingChargesByDate", () => {
  it("agrupa cargos consecutivos de la misma fecha en un solo bloque", () => {
    // El caso que hace ilegible la lista plana: dos suscripciones distintas cobrando el
    // mismo día se leían como dos filas sueltas con la misma fecha repetida.
    const charges = [
      upcomingCharge({ expenseId: 1, date: "2026-08-01", amount: 290 }),
      upcomingCharge({ expenseId: 2, date: "2026-08-01", amount: 150 }),
      upcomingCharge({ expenseId: 3, date: "2026-08-15", amount: 80 }),
    ];

    const groups = groupUpcomingChargesByDate(charges);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      date: "2026-08-01",
      charges: [charges[0], charges[1]],
      total: 440,
    });
    expect(groups[1]).toEqual({
      date: "2026-08-15",
      charges: [charges[2]],
      total: 80,
    });
  });

  it("un cargo por fecha da un grupo por cargo", () => {
    const charges = [
      upcomingCharge({ expenseId: 1, date: "2026-08-01" }),
      upcomingCharge({ expenseId: 2, date: "2026-08-08" }),
    ];

    expect(groupUpcomingChargesByDate(charges)).toEqual([
      { date: "2026-08-01", charges: [charges[0]], total: 290 },
      { date: "2026-08-08", charges: [charges[1]], total: 290 },
    ]);
  });

  it("una lista vacía da cero grupos", () => {
    expect(groupUpcomingChargesByDate([])).toEqual([]);
  });
});
