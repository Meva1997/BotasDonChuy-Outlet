import type { MetadataRoute } from "next";
import { getProducts, type Product } from "@/lib/api/products";
import { CATEGORIES } from "@/lib/domain/categories";
import { absoluteUrl } from "@/lib/seo/site";

// Genera /sitemap.xml. El inventario del outlet rota constantemente (piezas
// únicas que se agotan), así que se revalida cada hora en lugar de congelarse en
// el build.
export const revalidate = 3600;

const PER_PAGE = 100;
// Tope de seguridad: si el backend devolviera un `totalPages` inesperado, el
// sitemap no debe convertirse en un bucle de miles de requests durante el build.
const MAX_PAGES = 20;

// El catálogo viene paginado, así que hay que recorrerlo. Secuencial a propósito:
// son pocas páginas y no vale la pena golpear el backend en paralelo por un
// archivo que se regenera una vez por hora.
async function fetchAllProducts(): Promise<Product[]> {
  const first = await getProducts({ page: 1, perPage: PER_PAGE });
  const products = [...first.products];

  const pages = Math.min(first.totalPages, MAX_PAGES);
  for (let page = 2; page <= pages; page++) {
    const next = await getProducts({ page, perPage: PER_PAGE });
    products.push(...next.products);
  }

  return products;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/outlet"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((category) => ({
      url: absoluteUrl(category.href),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/nosotros"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/envios"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/terminos"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacidad"), changeFrequency: "yearly", priority: 0.3 },
  ];

  // El sitemap se genera en build: si el backend está caído, publicar solo las
  // rutas estáticas es mejor que reventar el deploy entero.
  let products: Product[] = [];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.error("[sitemap] No se pudo cargar el catálogo:", error);
  }

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/outlet/${product.id}/producto`),
    lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
