"use client";

import { useRef } from "react";
import Image from "next/image";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MockProduct } from "@/db/mockProducts";
import { CATEGORIES, type CategoryInfo } from "@/lib/categories";

interface Props {
  category: CategoryInfo;
  product?: MockProduct;
  onBack: () => void;
}

const productSchema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    visible: z.boolean(),
    type: z.enum(["bota", "sombrero", "ropa"]),
    originalPrice: z.number().nonnegative("Debe ser ≥ 0"),
    salePrice: z.number().nonnegative("Debe ser ≥ 0"),
    stock: z.number().int().nonnegative("Debe ser ≥ 0"),
    sizes: z.string(),
    description: z.string(),
    imageUrl: z.string().nullable(),
  })
  .refine((d) => d.salePrice <= d.originalPrice, {
    message: "El precio outlet no puede superar el precio original",
    path: ["salePrice"],
  });

type ProductFormData = z.infer<typeof productSchema>;

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

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "Nueva pieza",
      visible: true,
      type: (product?.type ?? category.type) as ProductFormData["type"],
      originalPrice: product?.originalPrice ?? 1000,
      salePrice: product?.salePrice ?? 400,
      stock: product?.stock ?? 1,
      sizes: product?.sizes?.join(", ") ?? "",
      description: product?.description ?? "",
      imageUrl: product?.imageSrc ?? null,
    },
  });

  const originalPrice = useWatch({ control, name: "originalPrice" });
  const salePrice = useWatch({ control, name: "salePrice" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const name = useWatch({ control, name: "name" });

  const orig = Number(originalPrice) || 0;
  const sale = Number(salePrice) || 0;
  const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setValue("imageUrl", URL.createObjectURL(file));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit(_data: ProductFormData) {
    // TODO: persist to backend
  }

  const breadcrumbThird = isEditing ? product.name : "Nueva pieza";

  const saveLabel = isSubmitting
    ? "Guardando…"
    : isSubmitSuccessful
      ? "Guardado"
      : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
          {isSubmitting && (
            <span className="text-[9px] tracking-[0.2em] uppercase text-amber-100/30">
              Guardando…
            </span>
          )}
          {isSubmitSuccessful && !isSubmitting && (
            <span className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-amber-400/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 inline-block" />
              Guardado
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

            {isEditing && (
              <button
                type="button"
                className="border border-amber-400/50 text-amber-400/80 text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-amber-400/10 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            )}
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

            {/* Existencias */}
            <div>
              <label htmlFor="field-stock" className={labelCls}>
                Existencias
              </label>
              <input
                id="field-stock"
                type="number"
                min={0}
                {...register("stock", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.stock && (
                <p className={errorCls}>{errors.stock.message}</p>
              )}
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

        {/* Tallas + Descripción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="field-sizes" className={labelCls}>
              Tallas (separadas por coma)
            </label>
            <input
              id="field-sizes"
              type="text"
              placeholder="25, 26, 27, 28"
              {...register("sizes")}
              className={inputCls}
            />
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

        {/* Save button */}
        <div className="flex justify-end pt-2">
          {saveLabel && (
            <span className="self-center mr-4 text-[9px] tracking-[0.2em] uppercase text-amber-100/40">
              {saveLabel}
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isEditing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </form>
  );
}
