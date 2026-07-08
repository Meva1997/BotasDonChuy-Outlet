"use client";

import { useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminProductKeys,
  createProduct,
  updateProduct,
  deleteProduct,
  type AdminProduct,
  type AdminProductInput,
} from "@/lib/api/adminProducts";
import { CATEGORIES, type CategoryInfo } from "@/lib/categories";

interface Props {
  category: CategoryInfo;
  product?: AdminProduct;
  onBack: () => void;
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
    weightKg: nonNegNumber,
    lengthCm: nonNegNumber,
    widthCm: nonNegNumber,
    heightCm: nonNegNumber,
    description: z.string(),
    imageUrl: z.string().nullable(),
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

function CrosshatchPlaceholder() {
  return (
    <div className="w-full h-full bg-stone-800">
      <svg
        aria-hidden="true"
        className="w-full h-full text-stone-700"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {Array.from({ length: 14 }, (_, i) => (
          <g key={i}>
            <line
              x1={i * 10}
              y1="0"
              x2="0"
              y2={i * 10}
              stroke="currentColor"
              strokeWidth="0.6"
            />
            <line
              x1="100"
              y1={i * 10}
              x2={i * 10}
              y2="100"
              stroke="currentColor"
              strokeWidth="0.6"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

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
    formState: { errors },
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
      weightKg: product?.weightKg ?? 0,
      lengthCm: product?.lengthCm ?? 0,
      widthCm: product?.widthCm ?? 0,
      heightCm: product?.heightCm ?? 0,
      description: product?.description ?? "",
      imageUrl: product?.imageSrc ?? null,
    },
  });

  const originalPrice = useWatch({ control, name: "originalPrice" });
  const salePrice = useWatch({ control, name: "salePrice" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const name = useWatch({ control, name: "name" });
  const sizesValue = useWatch({ control, name: "sizes" });

  const orig = Number(originalPrice) || 0;
  const sale = Number(salePrice) || 0;
  const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
  // Stock derivado de las tallas repetidas (fuente única; el backend lo calcula igual).
  const derivedStock = parseSizes(sizesValue || "").length;

  // Persistencia real: crear o editar según el modo. Se envía `sizes` como CSV
  // (repetición = stock); el backend agrupa en filas ProductSize y recalcula stock.
  const mutation = useMutation({
    mutationFn: (input: AdminProductInput) =>
      isEditing ? updateProduct(product.id, input) : createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      onBack();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(product!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      onBack();
    },
  });

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setValue("imageUrl", URL.createObjectURL(file));
  }

  const onSubmit = handleSubmit((data) => {
    const input: AdminProductInput = {
      name: data.name,
      description: data.description || undefined,
      originalPrice: data.originalPrice,
      salePrice: data.salePrice,
      unitCost: data.unitCost,
      type: data.type,
      sizes: data.sizes,
      imageSrc: data.imageUrl ?? undefined,
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
          onClick={onBack}
          className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer"
        >
          Productos
        </button>
        <span className="text-amber-100/20 text-xs">/</span>
        <button
          type="button"
          onClick={onBack}
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
          onClick={onBack}
          className="shrink-0 border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-5 py-3 hover:border-amber-400/40 hover:text-amber-100/80 transition-all cursor-pointer flex items-center gap-2"
        >
          <span>←</span>
          <span>Volver a {category.plural}</span>
        </button>
      </div>

      {/* Main form card */}
      <div className="max-w-5xl bg-stone-900/60 border border-amber-400/10 p-7 space-y-7">
        {/* Top row: image + name + controls */}
        <div className="flex gap-6 items-start">
          {/* Image thumbnail */}
          <div className="shrink-0 w-28 h-28 border border-stone-700/60 overflow-hidden relative">
            {imageUrl ? (
              <Image src={imageUrl} alt={name} fill className="object-cover" />
            ) : (
              <CrosshatchPlaceholder />
            )}
          </div>

          {/* Name + photo upload */}
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
            {errors.name && (
              <p className={errorCls}>{errors.name.message}</p>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:border-amber-400/40 hover:text-amber-100/80 transition-all cursor-pointer shrink-0"
              >
                Subir foto
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={() => setValue("imageUrl", null)}
                  className="text-[10px] tracking-[0.15em] uppercase text-amber-400/40 hover:text-amber-400/70 transition-colors cursor-pointer"
                >
                  Quitar foto
                </button>
              ) : (
                <span className="text-amber-100/25 text-xs">
                  sin foto — se muestra degradado
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageFile(f);
                }}
              />
            </div>
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
                min={0}
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
                min={0}
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
                min={0}
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
                min={0}
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
