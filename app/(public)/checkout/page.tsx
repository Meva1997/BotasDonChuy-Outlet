import { CheckoutProvider } from "@/components/checkout/CheckoutContext";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <CheckoutFlow />
    </CheckoutProvider>
  );
}
