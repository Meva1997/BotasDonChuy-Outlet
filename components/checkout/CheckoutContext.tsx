"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCartStore, type CartItem } from "@/store/cartStore";
import type { CartTotals } from "@/lib/domain/cart";
import type { ShippingData } from "@/schemas/checkout";
import type { OrderResponse } from "@/lib/api/orders";
import type { SelectedShippingRate } from "@/lib/api/shipping";

export const CHECKOUT_STEPS = ["Resumen", "Dirección", "Envío", "Confirmación"] as const;
export type CheckoutStep = 0 | 1 | 2 | 3;

/** Orden creada en el backend a la espera de que el pago se confirme. */
export interface PendingOrder {
  order: OrderResponse;
  clientSecret: string;
}

/** Copia congelada del pedido, conservada después de vaciar el carrito. */
export interface CompletedOrder {
  /** Nº de pedido real que devuelve el backend (order.id). */
  orderId: number;
  items: CartItem[];
  /** Totales autoritativos recalculados por el servidor. */
  totals: CartTotals;
  customer: ShippingData;
}

interface CheckoutContextValue {
  step: CheckoutStep;
  /** Paso más avanzado al que se ha llegado; el Stepper deja saltar hasta aquí. */
  maxVisitedStep: CheckoutStep;
  acceptedTerms: boolean;
  setAcceptedTerms: (value: boolean) => void;
  order: CompletedOrder | null;
  goTo: (step: CheckoutStep) => void;
  goToReview: () => void;
  goToDetails: () => void;
  /** Devuelve lo último capturado en el formulario de envío (sin validar), o `null`. */
  getShippingDraft: () => Partial<ShippingData> | null;
  /** Guarda el borrador del formulario de envío para resembrarlo al remontarlo. */
  setShippingDraft: (data: Partial<ShippingData>) => void;
  /** Dirección VALIDADA por UserDetails (paso 1); lo que ShippingOptions cotiza. */
  confirmedCustomer: ShippingData | null;
  /** Guarda la dirección validada, invalida la tarifa elegida y avanza al paso de envío. */
  confirmShipping: (customer: ShippingData) => void;
  /** Devuelve la tarifa elegida solo si corresponde al carrito+cliente actual (misma firma). */
  getSelectedRate: (signature: string) => SelectedShippingRate | null;
  /** Cachea (o limpia, con `null`) la tarifa de envío elegida junto a su firma. */
  setSelectedRate: (signature: string, rate: SelectedShippingRate | null) => void;
  /** Devuelve la orden pendiente cacheada solo si corresponde al carrito actual (misma firma). */
  getPendingOrder: (signature: string) => PendingOrder | null;
  /** Cachea (o limpia, con `null`) la orden pendiente junto a la firma del carrito que la originó. */
  setPendingOrder: (signature: string, pending: PendingOrder | null) => void;
  /** Congela el pedido creado por el backend, vacía el carrito y avanza a la confirmación. */
  completeOrder: (customer: ShippingData, order: OrderResponse) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<CheckoutStep>(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState<CheckoutStep>(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [order, setOrder] = useState<CompletedOrder | null>(null);

  // Avanzar de paso también amplía hasta dónde puede saltar el Stepper.
  const visit = useCallback((target: CheckoutStep) => {
    setStep(target);
    setMaxVisitedStep((max) => (target > max ? target : max));
  }, []);

  const goTo = useCallback((target: CheckoutStep) => visit(target), [visit]);
  const goToReview = useCallback(() => setStep(0), []);
  const goToDetails = useCallback(() => visit(1), [visit]);

  // Caché de la orden creada en el backend a la espera de que el pago se
  // confirme. Vive en el contexto (no en el ref de UserDetails) para sobrevivir
  // a "Volver al resumen": remontar el formulario perdería el caché y el
  // siguiente submit crearía una orden pendiente DUPLICADA. Se guarda con la
  // firma del carrito que la originó para invalidarla si el carrito cambió.
  const pendingOrderRef = useRef<{
    signature: string;
    pending: PendingOrder;
  } | null>(null);

  // Borrador del formulario de envío. Vive aquí (y no en UserDetails) porque el
  // flujo desmonta el paso al navegar: react-hook-form destruiría su estado y el
  // usuario tendría que retipear todo al volver. Es un ref y no state porque
  // nadie re-renderiza con él: solo se lee al montar, para los `defaultValues`.
  const shippingDraftRef = useRef<Partial<ShippingData> | null>(null);

  const getShippingDraft = useCallback(() => shippingDraftRef.current, []);

  const setShippingDraft = useCallback((data: Partial<ShippingData>) => {
    shippingDraftRef.current = data;
  }, []);

  // Dirección VALIDADA (a diferencia del draft de arriba) capturada al enviar
  // el formulario de paso 1. Es state (no ref) porque ShippingOptions —un
  // componente hermano montado por separado— debe re-renderizar en cuanto
  // exista, para poder cotizar contra ella.
  const [confirmedCustomer, setConfirmedCustomer] = useState<ShippingData | null>(
    null
  );

  // Tarifa de envío elegida en ShippingOptions, cacheada por firma
  // (carrito+cliente) con el mismo criterio que `pendingOrderRef` de abajo,
  // pero como state: a diferencia de la orden pendiente, la selección debe
  // reflejarse visualmente (tarjeta resaltada, total actualizado).
  const [selectedRateEntry, setSelectedRateEntry] = useState<{
    signature: string;
    rate: SelectedShippingRate;
  } | null>(null);

  const getSelectedRate = useCallback(
    (signature: string): SelectedShippingRate | null =>
      selectedRateEntry && selectedRateEntry.signature === signature
        ? selectedRateEntry.rate
        : null,
    [selectedRateEntry]
  );

  const setSelectedRate = useCallback(
    (signature: string, rate: SelectedShippingRate | null) => {
      setSelectedRateEntry(rate ? { signature, rate } : null);
    },
    []
  );

  // Guarda la dirección validada y avanza a elegir método de envío. Cualquier
  // tarifa elegida antes se invalida sin condición: una dirección nueva (o
  // reenviada) puede cotizar distinto — se re-cotiza siempre en el paso
  // siguiente en vez de arriesgar un envío mostrado con una tarifa que ya no
  // corresponde al destino.
  const confirmShipping = useCallback(
    (customer: ShippingData) => {
      setConfirmedCustomer(customer);
      setSelectedRateEntry(null);
      visit(2);
    },
    [visit]
  );

  const getPendingOrder = useCallback(
    (signature: string): PendingOrder | null => {
      const cached = pendingOrderRef.current;
      return cached && cached.signature === signature ? cached.pending : null;
    },
    []
  );

  const setPendingOrder = useCallback(
    (signature: string, pending: PendingOrder | null) => {
      pendingOrderRef.current = pending ? { signature, pending } : null;
    },
    []
  );

  const completeOrder = useCallback(
    (customer: ShippingData, order: OrderResponse) => {
      const { items, clearCart } = useCartStore.getState();
      // Los items locales alimentan el detalle visual (imagen/nombre); los totales
      // vienen del servidor (autoridad de precios), no de un recálculo en cliente.
      setOrder({
        orderId: order.id,
        items,
        totals: {
          subtotal: order.subtotal,
          savings: order.savings,
          shipping: order.shipping,
          total: order.total,
        },
        customer,
      });
      clearCart();
      // El pedido ya está congelado arriba: el borrador solo dejaría datos
      // personales en memoria sin uso.
      shippingDraftRef.current = null;
      visit(3);
    },
    [visit]
  );

  const value = useMemo(
    () => ({
      step,
      maxVisitedStep,
      acceptedTerms,
      setAcceptedTerms,
      order,
      goTo,
      goToReview,
      goToDetails,
      getShippingDraft,
      setShippingDraft,
      confirmedCustomer,
      confirmShipping,
      getSelectedRate,
      setSelectedRate,
      getPendingOrder,
      setPendingOrder,
      completeOrder,
    }),
    [
      step,
      maxVisitedStep,
      acceptedTerms,
      order,
      goTo,
      goToReview,
      goToDetails,
      getShippingDraft,
      setShippingDraft,
      confirmedCustomer,
      confirmShipping,
      getSelectedRate,
      setSelectedRate,
      getPendingOrder,
      setPendingOrder,
      completeOrder,
    ]
  );

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error("useCheckout debe usarse dentro de <CheckoutProvider>");
  }
  return ctx;
}
