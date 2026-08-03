/**
 * Traducción de `Order.shipmentStatus` (Fase 11): el string **crudo** que reporta
 * Skydropx, no un enum cerrado validado por el backend. Este diccionario cubre los
 * valores más comunes del carrier y cualquier otro cae a un fallback legible en vez
 * de mostrar la clave cruda o reventar.
 *
 * Vive en `lib/domain/` (y no en `components/admin/orders/StatusBadges.tsx`, donde
 * nació) porque desde la Fase 17 lo consumen DOS superficies con presentación
 * distinta: la píldora del panel (`ShipmentStatusBadge`) y la frase de la página
 * pública de seguimiento ("La paquetería reporta: …"). Con dos tablas paralelas,
 * agregar un estado en una y olvidarla en la otra le contaría al comprador algo
 * distinto de lo que ve el dueño; con una sola no puede pasar. Además, el
 * storefront no debe importar de `components/admin/`.
 */
export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pre_transit: "Guía generada",
  label_created: "Guía generada",
  in_transit: "En tránsito",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  exception: "Incidencia",
  failure: "Incidencia",
  cancelled: "Cancelado",
};

/** `out_for_delivery` → "Out for delivery": legible aunque no esté en la tabla. */
function fallbackShipmentLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Etiqueta en español del estado del envío, con fallback para lo no mapeado. */
export function shipmentStatusLabel(raw: string): string {
  return SHIPMENT_STATUS_LABELS[raw.toLowerCase()] ?? fallbackShipmentLabel(raw);
}

/** True si el estado viene de la tabla (no es un fallback improvisado). */
export function isKnownShipmentStatus(raw: string): boolean {
  return raw.toLowerCase() in SHIPMENT_STATUS_LABELS;
}
