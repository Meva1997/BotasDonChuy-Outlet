"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RefreshCw, ShoppingBag } from "lucide-react";
import { fadeUp } from "@/lib/ui/motion";
import { useCartStore } from "@/store/cartStore";
import {
  lookupOrder,
  lookupOrderErrorMessage,
  orderKeys,
} from "@/lib/api/orders";
import OrderTotals from "@/components/checkout/OrderTotals";
import OrderStatusTimeline from "./OrderStatusTimeline";
import TrackedOrderItems from "./TrackedOrderItems";

/** Fecha corta en es-MX ("3 de julio de 2026"). */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Página pública de seguimiento (Fase 17). El `token` de la URL ES la credencial:
 * `GET /api/orders/lookup/:token` no pide correo ni ningún otro dato.
 *
 * Sin `refetchInterval` a propósito: el estado de un pedido cambia en horas o días,
 * no en segundos, y el backend limita la ruta a 30 consultas por minuto por IP
 * pidiendo que cualquier refresco automático sea de un minuto para arriba. En su
 * lugar hay un botón manual (mismo patrón que la cabecera de `OrdersSection`) y
 * `refetchOnWindowFocus`, que cubre el caso real: volver a la pestaña al día
 * siguiente.
 */
/**
 * Cierra el checkout cuando el pago terminó FUERA del wizard.
 *
 * Con `redirect: "if_required"` el 3D Secure casi siempre sale en un modal y el
 * comprador nunca abandona `/checkout`, donde `completeOrder()` vacía el carrito
 * al confirmarse el cobro. Pero hay emisores que sí obligan a salir del sitio:
 * ese viaje se lleva por delante el estado del wizard (vive en memoria), y
 * Stripe devuelve al comprador aquí, al `return_url` — con el pago hecho y el
 * carrito intacto, como si no hubiera comprado nada.
 *
 * Este es el único punto donde ese camino se puede cerrar. Solo actúa con
 * `redirect_status=succeeded` (Stripe también devuelve `failed`, y ahí el
 * carrito debe seguir lleno para poder reintentar).
 *
 * Se lee de `window.location` y no con `useSearchParams()` a propósito: ese hook
 * suspende en prerender y obligaría a envolver la página en un <Suspense> que
 * hoy no necesita. Aquí no se renderiza nada con el valor — es un efecto de una
 * sola vez tras montar.
 */
function useCloseCheckoutOnPaymentReturn() {
  const clearCart = useCartStore((s) => s.clearCart);
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get(
      "redirect_status"
    );
    if (status === "succeeded") clearCart();
  }, [clearCart]);
}

export default function OrderTracking({ token }: { token: string }) {
  useCloseCheckoutOnPaymentReturn();

  const { data: order, error, isPending, isFetching, refetch } = useQuery({
    queryKey: orderKeys.lookup(token),
    queryFn: () => lookupOrder(token),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    // Un 404 es definitivo (el token no existe y no va a existir): reintentarlo
    // gastaría tres consultas del presupuesto para llegar al mismo mensaje.
    retry: false,
  });

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-xs tracking-[0.25em] uppercase text-amber-100/40 animate-pulse">
          Consultando tu pedido…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto px-6 py-24 flex flex-col items-center text-center gap-4"
      >
        {/* Mismo sello decorativo que `components/outlet/EmptyState.tsx`. */}
        <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg] mb-2">
          <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
            Sin resultados
          </span>
        </div>

        <h1 className="font-serif text-amber-50/70 text-2xl">
          No pudimos mostrar tu pedido
        </h1>
        {/* El `message` del backend tal cual: su 404 es el mismo para un token
            inexistente, alterado o mal formado —no revela cuál fue— y ya dice qué
            hacer. Inventar aquí un "token inválido" sería menos útil y filtraría
            justo lo que el backend calla. */}
        <p className="font-sans text-amber-100/40 text-sm leading-relaxed">
          {lookupOrderErrorMessage(error)}
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <Link
            href="/pedido"
            className="text-xs tracking-[0.2em] uppercase rounded-md border border-amber-500/40 text-amber-400 px-8 py-3 hover:bg-amber-500/10 transition-colors"
          >
            Buscar otro pedido
          </Link>
          <Link
            href="/outlet"
            className="text-xs tracking-[0.2em] uppercase rounded-md border border-amber-100/15 text-amber-100/50 px-8 py-3 hover:text-amber-100/80 transition-colors"
          >
            Volver a la tienda
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14 sm:py-20 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          {/* Aquí NO va el `#<id>` del pedido: es el consecutivo global de la
              tienda, no la referencia del comprador (la consulta pública es por
              token, justamente porque un id secuencial sería enumerable). En el
              panel sí se muestra — ahí es la forma en que el dueño nombra un
              pedido. */}
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-400/90">
            Seguimiento de pedido
          </p>
          <h1 className="font-serif text-3xl text-amber-50">
            Hola, {order.customerName.split(" ")[0]}
          </h1>
          <p className="text-xs text-amber-100/40">
            Realizado el {formatDay(order.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-amber-100/50 hover:text-amber-100/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCw
            width={14}
            height={14}
            aria-hidden="true"
            className={isFetching ? "animate-spin" : undefined}
          />
          Actualizar
        </button>
      </header>

      <OrderStatusTimeline order={order} />

      <section
        aria-labelledby="resumen-pedido"
        className="rounded-xl border border-amber-600/30 bg-linear-to-b from-stone-900/40 to-stone-900/10 p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-amber-600/30">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-amber-500/20 to-amber-600/5 border border-amber-600/30 text-amber-500 shrink-0">
            <ShoppingBag
              width={16}
              height={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>
          <h2 id="resumen-pedido" className="font-serif text-lg text-amber-50">
            Resumen de tu compra
          </h2>
        </div>

        <TrackedOrderItems items={order.items} />

        <div className="border-t border-amber-600/30 pt-5">
          {/* Los totales son los que el servidor congeló al comprar; el cupón se
              pinta solo si lo hubo (si no, el total no cuadraría con
              subtotal − savings + shipping y el faltante no tendría explicación). */}
          <OrderTotals
            totals={{
              subtotal: order.subtotal,
              savings: order.savings,
              shipping: order.shipping,
              total: order.total,
            }}
            discount={{
              code: order.couponCode ?? null,
              amount: order.couponDiscount ?? 0,
            }}
          />
        </div>

        <div className="border-t border-amber-600/30 pt-5">
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-2">
            Enviar a
          </p>
          {/* La dirección va aquí para que el comprador detecte a tiempo un dato
              mal capturado y lo corrija con la tienda antes de que salga. */}
          <address className="not-italic text-sm text-amber-100/70 leading-relaxed wrap-break-word">
            {order.customerName}
            <br />
            {order.shippingAddress.street}, {order.shippingAddress.neighborhood}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}, C.P.{" "}
            {order.shippingAddress.postalCode}
            {order.shippingAddress.references && (
              <>
                <br />
                <span className="text-amber-100/40">
                  Referencias: {order.shippingAddress.references}
                </span>
              </>
            )}
          </address>
        </div>
      </section>

      <p className="text-center text-xs text-amber-100/30 leading-relaxed">
        ¿Algo no cuadra? Escríbenos y lo revisamos contigo.
      </p>
    </div>
  );
}
