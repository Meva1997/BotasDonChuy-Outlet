import axios from "axios";
import { z } from "zod";
import { api } from "@/lib/api/client";

// Importación/restock masivo de productos por Excel (Fase 13). Son DOS endpoints y la
// separación es la decisión central: el paso 1 no escribe nada y el paso 2 recibe lo que el
// dueño VIO y CORRIGIÓ en pantalla, no el archivo.
//
// El motivo es que el restock SUMA stock y no hay forma de deshacerlo desde la app: aplicar
// un archivo a ciegas (una fórmula que no se leyó, una columna mal escrita, un nombre que
// empareja con el producto equivocado) se corrige a mano, producto por producto.
//
// Backend: ../backend/src/services/productImport.service.ts + src/schemas/productImport.ts.

/** Tope de filas por importación — el backend rechaza el archivo si lo excede. */
export const MAX_IMPORT_ROWS = 500;

/** Tope de tamaño del .xlsx (multer, ../backend/src/middlewares/upload.ts). */
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

/** Mimetype OOXML del .xlsx — el backend rechaza cualquier otro (incluido .xls binario). */
export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ── Fila que viaja de vuelta al confirmar ────────────────────────────────────────────────

/**
 * Refleja `importRowInputSchema` del backend, que es `.strict()`: **una clave desconocida
 * revienta el lote entero con un 400**. Por eso el front nunca reenvía el objeto del preview
 * crudo — serializa desde una whitelist (ver components/admin/import/rowInput.ts).
 *
 * Una clave AUSENTE significa "no toques esa columna del producto"; `null` se descarta en el
 * backend y equivale a ausente. La excepción es `description: ""`, que SÍ limpia la
 * descripción — de ahí el modelo de presencia explícita del editor.
 */
export const ImportRowInputSchema = z.looseObject({
  row: z.number().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  originalPrice: z.number().optional(),
  salePrice: z.number().optional(),
  unitCost: z.number().optional(),
  sizes: z.union([z.string(), z.array(z.number())]).optional(),
  weightKg: z.number().optional(),
  lengthCm: z.number().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  visible: z.boolean().optional(),
});

export type ImportRowInput = z.infer<typeof ImportRowInputSchema>;

// ── Preview (paso 1) ─────────────────────────────────────────────────────────────────────

/** Foto de un producto para el diff. Trae `unitCost`: es ruta de admin. */
export const ProductSnapshotSchema = z.object({
  id: z.number().nullable(),
  code: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  originalPrice: z.number(),
  salePrice: z.number(),
  unitCost: z.number(),
  weightKg: z.number(),
  lengthCm: z.number(),
  widthCm: z.number(),
  heightCm: z.number(),
  visible: z.boolean(),
  discontinued: z.boolean(),
  sizes: z.array(z.object({ size: z.number(), stock: z.number() })),
  stock: z.number(),
});

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

// `before`/`after` son `unknown` en el backend (el valor de cualquier columna). Se pintan con
// un render defensivo — ver components/admin/import/ImportDiff.tsx.
export const FieldChangeSchema = z.object({
  field: z.string(),
  label: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});

export type FieldChange = z.infer<typeof FieldChangeSchema>;

/** `added` se SUMA a `before`, no lo reemplaza. Es el dato más importante de la pantalla. */
export const SizeChangeSchema = z.object({
  size: z.number(),
  before: z.number(),
  added: z.number(),
  after: z.number(),
});

export type SizeChange = z.infer<typeof SizeChangeSchema>;

// Enum estricto a propósito: una acción que no conocemos no se puede pintar bien, y pintarla
// mal arriesga que el dueño confirme una escritura que no entendió. Mejor fallar el parse.
export const ImportActionSchema = z.enum(["create", "update", "unchanged", "error"]);

export type ImportAction = z.infer<typeof ImportActionSchema>;

export const ImportSummarySchema = z.object({
  total: z.number(),
  created: z.number(),
  updated: z.number(),
  unchanged: z.number(),
  failed: z.number(),
});

export type ImportSummary = z.infer<typeof ImportSummarySchema>;

export const ImportRowPlanSchema = z.object({
  row: z.number(),
  action: ImportActionSchema,
  code: z.string().nullable(),
  name: z.string().nullable(),
  /** `null` cuando la fila crea un producto — o cuando empareja con uno que otra fila
   *  ANTERIOR del mismo archivo va a crear (el preview resuelve contra un catálogo virtual). */
  productId: z.number().nullable(),
  before: ProductSnapshotSchema.nullable(),
  after: ProductSnapshotSchema.nullable(),
  changes: z.array(FieldChangeSchema),
  sizeChanges: z.array(SizeChangeSchema),
  reactivated: z.boolean(),
  warnings: z.array(z.string()),
  message: z.string(),
  input: ImportRowInputSchema,
});

export type ImportRowPlan = z.infer<typeof ImportRowPlanSchema>;

export const ImportPreviewResponseSchema = z.object({
  summary: ImportSummarySchema,
  /** Avisos del archivo completo (columnas que NO se van a importar). Hay que mostrarlos:
   *  son el aviso que evita una importación fantasma. */
  warnings: z.array(z.string()),
  rows: z.array(ImportRowPlanSchema),
});

export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponseSchema>;

// ── Commit (paso 2) ──────────────────────────────────────────────────────────────────────

export const ImportRowResultSchema = z.object({
  row: z.number(),
  status: z.enum(["created", "updated", "unchanged", "error"]),
  code: z.string().nullable(),
  name: z.string().nullable(),
  productId: z.number().optional(),
  message: z.string(),
});

export type ImportRowResult = z.infer<typeof ImportRowResultSchema>;

export const ImportCommitResponseSchema = z.object({
  summary: ImportSummarySchema,
  rows: z.array(ImportRowResultSchema),
});

export type ImportCommitResponse = z.infer<typeof ImportCommitResponseSchema>;

// ── Query keys ───────────────────────────────────────────────────────────────────────────

// Mismo patrón que adminProductKeys / adminOrderKeys. Hoy nadie lee esta caché (las dos
// llamadas son mutations); la invalidación tras confirmar apunta a adminProductKeys.all y
// productKeys.all, que es lo que el import realmente cambia.
export const adminProductImportKeys = {
  all: ["adminProductImport"] as const,
};

// ── Llamadas ─────────────────────────────────────────────────────────────────────────────

/**
 * Paso 1 · POST /api/admin/products/import/preview — multipart, campo `file`. NO escribe nada.
 *
 * `.parse()` estricto: esto es efectivamente una lectura, y una forma inesperada significa que
 * no podemos pintar la revisión con honestidad. Un parse fallido aquí es seguro de reintentar
 * (no hay nada que duplicar), al revés que el commit.
 */
export async function previewProductImport(file: File): Promise<ImportPreviewResponse> {
  const form = new FormData();
  form.append("file", file);
  // Dejamos que axios ponga el boundary (sobrescribe el Content-Type JSON de la instancia).
  const { data } = await api.post("/admin/products/import/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return ImportPreviewResponseSchema.parse(data);
}

/**
 * Paso 2 · POST /api/admin/products/import — JSON `{ rows }`. Aplica lo revisado.
 *
 * Mismo criterio que `acceptWrite` en adminProducts.ts, pero con más razón: un 2xx YA escribió,
 * y convertir un cuerpo inesperado en error invitaría a un reintento que **duplica el stock**
 * (el restock suma). Se avisa en consola y se devuelve el dato crudo.
 */
export async function commitProductImport(
  rows: ImportRowInput[]
): Promise<ImportCommitResponse> {
  const { data } = await api.post("/admin/products/import", { rows });
  const parsed = ImportCommitResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(
      "commitProductImport: la respuesta 2xx no valida ImportCommitResponseSchema",
      parsed.error
    );
    return data as ImportCommitResponse;
  }
  return parsed.data;
}

// ── Mensajes de error ────────────────────────────────────────────────────────────────────

function backendMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const message = error.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : undefined;
}

/**
 * El backend ya devuelve oraciones en español listas para mostrar (archivo corrupto, columnas
 * duplicadas, más de 500 filas, hoja vacía…), así que se prefieren siempre a un genérico.
 */
export function importPreviewErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = backendMessage(error);
    if (!error.response) {
      return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
    }
    if (error.response.status === 400) {
      return (
        message ??
        "No pudimos leer el archivo. Verifica que sea un .xlsx válido y vuelve a intentarlo."
      );
    }
    // Multer corta la petición cuando el archivo pasa el límite; según cómo se propague puede
    // llegar como 413 o como 400 con mensaje propio (ya cubierto arriba).
    if (error.response.status === 413) {
      return message ?? "El archivo pesa más de 2 MB. Reduce el archivo e inténtalo de nuevo.";
    }
    if (error.response.status >= 500) {
      return "Tuvimos un problema en el servidor al leer el archivo. Inténtalo de nuevo en unos minutos.";
    }
  }
  return "No pudimos analizar el archivo. Inténtalo de nuevo.";
}

/**
 * El `409` de doble envío trae la explicación completa del backend (que el stock se duplicaría)
 * — se muestra tal cual, sin genérico encima. Ver `assertNotDuplicateCommit` en el backend.
 */
export function importCommitErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = backendMessage(error);
    if (!error.response) {
      return "No pudimos conectar con el servidor. No sabemos si la importación se aplicó — revisa el catálogo antes de reintentar.";
    }
    if (error.response.status === 409) {
      return (
        message ??
        "Esta misma importación se acaba de aplicar. Revisa el catálogo antes de reintentar: el stock de un restock se suma, así que aplicarla dos veces duplicaría las piezas."
      );
    }
    if (error.response.status === 400) {
      return (
        message ??
        "El servidor rechazó las filas enviadas. Vuelve a analizar el archivo e inténtalo de nuevo."
      );
    }
    if (error.response.status >= 500) {
      return "Tuvimos un problema en el servidor. Revisa el catálogo antes de reintentar: parte de la importación pudo haberse aplicado.";
    }
  }
  return "No pudimos aplicar la importación. Revisa el catálogo antes de reintentar.";
}
