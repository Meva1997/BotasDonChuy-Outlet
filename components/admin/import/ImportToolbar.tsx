"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Undo2, X } from "lucide-react";
import type { ImportPreviewResponse } from "@/lib/api/adminProductImport";
import { ACTION_META, rowCount } from "./labels";
import type { ImportFilter } from "./types";
import type { DependencyReport } from "./dependencies";

// Filtros, doble conteo y avisos de lote. El doble conteo es deliberado: el resumen del ARCHIVO
// y lo que se VA A APLICAR responden preguntas distintas, y enseñar solo el primero deja al
// dueño creyendo que aplicará más de lo que realmente seleccionó.

const CHIP_BASE =
  "px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase rounded border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

interface ImportToolbarProps {
  plan: ImportPreviewResponse;
  counts: { create: number; update: number; unchanged: number; error: number; total: number };
  filter: ImportFilter;
  selectedCount: number;
  editCount: number;
  invalidCount: number;
  reactivateCount: number;
  dependencies: DependencyReport;
  fileName: string | null;
  /** Filas ya aplicadas con éxito: mientras haya alguna, no se puede releer el archivo. */
  appliedCount: number;
  canReanalyze: boolean;
  disabled: boolean;
  isReanalyzing: boolean;
  onFilterChange: (filter: ImportFilter) => void;
  onFixDependencies: () => void;
  onRevertAllEdits: () => void;
  onReanalyze: () => void;
  onStartOver: () => void;
}

export default function ImportToolbar({
  plan,
  counts,
  filter,
  selectedCount,
  editCount,
  invalidCount,
  reactivateCount,
  dependencies,
  fileName,
  appliedCount,
  canReanalyze,
  disabled,
  isReanalyzing,
  onFilterChange,
  onFixDependencies,
  onRevertAllEdits,
  onReanalyze,
  onStartOver,
}: ImportToolbarProps) {
  // Confirmación inline para lo que descarta trabajo (nunca window.confirm — el repo no lo usa
  // en ningún flujo destructivo). `null` = ninguna acción esperando confirmación.
  const [confirming, setConfirming] = useState<"revert" | "reanalyze" | "startOver" | null>(null);

  /** Pide confirmación solo si hay ediciones que perder; si no, ejecuta directo. */
  const guarded = (
    key: "revert" | "reanalyze" | "startOver",
    action: () => void,
    needsConfirm: boolean
  ) => {
    if (!needsConfirm || confirming === key) {
      setConfirming(null);
      action();
      return;
    }
    setConfirming(key);
  };

  const filters: { value: ImportFilter; label: string; count: number }[] = [
    { value: "all", label: "Todas", count: counts.total },
    { value: "create", label: ACTION_META.create.label, count: counts.create },
    { value: "update", label: ACTION_META.update.label, count: counts.update },
    { value: "unchanged", label: ACTION_META.unchanged.label, count: counts.unchanged },
    { value: "error", label: ACTION_META.error.label, count: counts.error },
  ];

  // El `summary` del backend solo se usa como verificación cruzada: la tabla es lo que el dueño
  // puede auditar, así que si discrepan mandan los conteos derivados de `rows`.
  //
  // En un efecto, no en el cuerpo del render: ahí se dispararía en cada re-render (incluida cada
  // tecla del editor inline) y ahogaría la consola justo cuando sirve para depurar.
  const summaryMismatch =
    plan.summary.total !== counts.total ||
    plan.summary.created !== counts.create ||
    plan.summary.updated !== counts.update;

  useEffect(() => {
    if (!summaryMismatch) return;
    console.warn(
      "El resumen del preview no coincide con las filas recibidas; se usan los conteos de las filas.",
      { summary: plan.summary, counts }
    );
  }, [summaryMismatch, plan.summary, counts]);

  return (
    <div className="space-y-4">
      {/* Doble conteo */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-amber-100/40 font-sans">
          <span className="text-amber-100/60">Archivo:</span>{" "}
          {fileName && <span className="font-mono text-amber-100/50">{fileName}</span>}
          {fileName && " · "}
          {rowCount(counts.total)} · {counts.create} nuevos · {counts.update} restock ·{" "}
          {counts.unchanged} sin cambios · {counts.error} con error
        </p>
        <p className="text-sm text-amber-50 font-sans">
          <span className="text-amber-100/50 text-xs tracking-[0.2em] uppercase mr-2">
            Vas a aplicar
          </span>
          <span className="tabular-nums font-medium">{rowCount(selectedCount)}</span>
          {reactivateCount > 0 && (
            <span className="text-amber-400/80 text-xs ml-2">
              · {reactivateCount} {reactivateCount === 1 ? "producto se reactivará" : "productos se reactivarán"}
            </span>
          )}
        </p>
      </div>

      {/* Filtros + acciones de lote */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="radiogroup" aria-label="Filtrar filas por acción" className="flex flex-wrap gap-1.5">
          {filters.map((option) => {
            const isActive = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={option.count === 0 && option.value !== "all"}
                onClick={() => onFilterChange(option.value)}
                className={[
                  CHIP_BASE,
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-400/10"
                    : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/50 hover:text-amber-100/70",
                ].join(" ")}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-60">{option.count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editCount > 0 && (
            <button
              type="button"
              onClick={() => guarded("revert", onRevertAllEdits, true)}
              disabled={disabled}
              className={`flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border px-3 py-2 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                confirming === "revert"
                  ? "border-red-400/60 text-red-400 bg-red-500/10"
                  : "border-amber-400/20 text-amber-100/40 hover:text-amber-400 hover:border-amber-400/40"
              }`}
            >
              <Undo2 className="size-3.5" strokeWidth={1.5} />
              {confirming === "revert"
                ? `¿Descartar ${editCount}?`
                : `Descartar mis ediciones (${editCount})`}
            </button>
          )}
          {/* Con filas ya aplicadas el botón NO se ofrece (ver `canReanalyze`): el plan nuevo
              se calcularía contra el catálogo ya actualizado y volvería a proponer el restock
              que acaba de sumarse. Se retira en vez de deshabilitarse porque no hay nada que
              esperar a que se cumpla — la salida es "Empezar de nuevo". */}
          {canReanalyze && (
            <button
              type="button"
              onClick={() => guarded("reanalyze", onReanalyze, editCount > 0)}
              disabled={disabled || isReanalyzing}
              title="Vuelve a leer el mismo archivo contra el catálogo actual."
              className={`flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border px-3 py-2 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                confirming === "reanalyze"
                  ? "border-red-400/60 text-red-400 bg-red-500/10"
                  : "border-amber-400/20 text-amber-100/40 hover:text-amber-400 hover:border-amber-400/40"
              }`}
            >
              <RefreshCw
                className={`size-3.5 ${isReanalyzing ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              {confirming === "reanalyze" ? "¿Descartar ediciones?" : "Volver a analizar"}
            </button>
          )}
          <button
            type="button"
            onClick={() => guarded("startOver", onStartOver, editCount > 0)}
            disabled={disabled}
            className={`flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase border px-3 py-2 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              confirming === "startOver"
                ? "border-red-400/60 text-red-400 bg-red-500/10"
                : "border-amber-400/20 text-amber-100/40 hover:text-red-400 hover:border-red-400/40"
            }`}
          >
            <X className="size-3.5" strokeWidth={1.5} />
            {confirming === "startOver" ? "¿Descartar todo?" : "Empezar de nuevo"}
          </button>
          {confirming && (
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {confirming === "reanalyze" && (
        <p
          role="status"
          className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
        >
          Volver a analizar relee el archivo original, así que tus {editCount}{" "}
          {editCount === 1 ? "fila editada" : "filas editadas"} se{" "}
          {editCount === 1 ? "pierde" : "pierden"}. Solo hace falta si el catálogo cambió desde
          que subiste el archivo.
        </p>
      )}

      {appliedCount > 0 && (
        <p
          role="status"
          className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
        >
          Ya {appliedCount === 1 ? "se aplicó" : "se aplicaron"} {rowCount(appliedCount)} de este
          archivo, así que {appliedCount === 1 ? "queda" : "quedan"} con candado y «Volver a
          analizar» deja de estar disponible: un plan nuevo se calcularía contra el catálogo ya
          actualizado y volvería a proponer ese restock, sumando el stock otra vez. Para trabajar
          con el catálogo de ahora, empieza de nuevo.
        </p>
      )}

      {/* Avisos de lote */}
      {invalidCount > 0 && (
        <p
          role="alert"
          className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
        >
          {rowCount(invalidCount)} {invalidCount === 1 ? "tiene" : "tienen"} errores de captura y
          no se {invalidCount === 1 ? "puede" : "pueden"} aplicar. Corrígel
          {invalidCount === 1 ? "a" : "as"} o déjal{invalidCount === 1 ? "a" : "as"} fuera — el
          resto del lote sí se aplica.
        </p>
      )}

      {/* `role="alert"` va en el contenedor, no en el <p>: el botón de reparación es parte del
          aviso, y así se anuncia junto con el problema en vez de quedar fuera de la región. */}
      {dependencies.broken.length > 0 && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center gap-3 text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
        >
          <AlertTriangle className="size-4 shrink-0" strokeWidth={1.5} />
          <p className="flex-1">
            {rowCount(dependencies.broken.length)}{" "}
            {dependencies.broken.length === 1 ? "depende" : "dependen"} de un producto que otra
            fila de este archivo iba a crear, pero esa fila no se va a aplicar. Así como está,{" "}
            {dependencies.broken.length === 1 ? "esa fila" : "esas filas"} dará
            {dependencies.broken.length === 1 ? "" : "n"} de alta un producto distinto al previsto,
            o fallará{dependencies.broken.length === 1 ? "" : "n"}.
          </p>
          {dependencies.missingProviders.length > 0 && (
            <button
              type="button"
              onClick={onFixDependencies}
              disabled={disabled}
              className="shrink-0 text-[10px] tracking-[0.2em] uppercase text-amber-400 border border-amber-400/50 px-3 py-2 rounded hover:bg-amber-400/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seleccionar las filas faltantes
            </button>
          )}
        </div>
      )}

      {dependencies.duplicateCreates.length > 0 && (
        <p
          role="status"
          className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
        >
          Hay {dependencies.duplicateCreates.length}{" "}
          {dependencies.duplicateCreates.length === 1 ? "producto" : "productos"} que se
          dar{dependencies.duplicateCreates.length === 1 ? "ía" : "ían"} de alta dos veces desde
          este mismo archivo. Revisa que no haya filas repetidas antes de aplicar.
        </p>
      )}
    </div>
  );
}
