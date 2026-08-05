import type {
  Expense,
  ExpenseCategory,
  ExpenseFrequency,
  ExpenseSummary,
} from "@/lib/api/adminExpenses";

/**
 * Derivaciones puras de un gasto para la sección "Gastos" del panel (Fase 20).
 * Sin React y sin I/O, con specs en `__tests__/expenseStatus.test.ts`.
 *
 * Vive aparte del componente por el mismo motivo que `couponStatus.ts` y
 * `shipmentLabel.ts`: "¿este gasto sigue costando?" no es un solo campo. Sale de
 * cuatro (`active`, `startsAt`, `endsAt` y `frequency`) y el orden en que se
 * evalúan cambia lo que el dueño lee en la tabla.
 *
 * **Lo que este módulo NO hace: aritmética de montos.** `currentAmount`,
 * `monthlyRunRate` y los totales del historial vienen calculados del backend, que
 * es el mismo servicio que alimenta el KPI `GASTOS` del dashboard. Duplicar aquí
 * las fórmulas (sobre todo `weekly × 52/12`) garantiza que un día las dos
 * pantallas digan números distintos. La única excepción es `priceChangeDelta`, que
 * el backend deja explícitamente al front.
 *
 * Se llama `expenseStatus.ts` y el badge `ExpenseStateBadge.tsx` a propósito: en un
 * FS insensible a mayúsculas (macOS) un `ExpenseStatus.tsx` junto a este archivo
 * dejaría el import a merced del orden de extensiones del bundler.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Etiquetas — el backend manda las claves crudas
// ─────────────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  infraestructura: "Infraestructura",
  software: "Software",
  renta: "Renta",
  servicios: "Servicios",
  paqueteria: "Paquetería",
  publicidad: "Publicidad",
  nomina: "Nómina",
  impuestos: "Impuestos",
  otro: "Otro",
};

export const EXPENSE_FREQUENCY_LABEL: Record<ExpenseFrequency, string> = {
  once: "Única vez",
  weekly: "Semanal",
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

// ─────────────────────────────────────────────────────────────────────────────
// Fechas — UTC, no zona de tienda (al revés que en cupones)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hoy como día de calendario UTC, que es exactamente lo que usa el backend
 * (`isoDay()` de ../backend/src/utils/date.ts) para decidir qué gasto sigue vivo y
 * cuál ya terminó.
 *
 * **Ojo con la tentación de reusar `storeDayISO` de `coupons/couponStatus.ts`:**
 * ahí corrige un instante con hora a la zona de la tienda, porque un `expiresAt` de
 * cupón ES un instante. Aquí no hay nada que corregir — las fechas de un gasto son
 * `DATEONLY` (`"2026-08-01"`, sin hora) y el servicio de gastos las compara contra
 * UTC. Aplicarles la zona de la tienda rodaría el día en el sentido contrario.
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `"2026-08-01"` → `"1 de agosto de 2026"`. Fijado a UTC igual que el backend: sin
 * `timeZone: "UTC"`, `new Date("2026-08-01")` se interpreta como medianoche UTC y
 * se pinta como el 31 de julio en cualquier host al oeste de UTC — que es
 * justamente donde corre esta tienda.
 */
export function dayLabel(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Versión corta para tablas y ejes: `"1 ago"`. Mismo pin a UTC. */
export function dayLabelShort(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Rango de la ventana de "próximos cargos": `"3 ago – 1 oct"`, de hoy a
 * `hoy + (days - 1)`. Existe porque "próximos 60 días" por sí solo no dice qué
 * fechas cubre — y es lo que explica que un gasto mensual (un cobro por mes)
 * aparezca DOS veces en la lista cuando la ventana cruza dos fechas de cobro:
 * no es el mismo cargo repetido, son dos cargos reales en dos fechas distintas.
 */
export function upcomingWindowRangeLabel(days: number, today: string = todayISO()): string {
  const start = new Date(`${today}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Math.max(days - 1, 0));
  const format = (date: Date) =>
    date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${format(start)} – ${format(end)}`;
}

/**
 * Rótulo de la ventana de la línea derivada de envío (`DerivedShippingCost`, Fase 22):
 * `"del 1 al 4 de agosto · a la fecha"` · `"del 1 al 31 de julio"` · `"el 1 de agosto"`.
 *
 * **No es decoración.** En el mes en curso la ventana llega hasta HOY, no hasta fin
 * de mes: un acumulado a media quincena puesto junto a un `monthlyRunRate` de mes
 * completo se lee como si el envío saliera baratísimo. El `· a la fecha` de
 * `partial` es lo que evita esa lectura.
 *
 * `from` y `to` del backend siempre caen en el mismo mes (`shippingLine` los arma
 * desde un `isoMonth`), así que el mes se nombra una sola vez, al final.
 */
export function shippingWindowLabel(
  from: string,
  to: string,
  partial: boolean
): string {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const month = end.toLocaleDateString("es-MX", {
    month: "long",
    timeZone: "UTC",
  });
  const suffix = partial ? " · a la fecha" : "";
  // Día 1 del mes en curso: "del 1 al 1 de agosto" se lee como un error de copia.
  if (from === to) {
    return `el ${start.getUTCDate()} de ${month}${suffix}`;
  }
  return `del ${start.getUTCDate()} al ${end.getUTCDate()} de ${month}${suffix}`;
}

export interface UpcomingChargeGroup {
  date: string;
  charges: ExpenseSummary["upcomingCharges"];
  total: number;
}

/**
 * Agrupa `upcomingCharges` (ya viene ordenado por fecha del backend) en un bloque por
 * día de calendario. Existe para que la tarjeta de resumen pinte "una fila por fecha"
 * en vez de "una fila por cargo" — con varias suscripciones cayendo el mismo día, listar
 * cada una suelta con su fecha repetida es lo que hoy hace ilegible el panel. Depende del
 * orden que ya garantiza `buildSummary` en el backend: no reordena nada aquí.
 */
export function groupUpcomingChargesByDate(
  charges: ExpenseSummary["upcomingCharges"]
): UpcomingChargeGroup[] {
  const groups: UpcomingChargeGroup[] = [];
  for (const charge of charges) {
    const last = groups[groups.length - 1];
    if (last && last.date === charge.date) {
      last.charges.push(charge);
      last.total += charge.amount;
    } else {
      groups.push({ date: charge.date, charges: [charge], total: charge.amount });
    }
  }
  return groups;
}

/** `"2026-08"` → `"ago 26"`, para las etiquetas del eje X de la gráfica. */
export function monthLabelShort(isoMonth: string): string {
  const date = new Date(`${isoMonth}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoMonth;
  return date.toLocaleDateString("es-MX", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado del gasto
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseState =
  | "inactivo"
  | "terminado"
  | "programado"
  | "cobrado"
  | "activo";

/**
 * Estado que se pinta en la tabla. **La precedencia importa** y es esta:
 *
 * 1. `inactivo` — `active: false`. Va primero porque es la única acción deliberada
 *    del dueño: si él lo dio de baja, eso es lo que quiere ver, aunque además ya
 *    hubiera terminado su vigencia.
 * 2. `terminado` — `endsAt` ya pasó. Un gasto que dejó de cobrarse.
 * 3. `programado` — `startsAt` es futuro. Todavía no cuesta nada.
 * 4. `cobrado` — un `once` cuya fecha ya pasó. Va aparte de `activo` a propósito:
 *    su `monthlyRunRate` es 0 y no va a volver a cobrarse, así que pintarlo
 *    "activo" lo haría parecer carga mensual junto a la renta y el hosting —
 *    exactamente el número que esta pantalla existe para no confundir.
 * 5. `activo` — recurrente y cobrándose.
 *
 * `today` se inyecta (día ISO, no `Date`) para poder fijar el reloj en las specs y
 * para comparar contra las fechas del backend en su mismo formato: en
 * `YYYY-MM-DD` el orden lexicográfico ES el cronológico.
 */
export function expenseState(
  expense: Pick<Expense, "active" | "startsAt" | "endsAt" | "frequency">,
  today: string = todayISO()
): ExpenseState {
  if (!expense.active) return "inactivo";
  if (expense.endsAt && expense.endsAt < today) return "terminado";
  if (expense.startsAt > today) return "programado";
  if (expense.frequency === "once") return "cobrado";
  return "activo";
}

export const EXPENSE_STATE_LABEL: Record<ExpenseState, string> = {
  inactivo: "Inactivo",
  terminado: "Terminado",
  programado: "Programado",
  cobrado: "Cobrado",
  activo: "Activo",
};

/**
 * ¿Este gasto suma a la carga mensual? Es `monthlyRunRate > 0`, y se pregunta así
 * —en vez de recalcularlo— justo para no tener una segunda definición.
 *
 * Sirve para explicar en la UI por qué un gasto de $8,000 de única vez no movió el
 * "hay que apartar al mes": sin decirlo, el número parece estar mal.
 */
export function countsTowardRunRate(expense: Pick<Expense, "monthlyRunRate">): boolean {
  return expense.monthlyRunRate > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambios de precio
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceChangeDelta {
  /** Positivo si subió, negativo si bajó. */
  delta: number;
  /**
   * Variación porcentual, o `null` cuando no se puede expresar. Es `null` y no `0`
   * a propósito: con `previousAmount: 0` la división da `Infinity`, y pintar
   * "+Infinity%" o —peor— "0%" sobre un gasto que pasó de nada a $340 diría lo
   * contrario de lo que ocurrió.
   */
  percent: number | null;
  direction: "up" | "down" | "same";
}

/**
 * El delta de un cambio de precio del historial. El backend devuelve
 * `previousAmount` y `amount` crudos y **deja este cálculo al front** a propósito
 * (misma regla que el resto de métricas derivadas de presentación).
 */
export function priceChangeDelta(
  previousAmount: number,
  amount: number
): PriceChangeDelta {
  const delta = amount - previousAmount;
  return {
    delta,
    percent: previousAmount === 0 ? null : (delta / previousAmount) * 100,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
}

/** "+$50.00 (+17.2%)" · "−$40.00 (−12.5%)" · "+$340.00" cuando no hay porcentaje. */
export function priceChangeLabel(
  previousAmount: number,
  amount: number
): string {
  const { delta, percent } = priceChangeDelta(previousAmount, amount);
  // El signo se arma a mano: `toLocaleString` no antepone "+" y sin él un aumento
  // y una corrección a la baja se leen igual de un vistazo.
  const sign = delta >= 0 ? "+" : "−";
  const money = `${sign}$${Math.abs(delta).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (percent == null) return money;
  return `${money} (${sign}${Math.abs(percent).toFixed(1)}%)`;
}
