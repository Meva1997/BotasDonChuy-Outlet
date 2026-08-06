import type { Metadata } from "next";
import OrderLookupForm from "@/components/order/OrderLookupForm";

// Entrada al seguimiento sin token: es lo que enlaza el Footer desde todas las
// páginas. `noindex` igual que `/pedido/[token]` — no es contenido de la tienda y
// no queremos que un buscador la use como puerta a los tokens.
export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  description: "Consulta el estado de tu pedido con el enlace de tu correo.",
  robots: { index: false, follow: false },
};

export default function OrderLookupPage() {
  return <OrderLookupForm />;
}
