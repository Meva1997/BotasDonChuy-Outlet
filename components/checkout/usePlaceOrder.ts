"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import { getStripe } from "@/lib/stripe/client";
import {
  createOrder,
  buildOrderPayload,
  OrderResponseParseError,
  type OrderResponse,
} from "@/lib/api/orders";
import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";
import { useCheckout } from "./CheckoutContext";

// PaymentMethod de PRUEBA de Stripe (equivale a la tarjeta 4242 4242 4242 4242).
// Todo corre en sandbox: no se capturan datos de tarjeta, se confirma el
// PaymentIntent con este token hardcodeado. Al pasar a producción se sustituye
// por captura real (Stripe Elements / <PaymentElement>).
const TEST_PAYMENT_METHOD = "pm_card_visa";

type PlaceOrderStatus = "idle" | "processing";

// Firma del carrito sobre los mismos campos que determinan la orden en el
// backend (productId + talla + cantidad). Si cambia, la orden pendiente
// cacheada ya no corresponde al carrito y se descarta (se crea una nueva).
function cartSignature(items: CartItem[]): string {
  return items
    .map((item) => `${item.product.id}:${item.size}:${item.quantity}`)
    .join("|");
}

// Traduce un error del flujo de pedido/pago en un mensaje para el usuario.
function placeOrderErrorMessage(error: unknown): string {
  // El pedido SÍ se creó (2xx) pero la respuesta no validó: reintentar lo
  // duplicaría. Se le indica explícitamente que no lo reenvíe.
  if (error instanceof OrderResponseParseError)
    return "Tu pedido se registró correctamente, pero no pudimos mostrar la confirmación. No vuelvas a enviarlo; te contactaremos para confirmar los detalles.";
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 409)
      return (
        message ??
        "Uno o más artículos se quedaron sin stock. Revisa tu carrito."
      );
    if (error.response?.status === 400)
      return "Revisa los datos del pedido e inténtalo de nuevo.";
  }
  return "No pudimos completar tu pedido. Inténtalo de nuevo.";
}

/**
 * Orquesta el checkout en dos fases:
 *   1. POST /api/orders → crea la orden y devuelve el `clientSecret` del PaymentIntent.
 *   2. stripe.confirmCardPayment(clientSecret, pm_card_visa) → confirma el pago (sandbox).
 *
 * La orden creada se cachea en el CheckoutContext (no en un ref local): si el
 * pago falla y el usuario reintenta —incluso tras "Volver al resumen" y regresar,
 * que remonta este hook— se re-confirma la MISMA orden en lugar de crear una
 * duplicada. El caché se invalida si el carrito cambió (firma distinta). Solo
 * tras un `succeeded` se llama `onSuccess` (que congela el snapshot y avanza de
 * paso). El estado `paid` real lo concilia el webhook del backend de forma asíncrona.
 */
export function usePlaceOrder() {
  const [status, setStatus] = useState<PlaceOrderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { getPendingOrder, setPendingOrder } = useCheckout();

  const placeOrder = useCallback(
    async (
      items: CartItem[],
      customer: ShippingData,
      onSuccess: (order: OrderResponse) => void
    ) => {
      setStatus("processing");
      setError(null);
      const signature = cartSignature(items);
      try {
        // 1. Crear la orden (o reusar la de un intento previo que falló en el
        //    pago, siempre que el carrito no haya cambiado desde entonces).
        let pending = getPendingOrder(signature);
        if (!pending) {
          const res = await createOrder(buildOrderPayload(items, customer));
          if (!res.clientSecret) {
            setError(
              "Los pagos no están disponibles en este momento. Inténtalo más tarde."
            );
            setStatus("idle");
            return;
          }
          pending = { order: res.order, clientSecret: res.clientSecret };
          setPendingOrder(signature, pending);
        }

        // 2. Confirmar el pago con Stripe.js usando la tarjeta de prueba.
        const stripePromise = getStripe();
        if (!stripePromise) {
          setError(
            "La pasarela de pago no está configurada. Inténtalo más tarde."
          );
          setStatus("idle");
          return;
        }
        const stripe = await stripePromise;
        if (!stripe) {
          setError(
            "No pudimos cargar la pasarela de pago. Revisa tu conexión e inténtalo de nuevo."
          );
          setStatus("idle");
          return;
        }

        const result = await stripe.confirmCardPayment(pending.clientSecret, {
          payment_method: TEST_PAYMENT_METHOD,
        });

        if (result.error) {
          setError(
            result.error.message ??
              "No pudimos procesar el pago. Inténtalo de nuevo."
          );
          setStatus("idle");
          return;
        }

        if (result.paymentIntent?.status === "succeeded") {
          setPendingOrder(signature, null);
          // No reseteamos el estado: al avanzar de paso, el formulario se desmonta.
          onSuccess(pending.order);
          return;
        }

        // Estado inesperado (p. ej. requires_action; no ocurre con pm_card_visa).
        setError(
          "El pago quedó pendiente de confirmación. Inténtalo de nuevo."
        );
        setStatus("idle");
      } catch (err) {
        setError(placeOrderErrorMessage(err));
        setStatus("idle");
      }
    },
    [getPendingOrder, setPendingOrder]
  );

  return { status, error, placeOrder };
}
