import type { AdminCoupon } from "@/lib/api/adminCoupons";
import { formatPrice } from "@/lib/utils";

/**
 * Derivaciones puras de un cupón para la sección "Cupones" del panel (Fase 19).
 * Sin React y sin I/O, con specs en `__tests__/couponStatus.test.ts`.
 *
 * Vive aparte del componente por el mismo motivo que `shipmentLabel.ts` y
 * `orderTimeline.ts`: "¿este cupón está vivo?" no es un solo campo. Sale de cinco
 * (`active`, la ventana de vigencia y el tope global contra el contador) y el
 * orden en que se evalúan cambia lo que el dueño lee en la tabla.
 *
 * Se llama `couponStatus.ts` y el badge `CouponStatusBadge.tsx` a propósito: en un
 * FS insensible a mayúsculas (macOS) un `CouponStatus.tsx` junto a este archivo
 * dejaría el import a merced del orden de extensiones del bundler.
 */

export type CouponState =
  | "cancelado"
  | "agotado"
  | "vencido"
  | "programado"
  | "activo";

/**
 * Estado que se pinta en la tabla. **La precedencia importa** y es esta:
 *
 * 1. `cancelado` — `active: false`. Va primero porque es la única acción
 *    deliberada del dueño: si él lo apagó, eso es lo que quiere ver, aunque
 *    además esté vencido o agotado.
 * 2. `agotado` — se acabaron los usos del tope global. Antes que `vencido`
 *    porque es el estado que le dice "funcionó": la promoción se consumió, no
 *    se le pasó la fecha.
 * 3. `vencido` / 4. `programado` — fuera de la ventana de vigencia.
 * 5. `activo` — canjeable ahora mismo.
 *
 * `now` se inyecta para poder fijar el reloj en las specs.
 */
export function couponState(coupon: AdminCoupon, now: Date = new Date()): CouponState {
  if (!coupon.active) return "cancelado";
  if (
    coupon.maxRedemptions != null &&
    coupon.redeemedCount >= coupon.maxRedemptions
  )
    return "agotado";
  // `<=` en el vencimiento espeja el guard del backend (`expiresAt <= now` ya no
  // canjea): si aquí fuera `<`, el cupón se vería activo en el instante en que la
  // tienda ya lo rechaza.
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return "vencido";
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return "programado";
  return "activo";
}

export const COUPON_STATE_LABEL: Record<CouponState, string> = {
  cancelado: "Cancelado",
  agotado: "Agotado",
  vencido: "Vencido",
  programado: "Programado",
  activo: "Activo",
};

/** Valor del descuento en una línea: "20% · máx. $300" o "$150". */
export function couponValueLabel(coupon: AdminCoupon): string {
  if (coupon.type === "fixed") return formatPrice(coupon.value);
  const base = `${coupon.value}%`;
  return coupon.maxDiscount != null
    ? `${base} · máx. ${formatPrice(coupon.maxDiscount)}`
    : base;
}

/** Usos consumidos contra el tope global. `∞` cuando no hay tope. */
export function couponUsageLabel(coupon: AdminCoupon): string {
  return coupon.maxRedemptions == null
    ? `${coupon.redeemedCount} / ∞`
    : `${coupon.redeemedCount} / ${coupon.maxRedemptions}`;
}

/**
 * El contador guardado no coincide con el conteo vivo de canjes vigentes.
 *
 * Significa que alguien tocó la base de datos a mano (p. ej. borró un pedido, que
 * se lleva su fila de canje por cascada sin pasar por la liberación que decrementa
 * el contador). El backend devuelve los dos números justo para que se pueda ver;
 * la tabla lo señala en vez de esconderlo, porque a partir de ahí el tope global
 * deja de contar lo que el dueño cree que cuenta.
 */
export function hasRedemptionDivergence(coupon: AdminCoupon): boolean {
  return coupon.redeemedCount !== coupon.activeRedemptions;
}

/**
 * Un instante ISO → `YYYY-MM-DD` **en la zona de la tienda**, que es lo que
 * espera un `<input type="date">`.
 *
 * Esta es la trampa de la sección, y `iso.slice(0, 10)` la pisa: el backend guarda
 * un `expiresAt` de "31 de agosto" como `2026-08-31T23:59:59.999-06:00`, que en
 * UTC es `2026-09-01T05:59:59.999Z`. Recortar la cadena sembraría el formulario
 * con el **1 de septiembre**, así que abrir un cupón para cambiarle cualquier otra
 * cosa le correría la vigencia un día sin que nadie lo pidiera — y cada vez que se
 * volviera a guardar, otro día más.
 *
 * `en-CA` porque su formato de fecha corta ES `YYYY-MM-DD`.
 */
const STORE_TIME_ZONE = "America/Mexico_City";

export function storeDayISO(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Vigencia legible para la tabla: "31 ago" / "1 – 31 ago" / "Sin límite". */
export function couponWindowLabel(coupon: AdminCoupon): string {
  const from = coupon.startsAt ? storeDayLabel(coupon.startsAt) : null;
  const to = coupon.expiresAt ? storeDayLabel(coupon.expiresAt) : null;
  if (from && to) return `${from} – ${to}`;
  if (to) return `Hasta ${to}`;
  if (from) return `Desde ${from}`;
  return "Sin límite";
}

/** "31 ago 2026", en la zona de la tienda (mismo motivo que `storeDayISO`). */
export function storeDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: STORE_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
