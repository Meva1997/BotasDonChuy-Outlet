// Fuente única de la identidad y los textos de marca visibles en la tienda.
// Hoy estos valores son fijos; cuando se cablee BrandSettings (ver BACKEND.md §9)
// se convierten en los defaults/fallback y el resto del front seguirá leyéndolos
// desde aquí — un solo lugar que actualizar.
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
