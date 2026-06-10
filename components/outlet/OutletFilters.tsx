"use client";

const SELECT_CLASS =
  "font-sans text-amber-50 text-sm bg-transparent border border-amber-400/30 rounded-sm px-4 py-2 pr-8 appearance-none cursor-pointer hover:border-amber-400/60 focus:outline-none focus:border-amber-400/60 transition-colors duration-200";

const ARROW_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23fbbf24' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

interface OutletFiltersProps {
  showCategoria: boolean;
  showTalla: boolean;
  selectedCategoria?: string;
  selectedTalla?: number;
  availableSizes: number[];
  total?: number;
  onCategoriaChange: (value: string | null) => void;
  onTallaChange: (value: string | null) => void;
}

export default function OutletFilters({
  showCategoria,
  showTalla,
  selectedCategoria,
  selectedTalla,
  availableSizes,
  total,
  onCategoriaChange,
  onTallaChange,
}: OutletFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-10">
      {showCategoria && (
        <select
          value={selectedCategoria ?? ""}
          onChange={(e) => onCategoriaChange(e.target.value || null)}
          className={SELECT_CLASS}
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
          className={SELECT_CLASS}
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

      {total !== undefined && (
        <span className="ml-auto font-sans text-amber-100/40 text-sm tracking-wide">
          {total} {total === 1 ? "pieza" : "piezas"} · sin reposición
        </span>
      )}
    </div>
  );
}
