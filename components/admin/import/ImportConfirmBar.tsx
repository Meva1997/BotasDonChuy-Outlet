"use client";

import { useState } from "react";
import { COPY, rowCount } from "./labels";

// Barra fija de confirmación. Va sticky a propósito: en un archivo de 500 filas el compromiso
// —cuántas filas se van a aplicar y que el stock se SUMA— nunca puede quedar fuera de pantalla.
// Es la decisión de seguridad más importante de esta UI.

interface ImportConfirmBarProps {
  selectedCount: number;
  /** Dependencias rotas: no se bloquea, se pide una confirmación extra. */
  hasBrokenDependencies: boolean;
  /** Mismo lote que el último enviado: el backend lo rechazaría con 409. */
  isSameBatch: boolean;
  cooldownSeconds: number;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}

export default function ImportConfirmBar({
  selectedCount,
  hasBrokenDependencies,
  isSameBatch,
  cooldownSeconds,
  isPending,
  error,
  onConfirm,
}: ImportConfirmBarProps) {
  // Confirmación inline (nunca window.confirm) — mismo patrón que OrderDetailModal.
  const [armed, setArmed] = useState(false);

  const needsConfirm = hasBrokenDependencies || isSameBatch;
  // Derivado, no sincronizado con un efecto: si el motivo de alarma desaparece (el dueño
  // seleccionó la fila que faltaba), el botón vuelve solo a su estado normal.
  const confirming = armed && needsConfirm;

  const disabled = selectedCount === 0 || isPending;

  return (
    <div className="sticky bottom-0 -mx-6 md:-mx-10 mt-8 bg-tobacco-950/95 backdrop-blur-sm border-t border-amber-400/15">
      {/* Filo de pan de oro, mismo recurso que el modal de pedidos. */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-linear-to-r from-transparent via-amber-400/50 to-transparent"
      />

      <div className="px-6 md:px-10 py-4 space-y-3">
        {error && (
          <p
            role="alert"
            className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
          >
            {error}
            {cooldownSeconds > 0 && (
              <span className="block mt-1 text-red-400/70">
                Podrás reintentarlo en unos {cooldownSeconds} s.
              </span>
            )}
          </p>
        )}

        {isSameBatch && !error && (
          <p
            role="status"
            className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
          >
            {COPY.sameBatchWarning}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-amber-50">
              {selectedCount === 0 ? (
                <span className="text-amber-100/40">No hay ninguna fila seleccionada</span>
              ) : (
                <>
                  Vas a aplicar{" "}
                  <span className="tabular-nums font-medium">{rowCount(selectedCount)}</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-amber-100/35 leading-relaxed mt-0.5 max-w-2xl">
              {COPY.restockWarning}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {confirming && (
              <button
                type="button"
                onClick={() => setArmed(false)}
                disabled={isPending}
                className="text-[10px] uppercase tracking-widest text-amber-100/40 hover:text-amber-100/70 transition-colors cursor-pointer disabled:opacity-50"
              >
                Revisar de nuevo
              </button>
            )}

            <button
              type="button"
              aria-busy={isPending}
              disabled={disabled}
              onClick={() => {
                if (needsConfirm && !confirming) {
                  setArmed(true);
                  return;
                }
                setArmed(false);
                onConfirm();
              }}
              className={[
                "uppercase tracking-[0.2em] text-[10px] px-6 py-3 transition-colors cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                confirming
                  ? "bg-red-600/80 border border-red-500/80 text-amber-50 hover:bg-red-600"
                  : "border border-amber-400 text-amber-400 hover:bg-amber-400/10 active:bg-amber-400/20",
              ].join(" ")}
            >
              {isPending
                ? "Aplicando…"
                : confirming
                  ? "Aplicar de todos modos"
                  : selectedCount === 0
                    ? "Selecciona filas para aplicar"
                    : `Aplicar ${rowCount(selectedCount)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
