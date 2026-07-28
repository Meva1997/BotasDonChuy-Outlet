"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import {
  commitProductImport,
  importCommitErrorMessage,
  importPreviewErrorMessage,
  previewProductImport,
  type ImportRowInput,
} from "@/lib/api/adminProductImport";
import { adminProductKeys } from "@/lib/api/adminProducts";
import { productKeys } from "@/lib/api/products";
import { useImportStore } from "@/store/importStore";
import ImportDropzone from "@/components/admin/import/ImportDropzone";
import ImportFormatHelp from "@/components/admin/import/ImportFormatHelp";
import ImportWarnings from "@/components/admin/import/ImportWarnings";
import ImportToolbar from "@/components/admin/import/ImportToolbar";
import ImportRowList from "@/components/admin/import/ImportRowList";
import ImportConfirmBar from "@/components/admin/import/ImportConfirmBar";
import ImportResults from "@/components/admin/import/ImportResults";
import {
  buildCommitRows,
  canReanalyze,
  countByAction,
  duplicateCooldownSeconds,
  isSameBatchAsLast,
  localErrorsFor,
  resultForIndex,
  selectableIndexes,
} from "@/components/admin/import/importReducer";
import { analyzeDependencies } from "@/components/admin/import/dependencies";
import { COPY } from "@/components/admin/import/labels";

// Importación/restock masivo de productos por Excel (Fase 13).
//
// El estado vive en `useImportStore` (Zustand, sin persist) y no en este componente: el panel
// desmonta la sección activa al cambiar de pestaña del Sidebar, y perder una revisión a medias
// —el archivo analizado, las filas corregidas a mano, la selección— obligaría a rehacerlo todo.

export default function ImportSection() {
  const queryClient = useQueryClient();
  const state = useImportStore((store) => store.state);
  const dispatch = useImportStore((store) => store.dispatch);

  // Solo para pintar la cuenta regresiva del 409 de doble envío; no entra en ninguna decisión.
  const [now, setNow] = useState(() => Date.now());

  const previewMutation = useMutation({
    mutationFn: async ({ file }: { file: File; analysisId: number }) =>
      previewProductImport(file),
    onSuccess: (plan, variables) => {
      dispatch({ type: "previewLoaded", plan, analysisId: variables.analysisId });
    },
    onError: () => {
      dispatch({ type: "previewFailed" });
    },
  });

  // Los índices enviados viajan como variable de la mutation, no como closure: el merge del
  // resultado es POSICIONAL (response.rows[k] ↔ sentIndices[k]) y tiene que emparejarse contra
  // el lote que realmente se mandó, no contra la selección que haya en pantalla al responder.
  const commitMutation = useMutation({
    mutationFn: ({ rows }: { rows: ImportRowInput[]; indexes: number[] }) =>
      commitProductImport(rows),
    onSuccess: (response, variables) => {
      // Se invalida aunque haya filas fallidas (un éxito parcial SÍ escribió) y aunque el Zod
      // del cuerpo haya fallado: lo que no se puede es dejar el catálogo del panel y el outlet
      // mostrando el stock viejo.
      queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      dispatch({
        type: "commitSucceeded",
        outcome: {
          response,
          sentIndices: variables.indexes,
          sentRows: variables.rows,
          sentAt: Date.now(),
        },
      });
    },
  });

  const isAnalyzing = previewMutation.isPending;
  const isCommitting = commitMutation.isPending;

  // ── Derivados ──────────────────────────────────────────────────────────────────────────
  const localErrors = useMemo(() => localErrorsFor(state), [state]);
  const dependencies = useMemo(() => analyzeDependencies(state), [state]);
  const pendingIndexes = useMemo(
    () => selectableIndexes(state, localErrors),
    [state, localErrors]
  );
  const counts = useMemo(
    () => (state.plan ? countByAction(state.plan) : null),
    [state.plan]
  );
  const commitRows = useMemo(
    () => buildCommitRows(state, pendingIndexes),
    [state, pendingIndexes]
  );
  const sameBatch = useMemo(
    () => isSameBatchAsLast(commitRows, state.result),
    [commitRows, state.result]
  );

  const invalidCount = Object.keys(localErrors).length;
  const editCount = Object.keys(state.edits).length;
  const reactivateCount = state.plan
    ? pendingIndexes.filter((index) => state.plan!.rows[index].reactivated).length
    : 0;

  // Cuenta regresiva de la ventana anti-duplicado (60 s). Solo corre mientras haga falta.
  useEffect(() => {
    if (!sameBatch || !state.result) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sameBatch, state.result]);

  // Cerrar la pestaña o recargar durante una revisión pierde el trabajo (el store no persiste,
  // a propósito). La navegación interna sí lo conserva.
  useEffect(() => {
    if (state.phase !== "reviewing" || !state.plan) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.phase, state.plan]);

  // ── Acciones ───────────────────────────────────────────────────────────────────────────
  const analyze = (file: File) => {
    dispatch({ type: "fileAccepted", file });
    // El reducer ya subió el contador, así que el id de ESTE análisis es el siguiente.
    previewMutation.reset();
    // Un plan nuevo deja sin sentido el error del commit anterior: sin esto, `ImportConfirmBar`
    // seguiría alertando "No pudimos aplicar la importación…" sobre filas que ya no existen.
    commitMutation.reset();
    previewMutation.mutate({
      file,
      analysisId: useImportStore.getState().state.analysisId,
    });
  };

  // Vuelve a leer el MISMO archivo contra el catálogo de ahora. No refresca las filas editadas
  // (el preview solo acepta un archivo, no filas), así que reemplaza el plan entero y descarta
  // las ediciones — por eso el botón pide confirmación cuando las hay.
  const reanalyze = async () => {
    // Defensa en profundidad: el toolbar ya retira el botón con filas aplicadas, pero el
    // candado no puede depender de que ningún llamador futuro se acuerde (ver `canReanalyze`).
    if (!canReanalyze(state) || !state.file) return;
    try {
      // Releer un File retenido puede fallar si el archivo se movió o si Excel lo reemplazó al
      // guardarlo (muy común en macOS: el guardado sustituye el inode).
      await state.file.slice(0, 1).arrayBuffer();
    } catch {
      // NO se descarta la revisión: que el archivo ya no se pueda leer no dice nada sobre la
      // validez del plan que está en pantalla, y con `editCount === 0` este botón ni siquiera
      // pide confirmación — un clic tiraría 500 filas corregidas a mano. Se avisa y se queda.
      previewMutation.reset();
      dispatch({
        type: "fileRejected",
        message:
          "No pudimos volver a leer el archivo (quizá lo moviste o lo guardaste de nuevo desde Excel). " +
          "La revisión que ves sigue siendo válida; para leerlo otra vez, empieza de nuevo y vuelve a seleccionarlo.",
      });
      return;
    }
    analyze(state.file);
  };

  const startOver = () => {
    previewMutation.reset();
    commitMutation.reset();
    dispatch({ type: "reset" });
  };

  const confirm = () => {
    if (pendingIndexes.length === 0 || isCommitting) return;
    commitMutation.mutate({ rows: commitRows, indexes: pendingIndexes });
  };

  const fixErrors = () => {
    if (!state.result || !state.plan) return;
    const failed = state.plan.rows
      .map((_, index) => index)
      .filter((index) => resultForIndex(state.result!, state.plan!, index)?.status === "error");
    dispatch({ type: "selectOnly", indexes: failed });
    dispatch({ type: "backToReview" });
    commitMutation.reset();
  };

  // ── Render ─────────────────────────────────────────────────────────────────────────────
  const header = (
    <div className="mb-8">
      <h1 className="font-serif text-amber-50 text-3xl mb-2">{COPY.sectionTitle}</h1>
      <p className="text-amber-100/40 text-sm leading-relaxed max-w-2xl">
        {COPY.sectionSubtitle}
      </p>
    </div>
  );

  // Resultados
  if (state.phase === "results" && state.result && state.plan) {
    const failedRows = state.plan.rows
      .map((_, index) => index)
      .filter((index) => resultForIndex(state.result!, state.plan!, index)?.status === "error");
    return (
      <>
        {header}
        <ImportResults
          response={state.result.response}
          failedRows={failedRows}
          onFixErrors={fixErrors}
          onStartOver={startOver}
        />
      </>
    );
  }

  // Primer análisis: pantalla completa. Al RE-analizar ya hay un plan en pantalla, y quitarlo
  // para poner un spinner haría perder de vista lo que se estaba revisando — ahí el indicador
  // vive en el botón del toolbar.
  if (isAnalyzing && !state.plan) {
    return (
      <>
        {header}
        <div className="max-w-3xl border border-amber-400/10 rounded-sm px-6 py-14 flex flex-col items-center text-center gap-3">
          <FileSpreadsheet className="size-8 text-amber-400/50 animate-pulse" strokeWidth={1} />
          <p className="text-amber-100/50 text-sm tracking-[0.15em] uppercase">
            {COPY.analyzing}
          </p>
          <p className="text-amber-100/30 text-xs max-w-sm leading-relaxed">
            {COPY.analyzingNote}
          </p>
        </div>
      </>
    );
  }

  // Revisión
  if (state.phase === "reviewing" && state.plan && counts) {
    const emptyFile = state.plan.rows.length === 0;

    return (
      <>
        {header}

        {emptyFile ? (
          <div className="max-w-3xl space-y-4">
            <ImportWarnings warnings={state.plan.warnings} />
            <div className="py-14 text-center border border-amber-400/10 rounded-sm">
              <p className="text-amber-100/40 text-sm max-w-md mx-auto leading-relaxed">
                {COPY.emptyFile}
              </p>
            </div>
            <button
              type="button"
              onClick={startOver}
              className="border border-amber-400/60 text-amber-400 text-[10px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-amber-400/10 transition-colors cursor-pointer"
            >
              Elegir otro archivo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <ImportWarnings warnings={state.plan.warnings} />

            {/* Un re-análisis fallido pasaría desapercibido: el dropzone (que es donde
                normalmente se muestra este error) no está montado en esta fase. */}
            {previewMutation.isError && (
              <p
                role="alert"
                className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
              >
                No pudimos volver a analizar el archivo: {importPreviewErrorMessage(previewMutation.error)}{" "}
                La revisión que ves sigue siendo válida.
              </p>
            )}

            {/* El fallo al RELEER el archivo (no una respuesta del servidor) también necesita
                banner propio aquí: el dropzone, que es donde normalmente se pinta `fileError`,
                no está montado durante la revisión. */}
            {state.fileError && (
              <p
                role="alert"
                className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
              >
                {state.fileError}
              </p>
            )}

            {counts.error === counts.total && (
              <p
                role="alert"
                className="text-[12px] leading-relaxed text-red-400/90 border border-red-500/30 bg-red-500/5 rounded-md px-4 py-2.5"
              >
                {COPY.allErrors}
              </p>
            )}
            {counts.unchanged === counts.total && (
              <p
                role="status"
                className="text-[12px] leading-relaxed text-amber-200/80 border border-amber-400/25 bg-amber-400/5 rounded-md px-4 py-2.5"
              >
                {COPY.allUnchanged}
              </p>
            )}

            <ImportToolbar
              plan={state.plan}
              counts={counts}
              filter={state.filter}
              selectedCount={pendingIndexes.length}
              editCount={editCount}
              invalidCount={invalidCount}
              reactivateCount={reactivateCount}
              dependencies={dependencies}
              fileName={state.file?.name ?? null}
              appliedCount={state.applied.length}
              canReanalyze={canReanalyze(state)}
              disabled={isCommitting}
              isReanalyzing={isAnalyzing}
              onFilterChange={(filter) => dispatch({ type: "setFilter", filter })}
              onFixDependencies={() =>
                dispatch({
                  type: "setRowsSelected",
                  indexes: dependencies.missingProviders,
                  selected: true,
                })
              }
              onRevertAllEdits={() => dispatch({ type: "revertAllEdits" })}
              onReanalyze={reanalyze}
              onStartOver={startOver}
            />

            {/* La tabla NO se desmonta durante el commit (solo se deshabilita): si falla, las
                ediciones y la selección siguen ahí. */}
            <ImportRowList
              plan={state.plan}
              state={state}
              localErrors={localErrors}
              dependencies={dependencies}
              disabled={isCommitting}
              resultFor={(index) =>
                state.result ? resultForIndex(state.result, state.plan!, index) : undefined
              }
              onToggleRow={(index) => dispatch({ type: "toggleRow", index })}
              onToggleExpanded={(index) => dispatch({ type: "toggleExpanded", index })}
              onToggleUnchangedGroup={() => dispatch({ type: "toggleUnchangedGroup" })}
              onSetAll={(indexes, selected) =>
                dispatch({ type: "setRowsSelected", indexes, selected })
              }
              onChange={(index, field, text) =>
                dispatch({ type: "editCell", index, field, text })
              }
              onPresenceChange={(index, field, present) =>
                dispatch({ type: "setCellPresence", index, field, present })
              }
              onRevert={(index) => dispatch({ type: "revertRow", index })}
            />

            <ImportConfirmBar
              selectedCount={pendingIndexes.length}
              hasBrokenDependencies={dependencies.broken.length > 0}
              isSameBatch={sameBatch}
              cooldownSeconds={duplicateCooldownSeconds(state.result, now)}
              isPending={isCommitting}
              error={
                commitMutation.isError
                  ? importCommitErrorMessage(commitMutation.error)
                  : null
              }
              onConfirm={confirm}
            />
          </div>
        )}
      </>
    );
  }

  // Inicio
  return (
    <>
      {header}
      <div className="space-y-5">
        <ImportDropzone
          onFile={analyze}
          onReject={(message) => dispatch({ type: "fileRejected", message })}
          error={
            previewMutation.isError
              ? importPreviewErrorMessage(previewMutation.error)
              : state.fileError
          }
          disabled={isAnalyzing}
        />
        <ImportFormatHelp />
      </div>
    </>
  );
}
