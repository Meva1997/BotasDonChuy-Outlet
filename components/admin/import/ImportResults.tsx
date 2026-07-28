"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_LUXE } from "@/lib/ui/motion";
import type { ImportCommitResponse } from "@/lib/api/adminProductImport";
import { ImportResultBadge } from "./ImportActionBadge";
import { commitSummaryNotice, rowCount } from "./labels";

// Resumen tras confirmar + detalle por fila. El foco viaja al encabezado para que quien navega
// con teclado o lector de pantalla no se quede en un botón que ya no existe.

const STATS: { key: "created" | "updated" | "unchanged" | "failed"; label: string; classes: string }[] = [
  { key: "created", label: "Creados", classes: "text-emerald-400 border-emerald-400/30" },
  { key: "updated", label: "Actualizados", classes: "text-sky-400 border-sky-400/30" },
  { key: "unchanged", label: "Sin cambios", classes: "text-stone-400 border-stone-500/30" },
  { key: "failed", label: "Con error", classes: "text-red-400 border-red-400/30" },
];

interface ImportResultsProps {
  response: ImportCommitResponse;
  failedRows: number[];
  onFixErrors: () => void;
  onStartOver: () => void;
}

export default function ImportResults({
  response,
  failedRows,
  onFixErrors,
  onStartOver,
}: ImportResultsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const { summary, rows } = response;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-amber-50 text-3xl mb-2 outline-none"
        >
          Importación aplicada
        </h2>
        <p role="status" className="text-amber-100/45 text-sm">
          {commitSummaryNotice(summary)}
        </p>
      </div>

      {/* El único momento animado de la pantalla: los contadores del resultado. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reduceMotion ? 0 : i * 0.06, ease: EASE_LUXE }}
            className={`border rounded-md px-5 py-4 bg-stone-900/50 ${
              summary[stat.key] > 0 ? stat.classes : "border-stone-700/40 text-amber-100/25"
            }`}
          >
            <p className="text-3xl font-serif tabular-nums leading-none mb-2">
              {summary[stat.key]}
            </p>
            <p className="text-[10px] tracking-[0.25em] uppercase opacity-70">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {summary.failed > 0 && (
        <p
          role="alert"
          className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
        >
          {rowCount(summary.failed)} no se {summary.failed === 1 ? "aplicó" : "aplicaron"}. El
          resto sí quedó guardado: al corregir y reintentar, solo se envían las que fallaron —
          las que ya se aplicaron quedan bloqueadas para que su stock no se sume dos veces.
        </p>
      )}

      <div className="rounded-lg border border-amber-400/20 bg-stone-900/60 p-4 sm:p-6 overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <caption className="sr-only">Resultado de cada fila enviada</caption>
          <thead>
            <tr className="border-b border-amber-400/20">
              <th
                scope="col"
                className="pb-2.5 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal w-14"
              >
                Fila
              </th>
              <th
                scope="col"
                className="pb-2.5 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Producto
              </th>
              <th
                scope="col"
                className="pb-2.5 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Resultado
              </th>
              <th
                scope="col"
                className="pb-2.5 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
              >
                Detalle
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-amber-400/10 last:border-0">
                <th
                  scope="row"
                  className="py-3 pr-4 align-top text-left font-mono text-xs text-amber-100/35 tabular-nums font-normal"
                >
                  {row.row}
                </th>
                <td className="py-3 pr-4 align-top">
                  <p className="text-amber-50 truncate max-w-60" title={row.name ?? undefined}>
                    {row.name ?? "—"}
                  </p>
                  {row.code && (
                    <p className="text-amber-100/30 text-xs font-mono truncate">{row.code}</p>
                  )}
                </td>
                <td className="py-3 pr-4 align-top">
                  <ImportResultBadge status={row.status} />
                </td>
                <td className="py-3 align-top text-amber-100/50 text-[13px] leading-relaxed">
                  {/* El backend ya manda oraciones en español listas para mostrar. */}
                  {row.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {failedRows.length > 0 && (
          <button
            type="button"
            onClick={onFixErrors}
            className="border border-amber-400 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-3 hover:bg-amber-400/10 transition-colors cursor-pointer"
          >
            Corregir las filas con error
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver}
          className="border border-stone-600/60 text-amber-100/50 text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:border-amber-400/40 hover:text-amber-100/80 transition-all cursor-pointer"
        >
          Importar otro archivo
        </button>
      </div>
    </div>
  );
}
