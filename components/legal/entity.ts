import { BRAND } from "@/lib/domain/brand";

/**
 * Datos del responsable legal, compartidos por los tres documentos (Términos,
 * Privacidad, Envíos). Viven aquí y no duplicados en cada archivo porque son
 * exactamente el tipo de dato que se corrige en un documento y se olvida en los
 * otros dos — y una discrepancia entre dos documentos vinculantes se interpreta
 * a favor del consumidor.
 *
 * Si alguno de estos datos vuelve a quedar pendiente, déjalo como texto visible
 * en pantalla (`[PENDIENTE: …]`) en lugar de omitirlo: la LFPDPPP (art. 16
 * fr. I) exige nombre y domicilio del responsable en el aviso de privacidad, y
 * los Términos necesitan identificar a la parte contratante. Un aviso que
 * aparenta estar completo sin estarlo es peor que uno con un hueco a la vista.
 */
export const LEGAL_ENTITY = {
  /** Nombre comercial con el que opera la tienda. */
  tradeName: BRAND.name,
  /** Razón social (persona moral) o nombre completo del titular (persona física). */
  legalName: "Alejandro Medina Valenzuela",
  /** RFC del responsable. */
  taxId: "MEVA9707024Z0",
  /** Domicilio fiscal / de atención. La tienda física opera en Celaya, Guanajuato. */
  address: "Allende # 202, Centro, C.P. 38000, Celaya, Guanajuato, México",
  /**
   * Canal oficial para reportes formales y para el ejercicio de derechos ARCO.
   * Instagram (el único contacto del Footer hoy) no sirve para esto: la ley pide
   * un medio en el que quede constancia.
   */
  email: BRAND.email,
  /** Plaza del domicilio del proveedor, para efectos de jurisdicción. */
  jurisdiction: "Celaya, Guanajuato",
} as const;

/**
 * Versión vigente de los tres documentos legales (Términos, Privacidad, Envíos).
 *
 * Sirve para dos cosas a la vez, y por eso es una sola constante: alimenta el
 * "Última actualización" que se imprime en los tres encabezados, y viaja en cada
 * `POST /api/orders` para quedar guardada en el pedido como constancia de QUÉ
 * texto aceptó el comprador. Términos §15 y Privacidad §13 prometen que aplica
 * "la versión vigente al momento de la transacción"; sin esto, esa versión solo
 * existiría en el historial de git, que no dice qué vio *este* comprador.
 *
 * **Al editar cualquiera de los tres documentos, actualizar esta fecha.** Se
 * versionan juntos porque el checkout los acepta en un solo acto: no hay forma
 * de aceptar los Términos de agosto con el Aviso de julio.
 *
 * Formato ISO porque es lo que viaja al backend (que valida `YYYY-MM-DD`).
 */
export const LEGAL_VERSION = "2026-08-19";

/**
 * `LEGAL_VERSION` en prosa, para el encabezado de los documentos: "18 de agosto
 * de 2026". Se deriva de la constante en vez de mantenerse aparte para que la
 * fecha que se imprime y la que se guarda en el pedido no puedan divergir.
 *
 * El `timeZone: "UTC"` **no es opcional**: `new Date("2026-08-18")` se parsea
 * como medianoche UTC, así que sin fijar la zona el formateo en México (UTC-6)
 * imprimiría *17* de agosto. Es el mismo corrimiento de día que `storeDayISO()`
 * resuelve para las fechas de cupones.
 */
export function legalVersionLabel(version: string = LEGAL_VERSION): string {
  return new Date(`${version}T00:00:00Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
