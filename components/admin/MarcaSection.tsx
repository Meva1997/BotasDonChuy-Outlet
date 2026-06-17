"use client";

import { useState, useRef } from "react";
import { BRAND } from "@/lib/brand";

interface MarcaData {
  brandName: string;
  heroText: string;
  tagline: string;
  cartNotice: string;
  footerNote: string;
  logoUrl: string | null;
}

type TextField = Exclude<keyof MarcaData, "logoUrl">;

const DEFAULTS: MarcaData = {
  brandName: BRAND.name,
  heroText: BRAND.heroText,
  tagline: BRAND.taglineLines.join("\n"),
  cartNotice: BRAND.cartNotice,
  footerNote: BRAND.footerNote,
  logoUrl: null,
};

const FIELDS: { key: TextField; label: string; multiline?: true }[] = [
  { key: "brandName", label: "Nombre de la marca" },
  { key: "heroText", label: "Texto superior del hero" },
  {
    key: "tagline",
    label: "Tagline (salto de línea = nueva línea)",
    multiline: true,
  },
  { key: "cartNotice", label: "Aviso del carrito" },
  { key: "footerNote", label: "Nota del pie de página" },
];

const inputCls =
  "w-full bg-stone-800/80 border border-stone-700/80 rounded-sm px-4 py-3 " +
  "text-amber-50 text-sm placeholder:text-amber-100/20 " +
  "focus:outline-none focus:border-amber-400/50 focus:bg-stone-800 transition-colors duration-150";

export default function MarcaSection() {
  const [data, setData] = useState<MarcaData>(DEFAULTS);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSave() {
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaveState("saved"), 700);
  }

  function handleField(key: TextField, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
    triggerSave();
  }

  function handleLogoFile(file: File) {
    const url = URL.createObjectURL(file);
    setData((prev) => ({ ...prev, logoUrl: url }));
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-amber-50 text-3xl mb-2">Marca</h2>
          <p className="text-amber-100/40 text-sm leading-relaxed">
            Identidad y textos visibles en la tienda. Se guarda automáticamente.
          </p>
        </div>
        <div className="pt-1 min-w-20 text-right">
          {saveState === "saving" && (
            <span className="text-[9px] tracking-[0.2em] uppercase text-amber-100/30">
              Guardando…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center justify-end gap-1.5 text-[9px] tracking-[0.2em] uppercase text-amber-400/60">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-stone-900/60 border border-amber-400/10 rounded-sm p-8 space-y-8">
        {/* Logo upload */}
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-amber-400/55 mb-3">
            Logo (Imagen)
          </label>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f?.type.startsWith("image/")) handleLogoFile(f);
            }}
            className={[
              "border border-dashed rounded-sm p-5 flex items-center gap-5 cursor-pointer",
              "transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-amber-400/40",
              isDragging
                ? "border-amber-400/50 bg-amber-400/5"
                : "border-stone-600/60 hover:border-amber-400/25 hover:bg-stone-800/30",
            ].join(" ")}
          >
            {/* Crosshatch thumbnail */}
            <div className="w-14 h-14 shrink-0 bg-stone-800 flex items-center justify-center overflow-hidden">
              {data.logoUrl ? (
                // Previsualización local (blob: URL) — next/image no optimiza object URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <svg
                  viewBox="0 0 56 56"
                  className="w-full h-full text-stone-600"
                  aria-hidden="true"
                >
                  {Array.from({ length: 9 }, (_, i) => (
                    <g key={i}>
                      <line
                        x1={i * 7}
                        y1="0"
                        x2="0"
                        y2={i * 7}
                        stroke="currentColor"
                        strokeWidth="0.8"
                      />
                      <line
                        x1="56"
                        y1={i * 7}
                        x2={i * 7}
                        y2="56"
                        stroke="currentColor"
                        strokeWidth="0.8"
                      />
                    </g>
                  ))}
                </svg>
              )}
            </div>
            <div>
              <p className="text-amber-100/55 text-sm">Clic para subir</p>
              <p className="text-amber-100/30 text-xs mt-0.5">
                PNG / JPG · se ajusta a 40px de alto
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoFile(f);
            }}
          />

          {data.logoUrl && (
            <button
              onClick={() => setData((prev) => ({ ...prev, logoUrl: null }))}
              className="mt-2.5 text-[10px] tracking-[0.15em] uppercase text-amber-400/40 hover:text-amber-400/70 transition-colors"
            >
              quitar logo
            </button>
          )}
        </div>

        {/* Text fields */}
        {FIELDS.map(({ key, label, multiline }) => (
          <div key={key}>
            <label
              htmlFor={`field-${key}`}
              className="block text-[10px] tracking-[0.3em] uppercase text-amber-400/55 mb-2.5"
            >
              {label}
            </label>
            {multiline ? (
              <textarea
                id={`field-${key}`}
                value={data[key]}
                onChange={(e) => handleField(key, e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            ) : (
              <input
                id={`field-${key}`}
                type="text"
                value={data[key]}
                onChange={(e) => handleField(key, e.target.value)}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
