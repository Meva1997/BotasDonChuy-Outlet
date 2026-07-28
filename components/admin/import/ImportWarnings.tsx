"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

// Avisos a NIVEL ARCHIVO del preview: sobre todo, columnas que no se reconocieron y por lo
// tanto no se van a importar. Son el aviso que evita la importación fantasma (el dueño cree
// que actualizó una columna que en realidad se ignoró), así que van fijos arriba de la tabla y
// su conteo sigue visible aunque se colapse el detalle.
//
// `role="status"` y no `alert`: son advertencias, no errores — el archivo sí se puede aplicar.

export default function ImportWarnings({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(true);

  if (warnings.length === 0) return null;

  return (
    <div
      role="status"
      className="border border-amber-400/25 bg-amber-400/5 rounded-md overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="import-file-warnings"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-400/5 transition-colors cursor-pointer"
      >
        <AlertTriangle className="size-4 shrink-0 text-amber-400" strokeWidth={1.5} />
        <span className="flex-1 text-[12px] tracking-[0.1em] uppercase text-amber-200/90">
          {warnings.length === 1
            ? "1 aviso sobre el archivo"
            : `${warnings.length} avisos sobre el archivo`}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-amber-400/50 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <ul id="import-file-warnings" className="px-4 pb-3.5 space-y-1.5">
          {warnings.map((warning, i) => (
            <li
              key={i}
              className="text-[12px] leading-relaxed text-amber-200/75 flex gap-2.5"
            >
              <span aria-hidden="true" className="text-amber-400/50 select-none">
                ·
              </span>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
