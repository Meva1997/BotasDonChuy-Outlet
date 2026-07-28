"use client";

import { AlertTriangle, EyeOff, Info } from "lucide-react";
import type { ImportRowPlan, ProductSnapshot } from "@/lib/api/adminProductImport";
import { formatPrice } from "@/lib/utils";
import { categorySingular } from "@/lib/domain/categories";
import ImportDiff from "./ImportDiff";
import ImportSizeDiff from "./ImportSizeDiff";
import ImportRowEditor from "./ImportRowEditor";
import { COPY, brokenDependencyNotice, pieceCount } from "./labels";
import type { EditableField, RowEdit, RowFieldErrors, Staleness } from "./types";

// Panel expandido de una fila: el diff (o lo que quede de él tras editar), los avisos, y el
// editor inline.

function SnapshotSummary({ snapshot }: { snapshot: ProductSnapshot }) {
  const fields: { label: string; value: string }[] = [
    { label: "Código", value: snapshot.code ?? "—" },
    { label: "Categoría", value: categorySingular(snapshot.type) },
    { label: "Precio original", value: formatPrice(snapshot.originalPrice) },
    { label: "Precio oferta", value: formatPrice(snapshot.salePrice) },
    { label: "Costo unitario", value: formatPrice(snapshot.unitCost) },
    { label: "Existencias", value: pieceCount(snapshot.stock) },
    { label: "Empaque", value: `${snapshot.weightKg} kg · ${snapshot.lengthCm}×${snapshot.widthCm}×${snapshot.heightCm} cm` },
    { label: "Visible", value: snapshot.visible ? "Sí" : "No" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4">
      {fields.map((field) => (
        <div key={field.label} className="min-w-0">
          <span className="block text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-1">
            {field.label}
          </span>
          <span className="block text-amber-50 text-sm tabular-nums truncate" title={field.value}>
            {field.value}
          </span>
        </div>
      ))}
      {snapshot.sizes.length > 0 && (
        <div className="col-span-2 sm:col-span-4 min-w-0">
          <span className="block text-[10px] tracking-[0.25em] uppercase text-amber-100/40 mb-1">
            Tallas
          </span>
          <span className="block text-amber-50 text-sm font-mono tabular-nums">
            {snapshot.sizes.map((s) => `${s.size}×${s.stock}`).join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "info" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const classes =
    tone === "danger"
      ? "border-red-500/30 bg-red-500/5 text-red-400/90"
      : tone === "warning"
        ? "border-amber-400/25 bg-amber-400/5 text-amber-200/80"
        : "border-stone-600/40 bg-stone-800/30 text-amber-100/50";
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`flex gap-2.5 text-[12px] leading-relaxed border rounded-md px-4 py-2.5 ${classes}`}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

interface ImportRowDetailProps {
  planRow: ImportRowPlan;
  edit: RowEdit;
  errors: RowFieldErrors;
  editedFields: EditableField[];
  staleness: Staleness;
  /** Folio (número de fila del Excel) de la fila que crea este producto, si la hay. */
  providerRow: number | null;
  dependencyBroken: boolean;
  disabled: boolean;
  onChange: (field: EditableField, text: string) => void;
  onPresenceChange: (field: EditableField, present: boolean) => void;
  onRevert: () => void;
}

export default function ImportRowDetail({
  planRow,
  edit,
  errors,
  editedFields,
  staleness,
  providerRow,
  dependencyBroken,
  disabled,
  onChange,
  onPresenceChange,
  onRevert,
}: ImportRowDetailProps) {
  // Regla dura: nunca se pinta una línea de diff cuyos insumos el usuario cambió.
  const suppressAll = staleness === "identity";
  const suppressedFields = new Set<string>(staleness === "partial" ? editedFields : []);
  const sizesEdited = editedFields.includes("sizes");

  const showSizeDiff =
    !suppressAll && !sizesEdited && planRow.sizeChanges.length > 0;
  const visibleChanges = suppressAll
    ? []
    : planRow.changes.filter((c) => !suppressedFields.has(c.field));

  // `before` con `productId === null` en un update no viene de la base: es la proyección de una
  // fila anterior del mismo archivo. Etiquetarlo como "actual en el catálogo" sería mentir.
  const beforeIsProjected = planRow.action === "update" && planRow.productId === null;

  return (
    <div className="space-y-6 px-5 py-6 sm:px-7 bg-stone-900/40 border-t border-amber-400/10">
      {/* Avisos */}
      <div className="space-y-2.5">
        {planRow.action === "error" && (
          <Notice tone="danger" icon={<AlertTriangle className="size-3.5" strokeWidth={1.5} />}>
            {planRow.message}
          </Notice>
        )}

        {dependencyBroken && (
          <Notice tone="danger" icon={<AlertTriangle className="size-3.5" strokeWidth={1.5} />}>
            {/* Se nombra por FOLIO del Excel, que es lo que el dueño ve en su hoja. */}
            {brokenDependencyNotice(
              providerRow,
              planRow.name ?? planRow.code ?? "este producto"
            )}
          </Notice>
        )}

        {staleness !== "fresh" && (
          <Notice tone="warning" icon={<Info className="size-3.5" strokeWidth={1.5} />}>
            {staleness === "identity" ? COPY.staleDiff : COPY.staleDiffPartial}
          </Notice>
        )}

        {planRow.reactivated && (
          <Notice tone="warning" icon={<Info className="size-3.5" strokeWidth={1.5} />}>
            {COPY.reactivateNote}
          </Notice>
        )}

        {planRow.before?.visible === false && !planRow.reactivated && (
          <Notice tone="info" icon={<EyeOff className="size-3.5" strokeWidth={1.5} />}>
            {COPY.hiddenProduct}
          </Notice>
        )}

        {planRow.warnings.map((warning, i) => (
          <Notice key={i} tone="warning" icon={<AlertTriangle className="size-3.5" strokeWidth={1.5} />}>
            {warning}
          </Notice>
        ))}
      </div>

      {/* Diff / valores */}
      {!suppressAll && (
        <>
          {planRow.action === "create" && planRow.after && (
            <div className="space-y-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-emerald-400/70">
                Se dará de alta así
              </p>
              <SnapshotSummary snapshot={planRow.after} />
            </div>
          )}

          {planRow.action !== "create" && planRow.before && (
            <div className="space-y-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
                {beforeIsProjected ? COPY.projectedBefore : COPY.storedBefore}
              </p>
              <SnapshotSummary snapshot={planRow.before} />
            </div>
          )}

          {visibleChanges.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-amber-100/40">
                Cambios al producto
              </p>
              <ImportDiff changes={visibleChanges} />
            </div>
          )}

          {showSizeDiff && <ImportSizeDiff sizeChanges={planRow.sizeChanges} />}

          {/* El tipo permite `after: null` en filas no-error; sin este ramal el panel quedaría
              mudo justo donde el dueño espera ver el resultado. */}
          {planRow.action !== "error" && !planRow.after && (
            <Notice tone="info" icon={<Info className="size-3.5" strokeWidth={1.5} />}>
              No tenemos vista previa del resultado de esta fila. Revisa los valores del editor
              antes de aplicarla.
            </Notice>
          )}
        </>
      )}

      {/* Editor */}
      <div className="border-t border-stone-700/40 pt-6">
        <ImportRowEditor
          planRow={planRow}
          edit={edit}
          errors={errors}
          editedFields={editedFields}
          disabled={disabled}
          onChange={onChange}
          onPresenceChange={onPresenceChange}
          onRevert={onRevert}
        />
      </div>
    </div>
  );
}
