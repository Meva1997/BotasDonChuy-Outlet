import type { Metadata } from "next";
import { BRAND } from "@/lib/domain/brand";

// Constructor de la metadata de una página pública. Existe por dos trampas de la
// herencia de metadata de Next, las dos medidas contra el HTML del build:
//
// 1. `alternates` se HEREDA del layout raíz si la página no lo define. Con un
//    `canonical: "/"` arriba, toda página que se olvide de poner el suyo se declara
//    duplicada del home y se sale del índice.
// 2. `openGraph` se REEMPLAZA entero al definirlo, no se mezcla. Una página que
//    solo quería cambiar el título perdía `siteName`, `locale`, `type` y —lo caro—
//    la imagen de opengraph-image.tsx: enlace pelón al compartirse en WhatsApp.
//
// Por eso el helper siempre emite el bloque completo: pasar por aquí es lo que
// garantiza que no falte nada. La página solo dice qué la hace distinta.
interface PageMetadataInput {
  /** Título de la pestaña y del resultado de búsqueda. El sufijo lo pone el layout. */
  title: string;
  description: string;
  /** Ruta propia, relativa ("/botas"). Es el canonical y el og:url. */
  path: string;
  /** Copy más corta y vendedora para el enlace compartido. Default: la description. */
  ogDescription?: string;
}

export function pageMetadata({
  title,
  description,
  path,
  ogDescription,
}: PageMetadataInput): Metadata {
  const social = ogDescription ?? description;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: BRAND.name,
      title,
      description: social,
      url: path,
      // Explícita a propósito: el archivo opengraph-image.tsx solo se hereda
      // mientras nadie declare `openGraph`, y aquí lo estamos declarando. Las
      // medidas van a mano por lo mismo — Next solo las deduce del archivo cuando
      // es él quien inyecta la imagen; sin ellas el scraper tiene que bajarla para
      // saber si cabe en el layout grande, y a veces no lo hace al primer intento.
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: BRAND.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: social,
      images: ["/opengraph-image"],
    },
  };
}
