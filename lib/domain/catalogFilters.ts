/**
 * Filtros del catálogo público (Fase 18): lectura y saneo de los query params que
 * `/outlet` (y las tres rutas de categoría) traducen a `GET /api/products`.
 * Módulo puro, con specs.
 *
 * Espejo en cliente de las reglas del controlador del backend
 * (`../backend/src/controllers/product.controller.ts`), que **ignora en silencio**
 * cualquier valor inválido y nunca responde 400 en estos campos. Aquí NO se
 * inventan mensajes de validación: un parámetro basura simplemente no viaja.
 *
 * Por qué normalizar en el front si el backend ya lo hace: lo que se lee de la URL
 * entra al `queryKey` de TanStack Query. Sin esta capa, `?orden=basura` y
 * `?orden=otracosa` serían dos entradas de caché distintas devolviendo exactamente
 * el mismo catálogo; colapsarlas a `undefined` las convierte en una sola.
 *
 * Vive en `lib/domain/` y no junto a `OutletFilters.tsx` a propósito: un
 * `outletFilters.ts` al lado de `OutletFilters.tsx` deja el import a merced del
 * orden de extensiones del bundler en un FS insensible a mayúsculas (macOS) —
 * la misma trampa que separa `OrderStatusTimeline.tsx` de `orderTimeline.ts`.
 */

/** Largo máximo de `?q=`. Espejo de `MAX_SEARCH_LENGTH` del backend. */
export const MAX_SEARCH_LENGTH = 100;

/** Los tres órdenes que el backend reconoce. Sin `orden`, lista por id ascendente. */
export type CatalogOrden = "precio_asc" | "precio_desc" | "novedad";

/**
 * Opciones del selector de orden, en el orden en que se pintan. La opción por
 * defecto (sin `orden`) no vive aquí: es el `<option value="">` del select.
 */
export const ORDEN_OPTIONS = [
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "novedad", label: "Lo más nuevo" },
] as const satisfies readonly { value: CatalogOrden; label: string }[];

const ORDEN_VALUES: readonly string[] = ORDEN_OPTIONS.map((o) => o.value);

/**
 * Término de búsqueda. Recorta espacios y aplica el mismo tope de 100 caracteres
 * que el backend; una cadena en blanco no es un filtro, es un input vacío.
 *
 * El valor se devuelve **tal cual** (sin escapar `%` ni `_`): el backend los busca
 * como texto literal vía `escapeLike`, así que escaparlos aquí los duplicaría.
 */
export function parseSearchParam(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const q = raw.trim().slice(0, MAX_SEARCH_LENGTH);
  return q.length > 0 ? q : undefined;
}

/** Orden de la lista. Un valor fuera de la whitelist cae al orden por defecto. */
export function parseOrdenParam(
  raw: string | null | undefined,
): CatalogOrden | undefined {
  return typeof raw === "string" && ORDEN_VALUES.includes(raw)
    ? (raw as CatalogOrden)
    : undefined;
}

/**
 * Un extremo del rango de precio. Espejo de `parsePrecio` del backend: solo pasa
 * un número finito y no negativo. `0` es un valor legítimo (`precioMin=0`), así
 * que la comprobación es `>= 0`, no un truthy.
 */
export function parsePriceParam(raw: string | null | undefined): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const precio = Number(raw);
  return Number.isFinite(precio) && precio >= 0 ? precio : undefined;
}

/**
 * Talla. Espejo del backend: entero positivo. El `> 0` no es cosmético — `?talla=`
 * daba `Number("") === 0`, que `Number.isInteger` acepta, y filtraba por talla 0.
 */
export function parseTallaParam(raw: string | null | undefined): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const talla = Number(raw);
  return Number.isInteger(talla) && talla > 0 ? talla : undefined;
}

/** Página. Cualquier basura cae a 1; el backend además la acota a [1, totalPages]. */
export function parsePageParam(raw: string | null | undefined): number {
  if (typeof raw !== "string") return 1;
  const page = Math.floor(Number(raw));
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Lo que el comprador eligió en la barra de filtros, ya normalizado. */
export interface CatalogFilterState {
  categoria?: string;
  talla?: number;
  q?: string;
  orden?: CatalogOrden;
  precioMin?: number;
  precioMax?: number;
}

/**
 * True si hay algún filtro puesto por el comprador. Decide qué estado vacío se
 * pinta (catálogo agotado vs. búsqueda sin resultados) y si se ofrece limpiar.
 *
 * `ignoreCategoria` es para `/botas`, `/sombreros` y `/ropa`: ahí la categoría la
 * fija la ruta, no el comprador, así que ni cuenta como filtro activo ni se puede
 * quitar.
 */
export function hasActiveFilters(
  filters: CatalogFilterState,
  { ignoreCategoria = false }: { ignoreCategoria?: boolean } = {},
): boolean {
  return Boolean(
    (!ignoreCategoria && filters.categoria) ||
      filters.talla !== undefined ||
      filters.q ||
      filters.orden ||
      filters.precioMin !== undefined ||
      filters.precioMax !== undefined,
  );
}

/**
 * True cuando el rango de precio está al revés. El backend **no** lo corrige: la
 * consulta devuelve cero resultados a propósito, así que lo único que se puede
 * hacer es avisarlo en la UI (no es un error de validación — no hay 400).
 */
export function isInvertedPriceRange(
  min: number | undefined,
  max: number | undefined,
): boolean {
  return min !== undefined && max !== undefined && min > max;
}
