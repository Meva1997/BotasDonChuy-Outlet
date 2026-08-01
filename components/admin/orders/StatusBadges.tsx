import type { AdminOrder } from "@/lib/api/adminOrders";
import { shipmentStatusLabel } from "@/lib/domain/shipmentStatus";

// Fuente única del color/etiqueta de cada estado — usada por OrdersTable y
// OrderDetailModal para que el significado visual no se duplique/desalinee.
//
// INVARIANTE DE COLOR: `status` y `paymentStatus` son campos INDEPENDIENTES que
// se pintan **uno junto al otro** (columnas "Estado" y "Pago" de OrdersTable,
// y el par de badges del encabezado del modal), así que los cinco hues de
// STATUS_META y los cinco de PAYMENT_META son DISJUNTOS: ningún par de badges
// que pueda aparecer en la misma fila comparte color, y dentro de cada columna
// tampoco se repite ninguno (se escanean en vertical). Al agregar un estado
// nuevo hay que sacarlo de una familia que no esté en ninguna de las dos
// tablas, no reusar la que "quede bien" — dos badges del mismo color obligan a
// leer el texto para saber cuál es cuál, que es justo lo que la píldora evita.
//
// STATUS se queda con la rampa intuitiva del ciclo de vida (espera → confirmado
// → en camino → entregado, más el rojo de cancelado); PAYMENT usa familias que
// STATUS no toca.
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

// Ninguno de estos hues aparece en STATUS_META (ver la nota de arriba). Las
// vecindades se eligieron pensando en la pareja que a cada uno le toca al lado:
// "Procesando" convive con Pendiente (ámbar) → cian; "Fallido" convive con
// Pendiente (ámbar) y Cancelado (rojo) → fucsia, magenta legible contra los
// dos; "Reembolsado" solo aparece con Cancelado (rojo) → naranja.
export const PAYMENT_META: Record<
  AdminOrder["paymentStatus"],
  { label: string; classes: string }
> = {
  unpaid: { label: "Sin pagar", classes: "border-stone-500 text-stone-400" },
  processing: {
    label: "Procesando",
    classes: "border-cyan-400 text-cyan-400",
  },
  paid: { label: "Pagado", classes: "border-lime-400 text-lime-400" },
  failed: { label: "Fallido", classes: "border-fuchsia-400 text-fuchsia-400" },
  refunded: {
    label: "Reembolsado",
    classes: "border-orange-400 text-orange-400",
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

// `Order.shipmentStatus` (Fase 11) es el string crudo que reporta Skydropx — no un
// enum cerrado validado por el backend. La TRADUCCIÓN vive en
// `lib/domain/shipmentStatus.ts` porque desde la Fase 17 también la usa la página
// pública de seguimiento, con otra presentación (ver el comentario de ese módulo);
// aquí solo queda el color, que sí es propio del panel.
//
// Éste SÍ reusa los hues de STATUS_META a propósito (al revés que PAYMENT_META,
// ver la nota de arriba): es el mismo ciclo de vida contado por la paquetería en
// vez de por nosotros, así que "En tránsito" en violeta = "Enviado" en violeta
// dice justo lo que debe decir. Puede hacerlo porque nunca se pinta junto al
// badge de `status`: vive en su propio Field del modal ("Estado del envío") y no
// aparece en la tabla.
const SHIPMENT_STATUS_CLASSES: Record<string, string> = {
  pre_transit: "border-sky-400 text-sky-400",
  label_created: "border-sky-400 text-sky-400",
  in_transit: "border-violet-400 text-violet-400",
  out_for_delivery: "border-violet-400 text-violet-400",
  delivered: "border-emerald-400 text-emerald-400",
  exception: "border-red-400 text-red-400",
  failure: "border-red-400 text-red-400",
  cancelled: "border-red-400 text-red-400",
};

export function ShipmentStatusBadge({ status }: { status: string }) {
  // Un estado que la tabla de labels no conoce tampoco tiene color asignado:
  // gris neutro en vez de fingir que sabemos en qué punto del ciclo cae.
  const classes =
    SHIPMENT_STATUS_CLASSES[status.toLowerCase()] ??
    "border-stone-500 text-stone-400";
  return (
    <span className={`${PILL_BASE} ${classes}`}>
      {shipmentStatusLabel(status)}
    </span>
  );
}
