import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductInfo from "@/components/product/ProductInfo";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api/products";
import { BRAND } from "@/lib/domain/brand";
import { categoryHref, categoryPlural, categorySingular } from "@/lib/domain/categories";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonLd";
import { absoluteUrl } from "@/lib/seo/site";

// NO agregar un loading.tsx a esta ruta (ni un <Suspense> alrededor del fetch).
//
// Es tentador —la página espera al backend antes de pintar—, pero cualquier
// boundary que streamee obliga a Next a mandar el shell ANTES de saber si el
// producto existe, y el status queda fijado en 200. El notFound() posterior pinta
// el 404 con status 200: un soft 404. Medido, no teórico: con loading.tsx
// /outlet/999999/producto devuelve 200; sin él, 404.
//
// En un outlet las piezas se agotan y se retiran, así que sus URLs (ya indexadas y
// en el sitemap) se crawlean seguido. Devolverles 404 real es lo que las saca del
// índice. Se eligió el status correcto sobre el skeleton a sabiendas del costo:
// al hacer clic en una tarjeta no hay feedback hasta que responde el backend.
//
// generateStaticParams + dynamicParams:false daría ambas cosas, pero entonces todo
// producto creado después del build daría 404 hasta el siguiente deploy — peor.
interface Props {
  params: Promise<{ slug: string }>;
}

// `generateMetadata` y el componente corren en el mismo render y ambos necesitan el
// producto. `cache()` hace que el segundo lo tome del primero: sin esto serían dos
// GET idénticos al backend por cada visita (axios no deduplica como fetch()).
//
// El slug se valida antes de pegarle al backend: es un segmento de URL abierto, y
// los crawlers y los enlaces viejos pegan a rutas basura de forma rutinaria.
// `Number("abc")` es NaN → GET /products/NaN → el backend responde 400, que
// getProductById NO atrapa (solo mapea 404 → null) → la ruta reventaría con un
// error 500 en vez de mostrar el 404 limpio.
const loadProduct = cache(async (slug: string) => {
  const id = Number(slug);
  if (!Number.isInteger(id) || id <= 0) return null;
  return getProductById(id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  // Corta aquí mismo: sin producto, la página también hará notFound() y la metadata
  // real la pone not-found.tsx.
  if (!product) notFound();

  const category = categorySingular(product.type);
  const description =
    product.description ??
    `${product.name} — ${category.toLowerCase()} de outlet con ${product.discountPercent}% de descuento. Pieza final, sin reposición. Envíos a todo México.`;
  const path = `/outlet/${product.id}/producto`;

  // La foto real de la pieza es la que vende cuando alguien comparte el enlace por
  // WhatsApp, así que gana a la imagen OG genérica del sitio.
  //
  // El fallback NO es opcional: declarar `openGraph` aquí reemplaza el bloque
  // heredado del layout raíz, y con él la imagen de opengraph-image.tsx. Un producto
  // sin foto se quedaría sin ninguna og:image (enlace pelón al compartirlo) — y hoy
  // la mayoría del catálogo aún no tiene fotos cargadas.
  const photo = product.images?.[0]?.url ?? product.imageSrc ?? null;
  const image = photo
    ? { url: photo, alt: product.name }
    : { url: absoluteUrl("/opengraph-image"), alt: BRAND.name };

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    // No usa pageMetadata(): la imagen es la foto de la pieza, no la genérica del
    // sitio. Sí repite `siteName`/`locale` por el mismo motivo que el helper — al
    // declarar `openGraph` se reemplaza el bloque heredado del layout completo.
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: BRAND.name,
      title: product.name,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [image.url],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  return (
    <>
      {/* Precio y disponibilidad para el rich result de Google. */}
      <JsonLd data={productJsonLd(product)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: categoryPlural(product.type), path: categoryHref(product.type) },
          { name: product.name, path: `/outlet/${product.id}/producto` },
        ])}
      />

      <ProductInfo product={product} />
    </>
  );
}
