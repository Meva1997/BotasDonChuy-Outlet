"use client";

import type { AdminOrder } from "@/lib/api/adminOrders";
import { formatPrice } from "@/lib/utils";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  DropoffBadge,
} from "./StatusBadges";

interface Props {
  orders: AdminOrder[];
  onSelect: (order: AdminOrder) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function totalPiezas(order: AdminOrder): number {
  return order.items.reduce((s, i) => s + i.quantity, 0);
}

const th =
  "pb-3 pr-4 last:pr-0 text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";
const thR = `${th} text-center`;
const td = "py-3 pr-4 last:pr-0 align-top";
const tdR = `${td} text-center`;

export default function OrdersTable({ orders, onSelect }: Props) {
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center border border-amber-400/10">
        <p className="text-amber-100/30 text-sm">Aún no hay pedidos</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-4 sm:p-6">
      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 xl:hidden">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelect(order)}
            className="text-left rounded border border-amber-400/10 p-4 flex flex-col gap-3 hover:bg-amber-400/5 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="text-sm text-amber-50 font-medium font-sans">
                  Pedido #{order.id}
                </span>
                <p className="text-[11px] text-amber-100/40 font-sans">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <span className="text-amber-400 font-semibold font-sans text-sm tabular-nums shrink-0">
                {formatPrice(order.total)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-amber-50 text-sm truncate">
                {order.customerName}
              </p>
              <p className="text-amber-100/40 text-xs truncate">
                {order.customerEmail}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-400/10">
              <span className="text-[11px] text-amber-100/40 font-sans">
                {totalPiezas(order)} pz
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                {order.shippingRequiresDropoff && <DropoffBadge />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm font-sans text-center">
          <thead>
            <tr className="border-b border-amber-400/20">
              <th className={th}>Pedido</th>
              <th className={th}>Fecha</th>
              <th className={th}>Cliente</th>
              <th className={thR}>Piezas</th>
              <th className={th}>Estado</th>
              <th className={th}>Pago</th>
              <th className={th}>Envío</th>
              <th className={thR}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver pedido #${order.id}`}
                onClick={() => onSelect(order)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(order);
                  }
                }}
                className="border-b border-amber-400/10 hover:bg-amber-400/5 transition-colors cursor-pointer"
              >
                <td className={`${td} text-amber-50 font-medium`}>
                  #{order.id}
                </td>
                <td className={`${td} text-amber-100/60 whitespace-nowrap`}>
                  {formatDate(order.createdAt)}
                </td>
                <td className={`${td} max-w-55`}>
                  <p className="text-amber-50 truncate">{order.customerName}</p>
                  <p className="text-amber-100/40 text-xs truncate">
                    {order.customerEmail}
                  </p>
                </td>
                <td className={`${tdR} text-amber-100/60 tabular-nums`}>
                  {totalPiezas(order)}
                </td>
                <td className={td}>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className={td}>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </td>
                <td className={td}>
                  {order.shippingRequiresDropoff ? (
                    <DropoffBadge />
                  ) : (
                    <span className="text-amber-100/20">—</span>
                  )}
                </td>
                <td
                  className={`${tdR} text-amber-400 font-semibold tabular-nums whitespace-nowrap`}
                >
                  {formatPrice(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
