// Piezas presentacionales compartidas por las tarjetas de ConfigSection
// (AccountCard + AdminsCard) y el shell. Acotado a la sección de configuración:
// otros componentes admin definen su propio inputCls local.

export const INPUT_BASE =
  "w-full bg-stone-800/80 border border-amber-400/20 text-amber-50 px-4 py-3 text-sm focus:outline-none focus:border-amber-400/50 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors placeholder:text-amber-100/20";

export const LABEL_BASE =
  "block text-amber-100/50 uppercase tracking-[0.25em] text-[10px] mb-2";

export const BTN_OUTLINE =
  "border border-amber-400 text-amber-400 uppercase tracking-[0.25em] text-[10px] px-6 py-3 hover:bg-amber-400/10 active:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-400/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export function inputCls(hasError?: boolean) {
  return `${INPUT_BASE} ${hasError ? "border-red-500/60" : ""}`;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] text-red-400/90">{message}</p>;
}
