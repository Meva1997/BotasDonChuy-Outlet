"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useCartStore, type CartItem } from "@/store/cartStore";
import { computeTotals, type CartTotals } from "@/lib/cart";
import type { ShippingData } from "@/schemas/checkout";

export const CHECKOUT_STEPS = ["Resumen", "Datos de envío", "Confirmación"] as const;
export type CheckoutStep = 0 | 1 | 2;

/** Copia congelada del pedido, conservada después de vaciar el carrito. */
export interface CompletedOrder {
  items: CartItem[];
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
  /** Congela el carrito, lo vacía y avanza a la confirmación. */
  completeOrder: (customer: ShippingData) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<CheckoutStep>(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [order, setOrder] = useState<CompletedOrder | null>(null);

  const goTo = useCallback((target: CheckoutStep) => setStep(target), []);
  const goToReview = useCallback(() => setStep(0), []);
  const goToDetails = useCallback(() => setStep(1), []);

  const completeOrder = useCallback((customer: ShippingData) => {
    const { items, clearCart } = useCartStore.getState();
    setOrder({ items, totals: computeTotals(items), customer });
    clearCart();
    setStep(2);
  }, []);

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
