import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/api/client";

/**
 * Contrato de gastos y suscripciones del panel (Fase 20). Patrón `getProducts`:
 * axios vía lib/api/client.ts + Zod en runtime. Refleja los modelos `Expense` y
 * `ExpenseAmount` de ../backend/src/models/.
 *
 * Lo único raro de este contrato —y lo que ordena toda la pantalla— es que
 * **el monto NO es un campo del gasto**: vive versionado por fecha de vigencia en
 * `amounts`. Subir Render de $290 a $340 hoy no reescribe lo que costaba en julio.
 * Ver `updateExpense` abajo.
 */

/**
 * Claves crudas del backend (`EXPENSE_CATEGORIES` de
 * ../backend/src/models/Expense.ts). Sus etiquetas en español viven en
 * `components/admin/expenses/expenseStatus.ts`, no aquí: este archivo es el
 * contrato, no la presentación.
 */
export const EXPENSE_CATEGORIES = [
  "infraestructura",
  "software",
  "renta",
  "servicios",
  "paqueteria",
  "publicidad",
  "nomina",
  "impuestos",
  "otro",
] as const;

/**
 * `once` es el caso aparte: un gasto de única vez **no entra en la carga mensual**
 * (vale 0 en el run-rate) y cuenta completo en el mes de su fecha. Mezclarlo en el
 * "cuánto hay que retirar al mes" mentiría.
 */
export const EXPENSE_FREQUENCIES = [
  "once",
  "weekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "yearly",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseFrequency = (typeof EXPENSE_FREQUENCIES)[number];

/**
 * Una versión de monto. El backend las devuelve del más viejo al más nuevo, y la
 * lista completa ES el historial de precios de ese gasto.
 *
 * `effectiveFrom` es un día de calendario crudo (`DATEONLY` → `"2026-08-01"`), no
 * un instante: se siembra tal cual en un `<input type="date">`.
 */
export const ExpenseAmountVersionSchema = z.object({
  id: z.number(),
  amount: z.number(),
  effectiveFrom: z.string(),
  note: z.string().nullable(),
});

export type ExpenseAmountVersion = z.infer<typeof ExpenseAmountVersionSchema>;

/**
 * Fila del listado. Los tres campos calculados (`currentAmount`, `monthlyRunRate`,
 * `nextChargeDate`) **vienen listos del backend y no se recalculan en el cliente**:
 * duplicar las fórmulas (sobre todo `weekly × 52/12`) garantiza que un día diverjan
 * del KPI `GASTOS` del dashboard, que sale del mismo servicio.
 */
export const ExpenseSchema = z.object({
  id: z.number(),
  concept: z.string(),
  vendor: z.string().nullable(),
  category: z.enum(EXPENSE_CATEGORIES),
  frequency: z.enum(EXPENSE_FREQUENCIES),
  /** Fecha del PRIMER cargo. De ahí se generan todas las ocurrencias. */
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  /** `false` = gasto dado de baja. El backend le fija `endsAt` en hoy solo. */
  active: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  /** Monto vigente HOY, resuelto desde `amounts`. No hay columna `amount`. */
  currentAmount: z.number(),
  /** Equivalente mensual (anual ÷ 12, semanal × 52/12). 0 para `once`. */
  monthlyRunRate: z.number(),
  nextChargeDate: z.string().nullable(),
  amounts: z.array(ExpenseAmountVersionSchema),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpenseListSchema = z.array(ExpenseSchema);

/**
 * Envío pagado a la paquetería en una ventana (Fase 22). Lo devuelven `/summary`
 * (mes en curso a la fecha) y cada mes de `/history`.
 *
 * **Es una línea DERIVADA de los pedidos: no hay fila de gasto detrás.** No se
 * edita, no se borra y no sale en `GET /api/admin/expenses` — de ahí los tres
 * literales, que son invariantes del contrato y no datos que puedan variar.
 *
 * **La regla que ordena toda la fase: va FUERA de `total`, `byCategory`,
 * `byExpense`, `monthlyRunRate`, `annualRunRate` y `activeCount`.** El dashboard ya
 * lo resta en GANANCIA BRUTA (es costo de venta: se paga una guía por pedido, igual
 * que el `unitCost` de cada pieza), y como `OPERATIVA = BRUTA − GASTOS`, sumarlo
 * también a los totales de gastos lo restaría **dos veces**. Sale aparte
 * precisamente para poder pintarlo sin ensuciar los totales.
 *
 * `from`/`to`/`partial` no son decoración: en el mes en curso la ventana llega
 * hasta HOY, y un acumulado a media quincena junto a un `monthlyRunRate` de mes
 * completo se lee como si el envío saliera baratísimo. Rotularlo es obligatorio
 * (`shippingWindowLabel` en `components/admin/expenses/expenseStatus.ts`).
 *
 * ⚠️ Cajas y empaque **sí** van como gasto de categoría `paqueteria`; **las guías
 * no**, ya están aquí.
 */
export const DerivedShippingCostSchema = z.object({
  category: z.literal("paqueteria"),
  /** Siempre `true`: derivado de los pedidos, sin fila editable detrás. */
  derived: z.literal(true),
  /** Siempre `true`: ya restado en GANANCIA BRUTA. No volver a restarlo. */
  includedInGrossProfit: z.literal(true),
  /** Ventana cubierta, días de calendario UTC, ambos inclusive. */
  from: z.string(),
  to: z.string(),
  /** La ventana no ha terminado: el monto puede crecer. */
  partial: z.boolean(),
  amount: z.number(),
  /** Pedidos pagados que lo generaron. Sin esto, un `amount` raro no se puede
   *  sanity-checkear. */
  orders: z.number(),
});

export type DerivedShippingCost = z.infer<typeof DerivedShippingCostSchema>;

/** GET /api/admin/expenses/summary — "¿cuánto tengo que retirar de lo que vendí?" */
export const ExpenseSummarySchema = z.object({
  /** Suma de los recurrentes llevados a su equivalente mensual. Sin los `once`. */
  monthlyRunRate: z.number(),
  annualRunRate: z.number(),
  activeCount: z.number(),
  byCategory: z.array(
    z.object({
      category: z.enum(EXPENSE_CATEGORIES),
      count: z.number(),
      monthlyRunRate: z.number(),
    })
  ),
  byFrequency: z.array(
    z.object({
      frequency: z.enum(EXPENSE_FREQUENCIES),
      count: z.number(),
      monthlyRunRate: z.number(),
    })
  ),
  /** Ventana de `upcomingCharges`, en días. Hoy el backend fija 60. */
  upcomingDays: z.number(),
  upcomingTotal: z.number(),
  /**
   * La otra mitad de la pregunta: qué se cobra, de cuánto y en qué fecha. Aquí SÍ
   * entran los `once` (se cobran de verdad), aunque no sumen al run-rate.
   */
  upcomingCharges: z.array(
    z.object({
      expenseId: z.number(),
      concept: z.string(),
      vendor: z.string().nullable(),
      category: z.enum(EXPENSE_CATEGORIES),
      frequency: z.enum(EXPENSE_FREQUENCIES),
      date: z.string(),
      amount: z.number(),
    })
  ),
  /**
   * Envío del mes en curso a la fecha. **Requerido, no opcional**: mismo precedente
   * que `packageCount` en la Fase 23 — así un backend viejo falla ruidoso en vez de
   * pintar "$0 de guías" sobre un mes que sí tuvo envíos.
   */
  shippingCost: DerivedShippingCostSchema,
});

export type ExpenseSummary = z.infer<typeof ExpenseSummarySchema>;

/**
 * Un mes del historial. `changes` es lo que responde "¿algo cambió?": los cambios
 * de precio que entraron en vigor ese mes, crudos. **El delta y el % los calcula el
 * front** (`priceChangeDelta` en expenseStatus.ts) — misma regla que el resto de
 * métricas derivadas.
 *
 * Sin `changes`, un aumento solo se nota como un total más alto sin causa visible.
 */
export const ExpenseMonthSchema = z.object({
  isoMonth: z.string(),
  label: z.string(),
  /** `true` solo en el mes en curso, igual que el reporte mensual de ventas. */
  partial: z.boolean(),
  total: z.number(),
  byCategory: z.array(
    z.object({
      category: z.enum(EXPENSE_CATEGORIES),
      amount: z.number(),
    })
  ),
  byExpense: z.array(
    z.object({
      expenseId: z.number(),
      concept: z.string(),
      vendor: z.string().nullable(),
      category: z.enum(EXPENSE_CATEGORIES),
      frequency: z.enum(EXPENSE_FREQUENCIES),
      /** Cargos que cayeron en el mes. Solo pasa de 1 en los semanales. */
      occurrences: z.number(),
      amount: z.number(),
    })
  ),
  changes: z.array(
    z.object({
      expenseId: z.number(),
      concept: z.string(),
      vendor: z.string().nullable(),
      category: z.enum(EXPENSE_CATEGORIES),
      effectiveFrom: z.string(),
      previousAmount: z.number(),
      amount: z.number(),
      note: z.string().nullable(),
    })
  ),
  /** Envío pagado ese mes. **Fuera de `total`, `byCategory` y `byExpense`** — ver
   *  `DerivedShippingCostSchema`. */
  shippingCost: DerivedShippingCostSchema,
});

export type ExpenseMonth = z.infer<typeof ExpenseMonthSchema>;

export const ExpenseHistorySchema = z.array(ExpenseMonthSchema);

// DELETE /api/admin/expenses/:id → { ok, deactivated }. `deactivated: true`
// significa que NO se borró: ya generó cargos, y borrarlo dejaría el historial
// mintiendo sobre meses cerrados. Mismo contrato que el DELETE de cupones.
export const DeleteExpenseResponseSchema = z.object({
  ok: z.boolean(),
  deactivated: z.boolean(),
});

export type DeleteExpenseResponse = z.infer<typeof DeleteExpenseResponseSchema>;

/**
 * Payload de alta. Las claves opcionales se OMITEN cuando el formulario las deja
 * vacías (no se mandan como `null`): el backend las valida con `.optional()`.
 *
 * `amount` es obligatorio y crea la PRIMERA versión de monto. Su vigencia por
 * defecto es `startsAt`, **no hoy**: si en agosto se registra una suscripción que
 * empezó en marzo, los cargos de marzo a julio tienen que valer ese monto.
 */
export interface ExpenseInput {
  concept: string;
  vendor?: string;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  startsAt: string;
  endsAt?: string;
  active?: boolean;
  notes?: string;
  amount: number;
  amountEffectiveFrom?: string;
  amountNote?: string;
}

/**
 * Payload de edición. Todas las claves son opcionales y **una ausente significa "no
 * toques ese campo"** — es lo que permite dar de baja un gasto mandando solo
 * `{ active: false }`.
 *
 * `amount` sigue aquí a propósito: en el `PUT` **no sobrescribe**, agrega una
 * versión (ver `updateExpense`). Por eso el cambio de precio es un formulario
 * aparte del de edición, y no un campo más.
 */
export type ExpenseUpdateInput = Partial<ExpenseInput>;

/**
 * Filtros del listado. A diferencia del catálogo público, aquí un valor inválido es
 * **400 y no se ignora**: quien consulta es el dueño, y un filtro que no aplicó le
 * haría leer mal sus propios números.
 *
 * `from`/`to` filtran por **fecha de cargo**, no de alta: un gasto dado de alta en
 * enero y vigente desde entonces sí sale al consultar agosto.
 */
export interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  active?: boolean;
}

// Query key factory (patrón de reportKeys / adminOrderKeys.list). Las tres lecturas
// cuelgan de `all` para que una sola invalidación refresque lista, resumen e
// historial: cualquier escritura mueve los tres.
export const adminExpenseKeys = {
  all: ["adminExpenses"] as const,
  list: (filters?: ExpenseFilters) =>
    [...adminExpenseKeys.all, "list", filters ?? null] as const,
  summary: () => [...adminExpenseKeys.all, "summary"] as const,
  history: () => [...adminExpenseKeys.all, "history"] as const,
};

// GET /api/admin/expenses — array plano, del más reciente al más antiguo.
// 400 si algún filtro no es válido.
export async function getAdminExpenses(
  filters?: ExpenseFilters
): Promise<Expense[]> {
  const { data } = await api.get("/admin/expenses", { params: filters });
  return ExpenseListSchema.parse(data);
}

// GET /api/admin/expenses/summary — sin parámetros.
export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const { data } = await api.get("/admin/expenses/summary");
  return ExpenseSummarySchema.parse(data);
}

// GET /api/admin/expenses/history — meses contiguos y SIN HUECOS (los vacíos en $0),
// del más viejo al más nuevo. `from`/`to` van en formato `YYYY-MM`; sin ellos, el
// backend arranca en el mes del gasto más antiguo y cierra en el mes en curso.
export async function getExpenseHistory(
  from?: string,
  to?: string
): Promise<ExpenseMonth[]> {
  const { data } = await api.get("/admin/expenses/history", {
    params: { from, to },
  });
  return ExpenseHistorySchema.parse(data);
}

// Un POST/PUT que devolvió 2xx YA escribió. Si el body no valida el schema al pie
// de la letra, NO convertimos ese éxito en error (reintentar daría de alta un
// segundo gasto, o agregaría una segunda versión de monto): avisamos en consola y
// devolvemos el dato crudo. La invalidación de la lista revalida con datos ya
// parseados por getAdminExpenses. `parse` estricto se reserva para lecturas.
function acceptWrite(op: string, data: unknown): Expense {
  const parsed = ExpenseSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`${op}: la respuesta 2xx no valida ExpenseSchema`, parsed.error);
    return data as Expense;
  }
  return parsed.data;
}

// POST /api/admin/expenses — 201 con el gasto creado junto a su primera versión de
// monto. 400 validación (fecha de término anterior al primer cargo, `endsAt` en un
// gasto de única vez, monto ≤ 0).
export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data } = await api.post("/admin/expenses", input);
  return acceptWrite("createExpense", data);
}

/**
 * PUT /api/admin/expenses/:id — manda solo los campos que cambian.
 *
 * Mandar `amount` **AGREGA UNA VERSIÓN** con vigencia `amountEffectiveFrom` (o
 * **hoy** si se omite — ojo, distinto del POST, que usa `startsAt`), en vez de
 * sobrescribir. Dos excepciones que el backend resuelve solo:
 *   · ya existe una versión con esa misma fecha → la **corrige en su lugar**;
 *   · el monto vigente en esa fecha ya es el mismo → **no escribe nada**.
 *
 * `amountEffectiveFrom` sin `amount` es 400 ("Para fechar una vigencia hay que
 * mandar también el monto nuevo."); `amount` solo sí es válido.
 *
 * `active` y `endsAt` se mantienen coherentes en el servidor: apagar un gasto le
 * fija `endsAt` en hoy y reactivarlo lo limpia, así que la UI solo manda `active`.
 *
 * 400 validación, 404 si ya no existe.
 */
export async function updateExpense(
  id: number,
  input: ExpenseUpdateInput
): Promise<Expense> {
  const { data } = await api.put(`/admin/expenses/${id}`, input);
  return acceptWrite("updateExpense", data);
}

// DELETE /api/admin/expenses/:id — borra el gasto, o lo desactiva si ya generó
// algún cargo (`deactivated: true`). 404 si ya no existe.
export async function deleteExpense(
  id: number
): Promise<DeleteExpenseResponse> {
  const { data } = await api.delete(`/admin/expenses/${id}`);
  return DeleteExpenseResponseSchema.parse(data);
}

/**
 * Traduce un error de escritura de gasto en copia para el dueño. Prefiere SIEMPRE
 * el `message` del backend: en esta ruta ya son copia de UI accionable en español
 * ("La fecha de término no puede ser anterior a la del primer cargo.", "Un gasto de
 * única vez no lleva fecha de término: se cobra una sola vez en su fecha.", "Para
 * fechar una vigencia hay que mandar también el monto nuevo."), y cualquier
 * genérico nuestro diría menos.
 */
export function expenseWriteErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
    const message = error.response.data?.message as string | undefined;
    if (message) return message;
    if (error.response.status === 404)
      return "Ese gasto ya no existe. Recarga la página para ver la lista actualizada.";
  }
  return "No pudimos guardar el gasto. Inténtalo de nuevo.";
}
