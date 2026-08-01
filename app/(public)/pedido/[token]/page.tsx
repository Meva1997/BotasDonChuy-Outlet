import type { Metadata } from "next";
import OrderTracking from "@/components/pedido/OrderTracking";

// La ruta tiene que ser EXACTAMENTE ésta: es la que el backend construye en el
// correo de confirmación (`publicOrderUrl` en `../backend/src/services/payment.service.ts`).
// Si cambia aquí, hay que cambiarla allá — es la única URL del front que ese
// backend arma.
//
// `noindex` + el disallow de `/pedido` en `app/robots.ts`: el token ES la
// credencial del pedido y no debe acabar en ningún buscador. Las dos capas cubren
// agujeros distintos (robots.txt impide el crawl, el meta impide el índice).
export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  description: "Consulta el estado de tu pedido.",
  robots: { index: false, follow: false },
};

// Sin `loading.tsx` a propósito: esta página es `noindex`, así que no hay un
// status HTTP que cuidar (la razón por la que producto tampoco lo lleva, ver
// "Estados de carga" en CLAUDE.md), y el estado de carga lo pinta la propia query
// de OrderTracking.
export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <OrderTracking token={token} />;
}
