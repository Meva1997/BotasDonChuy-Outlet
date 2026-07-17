"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminProductKeys,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage,
  type AdminProduct,
  type AdminProductImage,
  type AdminProductInput,
} from "@/lib/api/adminProducts";
import { productKeys } from "@/lib/api/products";
import {
  CATEGORIES,
  DEFAULT_DIMENSIONS,
  type CategoryInfo,
  type ProductType,
} from "@/lib/domain/categories";
import { deleteNotice, saveNotice } from "./notices";

// Límites de la galería (reflejan el backend: máx 3 imágenes, ≤ 5 MB c/u).
const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Formatos que acepta el backend. El atributo `accept` del input filtra el
// picker, pero drag&drop o algunos pickers cuelan otros image/* (gif, avif,
// heic): validamos contra la misma allowlist para rechazar antes de subir.
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Imagen recién elegida en el form: el File a subir + su preview local (blob:).
interface NewImage {
  file: File;
  preview: string;
}

interface Props {
  category: CategoryInfo;
  product?: AdminProduct;
  // El aviso opcional viaja al volver: la vista de lista lo muestra como
  // confirmación de lo que acaba de pasar (guardar/eliminar). Sin aviso =
  // salida sin cambios (cancelar), que además limpia el aviso anterior.
  onBack: (notice?: string) => void;
}

// Tallas se capturan como texto CSV donde repetir una talla suma unidades de
// stock ("25, 26, 26" → talla 26 con 2 unidades). Este helper extrae las tallas
// válidas (enteros positivos); su longitud es el stock total derivado.
function parseSizes(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

// Campo numérico ≥ 0. Un input vaciado (valueAsNumber) llega como NaN, que Zod
// rechaza a nivel de tipo; damos un mensaje en español (el default es inglés)
// sin perder el de `.nonnegative`, que es más específico y gana para su check.
const nonNegNumber = z
  .number({ error: "Ingresa un número válido" })
  .nonnegative("Debe ser ≥ 0");

// Medidas de envío: el backend las exige > 0 (van a Skydropx para cotizar en
// vivo — un valor en 0 tumbaría la cotización, ver backend/CLAUDE.md § Envío
// en vivo / Skydropx), así que el form debe rechazarlas aquí también, no solo
// dejar que el submit falle con un 400 después.
const positiveNumber = z
  .number({ error: "Ingresa un número válido" })
  .positive("Debe ser mayor a 0");

const productSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    visible: z.boolean(),
    type: z.enum(["bota", "sombrero", "ropa"]),
    originalPrice: nonNegNumber,
    salePrice: nonNegNumber,
    unitCost: nonNegNumber,
    sizes: z.string(),
    code: z.string(),
    weightKg: positiveNumber,
    lengthCm: positiveNumber,
    widthCm: positiveNumber,
    heightCm: positiveNumber,
    description: z.string(),
  })
  .refine((d) => d.salePrice <= d.originalPrice, {
    message: "El precio outlet no puede superar el precio original",
    path: ["salePrice"],
  })
  .refine((d) => parseSizes(d.sizes).length >= 1, {
    message: "Agrega al menos una talla",
    path: ["sizes"],
  });

type ProductFormData = z.infer<typeof productSchema>;

// Traduce el error de axios en un mensaje para el usuario. El backend responde
// 400 con el detalle en `message` (p. ej. salePrice > originalPrice).
function productErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message as string | undefined;
    if (error.response?.status === 400)
      return message ?? "Revisa los datos del producto e inténtalo de nuevo.";
    if (error.response?.status === 404)
      return "El producto ya no existe. Vuelve al listado.";
    // El producto se guardó, pero Cloudinary falló al subir alguna imagen.
    if (error.response?.status === 502)
      return (
        message ??
        "El producto se guardó, pero no pudimos subir las imágenes. Vuelve a intentarlo."
      );
  }
  return "No pudimos guardar el producto. Inténtalo de nuevo.";
}

const inputCls =
  "w-full bg-stone-800/80 border border-stone-700/60 px-3 py-2.5 " +
  "text-amber-50 text-sm placeholder:text-amber-100/20 " +
  "focus:outline-none focus:border-amber-400/50 focus:bg-stone-800 transition-colors";

const labelCls =
  "block text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-2";

const errorCls = "mt-1 text-[11px] text-red-400/80";

export default function ProductForm({ category, product, onBack }: Props) {
  const isEditing = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "Nueva pieza",
      visible: product?.visible ?? true,
      type: (product?.type ?? category.type) as ProductFormData["type"],
      originalPrice: product?.originalPrice ?? 1000,
      salePrice: product?.salePrice ?? 400,
      unitCost: product?.unitCost ?? 0,
      sizes: product?.sizes?.join(", ") ?? "",
      code: product?.code ?? "",
      // Al crear, arrancan con los defaults de empaque de la categoría (editables)
      // en vez de cero; al editar se conservan los del producto.
      weightKg: product?.weightKg ?? DEFAULT_DIMENSIONS[category.type].weightKg,
      lengthCm: product?.lengthCm ?? DEFAULT_DIMENSIONS[category.type].lengthCm,
      widthCm: product?.widthCm ?? DEFAULT_DIMENSIONS[category.type].widthCm,
      heightCm: product?.heightCm ?? DEFAULT_DIMENSIONS[category.type].heightCm,
      description: product?.description ?? "",
    },
  });

  const originalPrice = useWatch({ control, name: "originalPrice" });
  const salePrice = useWatch({ control, name: "salePrice" });
  const name = useWatch({ control, name: "name" });
  const sizesValue = useWatch({ control, name: "sizes" });
  const type = useWatch({ control, name: "type" });

  // Al cambiar la categoría (solo creando), re-pobla las dimensiones con los
  // defaults de la nueva categoría — pero solo los campos que el usuario NO haya
  // editado a mano (respeta "a no ser que yo las quiera editar"). En edición no
  // se tocan: son datos reales del producto.
  useEffect(() => {
    if (isEditing) return;
    const dims = DEFAULT_DIMENSIONS[type as ProductType];
    (["weightKg", "lengthCm", "widthCm", "heightCm"] as const).forEach((field) => {
      if (!dirtyFields[field]) {
        setValue(field, dims[field], { shouldDirty: false });
      }
    });
    // dirtyFields se lee dentro; reaccionamos solo al cambio de categoría.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // ── Galería de imágenes (fuera de RHF: es un side-effect de archivos) ──────────
  // `existing` = imágenes ya persistidas (edición); al quitar una, se saca de aquí
  // y su publicId se marca en `removedPublicIds` para borrarla al guardar.
  // `newImages` = archivos recién elegidos (con preview blob:), se suben al guardar.
  const [existing, setExisting] = useState<AdminProductImage[]>(
    product?.images ?? [],
  );
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [removedPublicIds, setRemovedPublicIds] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  // Id del producto ya persistido. En creación arranca null y se fija con el id
  // devuelto por createProduct: así, si un paso posterior de imágenes falla, el
  // reintento hace updateProduct (NO recrea → sin duplicados). Ver mutationFn.
  const [savedId, setSavedId] = useState<number | null>(product?.id ?? null);

  const galleryCount = existing.length + newImages.length;

  // Revoca los blob: previews al desmontar para no filtrar memoria.
  useEffect(
    () => () => {
      newImages.forEach((img) => URL.revokeObjectURL(img.preview));
    },
    // Solo al desmontar: los blobs individuales ya se revocan al quitarlos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleFilesSelected(fileList: FileList) {
    setImageError(null);
    const available = MAX_IMAGES - galleryCount;
    if (available <= 0) {
      setImageError(`Máximo ${MAX_IMAGES} imágenes por producto.`);
      return;
    }

    const accepted: NewImage[] = [];
    let rejectedSize = false;
    let rejectedType = false;
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejectedType = true;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejectedSize = true;
        continue;
      }
      if (accepted.length >= available) break;
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }

    if (rejectedType)
      setImageError("Formato no permitido. Usa PNG, JPG o WEBP.");
    else if (rejectedSize)
      setImageError("Cada imagen debe pesar 5 MB o menos.");
    else if (Array.from(fileList).length > available)
      setImageError(`Solo se agregaron ${available} — máximo ${MAX_IMAGES} en total.`);

    if (accepted.length) setNewImages((prev) => [...prev, ...accepted]);
  }

  function removeExisting(publicId: string) {
    setExisting((prev) => prev.filter((img) => img.publicId !== publicId));
    setRemovedPublicIds((prev) => [...prev, publicId]);
    setImageError(null);
  }

  function removeNew(index: number) {
    setNewImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
    setImageError(null);
  }

  const orig = Number(originalPrice) || 0;
  const sale = Number(salePrice) || 0;
  const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
  // Stock derivado de las tallas repetidas (fuente única; el backend lo calcula igual).
  const derivedStock = parseSizes(sizesValue || "").length;

  // Persistencia real en un solo flujo: (1) crear/editar el producto (JSON, sin
  // imágenes) → (2) con su id, borrar las imágenes quitadas y subir las nuevas por
  // los endpoints dedicados. El id de un producto NUEVO solo existe tras crearlo.
  const mutation = useMutation({
    mutationFn: async (input: AdminProductInput) => {
      // Si ya tenemos id (edición, o una creación previa que persistió y luego
      // falló en las imágenes), actualizamos; solo creamos cuando aún no hay id.
      const saved =
        savedId != null
          ? await updateProduct(savedId, input)
          : await createProduct(input);
      const id = saved.id;
      // Fija el id apenas se crea: un reintento tras un fallo de imágenes ya no
      // recreará el producto (evita duplicados).
      if (savedId == null) setSavedId(id);
      // Borrar primero libera cupo antes de subir (respeta el tope de 3 total).
      // Cada borrado se saca de `removedPublicIds` en cuanto tiene éxito: si un
      // paso posterior falla, el reintento no vuelve a borrar un publicId ya ido.
      for (const publicId of removedPublicIds) {
        await deleteProductImage(id, publicId);
        setRemovedPublicIds((prev) => prev.filter((p) => p !== publicId));
      }
      if (newImages.length) {
        await addProductImages(
          id,
          newImages.map((img) => img.file),
        );
      }
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      onBack(saveNotice(saved.name, isEditing));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product!.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      onBack(deleteNotice(product!.name, res.softDeleted));
    },
  });

  const onSubmit = handleSubmit((data) => {
    const input: AdminProductInput = {
      name: data.name,
      description: data.description || undefined,
      originalPrice: data.originalPrice,
      salePrice: data.salePrice,
      unitCost: data.unitCost,
      type: data.type,
      sizes: data.sizes,
      code: data.code || undefined,
      weightKg: data.weightKg,
      lengthCm: data.lengthCm,
      widthCm: data.widthCm,
      heightCm: data.heightCm,
      visible: data.visible,
    };
    mutation.mutate(input);
  });

  const breadcrumbThird = isEditing ? product.name : "Nueva pieza";
  const isBusy = mutation.isPending || deleteMutation.isPending;

  return (
    <form onSubmit={onSubmit}>
      {/* Breadcrumb */}
      <nav className="mb-7 flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={() => onBack()}
          className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer"
        >
          Productos
        </button>
        <span className="text-amber-100/20 text-xs">/</span>
        <button
          type="button"
          onClick={() => onBack()}
          className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer"
        >
          {category.plural}
        </button>
        <span className="text-amber-100/20 text-xs">/</span>
        <span className="text-[10px] tracking-[0.25em] uppercase text-amber-50/80 truncate max-w-45">
          {breadcrumbThird}
        </span>
      </nav>

      {/* Page header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-amber-50 text-3xl">
            {isEditing ? "Editar producto" : "Agregar producto"}
          </h2>
          {mutation.isPending && (
            <span className="text-[9px] tracking-[0.2em] uppercase text-amber-100/30">
              Guardando…
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onBack()}
          className="shrink-0 border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-5 py-3 hover:border-amber-400/40 hover:text-amber-100/80 transition-all cursor-pointer flex items-center gap-2"
        >
          <span>←</span>
          <span>Volver a {category.plural}</span>
        </button>
      </div>

      {/* Main form card */}
      <div className="max-w-5xl bg-stone-900/60 border border-amber-400/10 p-7 space-y-7">
        {/* Top row: name + controls */}
        <div className="flex gap-6 items-start">
          {/* Name */}
          <div className="flex-1 min-w-0">
            <label htmlFor="field-name" className={labelCls}>
              Nombre
            </label>
            <input
              id="field-name"
              type="text"
              {...register("name")}
              className={`${inputCls} font-serif text-lg mb-1`}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Visible + Eliminar */}
          <div className="shrink-0 flex flex-col items-end gap-3">
            <Controller
              control={control}
              name="visible"
              render={({ field }) => (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="sr-only"
                    />
                    <div
                      className={[
                        "w-4 h-4 border flex items-center justify-center transition-colors",
                        field.value
                          ? "bg-amber-400/20 border-amber-400/70"
                          : "bg-transparent border-stone-600",
                      ].join(" ")}
                    >
                      {field.value && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 text-amber-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="1.5,6 4.5,9 10.5,3" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/50">
                    Visible
                  </span>
                </label>
              )}
            />

            {isEditing &&
              (confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-amber-100/45">
                    {deleteMutation.isPending ? "Eliminando…" : "¿Eliminar?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-[10px] tracking-[0.2em] uppercase text-red-400/80 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleteMutation.isPending}
                    className="text-[10px] tracking-[0.2em] uppercase text-amber-100/35 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="border border-amber-400/50 text-amber-400/80 text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-amber-400/10 transition-all cursor-pointer"
                >
                  Eliminar
                </button>
              ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-700/40" />

        {/* Galería de imágenes (hasta 3) */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/30">
              Imágenes del producto
            </p>
            <span className="text-[11px] text-amber-100/30">
              {galleryCount}/{MAX_IMAGES} · PNG/JPG/WEBP · ≤ 5 MB
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Imágenes ya persistidas (edición) */}
            {existing.map((img) => (
              <div
                key={img.publicId}
                className="relative w-28 h-28 border border-stone-700/60 overflow-hidden group/img"
              >
                <Image
                  src={img.url}
                  alt={name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label="Quitar imagen"
                  onClick={() => removeExisting(img.publicId)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/80 text-amber-100/70 backdrop-blur-sm transition-colors hover:border-red-500/70 hover:text-red-400 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Imágenes nuevas (preview blob:) */}
            {newImages.map((img, i) => (
              <div
                key={img.preview}
                className="relative w-28 h-28 border border-amber-400/30 overflow-hidden"
              >
                {/* Preview local (blob:) — next/image no optimiza object URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] tracking-[0.15em] uppercase text-amber-400/80 bg-stone-950/70 px-1.5 py-0.5">
                  Nueva
                </span>
                <button
                  type="button"
                  aria-label="Quitar imagen"
                  onClick={() => removeNew(i)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/80 text-amber-100/70 backdrop-blur-sm transition-colors hover:border-red-500/70 hover:text-red-400 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Tile para agregar (solo si queda cupo) */}
            {galleryCount < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 border border-dashed border-stone-600/60 flex flex-col items-center justify-center gap-1.5 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70 hover:bg-stone-800/30 transition-all cursor-pointer"
              >
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[9px] tracking-[0.2em] uppercase">
                  Subir foto
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFilesSelected(e.target.files);
              // Permite re-elegir el mismo archivo tras quitarlo.
              e.target.value = "";
            }}
          />

          {imageError ? (
            <p className={errorCls}>{imageError}</p>
          ) : galleryCount === 0 ? (
            <p className="mt-2 text-[11px] text-amber-100/30">
              Sin imágenes — el producto se mostrará con un degradado.
            </p>
          ) : null}
        </div>

        {/* Divider */}
        <div className="border-t border-stone-700/40" />

        {/* Prices row */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Categoría */}
            <div>
              <label htmlFor="field-type" className={labelCls}>
                Categoría
              </label>
              <select
                id="field-type"
                {...register("type")}
                className={`${inputCls} appearance-none`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.plural}
                  </option>
                ))}
              </select>
            </div>

            {/* Precio original */}
            <div>
              <label htmlFor="field-original" className={labelCls}>
                Precio original
              </label>
              <input
                id="field-original"
                type="number"
                min={0}
                step="any"
                {...register("originalPrice", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.originalPrice && (
                <p className={errorCls}>{errors.originalPrice.message}</p>
              )}
            </div>

            {/* Precio outlet */}
            <div>
              <label htmlFor="field-sale" className={labelCls}>
                Precio outlet
              </label>
              <input
                id="field-sale"
                type="number"
                min={0}
                step="any"
                {...register("salePrice", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.salePrice && (
                <p className={errorCls}>{errors.salePrice.message}</p>
              )}
            </div>

            {/* Descuento (calculado) */}
            <div>
              <label className={labelCls}>Descuento %</label>
              <div className={`${inputCls} text-amber-400/80 select-none`}>
                {discount > 0 ? discount : "—"}
              </div>
            </div>

            {/* Existencias (derivado de las tallas) */}
            <div>
              <label className={labelCls}>Existencias</label>
              <div
                className={`${inputCls} text-amber-100/60 select-none tabular-nums`}
                title="Se calcula de las tallas capturadas (repetir una talla suma unidades)"
              >
                {derivedStock}
              </div>
            </div>
          </div>

          {/* Discount preview */}
          {discount > 0 && orig > 0 && (
            <p className="mt-3 text-[11px] text-amber-400/70">
              {discount}% de descuento
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-stone-700/40" />

        {/* Costo y empaque */}
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/30 mb-4">
            Costo y empaque
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Costo unitario */}
            <div>
              <label htmlFor="field-unitcost" className={labelCls}>
                Costo unit.
              </label>
              <input
                id="field-unitcost"
                type="number"
                min={0}
                step="any"
                {...register("unitCost", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.unitCost && (
                <p className={errorCls}>{errors.unitCost.message}</p>
              )}
            </div>

            {/* Código / SKU */}
            <div>
              <label htmlFor="field-code" className={labelCls}>
                Código
              </label>
              <input
                id="field-code"
                type="text"
                placeholder="SKU"
                {...register("code")}
                className={inputCls}
              />
            </div>

            {/* Peso */}
            <div>
              <label htmlFor="field-weight" className={labelCls}>
                Peso (kg)
              </label>
              <input
                id="field-weight"
                type="number"
                min={0.01}
                step="any"
                {...register("weightKg", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.weightKg && (
                <p className={errorCls}>{errors.weightKg.message}</p>
              )}
            </div>

            {/* Largo */}
            <div>
              <label htmlFor="field-length" className={labelCls}>
                Largo (cm)
              </label>
              <input
                id="field-length"
                type="number"
                min={0.01}
                step="any"
                {...register("lengthCm", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.lengthCm && (
                <p className={errorCls}>{errors.lengthCm.message}</p>
              )}
            </div>

            {/* Ancho */}
            <div>
              <label htmlFor="field-width" className={labelCls}>
                Ancho (cm)
              </label>
              <input
                id="field-width"
                type="number"
                min={0.01}
                step="any"
                {...register("widthCm", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.widthCm && (
                <p className={errorCls}>{errors.widthCm.message}</p>
              )}
            </div>

            {/* Alto */}
            <div>
              <label htmlFor="field-height" className={labelCls}>
                Alto (cm)
              </label>
              <input
                id="field-height"
                type="number"
                min={0.01}
                step="any"
                {...register("heightCm", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.heightCm && (
                <p className={errorCls}>{errors.heightCm.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-700/40" />

        {/* Tallas + Descripción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="field-sizes" className={labelCls}>
              Tallas — repite una talla para sumar unidades
            </label>
            <input
              id="field-sizes"
              type="text"
              placeholder="25, 26, 26, 27"
              {...register("sizes")}
              className={inputCls}
            />
            {errors.sizes ? (
              <p className={errorCls}>{errors.sizes.message}</p>
            ) : (
              <p className="mt-1 text-[11px] text-amber-100/30">
                Ej. «25, 26, 26» = 1 unidad de la 25 y 2 de la 26 · {derivedStock} en total
              </p>
            )}
          </div>

          <div>
            <label htmlFor="field-desc" className={labelCls}>
              Descripción
            </label>
            <textarea
              id="field-desc"
              rows={4}
              placeholder="Descripción del producto…"
              {...register("description")}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Error de guardado */}
        {mutation.isError && (
          <p
            role="alert"
            className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
          >
            {productErrorMessage(mutation.error)}
          </p>
        )}
        {deleteMutation.isError && (
          <p
            role="alert"
            className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
          >
            {productErrorMessage(deleteMutation.error)}
          </p>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          {mutation.isPending && (
            <span className="self-center mr-4 text-[9px] tracking-[0.2em] uppercase text-amber-100/40">
              Guardando…
            </span>
          )}
          <button
            type="submit"
            disabled={isBusy}
            className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isEditing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </form>
  );
}
