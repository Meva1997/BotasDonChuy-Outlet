"use client";

import { motion } from "framer-motion";
import { Check, Clock, ExternalLink, XCircle } from "lucide-react";
import { fadeUp } from "@/lib/ui/motion";
import { shipmentStatusLabel } from "@/lib/domain/shipmentStatus";
import { isOwnOrderTrackingUrl } from "@/lib/domain/publicOrderToken";
import type { PublicOrder } from "@/lib/api/orders";
import { orderTimeline } from "./orderTimeline";

// El componente se llama distinto que el módulo puro (`orderTimeline.ts`) a
// propósito: en un sistema de archivos insensible a mayúsculas —el default de
// macOS— un `OrderTimeline.tsx` junto a un `orderTimeline.ts` deja el
// `import ... from "./orderTimeline"` a merced del orden de extensiones del
// bundler.

/** Fecha larga en es-MX ("3 de julio de 2026"). */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Aviso de una sola pieza: usado por los dos estados fuera de la línea. */
function Banner({
  icon,
  title,
  detail,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: "neutral" | "danger";
  children?: React.ReactNode;
}) {
  const accent =
    tone === "danger"
      ? "border-red-500/30 text-red-400"
      : "border-amber-500/30 text-amber-400";

  return (
    <div className={`rounded-xl border ${accent} bg-stone-900/40 p-6 sm:p-8`}>
      <div className="flex items-start gap-4">
        <span className="shrink-0 mt-0.5" aria-hidden="true">
          {icon}
        </span>
        <div className="space-y-2 min-w-0">
          <h2 className="font-serif text-xl text-amber-50">{title}</h2>
          <p className="text-sm text-amber-100/60 leading-relaxed wrap-break-word">
            {detail}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Encabezado de estado del pedido. Todas las ramas salen de `orderTimeline()`
 * (módulo puro, con specs) — aquí solo se pinta.
 *
 * `shipmentStatus` es el string CRUDO de la paquetería, no copia nuestra: por eso
 * va como detalle secundario bajo el paso en curso y atribuido ("La paquetería
 * reporta: …"), nunca como el título del estado. Lo traduce
 * `shipmentStatusLabel()`, la misma tabla que usa el panel.
 */
export default function OrderStatusTimeline({ order }: { order: PublicOrder }) {
  const timeline = orderTimeline(order);

  if (timeline.kind === "awaiting-payment") {
    return (
      <Banner
        tone="neutral"
        icon={<Clock width={22} height={22} strokeWidth={1.5} />}
        title={timeline.title}
        detail={timeline.detail}
      />
    );
  }

  if (timeline.kind === "cancelled") {
    return (
      <Banner
        tone="danger"
        icon={<XCircle width={22} height={22} strokeWidth={1.5} />}
        title={timeline.title}
        detail={timeline.detail}
      >
        {/* El reembolso tarda días hábiles en aparecer en el estado de cuenta, y
            esa es justo la siguiente pregunta del cliente. */}
        {timeline.refunded && (
          <p className="text-sm text-amber-100/50 leading-relaxed">
            {order.refundedAt
              ? `Emitimos el reembolso el ${formatDay(order.refundedAt)}. `
              : ""}
            Los bancos suelen tardar de 5 a 10 días hábiles en reflejarlo en tu
            estado de cuenta.
          </p>
        )}
      </Banner>
    );
  }

  const { steps, currentIndex } = timeline;
  const current = steps[currentIndex];

  // "Rastrear" promete el sitio de la paquetería. Un `trackingUrl` que apunta a
  // nuestra propia página de seguimiento (dato viejo del formulario manual, ver
  // `isOwnOrderTrackingUrl`) devolvería al comprador a donde ya está, así que no
  // se pinta el botón: sin él, la guía y la paquetería siguen siendo lo que
  // necesita para buscar por su cuenta.
  const carrierTrackingUrl =
    order.trackingUrl && !isOwnOrderTrackingUrl(order.trackingUrl)
      ? order.trackingUrl
      : null;
  const hasShippingInfo =
    !!order.shippingCarrier || !!order.trackingNumber || !!carrierTrackingUrl;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-amber-600/30 bg-stone-900/40 p-6 sm:p-8 space-y-6"
    >
      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
          Estado de tu pedido
        </p>
        <h2 className="font-serif text-2xl text-amber-50">{current.label}</h2>
        <p className="text-sm text-amber-100/60 leading-relaxed">
          {current.detail}
        </p>
      </div>

      {/* <ol> real: es una secuencia y el orden significa algo. */}
      <ol className="list-none">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const done = step.state === "done";
          const isCurrent = step.state === "current";

          return (
            <li key={step.key} className="flex gap-4">
              {/* Riel: marcador + tramo de línea hacia el siguiente paso */}
              <div className="flex flex-col items-center shrink-0">
                <span
                  aria-hidden="true"
                  className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                    done
                      ? "border-amber-500 bg-amber-500 text-stone-950"
                      : isCurrent
                        ? "border-amber-400 text-amber-400 bg-amber-400/10"
                        : "border-amber-100/15 text-amber-100/20"
                  }`}
                >
                  {done ? (
                    <Check width={13} height={13} strokeWidth={2.5} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`w-px flex-1 min-h-8 ${
                      done ? "bg-amber-500/50" : "bg-amber-100/10"
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 ${isLast ? "" : "pb-6"}`}>
                <p
                  className={`text-sm ${
                    isCurrent
                      ? "text-amber-400"
                      : done
                        ? "text-amber-100/70"
                        : "text-amber-100/25"
                  }`}
                >
                  {step.label}
                  {isCurrent && <span className="sr-only"> — paso actual</span>}
                </p>

                {/* El detalle de la paquetería solo tiene sentido junto al paso en
                    curso: es el estado de HOY, no el de ningún paso pasado. */}
                {isCurrent && order.shipmentStatus && (
                  <p className="text-xs text-amber-100/40 mt-1.5">
                    La paquetería reporta:{" "}
                    <span className="text-amber-100/70">
                      {shipmentStatusLabel(order.shipmentStatus)}
                    </span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasShippingInfo && (
        <div className="border-t border-amber-600/30 pt-5 space-y-3">
          {order.shippingCarrier && (
            <p className="text-xs text-amber-100/50">
              Paquetería:{" "}
              <span className="text-amber-100/80">{order.shippingCarrier}</span>
            </p>
          )}
          {order.trackingNumber && (
            <p className="text-xs text-amber-100/50">
              Guía:{" "}
              {/* Seleccionable: mucha gente la pega en el sitio del carrier. */}
              <span className="text-amber-100/80 select-all">
                {order.trackingNumber}
              </span>
            </p>
          )}
          {carrierTrackingUrl && (
            <a
              href={carrierTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase rounded-md border border-amber-500/40 text-amber-400 px-6 py-3 hover:bg-amber-500/10 transition-colors"
            >
              Rastrear
              <ExternalLink width={13} height={13} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
