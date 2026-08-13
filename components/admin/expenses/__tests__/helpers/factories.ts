import type {
  DerivedShippingCost,
  Expense,
  ExpenseAmountVersion,
  ExpenseMonth,
  ExpenseSummary,
} from "@/lib/api/adminExpenses";

// Fixtures compartidas por components/admin/expenses/__tests__/ — mismo criterio
// que coupons/orders/products/__tests__/helpers/factories.ts: defaults mínimos
// válidos + `overrides`. El default es un gasto mensual activo con una sola
// versión de monto — el estado con más ramas disponibles a la vez (recurrente,
// sin fecha de término, `expenseState` cae directo en "activo").

export function makeExpenseAmountVersion(
  overrides: Partial<ExpenseAmountVersion> = {}
): ExpenseAmountVersion {
  return {
    id: 1,
    amount: 290,
    effectiveFrom: "2026-03-01",
    note: null,
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
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
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-01T12:00:00.000Z",
    currentAmount: 290,
    monthlyRunRate: 290,
    nextChargeDate: "2026-09-01",
    amounts: [makeExpenseAmountVersion()],
    ...overrides,
  };
}

export function makeDerivedShippingCost(
  overrides: Partial<DerivedShippingCost> = {}
): DerivedShippingCost {
  return {
    category: "paqueteria",
    derived: true,
    includedInGrossProfit: true,
    from: "2026-08-01",
    to: "2026-08-12",
    partial: true,
    amount: 640,
    orders: 4,
    ...overrides,
  };
}

export function makeUpcomingCharge(
  overrides: Partial<ExpenseSummary["upcomingCharges"][number]> = {}
): ExpenseSummary["upcomingCharges"][number] {
  return {
    expenseId: 1,
    concept: "Render — Web Service",
    vendor: "Render",
    category: "infraestructura",
    frequency: "monthly",
    date: "2026-09-01",
    amount: 290,
    ...overrides,
  };
}

// El default trae UN cargo próximo y NINGÚN gasto de única vez: el estado más
// "callado" posible de la tarjeta, para que cada aviso condicional (la nota de
// `once`, el botón de "ver más", los montos por cargo) aparezca solo cuando el
// caso lo pide explícitamente en sus overrides.
export function makeExpenseSummary(
  overrides: Partial<ExpenseSummary> = {}
): ExpenseSummary {
  return {
    monthlyRunRate: 1200,
    annualRunRate: 14400,
    activeCount: 3,
    byCategory: [
      { category: "infraestructura", count: 2, monthlyRunRate: 900 },
      { category: "software", count: 1, monthlyRunRate: 300 },
    ],
    byFrequency: [{ frequency: "monthly", count: 3, monthlyRunRate: 1200 }],
    upcomingDays: 60,
    upcomingTotal: 290,
    upcomingCharges: [makeUpcomingCharge()],
    shippingCost: makeDerivedShippingCost(),
    ...overrides,
  };
}

export function makeExpenseMonth(overrides: Partial<ExpenseMonth> = {}): ExpenseMonth {
  return {
    isoMonth: "2026-08",
    label: "Agosto 2026",
    partial: false,
    total: 1200,
    byCategory: [{ category: "infraestructura", amount: 1200 }],
    byExpense: [
      {
        expenseId: 1,
        concept: "Render — Web Service",
        vendor: "Render",
        category: "infraestructura",
        frequency: "monthly",
        occurrences: 1,
        amount: 1200,
      },
    ],
    changes: [],
    shippingCost: makeDerivedShippingCost({ from: "2026-08-01", to: "2026-08-31", partial: false }),
    ...overrides,
  };
}
