"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { AdminOrder } from "@/lib/api/adminOrders";
import { formatPrice } from "@/lib/utils";
import { EASE_LUXE } from "@/lib/ui/motion";
import { OrderStatusBadge, PaymentStatusBadge } from "./StatusBadges";

interface Props {
  order: AdminOrder;
  onClose: () => void;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const labelCls =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-1.5";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="text-amber-50 text-sm">{children}</div>
    </div>
  );
}

const th =
  "pb-2 pr-4 last:pr-0 text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal font-sans";
const thR = `${th} text-right`;
const td = "py-2.5 pr-4 last:pr-0 align-top";
const tdR = `${td} text-right`;

export default function OrderDetailModal({ order, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape para cerrar + trampa de foco (Tab/Shift+Tab cicla dentro del diálogo)
  // + foco inicial dentro del panel y restauración al cerrar + bloqueo del scroll
  // de fondo. El repo no tiene una primitiva de modal compartida, así que va inline.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    // Foco inicial en el primer elemento enfocable del panel (el botón cerrar).
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = bodyOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const created = formatDate(order.createdAt);
  const updated = formatDate(order.updatedAt);
  const totalMargin = order.items.reduce(
    (s, i) => s + (i.unitSalePrice - i.unitCost) * i.quantity,
    0
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel centrado */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del pedido #${order.id}`}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-tobacco-950 border border-amber-400/15 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
        >
          {/* Gold-foil edge */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-amber-400/50 to-transparent"
          />

          {/* Header */}
          <div className="flex items-start gap-5 p-6 border-b border-amber-900/40">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-amber-50 text-2xl leading-snug mb-2">
                Pedido #{order.id}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="group shrink-0 w-7 h-7 flex items-center justify-center border border-amber-100/15 text-amber-100/40 hover:text-red-400 hover:border-red-600 transition-colors cursor-pointer"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:rotate-90"
                viewBox="0 0 18 18"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="m2 2 14 14m0-14L2 16"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {(created || updated) && (
              <p className="text-[11px] text-amber-100/30">
                {created && <>Creado {created}</>}
                {created && updated && updated !== created && " · "}
                {updated && updated !== created && <>actualizado {updated}</>}
              </p>
            )}

            {/* Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="Cliente">{order.customerName}</Field>
              <Field label="Correo">{order.customerEmail}</Field>
              <Field label="Teléfono">{order.customerPhone}</Field>
            </div>

            <div className="border-t border-stone-700/40" />

            {/* Envío */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Dirección">
                {order.street}, {order.neighborhood}
                <br />
                {order.city}, {order.state} {order.postalCode}
              </Field>
              <Field label="Referencias">
                {order.references || (
                  <span className="text-amber-100/30">—</span>
                )}
              </Field>
              <Field label="Paquetería">
                {order.shippingCarrier || (
                  <span className="text-amber-100/30">Aún no asignado</span>
                )}
              </Field>
            </div>

            {order.shippingRequiresDropoff && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3"
              >
                <span aria-hidden="true" className="shrink-0 leading-none">
                  ⚠️
                </span>
                <p className="text-[13px] leading-relaxed text-red-300">
                  Sin recolección — lleva el paquete a la sucursal de{" "}
                  {order.shippingCarrier || "la paquetería"}. Esta paquetería
                  no pasa a recogerlo a la tienda.
                </p>
              </div>
            )}

            <div className="border-t border-stone-700/40" />

            {/* Artículos */}
            <Field label="Artículos">
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-amber-400/20">
                      <th className={th}>Producto</th>
                      <th className={thR}>Talla</th>
                      <th className={thR}>Cant.</th>
                      <th className={thR}>Precio venta</th>
                      <th className={thR}>Costo</th>
                      <th className={thR}>Margen</th>
                      <th className={thR}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const marginUnit = item.unitSalePrice - item.unitCost;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-amber-400/10"
                        >
                          <td className={`${td} text-amber-50`}>
                            {item.nameSnapshot}
                          </td>
                          <td className={`${tdR} tabular-nums`}>
                            {item.size}
                          </td>
                          <td className={`${tdR} tabular-nums`}>
                            {item.quantity}
                          </td>
                          <td className={`${tdR} text-amber-400 tabular-nums`}>
                            {formatPrice(item.unitSalePrice)}
                          </td>
                          <td className={`${tdR} text-amber-100/60 tabular-nums`}>
                            {formatPrice(item.unitCost)}
                          </td>
                          <td
                            className={`${tdR} tabular-nums ${
                              marginUnit >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatPrice(marginUnit)}
                          </td>
                          <td className={`${tdR} text-amber-100/70 tabular-nums`}>
                            {formatPrice(item.unitSalePrice * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Field>

            <div className="border-t border-stone-700/40" />

            {/* Totales */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
              <Field label="Subtotal">
                <span className="tabular-nums">
                  {formatPrice(order.subtotal)}
                </span>
              </Field>
              <Field label="Ahorro">
                <span className="tabular-nums">
                  {formatPrice(order.savings)}
                </span>
              </Field>
              <Field label="Envío">
                <span className="tabular-nums">
                  {formatPrice(order.shipping)}
                </span>
              </Field>
              <Field label="Total">
                <span className="text-amber-400 font-semibold tabular-nums">
                  {formatPrice(order.total)}
                </span>
              </Field>
              <Field label="Margen total">
                <span
                  className={`tabular-nums ${
                    totalMargin >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatPrice(totalMargin)}
                </span>
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-amber-900/40">
            <button
              type="button"
              onClick={onClose}
              className="border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:border-red-600 hover:text-red-400 transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
