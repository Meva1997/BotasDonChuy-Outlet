import type { Metadata } from "next";
import { CheckoutProvider } from "@/components/checkout/CheckoutContext";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finaliza tu compra en Botas Don Chuy Outlet.",
  // El checkout es un flujo transaccional con datos del cliente, no contenido:
  // no debe aparecer en resultados de búsqueda.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <CheckoutFlow />
    </CheckoutProvider>
  );
}
