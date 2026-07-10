"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useCartStore, type CartItem } from "@/store/cartStore";
import type { CartTotals } from "@/lib/domain/cart";
import type { ShippingData } from "@/schemas/checkout";
import type { OrderResponse } from "@/lib/api/orders";

export const CHECKOUT_STEPS = ["Resumen", "Datos de envío", "Confirmación"] as const;
export type CheckoutStep = 0 | 1 | 2;

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
      completeOrder,
    }),
    [step, acceptedTerms, order, goTo, goToReview, goToDetails, completeOrder]
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
