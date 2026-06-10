import { MOCK_PRODUCTS, type MockProduct } from "@/db/mockProducts";

// Re-export the type so consumers never import from db/ directly.
// When the backend is ready:
//   1. Replace MockProduct with a Zod-inferred type (z.infer<typeof ProductSchema>)
//   2. Replace the mock implementation below with:
//        const { data } = await axios.get("/api/products", { params: filters })
//        return ProductsResultSchema.parse(data)
export type Product = MockProduct;

export interface ProductFilters {
  categoria?: string;
  talla?: number;
  page?: number;
  perPage?: number;
}

export interface ProductsResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  availableSizes: number[];
}

// Query key factory — drop-in ready for TanStack Query:
//   useQuery({ queryKey: productKeys.filtered(filters), queryFn: () => getProducts(filters) })
export const productKeys = {
  all: ["products"] as const,
  filtered: (filters: ProductFilters) => ["products", filters] as const,
};

export async function getProducts(
  filters: ProductFilters = {}
): Promise<ProductsResult> {
  const { categoria, talla, page = 1, perPage = 9 } = filters;

  let results = [...MOCK_PRODUCTS];

  if (categoria) {
    results = results.filter((p) => p.type === categoria);
  }

  if (talla) {
    results = results.filter((p) => p.sizes.includes(talla));
  }

  const availableSizes = [
    ...new Set(
      (categoria
        ? MOCK_PRODUCTS.filter((p) => p.type === categoria)
        : MOCK_PRODUCTS
      ).flatMap((p) => p.sizes)
    ),
  ].sort((a, b) => a - b);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    products: results.slice(start, start + perPage),
    total,
    page: safePage,
    perPage,
    totalPages,
    availableSizes,
  };
}
