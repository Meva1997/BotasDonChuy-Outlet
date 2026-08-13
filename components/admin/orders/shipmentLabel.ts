import axios from "axios";
import type { AdminOrder } from "@/lib/api/adminOrders";

/**
 * Clasificación del campo `skydropxShipmentId` y mapeo de errores del reintento
 * de guía (Fase 16). Vive aparte de OrderDetailModal porque es lógica pura
 * —sin React, sin I/O— y porque **cada guía se cobra**: confundir dos de los
 * estados de abajo significa pagar una guía de más o dejar un pedido atorado.
 *
 * El campo NO es "un id o null". El backend (`payment.service.ts`) guarda ahí
 * dos centinelas además del id real, y cada uno pide una salida distinta.
 */

/** Centinela: alguien reclamó la creación de la guía y está en vuelo. */
export const SHIPMENT_CREATION_SENTINEL = "creating";

/** Prefijo de "la guía se creó y se cobró, pero no se pudo guardar su id". */
export const UNRECONCILED_PREFIX = "unreconciled:";

/** id del marcador cuando ni siquiera se sabe si la guía llegó a crearse. */
export const UNKNOWN_SHIPMENT_ID = "desconocido";

export type ShipmentLabelState =
  /** Nunca se generó (o `force` acaba de limpiar el marcador). Reintentable. */
  | "none"
  /** Centinela puesto: en curso, o huérfano de un proceso que murió. */
  | "creating"
  /** Id de guía real. No se toca: existe y está cobrada. */
  | "real"
  /** Cobrada sin persistir; se conoce su id y hay que reconciliarla a mano. */
  | "unreconciled"
  /** Skydropx no respondió: pudo cobrarla sin dejar rastro. Única puerta de `force`. */
  | "unreconciled-unknown";

export interface ShipmentLabelInfo {
  state: ShipmentLabelState;
  /** El id real cuando lo hay: `"real"` y `"unreconciled"`. Si no, `null`. */
  shipmentId: string | null;
}

export function shipmentLabelState(
  value: string | null | undefined
): ShipmentLabelInfo {
  if (!value) return { state: "none", shipmentId: null };
  if (value === SHIPMENT_CREATION_SENTINEL)
    return { state: "creating", shipmentId: null };

  if (value.startsWith(UNRECONCILED_PREFIX)) {
    const id = value.slice(UNRECONCILED_PREFIX.length);
    // Un marcador sin id detrás no identifica ninguna guía: se trata como el
    // caso "desconocido", que es el que sí tiene salida (`force`). Tratarlo
    // como id conocido dejaría el pedido atorado sin nada que buscar.
    return id && id !== UNKNOWN_SHIPMENT_ID
      ? { state: "unreconciled", shipmentId: id }
      : { state: "unreconciled-unknown", shipmentId: null };
  }

  return { state: "real", shipmentId: value };
}

/**
 * Espeja los guards de `retryShipmentForOrder` (backend) para no ofrecer un
 * botón que solo puede devolver 409. En el mismo orden que allá:
 *
 * - cancelado / pendiente de pago / ya enviado o entregado → no hay guía que
 *   generar (un pedido ya enviado con guía capturada a mano pagaría una
 *   segunda);
 * - sin `skydropxQuotationId` **o** sin `skydropxRateId` → se cobró con la
 *   tarifa plana de respaldo, no hay tarifa de Skydropx que convertir en guía;
 * - con guía real o cobrada sin persistir → ante la duda, no se genera otra.
 */
export function canRetryShipment(order: AdminOrder): boolean {
  if (order.status !== "paid") return false;
  if (!order.skydropxQuotationId || !order.skydropxRateId) return false;
  const { state } = shipmentLabelState(order.skydropxShipmentId);
  return state === "none" || state === "creating";
}

/** True si el pedido necesita que un humano lo revise en el panel de Skydropx. */
export function needsShipmentReview(order: AdminOrder): boolean {
  const { state } = shipmentLabelState(order.skydropxShipmentId);
  return state === "unreconciled" || state === "unreconciled-unknown";
}

/**
 * True mientras el flujo manual de "Marcar como enviado" (OrderDetailModal)
 * sigue disponible para este pedido — única fuente de verdad para esa
 * condición, para que no se desincronice del botón que gobierna.
 */
export function canMarkOrderShipped(order: AdminOrder): boolean {
  return order.status === "paid";
}

/**
 * `Order.shippingRequiresDropoff` es una bandera congelada al pagar (viene de
 * la tarifa de Skydropx elegida en el checkout) y el backend NUNCA la limpia
 * — es dato histórico, igual que `unitCost` en un `OrderItem` (ver
 * CLAUDE.md). Por eso mostrarla es responsabilidad del frontend: solo tiene
 * sentido como aviso de acción mientras el pedido sigue `paid` sin enviar —
 * una vez que pasa a `shipped`/`delivered` el dueño ya llevó el paquete a la
 * sucursal (o nunca lo hará vía este flujo, si se marcó a mano), así que
 * seguir pidiéndolo es ruido. Espeja `canMarkOrderShipped`.
 */
export function needsDropoffAction(order: AdminOrder): boolean {
  return order.shippingRequiresDropoff === true && canMarkOrderShipped(order);
}

/**
 * El backend redacta en es-MX y con instrucciones concretas (qué buscar en el
 * panel de Skydropx, si conviene reintentar), así que su `message` siempre gana
 * al genérico — que solo cubre el caso de red.
 */
export function retryShipmentErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 409) {
      return (
        message ??
        "Este pedido ya no admite un reintento de guía (ya tiene una, está cancelado, no está pagado o se cobró con la tarifa plana)."
      );
    }
    if (error.response?.status === 502) {
      return (
        message ??
        "No se pudo generar la guía con Skydropx. Revisa el saldo de la cuenta y los datos de envío del pedido, y vuelve a intentarlo."
      );
    }
    if (error.response?.status === 404) return "El pedido ya no existe.";
    if (error.response?.status === 400)
      return message ?? "Revisa los datos e inténtalo de nuevo.";
  }
  return "No pudimos generar la guía. Inténtalo de nuevo.";
}
