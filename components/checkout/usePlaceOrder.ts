"use client";

import { useCallback, useState } from "react";
import { getStripe } from "@/lib/stripe/client";
import {
  createOrder,
  buildOrderPayload,
  type OrderResponse,
} from "@/lib/api/orders";
import { shippingKeys, type SelectedShippingRate } from "@/lib/api/shipping";
import { cartLineSignature, shippingSignature } from "@/lib/domain/cart";
import { useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "@/store/cartStore";
import type { ShippingData } from "@/schemas/checkout";
import { useCheckout } from "./CheckoutContext";
import {
  isIdempotencyKeyConflict,
  isRateExpiredError,
  placeOrderErrorMessage,
} from "./checkoutErrors";

// PaymentMethod de PRUEBA de Stripe (equivale a la tarjeta 4242 4242 4242 4242).
// Todo corre en sandbox: no se capturan datos de tarjeta, se confirma el
// PaymentIntent con este token hardcodeado. Al pasar a producción se sustituye
// por captura real (Stripe Elements / <PaymentElement>).
const TEST_PAYMENT_METHOD = "pm_card_visa";

type PlaceOrderStatus = "idle" | "processing";

// Firma sobre todo lo que determina la orden en el backend: el carrito
// (productId + talla + cantidad), los datos del cliente y la tarifa de envío
// elegida. Si cambia cualquiera, la orden pendiente cacheada ya no corresponde
// a lo que el usuario está pidiendo y se descarta (se crea una nueva). Incluir
// al cliente es lo que evita que, tras corregir la dirección después de un pago
// fallido, se reconfirme la orden vieja y se envíe a la dirección anterior;
// incluir la tarifa evita reconfirmar un PaymentIntent cotizado con una opción
// de envío distinta a la que el usuario acaba de elegir.
function orderSignature(
  items: CartItem[],
  customer: ShippingData,
  rate: SelectedShippingRate
): string {
  const rateKey = `${rate.quotationId ?? "flat"}:${rate.rateId ?? "flat"}`;
  return `${cartLineSignature(items)}#${JSON.stringify(customer)}#${rateKey}`;
}

/**
 * Orquesta el checkout en dos fases:
 *   1. POST /api/orders → crea la orden y devuelve el `clientSecret` del PaymentIntent.
 *   2. stripe.confirmCardPayment(clientSecret, pm_card_visa) → confirma el pago (sandbox).
 *
 * La orden creada se cachea en el CheckoutContext (no en un ref local): si el
 * pago falla y el usuario reintenta —incluso tras "Volver al resumen" y regresar,
 * que remonta este hook— se re-confirma la MISMA orden en lugar de crear una
 * duplicada. El caché se invalida si cambió el carrito, los datos del cliente,
 * o la tarifa de envío elegida (firma distinta), en cuyo caso se crea una
 * orden nueva y correcta. Solo
 * tras un `succeeded` se llama `onSuccess` (que congela el snapshot y avanza de
 * paso). El estado `paid` real lo concilia el webhook del backend de forma asíncrona.
 *
 * Ese caché protege del reintento que pasa por aquí. La `Idempotency-Key`
 * (Fase 15) protege del que NO pasa: un doble clic que dispara dos peticiones
 * antes de que la primera responda, o el reintento automático del navegador.
 * Se pide con la misma firma, así que rota exactamente cuando el intento de
 * compra deja de ser el mismo.
 */
export function usePlaceOrder() {
  const [status, setStatus] = useState<PlaceOrderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const {
    getPendingOrder,
    setPendingOrder,
    setSelectedRate,
    getIdempotencyKey,
    resetIdempotencyKey,
  } = useCheckout();
  const queryClient = useQueryClient();

  const placeOrder = useCallback(
    async (
      items: CartItem[],
      customer: ShippingData,
      selectedRate: SelectedShippingRate,
      onSuccess: (order: OrderResponse) => void
    ) => {
      setStatus("processing");
      setError(null);
      const signature = orderSignature(items, customer, selectedRate);
      try {
        // 1. Crear la orden (o reusar la de un intento previo que falló en el
        //    pago, siempre que ni el carrito, los datos, ni la tarifa elegida
        //    hayan cambiado).
        let pending = getPendingOrder(signature);
        // Solo puede ser true si la orden se creó en ESTA pasada: una orden
        // servida del caché no trajo respuesta HTTP de la que leer el header.
        let replayed = false;
        if (!pending) {
          const res = await createOrder(
            buildOrderPayload(items, customer, selectedRate),
            // Misma clave mientras el intento de compra sea el mismo (la firma
            // no cambió): es lo que convierte un doble clic o un reintento del
            // navegador en un solo pedido con un solo cobro.
            getIdempotencyKey(signature)
          );
          replayed = res.replayed;
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

        // 2.b El backend nos devolvió un pedido que YA existía (header
        //     `Idempotency-Replayed`), no uno nuevo: su PaymentIntent puede
        //     estar cobrado desde el intento anterior. Confirmarlo otra vez
        //     devuelve un error de Stripe que le diría al comprador que su pago
        //     falló cuando en realidad ya se hizo — y lo empujaría a reintentar.
        //     Se consulta el estado real antes de tocarlo.
        if (replayed) {
          const { paymentIntent } = await stripe.retrievePaymentIntent(
            pending.clientSecret
          );
          if (paymentIntent?.status === "succeeded") {
            setPendingOrder(signature, null);
            onSuccess(pending.order);
            return;
          }
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
        if (isRateExpiredError(err)) {
          // La tarifa cotizada ya no es válida (Skydropx la olvidó a las
          // 24 h): la orden pendiente cacheada quedó con ese total viejo y la
          // selección hecha en ShippingOptions ya no sirve — se limpian ambas.
          // Limpiar la selección NO basta: la query de tarifas sigue guardando
          // la MISMA quotationId caducada, así que ShippingOptions la volvería
          // a elegir (auto-select de tarifa única) o el usuario la re-elegiría
          // y caería en el mismo 409. Se invalida la query para forzar una
          // cotización nueva de verdad, en vez de reintentar en bucle.
          setPendingOrder(signature, null);
          setSelectedRate(shippingSignature(items, customer), null);
          queryClient.invalidateQueries({
            queryKey: shippingKeys.rates(items, customer),
          });
        }
        if (isIdempotencyKeyConflict(err)) {
          // La clave que mandamos quedó asociada a otro carrito en el backend:
          // reintentar con la misma da este mismo 409 para siempre. Se descarta
          // para que el siguiente clic genere una nueva. Nada se persistió (el
          // backend rechaza antes de crear), así que no hay pedido que limpiar.
          resetIdempotencyKey();
        }
        setError(placeOrderErrorMessage(err));
        setStatus("idle");
      }
    },
    [
      getPendingOrder,
      setPendingOrder,
      setSelectedRate,
      getIdempotencyKey,
      resetIdempotencyKey,
      queryClient,
    ]
  );

  return { status, error, placeOrder };
}
