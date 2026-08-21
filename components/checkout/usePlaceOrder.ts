"use client";

import { useCallback, useState } from "react";
import type { Stripe, StripeElements } from "@stripe/stripe-js";
import { absoluteUrl } from "@/lib/seo/site";
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
  isCouponError,
  isIdempotencyKeyConflict,
  isRateExpiredError,
  placeOrderErrorMessage,
} from "./checkoutErrors";

type PlaceOrderStatus = "idle" | "processing";

/**
 * A dónde vuelve el comprador si el banco se lo lleva a autenticar fuera del
 * sitio (3D Secure con redirect). El destino es su propia página de
 * seguimiento: el wizard vive en memoria y no sobrevive a un viaje al dominio
 * del banco, así que devolverlo al checkout lo dejaría mirando un carrito y un
 * paso 1 como si nada hubiera pasado. `/pedido/<token>` sí sabe el estado real,
 * porque lo pregunta al backend.
 *
 * Sin `publicToken` (el backend lo manda siempre, pero el esquema lo declara
 * opcional) cae al buscador por código, que al menos es una salida.
 */
function paymentReturnUrl(order: OrderResponse): string {
  return order.publicToken
    ? absoluteUrl(`/pedido/${order.publicToken}`)
    : absoluteUrl("/pedido");
}

// Firma sobre todo lo que determina la orden en el backend: el carrito
// (productId + talla + cantidad), los datos del cliente, la tarifa de envío
// elegida y el cupón aplicado. Si cambia cualquiera, la orden pendiente cacheada
// ya no corresponde a lo que el usuario está pidiendo y se descarta (se crea una
// nueva). Incluir al cliente es lo que evita que, tras corregir la dirección
// después de un pago fallido, se reconfirme la orden vieja y se envíe a la
// dirección anterior; incluir la tarifa evita reconfirmar un PaymentIntent
// cotizado con una opción de envío distinta a la que el usuario acaba de elegir;
// e incluir el cupón (Fase 19) evita reconfirmar el pedido cacheado con el precio
// de antes de aplicarlo o quitarlo — que es justo el error que le cobraría al
// comprador un total distinto al que tiene en pantalla. De paso rota la clave de
// idempotencia, que se pide con esta misma firma: el backend también mete el
// `couponCode` en su huella, así que los dos criterios coinciden por
// construcción en vez de por coincidencia.
function orderSignature(
  items: CartItem[],
  customer: ShippingData,
  rate: SelectedShippingRate,
  couponCode: string | null
): string {
  const rateKey = `${rate.quotationId ?? "flat"}:${rate.rateId ?? "flat"}`;
  return `${cartLineSignature(items)}#${JSON.stringify(customer)}#${rateKey}#${
    couponCode ?? "sincupon"
  }`;
}

/**
 * Orquesta el checkout en tres fases:
 *   1. elements.submit() → valida el formulario de tarjeta del Payment Element.
 *   2. POST /api/orders → crea la orden y devuelve el `clientSecret` del PaymentIntent.
 *   3. stripe.confirmPayment({ elements, clientSecret }) → cobra la tarjeta capturada.
 *
 * El orden importa y no es el obvio. `elements.submit()` va PRIMERO —antes de
 * crear nada— porque crear la orden reserva stock: si el comprador le da a
 * "Pagar" con el formulario vacío o con un número inválido, un pedido nacido de
 * ese clic dejaría piezas apartadas para un pago que nunca ocurrió, hasta que
 * el barrido de órdenes pendientes las devolviera media hora después. Validar
 * primero cuesta una llamada local y evita todo eso.
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
  // El último error vino del cupón (Fase 19). Se expone en vez de quitar el
  // cupón aquí mismo: cambiar en silencio el precio que el comprador aceptó es
  // peor que pedirle un clic. ShippingOptions lo usa para ofrecer "Quitar cupón
  // y reintentar" junto al mensaje del backend.
  const [couponRejected, setCouponRejected] = useState(false);
  // El pago se envió pero Stripe todavía no dice "succeeded" (`processing`, o un
  // `requires_action` que sobrevivió a `redirect: "if_required"`). NO es un
  // error —el dinero puede estar en camino— y NO es un éxito: avanzar al paso 4
  // pintaría "Tu pago se realizó con éxito" sobre algo que aún no ocurrió, y
  // vaciar el carrito daría por cerrada una compra que podría no cerrarse.
  // Se guarda el token para mandar al comprador a su seguimiento, que sí sabe
  // el estado real, y se deja que el webhook concilie.
  //
  // Es un objeto y no un `string | null` porque el token PUEDE faltar (el
  // esquema lo declara opcional) y "pago en revisión sin enlace" no es lo mismo
  // que "no hay pago en revisión": aplanarlo devolvería el botón de pagar justo
  // en el caso donde más peligroso es volver a cobrarle.
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    token: string | null;
  } | null>(null);
  const {
    acceptedTerms,
    getPendingOrder,
    setPendingOrder,
    setSelectedRate,
    getIdempotencyKey,
    resetIdempotencyKey,
  } = useCheckout();
  const queryClient = useQueryClient();

  const placeOrder = useCallback(
    async (
      // `stripe` y `elements` llegan como argumentos en vez de salir de
      // `useStripe()`/`useElements()` aquí dentro: este hook se llama desde
      // ShippingOptions, que es quien MONTA el <Elements> (necesita el total, y
      // el total sale de sus propias queries). Un hook de contexto llamado por
      // encima del proveedor devolvería null siempre.
      stripe: Stripe,
      elements: StripeElements,
      items: CartItem[],
      customer: ShippingData,
      selectedRate: SelectedShippingRate,
      couponCode: string | null,
      onSuccess: (order: OrderResponse) => void
    ) => {
      // Constancia de aceptación (Fase 27). La casilla solo bloquea el botón del
      // paso 1, y `acceptedTerms` no se resetea al avanzar, así que quien
      // regresara por el Stepper y la desmarcara podía llegar hasta aquí. Esto
      // lo corta antes de crear el pedido, en espejo del 400 del backend.
      if (!acceptedTerms) {
        setStatus("idle");
        setError(
          "Necesitas aceptar los términos y condiciones para completar tu compra."
        );
        return;
      }
      setStatus("processing");
      setError(null);
      setCouponRejected(false);
      setPendingConfirmation(null);
      const signature = orderSignature(
        items,
        customer,
        selectedRate,
        couponCode
      );
      try {
        // 1. Validar la tarjeta capturada ANTES de crear nada. `elements.submit()`
        //    es local (no cobra ni contacta al banco): solo revisa el formulario
        //    y recoge lo que haga falta. Si falla, no llegamos a reservar stock.
        //
        //    Va dentro del try aunque solo devuelva errores por valor: si
        //    Stripe.js llegara a lanzar, fuera de aquí el `status` se quedaría en
        //    "processing" para siempre y el botón, clavado en "Procesando…".
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(
            submitError.message ??
              "Revisa los datos de tu tarjeta e inténtalo de nuevo."
          );
          setStatus("idle");
          return;
        }

        // 2. Crear la orden (o reusar la de un intento previo que falló en el
        //    pago, siempre que ni el carrito, los datos, la tarifa elegida ni el
        //    cupón hayan cambiado).
        let pending = getPendingOrder(signature);
        // Solo puede ser true si la orden se creó en ESTA pasada: una orden
        // servida del caché no trajo respuesta HTTP de la que leer el header.
        let replayed = false;
        if (!pending) {
          const res = await createOrder(
            buildOrderPayload(
              items,
              customer,
              selectedRate,
              couponCode,
              acceptedTerms
            ),
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

        // 3.a El backend nos devolvió un pedido que YA existía (header
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

        // 3.b Cobrar la tarjeta capturada en el Payment Element.
        //
        //     `redirect: "if_required"` mantiene al comprador en la página: el
        //     3D Secure de la mayoría de los emisores sale en un modal sobre el
        //     checkout. El `return_url` NO es opcional aunque casi nunca se use
        //     — es la red para el emisor que sí exige salir del sitio, y sin él
        //     ese pago fallaría en vez de autenticarse.
        const result = await stripe.confirmPayment({
          elements,
          clientSecret: pending.clientSecret,
          confirmParams: { return_url: paymentReturnUrl(pending.order) },
          redirect: "if_required",
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

        // Ni error ni `succeeded`: el pago sigue su curso (`processing`) o pide
        // una acción que `if_required` no pudo resolver aquí. Se deja el pedido
        // en el caché a propósito —existe y tiene stock reservado, así que un
        // reintento debe recaer en él y no crear otro— y se manda al comprador a
        // su seguimiento en vez de dejarlo pulsando "Pagar" contra un cobro que
        // quizá ya vaya en camino.
        setPendingConfirmation({ token: pending.order.publicToken ?? null });
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
        if (isCouponError(err)) {
          // El cupón dejó de aplicar entre el visto bueno de /validate y el
          // pago (se agotó, lo usó otro carrito del mismo correo, o el total
          // quedó bajo el mínimo cobrable). No se creó nada: el backend rechaza
          // dentro de la transacción, así que no hay pedido pendiente que
          // limpiar — solo hay que dejar de reintentar contra el mismo cupón.
          setCouponRejected(true);
        }
        setError(placeOrderErrorMessage(err));
        setStatus("idle");
      }
    },
    [
      acceptedTerms,
      getPendingOrder,
      setPendingOrder,
      setSelectedRate,
      getIdempotencyKey,
      resetIdempotencyKey,
      queryClient,
    ]
  );

  return { status, error, couponRejected, pendingConfirmation, placeOrder };
}
