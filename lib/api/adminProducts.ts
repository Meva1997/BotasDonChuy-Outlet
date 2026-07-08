import { z } from "zod";
import { api } from "@/lib/api/client";

// Forma admin de un producto (GET /api/admin/products). A diferencia de la forma
// pública (`ProductSchema` en lib/getProducts.ts) SÍ incluye `unitCost` — dato
// sensible (costo/márgenes) que solo viaja por rutas /api/admin/* autenticadas.
// `stock`/`sizes`/`discountPercent` son campos VIRTUAL derivados en el backend
// de las filas ProductSize (ver ../backend/src/models/Product.ts).
export const AdminProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  originalPrice: z.number(),
  salePrice: z.number(),
  discountPercent: z.number(),
  unitCost: z.number(),
  stock: z.number(),
  type: z.string(),
  sizes: z.array(z.number()),
  imageSrc: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  // Dimensiones del paquete — requeridas por Skydropx para cotizar envíos.
  weightKg: z.number(),
  lengthCm: z.number(),
  widthCm: z.number(),
  heightCm: z.number(),
  visible: z.boolean(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type AdminProduct = z.infer<typeof AdminProductSchema>;

// El endpoint admin devuelve un array plano (no el envoltorio { products, total… }
// de la ruta pública paginada).
export const AdminProductListSchema = z.array(AdminProductSchema);

// DELETE /api/admin/products/:id → soft-delete si el producto tiene pedidos
// asociados (se oculta para preservar el historial), hard-delete si no.
export const DeleteResponseSchema = z.object({
  ok: z.boolean(),
  softDeleted: z.boolean(),
});

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

// Payload de creación/edición. Mapea 1:1 al `productSchema` del backend
// (../backend/src/schemas/product.ts). `sizes` va como string CSV donde la
// repetición de una talla representa unidades de stock ("25,26,26" → talla 26
// con 2 unidades); el backend lo agrupa en filas ProductSize. No se envía un
// `stock` escalar: se deriva de las tallas repetidas.
export interface AdminProductInput {
  name: string;
  description?: string;
  originalPrice: number;
  salePrice: number;
  unitCost: number;
  type: "bota" | "sombrero" | "ropa";
  sizes: string;
  imageSrc?: string;
  code?: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  visible: boolean;
}

// Query key factory (mismo patrón que productKeys / orderKeys / authKeys).
export const adminProductKeys = {
  all: ["adminProducts"] as const,
};

// GET /api/admin/products — lista completa (incluye no visibles y unitCost).
export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { data } = await api.get("/admin/products");
  return AdminProductListSchema.parse(data);
}

// Una escritura (POST/PUT) que devolvió 2xx YA tuvo efecto en el backend. Si el
// body de respuesta no valida el schema al pie de la letra, NO convertimos ese
// éxito en un error: reintentar un create generaría un producto DUPLICADO y un
// update volvería a pisar los datos. Devolvemos el dato crudo (la invalidación de
// la lista revalida con datos ya parseados por getAdminProducts) y avisamos en
// consola. El `parse` estricto se reserva para lecturas (getAdminProducts).
function acceptWrite(op: string, data: unknown): AdminProduct {
  const parsed = AdminProductSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`${op}: la respuesta 2xx no valida AdminProductSchema`, parsed.error);
    return data as AdminProduct;
  }
  return parsed.data;
}

// POST /api/admin/products — 201 con el producto creado. 400 si la validación
// falla (p. ej. salePrice > originalPrice).
export async function createProduct(input: AdminProductInput): Promise<AdminProduct> {
  const { data } = await api.post("/admin/products", input);
  return acceptWrite("createProduct", data);
}

// PUT /api/admin/products/:id — actualización (el backend acepta parcial; aquí se
// envía el objeto completo). 400 validación, 404 si el producto ya no existe.
export async function updateProduct(
  id: number,
  input: AdminProductInput
): Promise<AdminProduct> {
  const { data } = await api.put(`/admin/products/${id}`, input);
  return acceptWrite("updateProduct", data);
}

// DELETE /api/admin/products/:id — 404 si no existe.
export async function deleteProduct(id: number): Promise<DeleteResponse> {
  const { data } = await api.delete(`/admin/products/${id}`);
  return DeleteResponseSchema.parse(data);
}
