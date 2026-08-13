"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { fadeIn } from "@/lib/ui/motion";
import { ORDEN_OPTIONS, type CatalogOrden } from "@/lib/domain/catalogFilters";

// Base compartida por todos los controles de la barra. El `<select>` le suma el
// hueco de la flecha y el cursor; el resto son inputs de texto.
const FIELD_CLASS =
  "font-sans text-amber-50 text-sm bg-stone-900/60 border border-amber-400/25 rounded-sm px-4 py-2.5 placeholder:text-amber-100/30 focus:outline-none focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/30 hover:border-amber-400/55 transition-all duration-200";

const SELECT_CLASS = `${FIELD_CLASS} pr-9 appearance-none cursor-pointer`;

const ARROW_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23fbbf24' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

/**
 * Cuánto se espera tras la última tecla antes de tocar la URL (y por tanto la
 * query). 1s porque es el campo donde más se escribe seguido (nombre o
 * código completo) — con menos tiempo se dispara una consulta por cada letra
 * antes de que el comprador termine de escribir la palabra.
 */
const DEBOUNCE_MS = 1000;

/** Los tres campos de texto que viajan juntos en un solo commit. */
interface TextFilters {
  q: string;
  precioMin: string;
  precioMax: string;
}

export interface OutletFiltersProps {
  showCategoria: boolean;
  showTalla: boolean;
  selectedCategoria?: string;
  selectedTalla?: number;
  selectedOrden?: CatalogOrden;
  // Texto CRUDO de la URL, no el valor ya saneado: es lo que se pinta en los
  // inputs. Si aquí llegara el número parseado, teclear algo que no es un precio
  // lo borraría solo (el saneo lo volvería `undefined` → input vacío) justo
  // mientras el comprador escribe. Un valor basura en la URL no hace daño: el
  // backend lo ignora en silencio y `getProducts` recibe la versión saneada.
  //
  // Van como tres strings sueltos y no como un objeto a propósito: un objeto
  // literal cambiaría de identidad en cada render de OutletView y la re-siembra
  // de abajo (un efecto que hace setState) se volvería un bucle infinito.
  qText: string;
  precioMinText: string;
  precioMaxText: string;
  /** El backend NO invierte el rango: devuelve cero resultados. Esto solo lo avisa. */
  invertedPriceRange: boolean;
  availableSizes: number[];
  total?: number;
  /**
   * Si hay algún filtro puesto por el comprador. Lo decide OutletView con
   * `hasActiveFilters` — la misma señal que elige el estado vacío, para que el
   * botón de limpiar y el "No encontramos nada" nunca se contradigan.
   */
  filtersActive: boolean;
  onCategoriaChange: (value: string | null) => void;
  onTallaChange: (value: string | null) => void;
  onOrdenChange: (value: string | null) => void;
  onTextFiltersCommit: (next: TextFilters) => void;
  onClearFilters: () => void;
}

function sameText(a: TextFilters, b: TextFilters) {
  return (
    a.q === b.q && a.precioMin === b.precioMin && a.precioMax === b.precioMax
  );
}

export default function OutletFilters({
  showCategoria,
  showTalla,
  selectedCategoria,
  selectedTalla,
  selectedOrden,
  qText,
  precioMinText,
  precioMaxText,
  invertedPriceRange,
  availableSizes,
  total,
  filtersActive,
  onCategoriaChange,
  onTallaChange,
  onOrdenChange,
  onTextFiltersCommit,
  onClearFilters,
}: OutletFiltersProps) {
  const fromUrl: TextFilters = {
    q: qText,
    precioMin: precioMinText,
    precioMax: precioMaxText,
  };

  // Borrador local de los campos de texto. La URL sigue siendo la fuente de
  // verdad; esto es solo lo que se ve mientras el debounce corre.
  const [draft, setDraft] = useState<TextFilters>(fromUrl);
  const [seeded, setSeeded] = useState<TextFilters>(fromUrl);

  // Re-siembra cuando la URL cambia por fuera del teclado: atrás/adelante del
  // navegador, "Limpiar filtros", o un enlace con query. Tras un commit propio
  // los valores ya coinciden, así que esto no pisa nada.
  //
  // Va en el render y no en un `useEffect`: es el ajuste de estado ante un
  // cambio de prop que documenta React (https://react.dev/learn/you-might-not-need-an-effect).
  // Con efecto se pintaría un frame con el borrador viejo y el linter lo marca
  // como render en cascada; así React re-renderiza antes de tocar el DOM.
  if (!sameText(seeded, fromUrl)) {
    setSeeded(fromUrl);
    setDraft(fromUrl);
  }

  // Commit con debounce. El `clearTimeout` del cleanup es lo que agrupa las
  // teclas; el guard es lo que evita el bucle commit → URL → re-siembra →
  // commit y también que se dispare al montar.
  useEffect(() => {
    if (
      sameText(draft, {
        q: qText,
        precioMin: precioMinText,
        precioMax: precioMaxText,
      })
    ) {
      return;
    }
    const timer = setTimeout(() => onTextFiltersCommit(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, qText, precioMinText, precioMaxText, onTextFiltersCommit]);

  function setField(key: keyof TextFilters, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8 md:mb-10 max-w-7xl mx-auto sticky top-0 z-10 bg-tobacco-950/85 backdrop-blur-sm py-3 md:static md:bg-transparent md:backdrop-blur-none"
    >
      {/* Una columna en móvil (cada control a ancho completo, sin campos de 3 cm
          apretados) y una sola fila que envuelve a partir de lg, donde sí caben. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          type="search"
          value={draft.q}
          onChange={(e) => setField("q", e.target.value)}
          placeholder="Buscar por nombre o código…"
          aria-label="Buscar en el catálogo"
          className={`${FIELD_CLASS} w-full lg:w-auto lg:flex-1 lg:min-w-[16rem]`}
        />

        {/* Los selects se reparten el ancho en móvil (dos por renglón) y vuelven a
            su ancho natural en cuanto hay sitio. `min-w-0` es lo que les permite
            encogerse dentro del grid en pantallas de 320 px. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {showCategoria && (
            <select
              value={selectedCategoria ?? ""}
              onChange={(e) => onCategoriaChange(e.target.value || null)}
              aria-label="Categoría"
              className={`${SELECT_CLASS} w-full min-w-0 sm:w-auto`}
              style={ARROW_STYLE}
            >
              <option value="" className="bg-stone-900">
                Todas las categorías
              </option>
              <option value="bota" className="bg-stone-900">
                Botas
              </option>
              <option value="sombrero" className="bg-stone-900">
                Sombreros
              </option>
              <option value="ropa" className="bg-stone-900">
                Ropa
              </option>
            </select>
          )}

          {showTalla && (
            <select
              value={selectedTalla ?? ""}
              onChange={(e) => onTallaChange(e.target.value || null)}
              aria-label="Talla"
              className={`${SELECT_CLASS} w-full min-w-0 sm:w-auto`}
              style={ARROW_STYLE}
            >
              <option value="" className="bg-stone-900">
                Todas las tallas
              </option>
              {availableSizes.map((size) => (
                <option key={size} value={size} className="bg-stone-900">
                  {size}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedOrden ?? ""}
            onChange={(e) => onOrdenChange(e.target.value || null)}
            aria-label="Ordenar por"
            className={`${SELECT_CLASS} w-full min-w-0 sm:w-auto`}
            style={ARROW_STYLE}
          >
            <option value="" className="bg-stone-900">
              Orden del catálogo
            </option>
            {ORDEN_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-stone-900"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Precio — `type="text" inputMode="decimal"` y no `type="number"`: éste
            devuelve "" ante basura (ni se puede leer lo tecleado), se traga la
            coma decimal y cambia el valor al hacer scroll. Mismo razonamiento
            que las celdas numéricas de la importación por Excel. */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-amber-100/40 shrink-0">
            Precio
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.precioMin}
            onChange={(e) => setField("precioMin", e.target.value)}
            placeholder="Mín"
            aria-label="Precio mínimo"
            className={`${FIELD_CLASS} flex-1 min-w-0 lg:flex-none lg:w-24`}
          />
          <span aria-hidden className="text-amber-400/40">
            –
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.precioMax}
            onChange={(e) => setField("precioMax", e.target.value)}
            placeholder="Máx"
            aria-label="Precio máximo"
            className={`${FIELD_CLASS} flex-1 min-w-0 lg:flex-none lg:w-24`}
          />
        </div>
      </div>

      {/* Aviso, no error de validación: el backend responde 200 con cero
          resultados y nunca corrige el rango (ver lib/domain/catalogFilters.ts). */}
      {invertedPriceRange && (
        <p
          role="status"
          className="mt-2 font-sans text-[11px] tracking-wide text-amber-400/70"
        >
          El precio mínimo es mayor que el máximo, así que no habrá resultados.
        </p>
      )}

      {/* Conteo + salida. Van juntos en su propio renglón para que el botón no se
          pierda entre los controles y no empuje el layout al aparecer/desaparecer. */}
      {(total !== undefined || filtersActive) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {total !== undefined && (
            <span className="font-sans text-amber-100/40 text-[11px] sm:text-xs tracking-widest uppercase">
              {total} {total === 1 ? "modelo" : "modelos"}{" "}
              <span aria-hidden className="text-amber-400/50">
                ·
              </span>{" "}
              sin reposición
            </span>
          )}

          {/* Limpiar es lo único que devuelve el catálogo completo de un clic: a
              mano habría que vaciar hasta seis controles (y el de talla ni
              siquiera existe sin categoría). `ml-auto` lo mantiene a la derecha
              cuando aún no hay conteo que mostrar (primera carga). */}
          {filtersActive && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ml-auto inline-flex items-center gap-2 font-sans text-[11px] tracking-[0.2em] uppercase text-amber-400 border border-amber-400/40 rounded-sm px-4 py-2 hover:bg-amber-400/10 hover:border-amber-400/70 transition-colors duration-200 hover:cursor-pointer"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
