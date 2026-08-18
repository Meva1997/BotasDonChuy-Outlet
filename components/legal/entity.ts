import { BRAND } from "@/lib/domain/brand";

/**
 * Datos del responsable legal, compartidos por los tres documentos (Términos,
 * Privacidad, Envíos). Viven aquí y no duplicados en cada archivo porque son
 * exactamente el tipo de dato que se corrige en un documento y se olvida en los
 * otros dos — y una discrepancia entre dos documentos vinculantes se interpreta
 * a favor del consumidor.
 *
 * ⚠️ Los campos `PENDIENTE` deben completarse con los datos fiscales reales
 * ANTES de publicar. Se dejan como texto visible a propósito: la LFPDPPP
 * (art. 16 fr. I) exige nombre y domicilio del responsable en el aviso de
 * privacidad, y los Términos necesitan identificar a la parte contratante. Un
 * placeholder visible en pantalla es preferible a un aviso que aparenta estar
 * completo sin estarlo.
 */
export const LEGAL_ENTITY = {
  /** Nombre comercial con el que opera la tienda. */
  tradeName: BRAND.name,
  /** Razón social (persona moral) o nombre completo del titular (persona física). */
  legalName: "[PENDIENTE: razón social o nombre del titular]",
  /** RFC del responsable. */
  taxId: "[PENDIENTE: RFC]",
  /** Domicilio fiscal / de atención. La tienda física opera en Celaya, Guanajuato. */
  address:
    "[PENDIENTE: calle, número, colonia y C.P.], Celaya, Guanajuato, México",
  /**
   * Canal oficial para reportes formales y para el ejercicio de derechos ARCO.
   * Instagram (el único contacto del Footer hoy) no sirve para esto: la ley pide
   * un medio en el que quede constancia.
   */
  email: BRAND.email,
  /** Plaza del domicilio del proveedor, para efectos de jurisdicción. */
  jurisdiction: "Celaya, Guanajuato",
} as const;
