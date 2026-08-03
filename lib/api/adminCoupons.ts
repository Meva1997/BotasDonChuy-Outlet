import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/api/client";

/**
 * Contrato del CRUD de cupones del panel (Fase 19). Patrón `getProducts`: axios vía
 * lib/api/client.ts + Zod en runtime. Refleja el modelo `Coupon` de
 * ../backend/src/models/Coupon.ts.
 */
export const CouponSchema = z.object({
  id: z.number(),
  /** Alfanumérico en MAYÚSCULAS. Lo normaliza el backend y NO se puede editar. */
  code: z.string(),
  type: z.enum(["percent", "fixed"]),
  /** Porcentaje (1–100) o pesos, según `type`. */
  value: z.number(),
  /** Tope en pesos del descuento. Solo existe en los cupones de porcentaje. */
  maxDiscount: z.number().nullable(),
  /** Mínimo de mercancía NETA (`subtotal − savings`) para que el cupón aplique. */
  minSubtotal: z.number().nullable(),
  /** Tope global de canjes. `null` = ilimitado. */
  maxRedemptions: z.number().nullable(),
  /** Estado derivado: solo lo mueven el canje y la liberación. El PUT lo ignora. */
  redeemedCount: z.number(),
  oncePerCustomer: z.boolean(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  /** `false` es "cupón cancelado": deja de canjearse sin borrar el histórico. */
  active: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Coupon = z.infer<typeof CouponSchema>;

/**
 * Fila del listado. `activeRedemptions` es el conteo VIVO de canjes vigentes y
 * solo viene en el GET (el POST/PUT devuelven el cupón pelón), por eso el schema
 * de escritura es `CouponSchema` y este lo extiende en vez de al revés.
 *
 * Normalmente coincide con `redeemedCount`; si difieren hubo una intervención
 * manual en la BD (p. ej. un pedido borrado a mano, que se lleva su fila de canje
 * por cascada sin pasar por la liberación). El backend lo expone justamente para
 * que la divergencia se vea, así que la tabla la señala en vez de esconderla.
 */
export const AdminCouponSchema = CouponSchema.extend({
  activeRedemptions: z.number(),
});

export type AdminCoupon = z.infer<typeof AdminCouponSchema>;

export const AdminCouponListSchema = z.array(AdminCouponSchema);

// DELETE /api/admin/coupons/:id → { ok, deactivated }. `deactivated: true`
// significa que NO se borró: ya hay pedidos que lo usaron, así que se desactivó
// para no romper el histórico de esa venta (mismo criterio que los productos).
export const DeleteCouponResponseSchema = z.object({
  ok: z.boolean(),
  deactivated: z.boolean(),
});

export type DeleteCouponResponse = z.infer<typeof DeleteCouponResponseSchema>;

/**
 * Payload de alta. Las claves opcionales se OMITEN cuando el formulario las deja
 * vacías (no se mandan como `null`): el backend las valida con `.optional()` y sus
 * defaults viven en el modelo.
 *
 * `startsAt`/`expiresAt` viajan como fecha sin hora (`2026-08-31`, tal cual la
 * escribe un `<input type="date">`): el backend la interpreta en la zona de la
 * tienda —inicio de día para el inicio, FIN de día para el vencimiento— que es lo
 * que un dueño quiere decir con "vence el 31". Mandar un instante UTC en su lugar
 * le recortaría la última tarde de la promoción.
 */
export interface CouponInput {
  code: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscount?: number;
  minSubtotal?: number;
  maxRedemptions?: number;
  oncePerCustomer?: boolean;
  startsAt?: string;
  expiresAt?: string;
  active?: boolean;
  description?: string;
}

/**
 * Payload de edición. `code` y `redeemedCount` quedan fuera porque el `PUT` los
 * ignora: un código ya impreso en un flyer no se renombra (y el valor congelado en
 * los pedidos dejaría de empatar), y el contador es estado derivado que solo mueven
 * el canje y la liberación.
 *
 * Todas las claves son opcionales y **una clave ausente significa "no toques ese
 * campo"** — es lo que permite cancelar un cupón mandando solo `{ active: false }`
 * sin reenviar el resto.
 */
export type CouponUpdateInput = Partial<Omit<CouponInput, "code">>;

// Query key factory (mismo patrón que adminUserKeys / adminOrderKeys).
export const adminCouponKeys = {
  all: ["adminCoupons"] as const,
};

// GET /api/admin/coupons — array plano, del más reciente al más antiguo.
export async function getAdminCoupons(): Promise<AdminCoupon[]> {
  const { data } = await api.get("/admin/coupons");
  return AdminCouponListSchema.parse(data);
}

// Un POST/PUT que devolvió 2xx YA escribió. Si el body no valida el schema al pie
// de la letra, NO convertimos ese éxito en error (reintentar crearía un segundo
// cupón, o repetiría una edición): avisamos en consola y devolvemos el dato crudo.
// La invalidación de la lista revalida con datos ya parseados por getAdminCoupons.
// `parse` estricto se reserva para lecturas. Mismo criterio que adminUsers.ts.
function acceptWrite(op: string, data: unknown): Coupon {
  const parsed = CouponSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`${op}: la respuesta 2xx no valida CouponSchema`, parsed.error);
    return data as Coupon;
  }
  return parsed.data;
}

// POST /api/admin/coupons — 201 con el cupón creado. 409 código duplicado,
// 400 validación (porcentaje > 100, tope en pesos sobre un cupón fijo, fechas
// invertidas).
export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const { data } = await api.post("/admin/coupons", input);
  return acceptWrite("createCoupon", data);
}

// PUT /api/admin/coupons/:id — manda solo los campos que cambian. `active: false`
// es la forma de CANCELAR una promoción. 400 validación, 404 si ya no existe.
export async function updateCoupon(
  id: number,
  input: CouponUpdateInput
): Promise<Coupon> {
  const { data } = await api.put(`/admin/coupons/${id}`, input);
  return acceptWrite("updateCoupon", data);
}

// DELETE /api/admin/coupons/:id — borra el cupón, o lo desactiva si ya hay pedidos
// que lo usaron (`deactivated: true`). 404 si ya no existe.
export async function deleteCoupon(id: number): Promise<DeleteCouponResponse> {
  const { data } = await api.delete(`/admin/coupons/${id}`);
  return DeleteCouponResponseSchema.parse(data);
}

/**
 * Traduce un error de escritura de cupón en copia para el dueño. Prefiere el
 * `message` del backend: ya dice qué regla se rompió ("Un cupón de porcentaje no
 * puede pasar de 100", "Ya existe un cupón con el código X", "La fecha de fin debe
 * ser posterior a la de inicio") y esos textos son más útiles que un genérico.
 */
export function couponWriteErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
    const message = error.response.data?.message as string | undefined;
    if (message) return message;
    if (error.response.status === 404)
      return "Ese cupón ya no existe. Recarga la página para ver la lista actualizada.";
  }
  return "No pudimos guardar el cupón. Inténtalo de nuevo.";
}
