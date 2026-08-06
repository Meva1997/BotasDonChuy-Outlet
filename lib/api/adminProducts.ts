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
  // false = existencia sin tallas (Fase 24) — ver ProductSchema en lib/api/products.ts.
  hasSizes: z.boolean(),
  // Galería de imágenes (Cloudinary, hasta 3). La forma admin SÍ trae el `publicId`
  // de cada imagen — necesario para borrarla vía DELETE /:id/images. `imageSrc`
  // (virtual) = URL de la primera imagen (compat con los consumidores de una foto).
  images: z
    .array(z.object({ url: z.string(), publicId: z.string() }))
    .optional()
    .default([]),
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

// Imagen de la galería en la respuesta admin (incluye publicId de Cloudinary).
export type AdminProductImage = AdminProduct["images"][number];

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
// `hasSizes` (Fase 24) decide cuál de los otros dos viaja: `sizes` cuando es
// `true` (o se omite — sigue siendo el default), `stockQuantity` (entero, la
// existencia capturada a mano) cuando es `false`. Mandar el campo del modo
// contrario responde 400 — por eso son ambos opcionales aquí y el llamador
// arma el objeto con solo el que corresponde.
export interface AdminProductInput {
  name: string;
  description?: string;
  originalPrice: number;
  salePrice: number;
  unitCost: number;
  type: "bota" | "sombrero" | "ropa";
  hasSizes: boolean;
  sizes?: string;
  stockQuantity?: number;
  // Las imágenes NO viajan en el POST/PUT (el backend las ignora aquí): se
  // gestionan por endpoints dedicados —addProductImages/deleteProductImage—.
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

// POST /api/admin/products/:id/images — sube de 1 a 3 archivos (multipart, campo
// `images`) a Cloudinary. El backend respeta el tope de 3 en total por producto y
// devuelve el producto con la galería actualizada. Formatos png/jpeg/webp, ≤ 5 MB c/u.
// Errores: 400 (excede 3 / tipo), 404 (producto), 502 (falló Cloudinary).
export async function addProductImages(
  id: number,
  files: File[]
): Promise<AdminProduct> {
  const form = new FormData();
  for (const file of files) form.append("images", file);
  // Dejamos que axios ponga el boundary del multipart (sobrescribe el
  // Content-Type JSON por defecto de la instancia).
  const { data } = await api.post(`/admin/products/${id}/images`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return acceptWrite("addProductImages", data);
}

// DELETE /api/admin/products/:id/images — borra la imagen (por su publicId) del
// producto y de Cloudinary. Devuelve el producto con la galería actualizada.
export async function deleteProductImage(
  id: number,
  publicId: string
): Promise<AdminProduct> {
  const { data } = await api.delete(`/admin/products/${id}/images`, {
    data: { publicId },
  });
  return acceptWrite("deleteProductImage", data);
}
