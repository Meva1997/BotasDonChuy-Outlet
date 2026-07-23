import type { AdminOrder } from "@/lib/api/adminOrders";

// Fuente única del color/etiqueta de cada estado — usada por OrdersTable y
// OrderDetailModal para que el significado visual no se duplique/desalinee.
// `status` y `paymentStatus` son campos independientes que comparten el string
// "paid"; se les da color distinto a propósito (no son la misma señal).
export const STATUS_META: Record<
  AdminOrder["status"],
  { label: string; classes: string }
> = {
  pending: { label: "Pendiente", classes: "border-amber-400 text-amber-400" },
  paid: { label: "Confirmado", classes: "border-sky-400 text-sky-400" },
  shipped: { label: "Enviado", classes: "border-violet-400 text-violet-400" },
  delivered: {
    label: "Entregado",
    classes: "border-emerald-400 text-emerald-400",
  },
  cancelled: { label: "Cancelado", classes: "border-red-400 text-red-400" },
};

export const PAYMENT_META: Record<
  AdminOrder["paymentStatus"],
  { label: string; classes: string }
> = {
  unpaid: { label: "Sin pagar", classes: "border-stone-500 text-stone-400" },
  processing: {
    label: "Procesando",
    classes: "border-amber-400 text-amber-400",
  },
  paid: { label: "Pagado", classes: "border-emerald-400 text-emerald-400" },
  failed: { label: "Fallido", classes: "border-red-400 text-red-400" },
  refunded: {
    label: "Reembolsado",
    classes: "border-violet-400 text-violet-400",
  },
};

const PILL_BASE =
  "inline-block border uppercase tracking-[0.2em] text-[9px] px-3 py-1.5 whitespace-nowrap";

export function OrderStatusBadge({ status }: { status: AdminOrder["status"] }) {
  const meta = STATUS_META[status];
  return <span className={`${PILL_BASE} ${meta.classes}`}>{meta.label}</span>;
}

export function PaymentStatusBadge({
  status,
}: {
  status: AdminOrder["paymentStatus"];
}) {
  const meta = PAYMENT_META[status];
  return <span className={`${PILL_BASE} ${meta.classes}`}>{meta.label}</span>;
}

// Bandera operativa "sin recolección a domicilio" (Skydropx, ver CLAUDE.md
// "Shipping"): el dueño debe llevar el paquete a la sucursal de la paquetería,
// o el pedido nunca sale de la tienda. En rojo (mismo tono que "urgente" en
// ReplenishmentReport) porque el costo de pasarlo por alto es dinero perdido.
export function DropoffBadge() {
  return (
    <span
      className={`${PILL_BASE} border-red-400/40 text-red-400 bg-red-500/10`}
    >
      Sin recolección
    </span>
  );
}

// `Order.shipmentStatus` (Fase 11) es el string crudo que reporta Skydropx —
// no un enum cerrado validado por el backend, así que este diccionario cubre
// los valores más comunes del carrier y cualquier otro cae a un fallback
// legible en vez de mostrar la clave cruda o reventar.
const SHIPMENT_STATUS_META: Record<string, { label: string; classes: string }> = {
  pre_transit: { label: "Guía generada", classes: "border-sky-400 text-sky-400" },
  label_created: { label: "Guía generada", classes: "border-sky-400 text-sky-400" },
  in_transit: {
    label: "En tránsito",
    classes: "border-violet-400 text-violet-400",
  },
  out_for_delivery: {
    label: "En reparto",
    classes: "border-violet-400 text-violet-400",
  },
  delivered: {
    label: "Entregado",
    classes: "border-emerald-400 text-emerald-400",
  },
  exception: { label: "Incidencia", classes: "border-red-400 text-red-400" },
  failure: { label: "Incidencia", classes: "border-red-400 text-red-400" },
  cancelled: { label: "Cancelado", classes: "border-red-400 text-red-400" },
};

function fallbackShipmentLabel(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const meta = SHIPMENT_STATUS_META[status.toLowerCase()] ?? {
    label: fallbackShipmentLabel(status),
    classes: "border-stone-500 text-stone-400",
  };
  return <span className={`${PILL_BASE} ${meta.classes}`}>{meta.label}</span>;
}
