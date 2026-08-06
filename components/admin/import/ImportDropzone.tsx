"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { MAX_IMPORT_FILE_BYTES, XLSX_MIME_TYPE } from "@/lib/api/adminProductImport";
import { COPY } from "./labels";

// Selector del .xlsx. Espeja los límites del backend (../backend/src/middlewares/upload.ts:
// 2 MB, mimetype OOXML) para no gastar una petición en un archivo que va a rebotar.

/** Ruta de la plantilla con el encabezado canónico (ver scripts/generate-import-template.mjs). */
export const TEMPLATE_HREF = "/product-import-template.xlsx";

/**
 * Nombre con el que se guarda la descarga. El archivo vive en inglés como el resto del repo,
 * pero quien lo abre es el dueño de la tienda: en su carpeta de descargas debe leerse en español.
 */
export const TEMPLATE_DOWNLOAD_NAME = "plantilla-importacion-productos.xlsx";

/**
 * Valida el archivo antes de subirlo.
 *
 * La EXTENSIÓN es la autoridad y el mimetype solo veta. `file.type` llega vacío o como
 * `application/octet-stream` con mucha frecuencia (Windows sin el tipo OOXML registrado, o al
 * arrastrar desde ciertos orígenes); rechazar por eso rompería subidas legítimas. El backend
 * hace la comprobación dura de todos modos.
 */
export function validateImportFile(file: File): string | null {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xls")) {
    return "El archivo es .xls (formato viejo). Ábrelo en Excel y guárdalo como .xlsx.";
  }
  if (!name.endsWith(".xlsx")) {
    return "Solo se aceptan archivos .xlsx. Si tu archivo es .csv o .xls, guárdalo como .xlsx desde Excel.";
  }
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `El archivo pesa ${mb} MB y el máximo son 2 MB. Divídelo en varios archivos.`;
  }
  // Solo vetamos cuando el navegador SÍ reportó un tipo y no es el de .xlsx.
  if (file.type && file.type !== XLSX_MIME_TYPE && file.type !== "application/octet-stream") {
    return "El archivo no parece un .xlsx real. Vuelve a guardarlo desde Excel como «Libro de Excel (.xlsx)».";
  }
  return null;
}

interface ImportDropzoneProps {
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  error: string | null;
  disabled?: boolean;
}

export default function ImportDropzone({
  onFile,
  onReject,
  error,
  disabled = false,
}: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Contador de profundidad, no booleano: los hijos anidados disparan `dragleave` al pasar el
  // cursor sobre ellos, y con un booleano el resaltado parpadea.
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    if (files.length > 1) {
      // Se rechaza el lote entero en vez de tomar el primero y avisar: el aviso no se alcanzaba
      // a ver (el análisis arranca en la misma pasada, limpia `fileError` y desmonta esto), y
      // elegir por el dueño cuál de varios archivos se importa es justo la clase de suposición
      // que acaba sumando el stock del archivo equivocado.
      onReject(
        `Soltaste ${files.length} archivos. Arrastra solo el .xlsx que quieres importar.`
      );
      return;
    }
    const file = files[0];
    const problem = validateImportFile(file);
    if (problem) {
      onReject(problem);
      return;
    }
    onFile(file);
  };

  const endDrag = () => {
    dragDepth.current = 0;
    setIsDragging(false);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (disabled) return;
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          endDrag();
          if (disabled) return;
          // Una carpeta soltada llega como un item sin archivo utilizable.
          const entry = e.dataTransfer.items?.[0]?.webkitGetAsEntry?.();
          if (entry?.isDirectory) {
            onReject("Soltaste una carpeta. Arrastra el archivo .xlsx directamente.");
            return;
          }
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "border border-dashed rounded-sm px-6 py-12 flex flex-col items-center text-center gap-4",
          "transition-all duration-200",
          disabled
            ? "border-stone-700/50 opacity-50"
            : isDragging
              ? "border-amber-400/60 bg-amber-400/5"
              : "border-stone-600/60 hover:border-amber-400/30 hover:bg-stone-800/25",
        ].join(" ")}
      >
        <FileSpreadsheet
          className={`size-9 transition-colors ${isDragging ? "text-amber-400" : "text-amber-100/25"}`}
          strokeWidth={1}
        />

        <div className="space-y-1.5">
          <p className="font-serif text-amber-50 text-xl">{COPY.dropzoneTitle}</p>
          <p className="text-amber-100/40 text-sm">{COPY.dropzoneHint}</p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2.5 border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="size-3.5" strokeWidth={1.5} />
          Elegir archivo
        </button>

        <p className="text-[10px] tracking-[0.2em] uppercase text-amber-100/25">
          {COPY.dropzoneLimits}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            // Sin esto, volver a elegir el MISMO archivo no dispara `change`.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
        >
          {error}
        </p>
      )}

      <a
        href={TEMPLATE_HREF}
        download={TEMPLATE_DOWNLOAD_NAME}
        className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-amber-100/45 hover:text-amber-400 transition-colors"
      >
        <Download className="size-3.5" strokeWidth={1.5} />
        Descargar plantilla de ejemplo
      </a>
    </div>
  );
}
