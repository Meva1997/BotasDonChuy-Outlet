import {
  adminExpenseKeys,
  createExpense,
  deleteExpense,
  expenseWriteErrorMessage,
  getAdminExpenses,
  getExpenseHistory,
  getExpenseSummary,
  updateExpense,
} from "../adminExpenses";
import { installMockApi, type MockApi } from "./helpers/mockApi";
import {
  makeExpense,
  makeExpenseMonth,
  makeExpenseSummary,
  omit,
} from "./helpers/factories";
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

describe("getAdminExpenses", () => {
  it("lee la lista sin filtros", async () => {
    const expenses = [makeExpense()];
    mock.ok(expenses);

    await expect(getAdminExpenses()).resolves.toEqual(expenses);
    expect(mock.lastCall().url).toBe("/admin/expenses");
    expect(mock.lastCall().params).toBeUndefined();
  });

  it("manda los filtros como query params", async () => {
    // `from`/`to` filtran por fecha de CARGO, no de alta: un gasto dado de alta
    // en enero y vigente desde entonces sí sale al consultar agosto.
    mock.ok([]);

    await getAdminExpenses({
      from: "2026-08-01",
      to: "2026-08-31",
      category: "infraestructura",
      active: true,
    });

    expect(mock.lastCall().params).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
      category: "infraestructura",
      active: true,
    });
  });

  it("trae `currentAmount`/`monthlyRunRate` precalculados, no los deriva el front", async () => {
    // Vienen del mismo servicio que alimenta el KPI del dashboard: recalcularlos
    // aquí garantizaría que un día las dos pantallas muestren números distintos.
    mock.ok([makeExpense({ currentAmount: 350, monthlyRunRate: 350 })]);

    const [expense] = await getAdminExpenses();

    expect(expense.currentAmount).toBe(350);
    expect(expense.monthlyRunRate).toBe(350);
  });

  it("conserva el historial de versiones de monto", async () => {
    mock.ok([
      makeExpense({
        amounts: [
          { id: 1, amount: 290, effectiveFrom: "2026-03-01", note: null },
          { id: 2, amount: 350, effectiveFrom: "2026-07-01", note: "Subió Render" },
        ],
      }),
    ]);

    const [expense] = await getAdminExpenses();

    expect(expense.amounts).toHaveLength(2);
    expect(expense.amounts[1].note).toBe("Subió Render");
  });

  it("LANZA si `category` cae fuera del enum (parse estricto: es lectura)", async () => {
    mock.ok([makeExpense({ category: "otros-gastos" as never })]);

    await expect(getAdminExpenses()).rejects.toThrow();
  });

  it("LANZA si `frequency` cae fuera del enum", async () => {
    mock.ok([makeExpense({ frequency: "quincenal" as never })]);

    await expect(getAdminExpenses()).rejects.toThrow();
  });

  it("propaga el 400 de un filtro inválido (aquí NO se ignora en silencio)", async () => {
    // Al revés que el catálogo público: quien consulta es el dueño, y un filtro
    // que no aplicó le haría leer mal sus propios números.
    mock.httpError(400, { message: "Categoría no válida" });

    await expect(
      getAdminExpenses({ category: "inventado" as never })
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

describe("getExpenseSummary", () => {
  it("lee el resumen sin parámetros", async () => {
    const summary = makeExpenseSummary();
    mock.ok(summary);

    await expect(getExpenseSummary()).resolves.toEqual(summary);
    expect(mock.lastCall().url).toBe("/admin/expenses/summary");
  });

  it("trae el envío derivado, que no es un gasto capturado", async () => {
    // `derived: true` + `includedInGrossProfit: true` es lo que le dice a la UI
    // que ese renglón NO se suma a los totales: ya está restado en GANANCIA
    // BRUTA, y sumarlo aquí lo contaría dos veces.
    mock.ok(makeExpenseSummary());

    const summary = await getExpenseSummary();

    expect(summary.shippingCost.derived).toBe(true);
    expect(summary.shippingCost.includedInGrossProfit).toBe(true);
  });

  it("LANZA si falta `shippingCost` (requerido desde la Fase 22)", async () => {
    mock.ok(omit(makeExpenseSummary(), "shippingCost"));

    await expect(getExpenseSummary()).rejects.toThrow();
  });
});

describe("getExpenseHistory", () => {
  it("lee el historial sin rango", async () => {
    const months = [makeExpenseMonth()];
    mock.ok(months);

    await expect(getExpenseHistory()).resolves.toEqual(months);
    expect(mock.lastCall().url).toBe("/admin/expenses/history");
    expect(mock.lastCall().params).toEqual({ from: undefined, to: undefined });
  });

  it("manda from/to en formato YYYY-MM", async () => {
    mock.ok([]);

    await getExpenseHistory("2026-01", "2026-08");

    expect(mock.lastCall().params).toEqual({ from: "2026-01", to: "2026-08" });
  });

  it("acepta un mes marcado como parcial (el mes en curso)", async () => {
    mock.ok([makeExpenseMonth({ partial: true })]);

    const [month] = await getExpenseHistory();

    expect(month.partial).toBe(true);
  });

  it("acepta un mes vacío: el historial no tiene huecos, los meses sin gasto van en $0", async () => {
    mock.ok([
      makeExpenseMonth({ total: 0, byCategory: [], byExpense: [], changes: [] }),
    ]);

    const [month] = await getExpenseHistory();

    expect(month.total).toBe(0);
  });
});

describe("createExpense", () => {
  it("postea el alta con el monto de la primera versión", async () => {
    const creado = makeExpense({ id: 9 });
    mock.ok(creado, { status: 201 });

    await expect(
      createExpense({
        concept: "Render — Web Service",
        category: "infraestructura",
        frequency: "monthly",
        startsAt: "2026-03-01",
        amount: 290,
      })
    ).resolves.toEqual(creado);

    expect(mock.lastCall().method).toBe("post");
    expect(mock.lastCall().url).toBe("/admin/expenses");
    expect(mock.lastCall().body).toMatchObject({ amount: 290 });
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    // El gasto YA se dio de alta: lanzar invitaría a reintentar y crearía un
    // segundo gasto idéntico, que inflaría el KPI del dashboard.
    const crudo = { id: 9, concepto: "Render" };
    mock.ok(crudo, { status: 201 });

    await expect(
      createExpense({
        concept: "Render",
        category: "infraestructura",
        frequency: "monthly",
        startsAt: "2026-03-01",
        amount: 290,
      })
    ).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "createExpense: la respuesta 2xx no valida ExpenseSchema",
      expect.anything()
    );
  });
});

describe("updateExpense", () => {
  it("da de baja mandando SOLO { active: false } — nunca un DELETE", async () => {
    mock.ok(makeExpense({ active: false, endsAt: "2026-08-20" }));

    await updateExpense(1, { active: false });

    expect(mock.lastCall().method).toBe("put");
    expect(mock.lastCall().url).toBe("/admin/expenses/1");
    expect(mock.lastCall().body).toEqual({ active: false });
  });

  it("edita el concepto SIN mandar monto — editar no debe repreciar el histórico", async () => {
    // Es la razón de que el cambio de precio sea otro formulario: el monto es una
    // VERSIÓN fechada, no una columna.
    mock.ok(makeExpense({ concept: "Render — Web Service (prod)" }));

    await updateExpense(1, { concept: "Render — Web Service (prod)" });

    expect(mock.lastCall().body).toEqual({ concept: "Render — Web Service (prod)" });
    expect(mock.lastCall().body).not.toHaveProperty("amount");
  });

  it("un cambio de precio manda monto + vigencia juntos", async () => {
    // `amountEffectiveFrom` sin `amount` es 400 en el backend; el monto solo sí
    // es válido (toma hoy como vigencia).
    mock.ok(makeExpense({ currentAmount: 350 }));

    await updateExpense(1, { amount: 350, amountEffectiveFrom: "2026-07-01" });

    expect(mock.lastCall().body).toEqual({
      amount: 350,
      amountEffectiveFrom: "2026-07-01",
    });
  });

  it("ante un 2xx con cuerpo inesperado avisa y devuelve el dato crudo, sin lanzar", async () => {
    const crudo = { id: 1 };
    mock.ok(crudo);

    await expect(updateExpense(1, { active: false })).resolves.toEqual(crudo);
    expect(warn).toHaveBeenCalledWith(
      "updateExpense: la respuesta 2xx no valida ExpenseSchema",
      expect.anything()
    );
  });

  it("propaga el 400 de vigencia sin monto", async () => {
    mock.httpError(400, {
      message: "Para fechar una vigencia hay que mandar también el monto nuevo.",
    });

    await expect(
      updateExpense(1, { amountEffectiveFrom: "2026-07-01" })
    ).rejects.toMatchObject({ response: { status: 400 } });
  });
});

describe("deleteExpense", () => {
  it("reporta `deactivated: true` cuando el backend desactivó en vez de borrar", async () => {
    mock.ok({ ok: true, deactivated: true });

    await expect(deleteExpense(1)).resolves.toEqual({ ok: true, deactivated: true });
    expect(mock.lastCall().method).toBe("delete");
    expect(mock.lastCall().url).toBe("/admin/expenses/1");
  });

  it("LANZA si falta `deactivated`: es el dato que decide el aviso al dueño", async () => {
    mock.ok({ ok: true });

    await expect(deleteExpense(1)).rejects.toThrow();
  });
});

describe("expenseWriteErrorMessage", () => {
  it("prefiere el mensaje del backend, que ya es copia accionable en español", () => {
    expect(
      expenseWriteErrorMessage(
        apiError(400, "Un gasto de única vez no lleva fecha de término.")
      )
    ).toBe("Un gasto de única vez no lleva fecha de término.");
  });

  it("tiene copia propia para un 404 sin mensaje", () => {
    expect(expenseWriteErrorMessage(apiError(404))).toMatch(/Ese gasto ya no existe/);
  });

  it("distingue 'no pudimos conectar' cuando la petición nunca llegó", () => {
    expect(expenseWriteErrorMessage(networkError())).toMatch(/No pudimos conectar/);
  });

  it("cae al genérico ante un status sin mensaje", () => {
    expect(expenseWriteErrorMessage(apiError(500))).toBe(
      "No pudimos guardar el gasto. Inténtalo de nuevo."
    );
  });

  it("cae al genérico ante algo que no es un AxiosError", () => {
    expect(expenseWriteErrorMessage(new Error("boom"))).toBe(
      "No pudimos guardar el gasto. Inténtalo de nuevo."
    );
  });
});

describe("adminExpenseKeys", () => {
  it("cuelga las tres lecturas de `all`: cualquier escritura mueve las tres", () => {
    expect(adminExpenseKeys.all).toEqual(["adminExpenses"]);
    expect(adminExpenseKeys.summary()).toEqual(["adminExpenses", "summary"]);
    expect(adminExpenseKeys.history()).toEqual(["adminExpenses", "history"]);
    expect(adminExpenseKeys.list({ active: true })).toEqual([
      "adminExpenses",
      "list",
      { active: true },
    ]);
  });

  it("`list` sin filtros usa null, para que la key serialice igual siempre", () => {
    expect(adminExpenseKeys.list()).toEqual(["adminExpenses", "list", null]);
  });
});
