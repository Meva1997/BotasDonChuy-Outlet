import type { AdminOrder } from "@/lib/api/adminOrders";

/**
 * Clasificación de una disputa (contracargo) de Stripe (Fase 28). Vive aparte del JSX porque es
 * lógica pura —sin React, sin I/O— y porque **decide si un pedido se imprime en la hoja de
 * empaque**: equivocarse aquí significa mandar mercancía cuyo dinero ya se fue del saldo.
 *
 * `Order.disputeStatus` guarda el string CRUDO de Stripe, no un enum cerrado (mismo trato que
 * `shipmentStatus` con Skydropx, ver lib/domain/shipmentStatus.ts). Hoy Stripe documenta ocho
 * valores —`warning_needs_response`, `warning_under_review`, `warning_closed`, `needs_response`,
 * `under_review`, `won`, `lost`, `prevented`— y puede agregar más sin avisarnos.
 */

export type DisputeState =
  /** El caso sigue vivo, o Stripe reportó algo que no conocemos. */
  | "abierta"
  /** Resuelta a nuestro favor: el dinero vuelve. */
  | "ganada"
  /** Contracargo consumado: el dinero se fue y no vuelve. */
  | "perdida"
  /** Alerta temprana cerrada sin llegar a contracargo. */
  | "cerrada";

/**
 * Solo cuatro estados de Stripe significan "esto ya terminó y no hay nada que empacar mal":
 * `won`, `lost`, `warning_closed` — y el resto cae en "abierta".
 *
 * **El default NO es un descuido.** Un estado que Stripe agregue mañana tiene que tratarse como
 * pendiente, nunca como resuelto: equivocarse hacia "abierta" cuesta una hoja de empaque con un
 * pedido de menos (recuperable en un clic), y equivocarse hacia "resuelta" cuesta la mercancía.
 * Eso incluye a `prevented`, que hoy significa que Stripe evitó el contracargo reembolsando el
 * cargo — el dinero tampoco está, así que menos todavía hay que enviar.
 */
export function disputeState(order: AdminOrder): DisputeState | null {
  const raw = order.disputeStatus;
  if (!raw) return null;

  switch (raw) {
    case "won":
      return "ganada";
    case "lost":
      return "perdida";
    case "warning_closed":
      return "cerrada";
    default:
      return "abierta";
  }
}

/**
 * ¿Este pedido NO debería salir en la hoja de empaque?
 *
 * Incluye a `"perdida"` a propósito: una disputa perdida no es un caso cerrado del que olvidarse,
 * es dinero que ya se fue definitivamente — enviar ahí es regalar la pieza encima. Solo se
 * levanta la bandera con `"ganada"` (el dinero volvió) y `"cerrada"` (nunca llegó a irse).
 *
 * No filtra por `status`: un pedido disputado ya enviado no aparece en la pestaña de pendientes de
 * todas formas, y agregar esa condición aquí solo escondería la bandera del modal justo donde el
 * dueño necesita verla.
 */
export function disputeBlocksShipping(order: AdminOrder): boolean {
  const state = disputeState(order);
  return state === "abierta" || state === "perdida";
}

/**
 * Motivos que declara Stripe (`Dispute.reason`). Se traducen los que puede ver una tienda de
 * ropa; los de suscripciones y débito directo se quedan fuera a propósito — no aplican a este
 * negocio y traducirlos daría a entender que sí.
 */
const REASON_LABELS: Record<string, string> = {
  fraudulent: "Cargo no reconocido (fraude)",
  unrecognized: "No reconoce el cargo",
  duplicate: "Cargo duplicado",
  product_not_received: "Producto no recibido",
  product_unacceptable: "Producto no corresponde o llegó dañado",
  credit_not_processed: "Reembolso prometido y no aplicado",
  customer_initiated: "Reclamo del comprador",
  general: "Sin motivo específico",
};

/**
 * Devuelve el crudo cuando no conoce el motivo, igual que `shipmentStatusLabel`: un código sin
 * traducir se puede buscar en el Dashboard de Stripe, y un guion no.
 */
export function disputeReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return REASON_LABELS[reason] ?? reason;
}
