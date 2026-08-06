import { z } from "zod";
import { api } from "@/lib/api/client";

// Contrato de la identidad de marca (patrón getProducts.ts / reports.ts).
// Refleja el modelo `BrandSettings` del backend (singleton id:1). El backend
// controla solo este subconjunto de la marca; `namePrimary`/`nameAccent`/`email`/
// `instagram` siguen viviendo estáticos en lib/brand.ts (ver resolveBrand()).
//   GET  /api/admin/brand  → BrandSettings   (público; hidrata el storefront)
//   PUT  /api/admin/brand  → BrandSettings   (protegido; update parcial desde BrandSection)
export const BrandSettingsSchema = z.object({
  id: z.number().optional(),
  brandName: z.string(),
  heroText: z.string(),
  // Tagline como string con `\n`; el storefront lo parte en líneas (taglineLines).
  tagline: z.string(),
  cartNotice: z.string(),
  footerNote: z.string(),
  logoUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type BrandSettings = z.infer<typeof BrandSettingsSchema>;

// Payload del PUT — update parcial (el backend exige ≥1 campo). El logo no se
// envía por ahora (solo previews blob: locales; subida real = trabajo futuro).
export interface BrandInput {
  brandName?: string;
  heroText?: string;
  tagline?: string;
  cartNotice?: string;
  footerNote?: string;
  logoUrl?: string | null;
}

// Query key factory (mismo patrón que reportKeys / dashboardKeys).
export const brandKeys = {
  all: ["brand"] as const,
  detail: () => [...brandKeys.all, "detail"] as const,
};

// GET /api/admin/brand — público. Se marca `skipAuth`: el storefront lo consume
// desde el root layout sin sesión, y un token viejo/expirado en localStorage NO
// debe adjuntarse (provocaría un 401 espurio que expulsaría al visitante público
// a /login vía el interceptor). `findOrCreate` en el backend → nunca 404.
export async function getBrandSettings(): Promise<BrandSettings> {
  const { data } = await api.get("/admin/brand", { skipAuth: true });
  return BrandSettingsSchema.parse(data);
}

// PUT /api/admin/brand — protegido (Bearer vía interceptor). Update parcial; el
// backend devuelve el objeto completo. Convención de escritura (cf. adminProducts):
// un 2xx ya surtió efecto, así que ante un mismatch de schema se avisa y se
// devuelve `data` sin lanzar (lanzar marcaría como error un guardado exitoso).
export async function updateBrandSettings(
  input: BrandInput
): Promise<BrandSettings> {
  const { data } = await api.put("/admin/brand", input);
  const parsed = BrandSettingsSchema.safeParse(data);
  if (!parsed.success) {
    console.warn("updateBrandSettings: respuesta inesperada del backend", parsed.error);
    return data as BrandSettings;
  }
  return parsed.data;
}
