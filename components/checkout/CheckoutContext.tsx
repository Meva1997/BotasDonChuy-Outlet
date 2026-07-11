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
  acceptedTerms: boolean;
  setAcceptedTerms: (value: boolean) => void;
  order: CompletedOrder | null;
  goTo: (step: CheckoutStep) => void;
  goToReview: () => void;
  goToDetails: () => void;
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [order, setOrder] = useState<CompletedOrder | null>(null);

  const goTo = useCallback((target: CheckoutStep) => setStep(target), []);
  const goToReview = useCallback(() => setStep(0), []);
  const goToDetails = useCallback(() => setStep(1), []);

  // Caché de la orden creada en el backend a la espera de que el pago se
  // confirme. Vive en el contexto (no en el ref de UserDetails) para sobrevivir
  // a "Volver al resumen": remontar el formulario perdería el caché y el
  // siguiente submit crearía una orden pendiente DUPLICADA. Se guarda con la
  // firma del carrito que la originó para invalidarla si el carrito cambió.
  const pendingOrderRef = useRef<{
    signature: string;
    pending: PendingOrder;
  } | null>(null);

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
      setStep(2);
    },
    []
  );

  const value = useMemo(
    () => ({
      step,
      acceptedTerms,
      setAcceptedTerms,
      order,
      goTo,
      goToReview,
      goToDetails,
      getPendingOrder,
      setPendingOrder,
      completeOrder,
    }),
    [
      step,
      acceptedTerms,
      order,
      goTo,
      goToReview,
      goToDetails,
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
