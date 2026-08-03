import type { PublicOrder } from "@/lib/api/orders";

/**
 * Derivación de `status`/`paymentStatus` a la línea de tiempo que ve el comprador
 * en /pedido/<token>. Módulo PURO (sin React), con specs — mismo criterio que
 * `components/admin/orders/shipmentLabel.ts`: la lógica de estado se puede razonar
 * y probar sin montar nada, y el componente solo pinta lo que sale de aquí.
 *
 * Por qué no basta con un `Record<status, string>`: el ciclo normal es una línea
 * de cuatro pasos donde los anteriores al actual ya se cumplieron, pero DOS
 * estados no viven en esa línea y pintarlos como si vivieran mentiría:
 *
 *  - `pending`: el pago aún no se confirma. No es "el paso 1 de 4 en curso" —
 *    todavía no hay nada que preparar, y el pedido puede acabar en nada (el
 *    barrido del backend lo recicla a los 30 min y libera su stock).
 *  - `cancelled`: la línea se rompe. Puede venir de un `pending` que nunca se
 *    pagó o de un `paid` que se reembolsó, y son dos mensajes distintos.
 *
 * La copia es nuestra a propósito. `shipmentStatus` (el texto crudo de la
 * paquetería) va aparte, como detalle secundario del componente.
 */

/** Un paso de la línea de tiempo del ciclo normal. */
export interface TimelineStep {
  key: "paid" | "preparing" | "shipped" | "delivered";
  label: string;
  /** Qué se le dice al comprador cuando ESTE es el paso en curso. */
  detail: string;
  state: "done" | "current" | "pending";
}

/** Lo que el componente necesita para pintar el encabezado de estado. */
export type OrderTimeline =
  | {
      kind: "awaiting-payment";
      title: string;
      detail: string;
    }
  | {
      kind: "cancelled";
      title: string;
      detail: string;
      /** True si el dinero se devolvió (hay que decir cuándo). */
      refunded: boolean;
    }
  | {
      kind: "progress";
      steps: TimelineStep[];
      /** Índice del paso en curso dentro de `steps`. */
      currentIndex: number;
    };

// El orden ES el ciclo de vida. `paid` y `preparing` son dos caras del mismo
// `status: "paid"` —el dinero entró y el pedido se está armando—, pero separarlos
// es lo que hace que la línea no se vea estancada durante los días que un outlet
// tarda en empacar: el comprador ve un paso cumplido y otro en curso, no uno solo
// que no se mueve.
const STEPS: Array<Omit<TimelineStep, "state">> = [
  {
    key: "paid",
    label: "Pago recibido",
    detail: "Confirmamos tu pago.",
  },
  {
    key: "preparing",
    label: "Preparando tu envío",
    detail: "Estamos empacando tu pedido. En cuanto salga verás aquí la guía.",
  },
  {
    key: "shipped",
    label: "Va en camino",
    detail: "Tu pedido ya salió de la tienda.",
  },
  {
    key: "delivered",
    label: "Entregado",
    detail: "Tu pedido llegó a su destino. ¡Gracias por tu compra!",
  },
];

/** Hasta qué paso llegó cada `status` del ciclo normal. */
const STEP_INDEX_BY_STATUS: Record<"paid" | "shipped" | "delivered", number> = {
  paid: 1, // "Preparando tu envío": el pago (índice 0) ya quedó atrás.
  shipped: 2,
  delivered: 3,
};

export function orderTimeline(
  order: Pick<PublicOrder, "status" | "paymentStatus">
): OrderTimeline {
  if (order.status === "cancelled") {
    const refunded = order.paymentStatus === "refunded";
    return {
      kind: "cancelled",
      title: refunded ? "Pedido cancelado y reembolsado" : "Pedido cancelado",
      detail: refunded
        ? "Te devolvimos el monto completo de tu compra."
        : "Este pedido se canceló y no se realizó ningún cargo.",
      refunded,
    };
  }

  if (order.status === "pending") {
    // Los tres paymentStatus posibles aquí cuentan historias distintas y llevan a
    // acciones distintas: esperar, reintentar, o nada.
    if (order.paymentStatus === "failed") {
      return {
        kind: "awaiting-payment",
        title: "El pago no se completó",
        detail:
          "No pudimos cobrar tu pedido. Si crees que es un error, escríbenos y lo revisamos contigo.",
      };
    }
    return {
      kind: "awaiting-payment",
      title: "Esperando el pago",
      detail:
        "Aún no recibimos la confirmación de tu pago. Si acabas de pagar, puede tardar unos minutos en reflejarse.",
    };
  }

  const currentIndex = STEP_INDEX_BY_STATUS[order.status];
  return {
    kind: "progress",
    currentIndex,
    steps: STEPS.map((step, i) => ({
      ...step,
      state: i < currentIndex ? "done" : i === currentIndex ? "current" : "pending",
    })),
  };
}
