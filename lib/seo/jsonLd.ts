import { BRAND } from "@/lib/domain/brand";
import { categorySingular } from "@/lib/domain/categories";
import { absoluteUrl, SITE_URL } from "@/lib/seo/site";
import type { Product } from "@/lib/api/products";

// Datos estructurados (schema.org / JSON-LD). Es lo que Google lee para armar los
// rich results: precio y disponibilidad bajo el resultado del producto, y el panel
// de negocio local. Se inyectan con <JsonLd /> (components/seo/JsonLd.tsx).
//
// Regla: solo describir lo que la página realmente muestra. Marcar datos que el
// usuario no ve es una violación de las políticas de Google y puede costar los
// rich results de todo el dominio.

/** La tienda física + la marca. Va en el home. */
export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "@id": `${SITE_URL}/#store`,
    name: BRAND.name,
    description:
      "Outlet de botas, sombreros y ropa vaquera en Celaya, Guanajuato. Piezas finales de inventario, sin reposición.",
    url: SITE_URL,
    email: BRAND.email,
    sameAs: [BRAND.instagram],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Allende 202, Colonia Centro",
      addressLocality: "Celaya",
      addressRegion: "Guanajuato",
      postalCode: "38000",
      addressCountry: "MX",
    },
    areaServed: { "@type": "Country", name: "México" },
    currenciesAccepted: "MXN",
  };
}

// Un producto del catálogo. `offers` refleja el precio de outlet (el que se cobra),
// no el original: `originalPrice` es solo el tachado de referencia.
//
// `sku`/`mpn`: el backend no tiene un SKU real por talla, así que se usa el `code`
// del producto cuando existe y el id como fallback — estable y único, que es lo que
// Google pide para agrupar el producto entre crawls.
export function productJsonLd(product: Product) {
  const url = absoluteUrl(`/outlet/${product.id}/producto`);
  const images = product.images?.length
    ? product.images.map((image) => image.url)
    : product.imageSrc
      ? [product.imageSrc]
      : [];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description:
      product.description ??
      `${categorySingular(product.type)} de outlet — pieza final, sin reposición.`,
    // Omitido si el producto aún no tiene fotos: `image: []` no es "sin imagen"
    // para Google, es una propiedad inválida, y arrastra al resto del bloque.
    ...(images.length > 0 ? { image: images } : {}),
    sku: product.code ?? String(product.id),
    category: categorySingular(product.type),
    brand: { "@type": "Brand", name: BRAND.name },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "MXN",
      price: product.salePrice,
      // El outlet no repone: cuando el stock llega a 0 el producto se agota de
      // forma definitiva, no "vuelve pronto".
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: BRAND.name },
    },
  };
}

/** Migas de pan: le dan a Google la jerarquía Inicio › Botas › Producto. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
