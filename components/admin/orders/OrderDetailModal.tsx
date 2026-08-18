"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  adminOrderKeys,
  cancelAdminOrder,
  retryAdminOrderShipment,
  rotateAdminOrderToken,
  updateAdminOrderStatus,
  type AdminOrder,
} from "@/lib/api/adminOrders";
import { adminProductKeys } from "@/lib/api/adminProducts";
import { productKeys } from "@/lib/api/products";
import { formatPrice } from "@/lib/utils";
import { EASE_LUXE } from "@/lib/ui/motion";
import {
  canMarkOrderShipped,
  canRetryShipment,
  needsDropoffAction,
  retryShipmentErrorMessage,
  shipmentLabelState,
} from "./shipmentLabel";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ShipmentStatusBadge,
} from "./StatusBadges";

interface Props {
  order: AdminOrder;
  onClose: () => void;
  // El padre (OrdersSection) sincroniza su snapshot `viewing` con el pedido que
  // devolvió la mutation (cancelación o avance de estado), para que el modal
  // siga mostrando badges frescos sin cerrarse.
  onOrderUpdated?: (order: AdminOrder) => void;
  // Refresca el listado sin tener un pedido nuevo que mostrar. Lo usa el
  // reintento de guía cuando FALLA: un 502 pudo dejar el pedido en
  // `unreconciled:*` y `force` limpia el marcador antes de intentar, así que
  // aun fallando cambió la BD y la tabla mentiría. OrdersSection lo cablea con
  // su refresh manual, para no dispararse a sí mismo el toast del polling.
  onRequestRefresh?: () => void;
}

const REASON_MAX = 200;
// Mismos topes que `orderStatusUpdateSchema` en el backend: recortar aquí evita
// un 400 por longitud que el dueño solo descubriría al enviar.
const TRACKING_NUMBER_MAX = 100;
const CARRIER_MAX = 80;

// 409 (estado no cancelable) y 502 (falló el reembolso en Stripe) traen un
// `message` accionable del backend — se muestra tal cual, sin genérico encima.
function cancelOrderErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 409) {
      return (
        message ??
        "Este pedido ya no se puede cancelar (ya fue enviado, entregado o cancelado)."
      );
    }
    if (error.response?.status === 502) {
      return (
        message ??
        "No se pudo procesar el reembolso en Stripe. El pedido no se canceló — inténtalo de nuevo o revisa el dashboard de Stripe."
      );
    }
    if (error.response?.status === 404) return "El pedido ya no existe.";
    if (error.response?.status === 400)
      return message ?? "Revisa los datos e inténtalo de nuevo.";
  }
  return "No pudimos cancelar el pedido. Inténtalo de nuevo.";
}

// 409 (retroceso de estado / pedido cancelado / todavía sin pagar) y 400
// (validación por campo) llegan con un `message` ya redactado en es-MX — se
// prefiere siempre al genérico, que solo cubre el caso de red.
function statusUpdateErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 409) {
      return (
        message ??
        "Este pedido ya no puede cambiar a ese estado (está cancelado, sin pagar, o el estado no puede retroceder)."
      );
    }
    if (error.response?.status === 400)
      return message ?? "Revisa los datos e inténtalo de nuevo.";
    if (error.response?.status === 404) return "El pedido ya no existe.";
  }
  return "No pudimos actualizar el pedido. Inténtalo de nuevo.";
}

// La rotación del código de rastreo (Fase 26) es la única de estas rutas que NO
// tiene 409: no hay estado del pedido que la bloquee. Solo quedan el 404 (el
// pedido dejó de existir) y el caso de red.
function rotateTokenErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 404) return "El pedido ya no existe.";
    if (message) return message;
  }
  return "No pudimos regenerar el código. Inténtalo de nuevo.";
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

// Qué está capturando el dueño en la sección "Estado del envío": el formulario
// de guía (marcar enviado o agregar la guía a un pedido ya enviado), la
// confirmación de "entregado", o nada.
type ShippingAction = null | "shipped" | "delivered";

export default function OrderDetailModal({
  order,
  onClose,
  onOrderUpdated,
  onRequestRefresh,
}: Props) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [shippingAction, setShippingAction] = useState<ShippingAction>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");
  // Cada guía se cobra, así que ninguna de las dos ramas del reintento dispara
  // la petición al primer clic: las dos piden una confirmación explícita.
  const [confirmingRetry, setConfirmingRetry] = useState<null | "normal" | "force">(
    null
  );
  // Rotar el código deja fuera al comprador legítimo hasta que le llegue el
  // correo con el nuevo: mismo tratamiento de dos pasos que cancelar y reintentar
  // guía, para que un clic accidental no la dispare.
  const [confirmingRotate, setConfirmingRotate] = useState(false);

  const canCancel = order.status === "pending" || order.status === "paid";
  // Los estados que el backend rechaza con 409 no ofrecen acción. Un pedido ya
  // `shipped` puede repetir el estado para agregar la guía que le falta.
  const canMarkShipped = canMarkOrderShipped(order);
  const canAddTracking = order.status === "shipped" && !order.trackingNumber;
  const canMarkDelivered =
    order.status === "paid" || order.status === "shipped";
  const hasShippingActions =
    canMarkShipped || canAddTracking || canMarkDelivered;

  // Guía de Skydropx (Fase 16). `skydropxShipmentId` puede traer centinelas en
  // vez de un id — ver shipmentLabel.ts.
  const label = shipmentLabelState(order.skydropxShipmentId);
  const canRetryLabel = canRetryShipment(order);
  const needsLabelReview =
    label.state === "unreconciled" || label.state === "unreconciled-unknown";

  const cancelMutation = useMutation({
    mutationFn: () => cancelAdminOrder(order.id, cancelReason.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      // El restock (pending) o el reembolso+restock (paid) cambia el stock
      // visible en el catálogo admin y el outlet público.
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setConfirmingCancel(false);
      setCancelReason("");
      onOrderUpdated?.(updated);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "shipped" | "delivered") =>
      updateAdminOrderStatus(order.id, {
        status,
        // La confirmación de "entregado" no captura guía: mandar los campos del
        // otro formulario ahí escribiría datos que el dueño no está viendo.
        // `trackingUrl` no viaja nunca desde aquí (ver el formulario abajo): la
        // clave ausente significa "no toques ese campo", así que la URL que haya
        // puesto el webhook de Skydropx se conserva intacta.
        ...(status === "shipped" ? { trackingNumber, shippingCarrier } : {}),
      }),
    onSuccess: (updated) => {
      // Avanzar el estado no toca stock (a diferencia de la cancelación), así
      // que solo se invalida el listado de pedidos.
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      setShippingAction(null);
      setTrackingNumber("");
      setShippingCarrier("");
      onOrderUpdated?.(updated);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (force?: boolean) =>
      retryAdminOrderShipment(order.id, force ? { force: true } : undefined),
    onSuccess: (updated) => {
      // Generar la guía no toca stock (a diferencia de la cancelación): solo
      // se invalida el listado de pedidos.
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
      setConfirmingRetry(null);
      onOrderUpdated?.(updated);
    },
    // Un reintento fallido igual escribió: el 502 puede haber dejado el pedido
    // en `unreconciled:*` y `force` limpia el marcador antes de intentar. El
    // mensaje del backend se queda visible; la tabla sí se pone al día.
    onError: () => onRequestRefresh?.(),
  });

  // Rotación del código de rastreo público (Fase 26).
  //
  // NO invalida `adminOrderKeys` ni llama a `onOrderUpdated`, y las dos
  // omisiones son deliberadas: `publicToken` no se pinta en ninguna vista admin,
  // así que no queda nada desincronizado en pantalla, y `onOrderUpdated` arma de
  // paso el `isManualRefreshRef` de OrdersSection —que existe para suprimir el
  // toast del polling— aunque esta acción no toca ni un solo campo de
  // `orderSignature`. Usarlo aquí se comería el aviso del SIGUIENTE cambio real
  // hecho por el webhook, que es justo lo que ese toast tiene que reportar.
  const rotateMutation = useMutation({
    mutationFn: () => rotateAdminOrderToken(order.id),
    onSuccess: () => setConfirmingRotate(false),
  });

  const openShippingAction = (action: Exclude<ShippingAction, null>) => {
    statusMutation.reset();
    setShippingAction(action);
  };

  const closeShippingForm = () => {
    setShippingAction(null);
    setTrackingNumber("");
    setShippingCarrier("");
    statusMutation.reset();
  };

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
  // La guía solo puede existir una vez pagado el pedido; antes de eso "en
  // proceso" sería engañoso (no hay envío que generar todavía).
  const canHaveLabel = order.status !== "pending" && order.status !== "cancelled";
  // El descuento del cupón (Fase 19) sale del bolsillo de la tienda, no del
  // proveedor: es una reducción real del ingreso de esta venta, así que se resta
  // del margen. Dejarlo fuera haría que una promoción se viera igual de rentable
  // que una venta a precio de lista, que es justo lo que el dueño necesita poder
  // comparar antes de repetirla.
  const couponDiscount = order.couponDiscount ?? 0;
  const totalMargin =
    order.items.reduce(
      (s, i) => s + (i.unitSalePrice - i.unitCost) * i.quantity,
      0
    ) - couponDiscount;

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
              <Field label="Guía">
                {order.labelUrl ? (
                  <a
                    href={order.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline"
                  >
                    Descargar guía (PDF)
                  </a>
                ) : needsLabelReview ? (
                  // "En proceso" mentiría: hay una guía que puede estar cobrada
                  // y necesita que alguien la revise (ver la sección de abajo).
                  <span className="text-amber-400/80">Por revisar en Skydropx</span>
                ) : canRetryLabel ? (
                  <span className="text-amber-400/80">Sin guía</span>
                ) : (
                  <span className="text-amber-100/30">
                    {canHaveLabel
                      ? "Guía en proceso"
                      : "Aún no generada"}
                  </span>
                )}
              </Field>
              <Field label="Rastreo">
                {order.trackingNumber ? (
                  order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    order.trackingNumber
                  )
                ) : (
                  <span className="text-amber-100/30">—</span>
                )}
              </Field>
              <Field label="Estado del envío">
                {order.shipmentStatus ? (
                  <ShipmentStatusBadge status={order.shipmentStatus} />
                ) : (
                  <span className="text-amber-100/30">—</span>
                )}
              </Field>
            </div>

            {needsDropoffAction(order) && (
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
                            {item.size > 0 ? item.size : "—"}
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

            {/* Totales. El invariante es
                `total = subtotal − savings − couponDiscount + shipping`, así que
                la fila del cupón va ANTES de Envío: el descuento se aplica sobre
                la mercancía neta y nunca toca el envío. */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 gap-5 ${
                couponDiscount > 0 ? "lg:grid-cols-6" : "lg:grid-cols-5"
              }`}
            >
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
              {couponDiscount > 0 && (
                <Field label={order.couponCode ? `Cupón ${order.couponCode}` : "Cupón"}>
                  <span className="tabular-nums text-emerald-400">
                    −{formatPrice(couponDiscount)}
                  </span>
                </Field>
              )}
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

            {(order.refundId || order.refundedAt) && (
              <>
                <div className="border-t border-stone-700/40" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Reembolso">
                    {order.refundId || (
                      <span className="text-amber-100/30">—</span>
                    )}
                  </Field>
                  <Field label="Reembolsado el">
                    {formatDate(order.refundedAt ?? undefined) ?? (
                      <span className="text-amber-100/30">—</span>
                    )}
                  </Field>
                </div>
              </>
            )}

            {/* Guía de Skydropx (Fase 16). La guía se genera sola al confirmarse
                el pago; si esa única llamada falló, el pedido queda pagado y sin
                guía y ningún webhook llega por una guía que nunca se creó. */}
            {(canRetryLabel || needsLabelReview) && (
              <>
                <div className="border-t border-stone-700/40" />
                <div>
                  <span className={labelCls}>Guía de Skydropx</span>

                  {/* Falta la guía y se puede generar. `creating` incluido: ese
                      centinela puede ser huérfano de un proceso caído, y el
                      backend lo libera (o responde 409 si de verdad está en
                      vuelo). */}
                  {canRetryLabel && (
                    <>
                      {confirmingRetry !== "normal" ? (
                        <div className="space-y-2.5">
                          <p className="text-[13px] text-amber-100/70 leading-relaxed">
                            {label.state === "creating"
                              ? "Este pedido está pagado y su guía quedó a medio generar. Puede estar generándose en este momento; si no, reintentarlo la crea."
                              : "Este pedido está pagado y no tiene guía. Skydropx falló al generarla."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              retryMutation.reset();
                              setConfirmingRetry("normal");
                            }}
                            className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 border border-amber-400/40 px-4 py-2 hover:text-amber-300 hover:border-amber-400/70 transition-colors cursor-pointer"
                          >
                            Reintentar guía
                          </button>
                          {retryMutation.isError && (
                            <p role="alert" className="text-[12px] text-red-400/90">
                              {retryShipmentErrorMessage(retryMutation.error)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 border border-amber-400/25 bg-amber-400/5 rounded-md p-4">
                          <p className="text-[13px] text-amber-100/70 leading-relaxed">
                            Se generará la guía con la tarifa que el cliente ya
                            pagó. <strong className="text-amber-200">Cada guía se cobra</strong>{" "}
                            en tu cuenta de Skydropx.
                          </p>

                          {retryMutation.isError && (
                            <p role="alert" className="text-[12px] text-red-400/90">
                              {retryShipmentErrorMessage(retryMutation.error)}
                            </p>
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(undefined)}
                              className="border border-amber-400/60 text-amber-400 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryMutation.isPending
                                ? "Generando…"
                                : "Generar guía"}
                            </button>
                            <button
                              type="button"
                              disabled={retryMutation.isPending}
                              onClick={() => {
                                setConfirmingRetry(null);
                                retryMutation.reset();
                              }}
                              className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Volver
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Guía cobrada con id conocido: existe y está pagada, así que
                      NO se ofrece reintentar (generaría una segunda). Solo se
                      dice dónde buscarla. */}
                  {label.state === "unreconciled" && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-md border border-amber-400/40 bg-amber-400/5 px-4 py-3"
                    >
                      <span aria-hidden="true" className="shrink-0 leading-none">
                        ⚠️
                      </span>
                      <p className="text-[13px] leading-relaxed text-amber-100/80">
                        La guía de este pedido{" "}
                        <strong className="text-amber-200">ya se generó y se cobró</strong>{" "}
                        en Skydropx (
                        <span className="font-mono text-amber-200">
                          {label.shipmentId}
                        </span>
                        ), pero no se pudo guardar aquí. Búscala con ese id en el
                        panel de Skydropx y captura su número más abajo, al marcar
                        el pedido como enviado. No generes otra: se cobraría dos
                        veces.
                      </p>
                    </div>
                  )}

                  {/* Skydropx no respondió al crear la guía: pudo cobrarla sin
                      dejar rastro. Nadie puede decidirlo desde aquí, así que las
                      dos salidas son explícitas y el `force` va con su propia
                      confirmación. */}
                  {label.state === "unreconciled-unknown" && (
                    <div className="space-y-3 rounded-md border border-amber-400/40 bg-amber-400/5 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span aria-hidden="true" className="shrink-0 leading-none">
                          ⚠️
                        </span>
                        <p className="text-[13px] leading-relaxed text-amber-100/80">
                          Skydropx no respondió al generar la guía de este pedido,
                          así que{" "}
                          <strong className="text-amber-200">
                            pudo haberla creado y cobrado
                          </strong>{" "}
                          sin que quedara registrada. Búscala en el panel de
                          Skydropx por fecha y paquetería antes de decidir.
                        </p>
                      </div>

                      {confirmingRetry !== "force" ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openShippingAction("shipped")}
                            className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 border border-amber-400/40 px-4 py-2 hover:text-amber-300 hover:border-amber-400/70 transition-colors cursor-pointer"
                          >
                            Ya la encontré — capturar guía
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              retryMutation.reset();
                              setConfirmingRetry("force");
                            }}
                            className="text-[11px] uppercase tracking-[0.2em] text-red-400/80 border border-red-400/30 px-4 py-2 hover:text-red-300 hover:border-red-400/60 transition-colors cursor-pointer"
                          >
                            No existe — generar de todos modos
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 border border-red-400/30 bg-red-500/5 rounded-md p-4">
                          <p className="text-[13px] text-red-300 leading-relaxed">
                            Confirma que revisaste el panel de Skydropx y{" "}
                            <strong>no existe ninguna guía</strong> para este
                            pedido. Si sí existía, se generará una segunda y se
                            cobrarán las dos.
                          </p>

                          {retryMutation.isError && (
                            <p role="alert" className="text-[12px] text-red-400/90">
                              {retryShipmentErrorMessage(retryMutation.error)}
                            </p>
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(true)}
                              className="bg-red-600/80 border border-red-500/80 text-amber-50 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryMutation.isPending
                                ? "Generando…"
                                : "Ya verifiqué, generar guía"}
                            </button>
                            <button
                              type="button"
                              disabled={retryMutation.isPending}
                              onClick={() => {
                                setConfirmingRetry(null);
                                retryMutation.reset();
                              }}
                              className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Volver
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {hasShippingActions && (
              <>
                <div className="border-t border-stone-700/40" />
                <div>
                  <span className={labelCls}>Estado del envío</span>

                  {shippingAction === null && (
                    <div className="flex flex-wrap items-center gap-3">
                      {canMarkShipped && (
                        <button
                          type="button"
                          onClick={() => openShippingAction("shipped")}
                          className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 border border-amber-400/40 px-4 py-2 hover:text-amber-300 hover:border-amber-400/70 transition-colors cursor-pointer"
                        >
                          Marcar como enviado
                        </button>
                      )}
                      {/* El backend acepta repetir `status: "shipped"` justo
                          para esto: la guía puede llegar horas después. */}
                      {canAddTracking && (
                        <button
                          type="button"
                          onClick={() => openShippingAction("shipped")}
                          className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 border border-amber-400/40 px-4 py-2 hover:text-amber-300 hover:border-amber-400/70 transition-colors cursor-pointer"
                        >
                          Agregar guía
                        </button>
                      )}
                      {canMarkDelivered && (
                        <button
                          type="button"
                          onClick={() => openShippingAction("delivered")}
                          className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90 border border-emerald-400/40 px-4 py-2 hover:text-emerald-300 hover:border-emerald-400/70 transition-colors cursor-pointer"
                        >
                          Marcar como entregado
                        </button>
                      )}
                    </div>
                  )}

                  {shippingAction === "shipped" && (
                    <div className="space-y-3 border border-amber-400/25 bg-amber-400/5 rounded-md p-4">
                      <p className="text-[13px] text-amber-100/70 leading-relaxed">
                        {canAddTracking
                          ? "Captura la guía de este pedido. Los dos campos son opcionales."
                          : "El pedido quedará marcado como enviado. Los dos campos son opcionales."}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="tracking-number"
                            className={labelCls}
                          >
                            Número de guía
                          </label>
                          <input
                            id="tracking-number"
                            type="text"
                            value={trackingNumber}
                            onChange={(e) =>
                              setTrackingNumber(
                                e.target.value.slice(0, TRACKING_NUMBER_MAX)
                              )
                            }
                            maxLength={TRACKING_NUMBER_MAX}
                            placeholder="Ej. 794658123456"
                            className="w-full bg-stone-900 border border-amber-400/20 text-amber-50 text-sm font-sans px-3 py-2 rounded hover:border-amber-400/40 focus-visible:border-amber-400/60 transition-colors"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="shipping-carrier"
                            className={labelCls}
                          >
                            Paquetería
                          </label>
                          <input
                            id="shipping-carrier"
                            type="text"
                            value={shippingCarrier}
                            onChange={(e) =>
                              setShippingCarrier(
                                e.target.value.slice(0, CARRIER_MAX)
                              )
                            }
                            maxLength={CARRIER_MAX}
                            placeholder={
                              order.shippingCarrier
                                ? `Actual: ${order.shippingCarrier}`
                                : "Ej. Estafeta"
                            }
                            className="w-full bg-stone-900 border border-amber-400/20 text-amber-50 text-sm font-sans px-3 py-2 rounded hover:border-amber-400/40 focus-visible:border-amber-400/60 transition-colors"
                          />
                        </div>

                      </div>

                      {/* Aquí NO se captura la "URL de rastreo": ese campo es el
                          enlace de la PAQUETERÍA y lo llena solo el webhook de
                          Skydropx —este formulario existe justo para los pedidos
                          que nunca pasaron por Skydropx, donde no hay tal URL—.
                          El seguimiento propio de la tienda ya viaja en TODOS los
                          correos (botón "Ver el estado de mi pedido" + el código
                          copiable, ver `sendOrderEmail` en el backend), así que
                          pegarlo aquí solo duplicaría el botón. Al no mandar la
                          clave, la URL que sí haya puesto el webhook se conserva. */}
                      {/* El correo de rastreo sale exactamente una vez por
                          pedido (guard atómico en el backend, compartido con el
                          webhook de Skydropx): capturar la guía es visible para
                          el cliente y no se puede deshacer. */}
                      <p className="text-[12px] leading-relaxed text-amber-100/60">
                        {trackingNumber.trim()
                          ? "Se enviará al cliente el correo de rastreo con esta guía, junto con su código de seguimiento. No se puede deshacer."
                          : "Sin número de guía no se manda el correo de rastreo; puedes agregarla después."}
                      </p>

                      {statusMutation.isError && (
                        <p role="alert" className="text-[12px] text-red-400/90">
                          {statusUpdateErrorMessage(statusMutation.error)}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate("shipped")}
                          className="border border-amber-400/60 text-amber-400 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {statusMutation.isPending
                            ? "Guardando…"
                            : canAddTracking
                              ? "Guardar guía"
                              : "Confirmar envío"}
                        </button>
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={closeShippingForm}
                          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}

                  {shippingAction === "delivered" && (
                    <div className="space-y-3 border border-emerald-400/25 bg-emerald-400/5 rounded-md p-4">
                      <p className="text-[13px] text-amber-100/70 leading-relaxed">
                        El pedido quedará marcado como entregado. El estado no
                        puede retroceder y no se manda ningún correo al cliente.
                      </p>

                      {statusMutation.isError && (
                        <p role="alert" className="text-[12px] text-red-400/90">
                          {statusUpdateErrorMessage(statusMutation.error)}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate("delivered")}
                          className="border border-emerald-400/60 text-emerald-400 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-emerald-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {statusMutation.isPending
                            ? "Guardando…"
                            : "Confirmar entrega"}
                        </button>
                        <button
                          type="button"
                          disabled={statusMutation.isPending}
                          onClick={closeShippingForm}
                          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Código de rastreo del comprador (Fase 26). Sin condición de
                visibilidad a propósito, a diferencia de todos los bloques de
                arriba: el backend no tiene ningún estado que rechace la
                rotación, porque un código filtrado hay que poder apagarlo
                aunque el pedido ya esté entregado o cancelado. */}
            <div className="border-t border-stone-700/40" />
            <div>
              <span className={labelCls}>Código de rastreo del comprador</span>

              {!confirmingRotate ? (
                <div className="space-y-2.5">
                  <p className="text-[13px] text-amber-100/70 leading-relaxed">
                    Regénéralo solo si el comprador reporta que su código o su
                    liga quedaron expuestos. El anterior deja de funcionar en el
                    acto.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      rotateMutation.reset();
                      setConfirmingRotate(true);
                    }}
                    className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 border border-amber-400/40 px-4 py-2 hover:text-amber-300 hover:border-amber-400/70 transition-colors cursor-pointer"
                  >
                    Regenerar código de rastreo
                  </button>

                  {/* La confirmación va inline y no en un toast de Sileo: el
                      Toaster vive en app/admin/layout.tsx, empata en z-index
                      con este modal y se pinta antes en el DOM, así que el
                      aviso quedaría detrás del backdrop justo cuando hace
                      falta leerlo. */}
                  {rotateMutation.isSuccess && (
                    <p
                      role="status"
                      className="text-[12px] text-emerald-400/90 leading-relaxed"
                    >
                      Listo: el código anterior quedó invalidado y le enviamos al
                      comprador un correo con el nuevo.
                    </p>
                  )}

                  {rotateMutation.isError && (
                    <p role="alert" className="text-[12px] text-red-400/90">
                      {rotateTokenErrorMessage(rotateMutation.error)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 border border-amber-400/25 bg-amber-400/5 rounded-md p-4">
                  <p className="text-[13px] text-amber-100/70 leading-relaxed">
                    El código y la liga que el comprador tiene hoy{" "}
                    <strong className="text-amber-200">
                      dejarán de funcionar
                    </strong>
                    . Le enviaremos por correo el código nuevo, así que hasta que
                    lo reciba no podrá consultar su pedido.
                  </p>

                  {rotateMutation.isError && (
                    <p role="alert" className="text-[12px] text-red-400/90">
                      {rotateTokenErrorMessage(rotateMutation.error)}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={rotateMutation.isPending}
                      onClick={() => rotateMutation.mutate()}
                      className="border border-amber-400/60 text-amber-400 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rotateMutation.isPending
                        ? "Regenerando…"
                        : "Confirmar y enviar código nuevo"}
                    </button>
                    <button
                      type="button"
                      disabled={rotateMutation.isPending}
                      onClick={() => {
                        setConfirmingRotate(false);
                        rotateMutation.reset();
                      }}
                      className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>

            {canCancel && (
              <>
                <div className="border-t border-stone-700/40" />
                <div>
                  <span className={labelCls}>
                    Cancelación / reembolso
                  </span>
                  {!confirmingCancel ? (
                    <button
                      type="button"
                      onClick={() => {
                        cancelMutation.reset();
                        setConfirmingCancel(true);
                      }}
                      className="text-[11px] uppercase tracking-[0.2em] text-red-400/80 border border-red-400/30 px-4 py-2 hover:text-red-300 hover:border-red-400/60 transition-colors cursor-pointer"
                    >
                      Cancelar / reembolsar pedido
                    </button>
                  ) : (
                    <div className="space-y-3 border border-red-400/30 bg-red-500/5 rounded-md p-4">
                      <p className="text-[13px] text-red-300 leading-relaxed">
                        {order.status === "paid"
                          ? "Se emitirá un reembolso total en Stripe y se restablecerá el stock. Esta acción es irreversible."
                          : "Se liberará el stock reservado y el pedido quedará cancelado. Esta acción es irreversible."}
                      </p>
                      <div>
                        <label
                          htmlFor="cancel-reason"
                          className={labelCls}
                        >
                          Motivo (opcional)
                        </label>
                        <textarea
                          id="cancel-reason"
                          value={cancelReason}
                          onChange={(e) =>
                            setCancelReason(e.target.value.slice(0, REASON_MAX))
                          }
                          maxLength={REASON_MAX}
                          rows={2}
                          placeholder="Ej. cliente pidió cancelar por WhatsApp"
                          className="w-full bg-stone-900 border border-amber-400/20 text-amber-50 text-sm font-sans px-3 py-2 rounded resize-none hover:border-amber-400/40 focus-visible:border-amber-400/60 transition-colors"
                        />
                        <span className="block text-right text-[10px] text-amber-100/30 mt-1">
                          {cancelReason.length}/{REASON_MAX}
                        </span>
                      </div>

                      {cancelMutation.isError && (
                        <p role="alert" className="text-[12px] text-red-400/90">
                          {cancelOrderErrorMessage(cancelMutation.error)}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate()}
                          className="bg-red-600/80 border border-red-500/80 text-amber-50 uppercase tracking-[0.2em] text-[10px] px-5 py-2.5 hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelMutation.isPending
                            ? "Cancelando…"
                            : "Confirmar cancelación"}
                        </button>
                        <button
                          type="button"
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            setConfirmingCancel(false);
                            setCancelReason("");
                            cancelMutation.reset();
                          }}
                          className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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
