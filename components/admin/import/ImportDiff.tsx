"use client";

import type { FieldChange } from "@/lib/api/adminProductImport";
import { formatPrice } from "@/lib/utils";

// Diff campo por campo de un `update`, en formato de libro mayor: antes atenuado, después en
// primer plano, con la flecha en medio. Los números van `tabular-nums` para que los dígitos
// aliñen verticalmente entre filas — es lo que hace auditable una lista larga.

/** Campos monetarios: se formatean con `formatPrice` (es-MX + símbolo). */
const MONEY_FIELDS = new Set(["originalPrice", "salePrice", "unitCost"]);

/**
 * Render defensivo: `before`/`after` son `unknown` en el contrato (el valor de cualquier
 * columna). `String(objeto)` daría "[object Object]" y una celda vacía se leería como "sin
 * cambio", así que el vacío lleva un token visible.
 */
export function formatDiffValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "«vacío»";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") {
    return MONEY_FIELDS.has(field) ? formatPrice(value) : value.toLocaleString("es-MX");
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default function ImportDiff({
  changes,
  suppressedFields,
}: {
  changes: FieldChange[];
  /** Campos cuyo diff dejó de ser cierto porque el usuario los editó. */
  suppressedFields?: Set<string>;
}) {
  const visible = suppressedFields
    ? changes.filter((change) => !suppressedFields.has(change.field))
    : changes;

  if (visible.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-sans">
        <caption className="sr-only">Campos que cambian en el producto</caption>
        <thead>
          <tr className="border-b border-amber-400/20">
            <th
              scope="col"
              className="pb-2 pr-4 text-left text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
            >
              Campo
            </th>
            <th
              scope="col"
              className="pb-2 pr-4 text-right text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
            >
              Antes
            </th>
            <th scope="col" className="pb-2 pr-4 w-6">
              <span className="sr-only">cambia a</span>
            </th>
            <th
              scope="col"
              className="pb-2 text-right text-[10px] tracking-[0.2em] uppercase text-amber-100/50 font-normal"
            >
              Después
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((change) => (
            <tr key={change.field} className="border-b border-amber-400/10 last:border-0">
              <th
                scope="row"
                className="py-2.5 pr-4 align-top text-left font-normal text-amber-100/60 whitespace-nowrap"
              >
                {/* El backend manda el label en español; si viniera vacío, la clave es mejor
                    que una celda en blanco. */}
                {change.label || change.field}
              </th>
              <td className="py-2.5 pr-4 align-top text-right text-amber-100/35 tabular-nums">
                {formatDiffValue(change.field, change.before)}
              </td>
              <td
                aria-hidden="true"
                className="py-2.5 pr-4 align-top text-center text-amber-400/40 select-none"
              >
                →
              </td>
              <td className="py-2.5 align-top text-right text-amber-50 tabular-nums">
                {formatDiffValue(change.field, change.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
