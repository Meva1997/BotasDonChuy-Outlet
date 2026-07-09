import type { BrandSettings } from "@/lib/api/brand";

// Fuente única de la identidad y los textos de marca visibles en la tienda.
// Estos valores son los defaults/fallback: el storefront se hidrata desde
// `GET /api/admin/brand` (ver lib/api/brand.ts + BrandProvider) y cae aquí si el
// backend no responde. `namePrimary`/`nameAccent`/`email`/`instagram` NO existen
// en el backend, así que siempre salen de aquí (ver resolveBrand()).
export const BRAND = {
  /** Nombre completo de la marca (metadata, títulos, copyright). */
  name: "Botas Don Chuy Outlet",
  /** Parte principal del logotipo, antes del acento. */
  namePrimary: "Botas Don Chuy",
  /** Parte acentuada del logotipo (se renderiza en cursiva). */
  nameAccent: "Outlet",
  /** Correo de contacto / acceso al panel de administración. */
  email: "admin@botasdonchuy.mx",
  /** Instagram oficial. */
  instagram: "https://www.instagram.com/botasdonchuy/",
  /** Eyebrow del hero / encabezado superior (se muestra en mayúsculas vía CSS). */
  heroText: "Liquidación final · Sin reposición",
  /** Tagline en dos líneas (hero, footer, etc.). */
  taglineLines: ["Piezas únicas. Sin reposición.", "Cuando se acaba, se acaba."],
  /** Aviso del carrito. */
  cartNotice: "Estos artículos no se reservan",
  /** Nota del pie de página (mensaje de liquidación). */
  footerNote: "Liquidación de inventario · piezas finales · sin reposición",
} as const;

// Forma resuelta que consume el storefront: los campos que el backend controla
// (mapeados desde BrandSettings) más los que solo viven aquí (logo split, email,
// instagram). El logo es nuevo respecto a BRAND (no existe como default estático).
export interface ResolvedBrand {
  name: string;
  namePrimary: string;
  nameAccent: string;
  email: string;
  instagram: string;
  heroText: string;
  taglineLines: string[];
  cartNotice: string;
  footerNote: string;
  logoUrl: string | null;
}

// Merge backend ← BRAND: cada campo que el backend controla se toma de `settings`
// (con BRAND como fallback); el resto sale siempre de BRAND. `tagline` (string con
// `\n`) se parte en `taglineLines`. `settings` null/undefined ⇒ todo BRAND.
export function resolveBrand(settings?: BrandSettings | null): ResolvedBrand {
  return {
    name: settings?.brandName ?? BRAND.name,
    namePrimary: BRAND.namePrimary,
    nameAccent: BRAND.nameAccent,
    email: BRAND.email,
    instagram: BRAND.instagram,
    heroText: settings?.heroText ?? BRAND.heroText,
    taglineLines: settings?.tagline
      ? settings.tagline.split("\n")
      : [...BRAND.taglineLines],
    cartNotice: settings?.cartNotice ?? BRAND.cartNotice,
    footerNote: settings?.footerNote ?? BRAND.footerNote,
    logoUrl: settings?.logoUrl ?? null,
  };
}
