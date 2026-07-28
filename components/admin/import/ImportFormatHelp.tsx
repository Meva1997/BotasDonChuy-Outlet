"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { COPY } from "./labels";

// Panel plegable con el formato del archivo. Documenta el encabezado canónico y —sobre todo—
// la notación `26x20`, que es lo que hace usable el restock desde una hoja de cálculo.

const COLUMNS: { header: string; note: string; required: string }[] = [
  { header: "Código", note: "SKU o clave. Es lo que empareja la fila con el producto.", required: "Recomendada" },
  { header: "Nombre", note: "Empareja por nombre exacto si no hay código.", required: "Obligatoria al crear" },
  { header: "Categoría", note: "bota · sombrero · ropa", required: "Obligatoria al crear" },
  { header: "Descripción", note: "Texto libre.", required: "Opcional" },
  { header: "Precio original", note: "Precio de lista, sin descuento.", required: "Obligatoria al crear" },
  { header: "Precio oferta", note: "No puede ser mayor al precio original.", required: "Obligatoria al crear" },
  { header: "Costo unitario", note: "Lo que te costó la pieza. Solo se ve en el panel.", required: "Obligatoria al crear" },
  { header: "Tallas", note: '"25, 26, 26" o "26x20" (20 piezas de la 26). Se pueden mezclar.', required: "Obligatoria al crear" },
  { header: "Peso (kg)", note: "Del paquete. Debe ser mayor que 0 para cotizar envío.", required: "Obligatoria al crear" },
  { header: "Largo (cm)", note: "Del paquete.", required: "Obligatoria al crear" },
  { header: "Ancho (cm)", note: "Del paquete.", required: "Obligatoria al crear" },
  { header: "Alto (cm)", note: "Del paquete.", required: "Obligatoria al crear" },
  { header: "Visible", note: "Sí / No. Si la omites, no se cambia.", required: "Opcional" },
];

export default function ImportFormatHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-3xl border border-amber-400/10 rounded-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="import-format-help"
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-stone-800/30 transition-colors cursor-pointer"
      >
        <span className="text-[10px] tracking-[0.25em] uppercase text-amber-100/50">
          Formato del archivo
        </span>
        <ChevronDown
          className={`size-4 text-amber-100/30 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div id="import-format-help" className="px-5 pb-5 space-y-4">
          {/* El aviso que más pesa en toda la pantalla: es la operación irreversible. */}
          <p className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5">
            {COPY.restockWarning}
          </p>

          <p className="text-amber-100/40 text-[13px] leading-relaxed">
            La primera fila es el encabezado y los productos empiezan en la segunda. Los nombres
            de columna no distinguen acentos ni mayúsculas, y se aceptan alias comunes
            (<span className="text-amber-100/60">SKU</span>,{" "}
            <span className="text-amber-100/60">Tipo</span>,{" "}
            <span className="text-amber-100/60">Precio de venta</span>…). Una columna que no se
            reconozca <strong className="text-amber-100/70 font-medium">no se importa</strong>, y
            te lo avisamos al revisar. Al actualizar, las columnas que <em>no</em> incluyas se
            dejan tal cual.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <caption className="sr-only">Columnas aceptadas por el importador</caption>
              <thead>
                <tr className="border-b border-amber-400/20">
                  <th scope="col" className="pb-2 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal">
                    Columna
                  </th>
                  <th scope="col" className="pb-2 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal">
                    Para qué sirve
                  </th>
                  <th scope="col" className="pb-2 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal">
                    ¿Obligatoria?
                  </th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((col) => (
                  <tr key={col.header} className="border-b border-amber-400/8">
                    <th scope="row" className="py-2 pr-4 align-top text-left text-amber-50 font-normal whitespace-nowrap">
                      {col.header}
                    </th>
                    <td className="py-2 pr-4 align-top text-amber-100/55">{col.note}</td>
                    <td className="py-2 align-top text-amber-100/35 text-xs whitespace-nowrap">
                      {col.required}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
