// Fuente única de la URL pública del sitio. La consumen `metadataBase` (root
// layout), los canonicals, sitemap.ts y robots.ts.
//
// `NEXT_PUBLIC_SITE_URL` se inyecta en build (definirla en Vercel al apuntar el
// dominio real). Sin ella cae a localhost, que es lo correcto en dev: los
// canonicals y el sitemap quedan absolutos y coherentes, solo que apuntando a la
// máquina local en lugar de a producción.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** "/outlet" → "https://dominio.mx/outlet". Para OG/JSON-LD, que exigen URL absoluta. */
export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Términos de búsqueda del negocio: outlet vaquero en Celaya, Guanajuato.
// Los buscadores ya casi no pesan <meta keywords>, pero es barato y algunos
// agregadores/redes lo siguen leyendo.
export const SITE_KEYWORDS = [
  "botas vaqueras",
  "botas de piel",
  "outlet de botas",
  "sombreros vaqueros",
  "ropa vaquera",
  "Cuadra",
  "Celaya",
  "Guanajuato",
  "México",
  "liquidación",
];
