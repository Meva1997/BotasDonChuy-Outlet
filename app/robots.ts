import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

// Genera /robots.txt.
//
// Las rutas privadas también llevan `robots: { index: false }` en su metadata.
// No es redundante: robots.txt impide el *crawl*, el meta impide el *índice*. Una
// URL bloqueada aquí pero enlazada desde fuera puede indexarse igual (sin
// contenido) — el meta es el cinturón que lo evita, y solo se lee si el crawler
// entra. Las dos capas cubren agujeros distintos.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", // panel: datos sensibles (unitCost, márgenes)
        "/login",
        "/forgot-password",
        "/checkout", // flujo transaccional, no es contenido
        "/pedido", // el token de la URL es la credencial del pedido (Fase 17)
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    // `Host` es una directiva de Yandex y espera el dominio pelón, sin esquema
    // (Google la ignora por completo). Con la URL entera quedaba
    // `Host: http://localhost:3000`, que no es un valor válido.
    host: new URL(SITE_URL).host,
  };
}
