import { z } from "zod";
// Reusado, no reimplementado: es el mismo parseo de "texto que escribió una
// persona" → número (miles, símbolo de moneda, coma decimal) que ya usa la
// importación por Excel, y es puro y con specs. Una segunda copia se volvería a
// escribir peor y divergiría en el primer caso raro.
import { parseNumberText } from "@/components/admin/import/rowInput";

/**
 * Formulario de cupón del panel (Fase 19). Espejo de `couponInputSchema` de
 * ../backend/src/schemas/coupon.ts, con dos diferencias que vienen del medio:
 *
 * 1. **Todos los campos son texto**, porque el valor de un `<input>` siempre lo
 *    es. La conversión a número vive en `couponInputFromForm` (abajo), no en un
 *    transform del schema, para que `handleSubmit` reciba exactamente lo que el
 *    usuario tecleó y el mapeo al payload sea un solo lugar legible.
 * 2. Los montos se capturan con `type="text" inputMode="decimal"` y NO con
 *    `type="number"`, por el mismo motivo que las celdas de la importación: éste
 *    devuelve `""` ante basura (ni siquiera se puede leer lo que se tecleó), se
 *    traga la coma decimal y cambia el valor al hacer scroll.
 */

/** Texto numérico obligatorio, con su propio mensaje. */
function requiredNumber(message: string) {
  return z.string().trim().min(1, message).refine(
    (text) => parseNumberText(text).ok,
    message
  );
}

/** Texto numérico opcional: vacío pasa, basura no. */
function optionalNumber(message: string) {
  return z
    .string()
    .trim()
    .refine((text) => text === "" || parseNumberText(text).ok, message);
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

export const couponFormSchema = z
  .object({
    // El backend recorta y sube a mayúsculas antes de validar, así que aquí se
    // aceptan minúsculas: rechazarlas sería inventar una regla que allá no existe.
    code: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9]{3,32}$/,
        "Solo letras y números, entre 3 y 32 caracteres"
      ),
    type: z.enum(["percent", "fixed"]),
    value: requiredNumber("Escribe el valor del descuento"),
    maxDiscount: optionalNumber("Escribe un monto válido"),
    minSubtotal: optionalNumber("Escribe un monto válido"),
    maxRedemptions: optionalNumber("Escribe un número entero"),
    oncePerCustomer: z.boolean(),
    startsAt: dateOnly,
    expiresAt: dateOnly,
    active: z.boolean(),
    description: z.string().trim().max(200, "Máximo 200 caracteres"),
  })
  // Las reglas cruzadas son las MISMAS que las del backend (`couponRuleIssues`).
  // Duplicarlas aquí no es redundante: sin ellas el dueño llena el formulario
  // completo para que se lo rechacen al guardar.
  .superRefine((d, ctx) => {
    const value = numberOf(d.value);
    if (value != null && value <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "El valor del descuento debe ser mayor a 0",
        path: ["value"],
      });
    }
    if (d.type === "percent" && value != null && value > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Un cupón de porcentaje no puede pasar de 100",
        path: ["value"],
      });
    }
    // En un cupón de monto fijo el tope ES el valor: aceptar los dos dejaría dos
    // campos que se contradicen entre sí.
    if (d.type === "fixed" && d.maxDiscount.trim() !== "") {
      ctx.addIssue({
        code: "custom",
        message: "El tope en pesos solo aplica a los cupones de porcentaje",
        path: ["maxDiscount"],
      });
    }
    const maxDiscount = numberOf(d.maxDiscount);
    if (maxDiscount != null && maxDiscount <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "El tope debe ser mayor a 0",
        path: ["maxDiscount"],
      });
    }
    const minSubtotal = numberOf(d.minSubtotal);
    if (minSubtotal != null && minSubtotal < 0) {
      ctx.addIssue({
        code: "custom",
        message: "El mínimo de compra no puede ser negativo",
        path: ["minSubtotal"],
      });
    }
    const maxRedemptions = numberOf(d.maxRedemptions);
    if (
      maxRedemptions != null &&
      (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "El límite de usos debe ser un entero de al menos 1",
        path: ["maxRedemptions"],
      });
    }
    // Comparación de cadenas: en `YYYY-MM-DD` el orden lexicográfico ES el
    // cronológico, así que no hace falta construir dos Date para esto.
    if (d.startsAt && d.expiresAt && d.startsAt >= d.expiresAt) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de fin debe ser posterior a la de inicio",
        path: ["expiresAt"],
      });
    }
  });

export type CouponFormData = z.infer<typeof couponFormSchema>;

export const emptyCouponForm: CouponFormData = {
  code: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minSubtotal: "",
  maxRedemptions: "",
  // El backend también arranca en `true`: un cupón para todo el mundo es la
  // excepción, no el default.
  oncePerCustomer: true,
  startsAt: "",
  expiresAt: "",
  active: true,
  description: "",
};

/**
 * Formulario → payload de la API. Las claves vacías se OMITEN en vez de mandarse
 * como `null` o `""`: el backend las valida con `.optional()` y en el `PUT` una
 * clave ausente significa "no toques ese campo".
 */
export function couponInputFromForm(data: CouponFormData) {
  const optional = (text: string) =>
    text.trim() === "" ? undefined : numberOf(text);

  return {
    code: data.code.trim().toUpperCase(),
    type: data.type,
    value: numberOf(data.value)!,
    maxDiscount: data.type === "fixed" ? undefined : optional(data.maxDiscount),
    minSubtotal: optional(data.minSubtotal),
    maxRedemptions: optional(data.maxRedemptions),
    oncePerCustomer: data.oncePerCustomer,
    startsAt: data.startsAt || undefined,
    expiresAt: data.expiresAt || undefined,
    active: data.active,
    description: data.description.trim() || undefined,
  };
}
