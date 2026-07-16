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

export const CHECKOUT_STEPS = ["Resumen", "Datos de envío", "Confirmación"] as const;
export type CheckoutStep = 0 | 1 | 2;

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
      visit(2);
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
