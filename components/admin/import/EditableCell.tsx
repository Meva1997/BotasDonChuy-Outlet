"use client";

import { useId } from "react";
import { CATEGORIES } from "@/lib/domain/categories";
import type { Cell, EditableField } from "./types";
import { FIELD_LABELS, parseSizesSpec } from "./rowInput";
import { COPY, pieceCount } from "./labels";

// Un campo del editor inline, con su control de presencia.
//
// Por qué la presencia es un control y no se infiere del texto: en el contrato, una clave
// AUSENTE significa "no toques esa columna", pero `description: ""` SÍ borra la descripción.
// Como el valor de un <input> siempre es un string, inferir "ausente" de un string vacío haría
// imposible expresar el segundo caso. Con el control explícito:
//
//   teclear y borrar  →  ""        (para `description`, borra; para el resto, es error)
//   botón "No tocar"  →  ausente   (la clave no viaja)
//
// Inequívoco en ambos sentidos y a un clic de distancia.

const INPUT_BASE =
  "w-full bg-stone-900 border text-amber-50 text-sm font-sans px-3 py-2 rounded transition-colors " +
  "placeholder:text-amber-100/20 disabled:cursor-not-allowed";

const NUMERIC_FIELDS = new Set<EditableField>([
  "originalPrice",
  "salePrice",
  "unitCost",
  "weightKg",
  "lengthCm",
  "widthCm",
  "heightCm",
]);

// Campos que NO se siembran con el valor guardado al pasar de "ausente" a "presente".
//
// `sizes` es el caso crítico: las tallas del import se SUMAN al stock (el backend hace
// `stock = stock + EXCLUDED.stock`), así que sembrar "25x3, 26x5" —lo que el producto tiene
// hoy— no hace explícito el valor actual: DUPLICA el stock al aplicar. Y como la celda queda
// marcada como editada, `ImportRowDetail` suprime el ImportSizeDiff que habría hecho visible
// la suma, así que el dueño no tendría cómo notarlo. Se deja vacío a propósito: lo que se
// escribe aquí son las piezas que ENTRAN, nunca las que ya hay.
//
// `description` se excluye porque su valor actual ya se ve como placeholder y sembrarlo
// llenaría el textarea con texto que el dueño no tecleó.
const NOT_SEEDED = new Set<EditableField>(["sizes", "description"]);

interface EditableCellProps {
  field: EditableField;
  cell: Cell;
  error?: string;
  /** Lo que el producto tiene hoy en ese campo — placeholder fantasma cuando está ausente. */
  currentValue: string | null;
  /** El producto tiene una descripción guardada que un `""` explícito borraría. */
  wouldClearDescription?: boolean;
  disabled?: boolean;
  onChange: (text: string) => void;
  onPresenceChange: (present: boolean) => void;
}

export default function EditableCell({
  field,
  cell,
  error,
  currentValue,
  wouldClearDescription = false,
  disabled = false,
  onChange,
  onPresenceChange,
}: EditableCellProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const absent = cell.presence === "absent";

  const borderClass = error
    ? "border-red-500/60"
    : absent
      ? "border-stone-700/50"
      : "border-amber-400/20 hover:border-amber-400/40 focus-visible:border-amber-400/60";

  // Total derivado de las tallas: la mejor defensa contra un "26x200" mal tecleado, porque
  // vuelve visible el error antes de aplicar (y el stock sumado no se puede deshacer).
  const sizesInfo =
    field === "sizes" && !absent && cell.text.trim() ? parseSizesSpec(cell.text) : null;

  // "Se suman" y no solo el total: la celda se lee como "las tallas del producto", y el import
  // es aditivo. Decirlo aquí, junto al número, es donde se puede notar antes de aplicar.
  const hint =
    field === "sizes" && sizesInfo?.ok
      ? `Se suman ${pieceCount(sizesInfo.value.total)} · ${sizesInfo.value.rows
          .map((r) => `talla ${r.size} ×${r.stock}`)
          .join(", ")}`
      : null;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label
          htmlFor={id}
          className="text-[10px] tracking-[0.2em] uppercase text-amber-100/40"
        >
          {FIELD_LABELS[field]}
        </label>

        {/* `visible` NO lleva este botón: su tri-estado ya incluye "No tocar", así que el
            control de presencia sería un segundo mando sobre lo mismo — y el valor sembrado
            ("Sí"/"No", que es texto de PRESENTACIÓN) no empata con lo que el tri-estado compara
            ("true"/"false"), dejando los tres botones sin marcar mientras el commit sí llevaba
            un cambio de visibilidad. Con un solo control, ese desajuste no puede existir. */}
        {field !== "visible" && (
          // Volver a "presente" siembra el valor guardado; volver a "ausente" NO borra el
          // texto, para que alternar no pierda lo tecleado.
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (absent && cell.text.trim() === "" && currentValue && !NOT_SEEDED.has(field)) {
                onChange(currentValue);
              } else {
                onPresenceChange(absent);
              }
            }}
            className="text-[9px] tracking-[0.15em] uppercase text-amber-100/30 hover:text-amber-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {absent ? "Establecer" : "✕ No tocar"}
          </button>
        )}
      </div>

      {field === "visible" ? (
        // Tri-estado, porque para un booleano "ausente" ≠ "No": omitir la columna deja la
        // visibilidad como está, y ponerla en No la oculta del catálogo.
        <div
          role="radiogroup"
          aria-label={`${FIELD_LABELS[field]} de esta fila`}
          className="flex gap-1.5"
        >
          {[
            { value: null, label: "No tocar" },
            { value: "true", label: "Sí" },
            { value: "false", label: "No" },
          ].map((option) => {
            const isActive =
              option.value === null ? absent : !absent && cell.text === option.value;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={disabled}
                onClick={() => {
                  if (option.value === null) onPresenceChange(false);
                  else onChange(option.value);
                }}
                className={[
                  "px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase rounded border transition-colors cursor-pointer",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  isActive
                    ? "border-amber-400 text-amber-400 bg-amber-400/10"
                    : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/50 hover:text-amber-100/70",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : field === "type" ? (
        <select
          id={id}
          value={absent ? "" : cell.text}
          disabled={disabled || absent}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_BASE} ${borderClass} cursor-pointer disabled:opacity-50`}
        >
          {/* También cuando está PRESENTE con texto vacío: sin una opción de valor "" el
              navegador pinta la primera categoría mientras el estado sigue en "" (la fila se
              marca inválida por un valor que nunca se eligió y que no se ve en pantalla). */}
          {(absent || cell.text === "") && (
            <option value="">{absent ? "Sin cambio" : "Elige una categoría"}</option>
          )}
          {CATEGORIES.map((cat) => (
            <option key={cat.type} value={cat.type}>
              {cat.label}
            </option>
          ))}
          {/* El archivo puede traer una categoría que no conocemos: se muestra en vez de
              descartarse en silencio (mismo criterio que el fallback de ShipmentStatusBadge). */}
          {!absent && !CATEGORIES.some((c) => c.type === cell.text) && cell.text && (
            <option value={cell.text}>{cell.text} (no reconocida)</option>
          )}
        </select>
      ) : field === "description" ? (
        <textarea
          id={id}
          rows={2}
          value={absent ? "" : cell.text}
          disabled={disabled || absent}
          placeholder={absent ? (currentValue ?? "Sin cambio") : ""}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : wouldClearDescription ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_BASE} ${borderClass} resize-none disabled:opacity-50`}
        />
      ) : (
        <input
          id={id}
          // `type="text"` a propósito, no `type="number"`: éste devuelve "" ante cualquier
          // basura (ni siquiera se puede leer lo que el usuario tecleó), se traga la coma
          // decimal y cambia el valor al hacer scroll encima.
          type="text"
          inputMode={NUMERIC_FIELDS.has(field) ? "decimal" : undefined}
          value={absent ? "" : cell.text}
          disabled={disabled || absent}
          placeholder={absent ? (currentValue ?? "Sin cambio") : ""}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_BASE} ${borderClass} disabled:opacity-50`}
        />
      )}

      {error ? (
        <p id={errorId} className="mt-1 text-[11px] text-red-400/80">
          {error}
        </p>
      ) : wouldClearDescription ? (
        <p id={hintId} className="mt-1 text-[11px] text-amber-400/80">
          {COPY.clearsDescription}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-[11px] text-amber-100/40 tabular-nums">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
