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
