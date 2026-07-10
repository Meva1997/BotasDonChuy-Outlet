import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/api/client";

// Forma pública de un producto (GET /api/products). Refleja el schema `Product`
// del backend: NO incluye `unitCost` (dato sensible, solo en /api/admin/products).
// `imageSrc`/`code` pueden venir null; `deletedAt` null cuando el producto está activo.
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  originalPrice: z.number(),
  salePrice: z.number(),
  discountPercent: z.number(),
  stock: z.number(),
  type: z.string(),
  sizes: z.array(z.number()),
  imageSrc: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  // Dimensiones del paquete — requeridas por la API de Skydropx para cotizar envíos.
  weightKg: z.number(),
  lengthCm: z.number(),
  widthCm: z.number(),
  heightCm: z.number(),
  visible: z.boolean().optional(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductListResponseSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  availableSizes: z.array(z.number()),
});

export type ProductsResult = z.infer<typeof ProductListResponseSchema>;

export interface ProductFilters {
  categoria?: string;
  talla?: number;
  page?: number;
  perPage?: number;
}

// Query key factory — drop-in ready for TanStack Query:
//   useQuery({ queryKey: productKeys.filtered(filters), queryFn: () => getProducts(filters) })
export const productKeys = {
  all: ["products"] as const,
  filtered: (filters: ProductFilters) => ["products", filters] as const,
};

// GET /api/products/{id} — devuelve null en 404 (producto inexistente/no visible).
export async function getProductById(id: number): Promise<Product | null> {
  try {
    const { data } = await api.get(`/products/${id}`);
    return ProductSchema.parse(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// GET /api/products — el backend aplica filtros, paginación y calcula availableSizes.
// axios omite automáticamente los params `undefined`.
export async function getProducts(
  filters: ProductFilters = {}
): Promise<ProductsResult> {
  const { data } = await api.get("/products", { params: filters });
  return ProductListResponseSchema.parse(data);
}
