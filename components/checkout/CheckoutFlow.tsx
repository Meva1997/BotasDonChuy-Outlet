"use client";

import { useCheckout } from "./CheckoutContext";
import Stepper from "./Stepper";
import OrderSummary from "./OrderSummary";
import UserDetails from "./UserDetails";
import Success from "./Success";

const HEADINGS = [
  {
    title: "Revisa los detalles de tu pedido",
    subtitle:
      "Confirma las piezas antes de continuar. Recuerda: estas piezas no tienen cambios ni devoluciones.",
  },
  {
    title: "¿A dónde enviamos tu pedido?",
    subtitle: "Completa tus datos de envío y pago para finalizar la compra.",
  },
  {
    title: "¡Listo!",
    subtitle: "Tu pago se realizó con éxito.",
  },
] as const;

export default function CheckoutFlow() {
  const { step, goTo } = useCheckout();
  const heading = HEADINGS[step];

  return (
    <div className="px-4 sm:px-6 py-12 sm:py-16">
      <Stepper current={step} onNavigate={goTo} />

      <header className="text-center max-w-xl mx-auto mt-12 mb-12 space-y-3">
        <h2 className="font-serif text-2xl sm:text-3xl text-amber-50">
          {heading.title}
        </h2>
        <p className="text-amber-100/50 text-sm leading-relaxed">
          {heading.subtitle}
        </p>
      </header>

      {step === 0 && <OrderSummary />}
      {step === 1 && <UserDetails />}
      {step === 2 && <Success />}
    </div>
  );
}
