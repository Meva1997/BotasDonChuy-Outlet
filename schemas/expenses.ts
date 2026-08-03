import { z } from "zod";
// Reusado, no reimplementado: es el mismo parseo de "texto que escribió una
// persona" → número (miles, símbolo de moneda, coma decimal) que ya usan la
// importación por Excel y el formulario de cupones, y es puro y con specs.
import { parseNumberText } from "@/components/admin/import/rowInput";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_FREQUENCIES,
  type ExpenseInput,
  type ExpenseUpdateInput,
} from "@/lib/api/adminExpenses";

/**
 * Formularios de la sección "Gastos" del panel (Fase 20). Espejo de
 * `expenseInputSchema` de ../backend/src/schemas/expense.ts, con la misma regla de
 * medio que `schemas/coupons.ts`: **todos los campos son texto** (el valor de un
 * `<input>` siempre lo es) y la conversión a número vive en los mappers de abajo,
 * no en un transform del schema.
 *
 * **Son DOS formularios, no uno**, y la separación no es cosmética: en el backend
 * el monto no es un campo del gasto, sino una versión fechada. Editar el concepto
 * corrige un typo; cambiar el monto agrega una versión que decide cuánto valían los
 * cargos desde cierta fecha. Meterlos en el mismo form haría que corregir una falta
 * de ortografía se sintiera igual que repreciar una suscripción.
 */

/** Texto numérico obligatorio, con su propio mensaje. */
function requiredNumber(message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .refine((text) => parseNumberText(text).ok, message);
}

function numberOf(text: string): number | undefined {
  const parsed = parseNumberText(text.trim());
  return parsed.ok ? parsed.value : undefined;
}

/** `YYYY-MM-DD` tal como lo escribe un `<input type="date">`, o vacío. */
const dateOnly = z
  .string()
  .trim()
  .refine(
    (text) => text === "" || /^\d{4}-\d{2}-\d{2}$/.test(text),
    "Usa una fecha válida"
  );

/** `YYYY-MM-DD` obligatorio. */
const requiredDate = z
  .string()
  .trim()
  .min(1, "Elige una fecha")
  .refine((text) => /^\d{4}-\d{2}-\d{2}$/.test(text), "Usa una fecha válida");

// ─────────────────────────────────────────────────────────────────────────────
// Alta y edición del gasto
// ─────────────────────────────────────────────────────────────────────────────

const baseExpenseForm = z.object({
  concept: z
    .string()
    .trim()
    .min(1, "Escribe un concepto (por ejemplo: Render — Web Service)")
    .max(120, "Máximo 120 caracteres"),
  vendor: z.string().trim().max(60, "Máximo 60 caracteres"),
  category: z.enum(EXPENSE_CATEGORIES),
  frequency: z.enum(EXPENSE_FREQUENCIES),
  startsAt: requiredDate,
  endsAt: dateOnly,
  active: z.boolean(),
  notes: z.string().trim().max(300, "Máximo 300 caracteres"),
  /** Solo se valida y se manda en el alta. Ver `expenseInputFromForm`. */
  amount: z.string().trim(),
  /** Idem: vigencia de esa primera versión. Vacío = `startsAt`. */
  amountEffectiveFrom: dateOnly,
});

export type ExpenseFormData = z.infer<typeof baseExpenseForm>;

/**
 * `amount` es obligatorio en el ALTA (crea la primera versión de monto), pero el
 * formulario lo oculta en la edición y el mapper lo omite: ahí el monto se cambia
 * por `amountChangeFormSchema`.
 *
 * Es una **función** de `isNew` y no un objeto con un campo `isNew` adentro: un
 * booleano que el formulario nunca pinta tendría que viajar como valor por defecto
 * sin registrar, y depender de que react-hook-form lo arrastre hasta el resolver es
 * un detalle de implementación suyo, no un contrato. Aquí el llamador lo dice.
 *
 * Las reglas cruzadas son las MISMAS que las del backend (`expenseRuleIssues`).
 * Duplicarlas aquí no es redundante: sin ellas el dueño llena el formulario
 * completo para que se lo rechacen al guardar.
 */
export function expenseFormSchema(isNew: boolean) {
  return baseExpenseForm.superRefine((d, ctx) => {
    if (isNew) {
      if (d.amount === "") {
        ctx.addIssue({
          code: "custom",
          message: "Escribe cuánto cuesta",
          path: ["amount"],
        });
      } else if (!parseNumberText(d.amount).ok) {
        ctx.addIssue({
          code: "custom",
          message: "Escribe un monto válido",
          path: ["amount"],
        });
      } else {
        const amount = numberOf(d.amount);
        if (amount != null && amount <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "El monto debe ser mayor a 0",
            path: ["amount"],
          });
        }
      }
    }
    // Comparación de cadenas: en `YYYY-MM-DD` el orden lexicográfico ES el
    // cronológico, así que no hace falta construir dos Date para esto.
    if (d.endsAt && d.startsAt && d.endsAt < d.startsAt) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de término no puede ser anterior a la del primer cargo",
        path: ["endsAt"],
      });
    }
    if (d.frequency === "once" && d.endsAt) {
      ctx.addIssue({
        code: "custom",
        message:
          "Un gasto de única vez no lleva fecha de término: se cobra una sola vez en su fecha",
        path: ["endsAt"],
      });
    }
  });
}

export const emptyExpenseForm: ExpenseFormData = {
  concept: "",
  vendor: "",
  category: "software",
  // Mensual es lo que es casi todo lo que paga una tienda (hosting, dominio,
  // renta); arrancar en `once` obligaría a cambiarlo en casi cada alta.
  frequency: "monthly",
  startsAt: "",
  endsAt: "",
  active: true,
  notes: "",
  amount: "",
  amountEffectiveFrom: "",
};

/**
 * Formulario → payload de alta. Las claves vacías se OMITEN en vez de mandarse
 * como `null` o `""`: el backend las valida con `.optional()`.
 */
export function expenseInputFromForm(data: ExpenseFormData): ExpenseInput {
  return {
    concept: data.concept.trim(),
    vendor: data.vendor.trim() || undefined,
    category: data.category,
    frequency: data.frequency,
    startsAt: data.startsAt,
    endsAt: data.endsAt || undefined,
    active: data.active,
    notes: data.notes.trim() || undefined,
    amount: numberOf(data.amount)!,
    amountEffectiveFrom: data.amountEffectiveFrom || undefined,
  };
}

/**
 * Formulario → payload de edición. **`amount` y `amountEffectiveFrom` NO viajan**:
 * mandarlos aquí agregaría una versión de monto en cada guardado, y corregir un
 * typo en el concepto acabaría repreciando el gasto. Ese camino es
 * `amountChangeFromForm`.
 *
 * `endsAt` vacío tampoco viaja: el `PUT` no acepta `null` y una clave ausente
 * significa "no toques ese campo" (mismo límite del contrato que en cupones).
 */
export function expenseUpdateFromForm(
  data: ExpenseFormData
): ExpenseUpdateInput {
  return {
    concept: data.concept.trim(),
    vendor: data.vendor.trim() || undefined,
    category: data.category,
    frequency: data.frequency,
    startsAt: data.startsAt,
    endsAt: data.endsAt || undefined,
    active: data.active,
    notes: data.notes.trim() || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambio de precio (una operación distinta, con su propio formulario)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `effectiveFrom` es obligatorio en el formulario aunque el backend lo acepte
 * ausente (ahí cae a hoy). Es deliberado: la fecha es LA decisión de esta pantalla
 * —decide desde cuándo valen los cargos— y dejarla implícita es justo cómo se
 * termina fechando un aumento el día que se capturó y no el día que ocurrió.
 */
export const amountChangeFormSchema = z.object({
  amount: requiredNumber("Escribe el monto nuevo").refine(
    (text) => (numberOf(text) ?? 0) > 0,
    "El monto debe ser mayor a 0"
  ),
  effectiveFrom: requiredDate,
  note: z.string().trim().max(200, "Máximo 200 caracteres"),
});

export type AmountChangeFormData = z.infer<typeof amountChangeFormSchema>;

/** Cambio de precio → payload del `PUT`. Solo viajan estas tres claves. */
export function amountChangeFromForm(
  data: AmountChangeFormData
): ExpenseUpdateInput {
  return {
    amount: numberOf(data.amount)!,
    amountEffectiveFrom: data.effectiveFrom,
    amountNote: data.note.trim() || undefined,
  };
}
