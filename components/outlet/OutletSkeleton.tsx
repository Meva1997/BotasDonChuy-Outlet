// Esqueleto de la rejilla del outlet. Se usa como fallback del <Suspense> que
// envuelve a OutletView en las 4 rutas de listado (/outlet + las de categoría):
// OutletView lee useSearchParams, así que durante el prerender se suspende y este
// es el HTML que se sirve — el que ve el usuario antes de que hidrate y arranque
// la query del catálogo.
//
// La rejilla replica la de OutletView (mismas columnas, mismo aspect-square) para
// que al llegar los productos no salte el layout.
export default function OutletSkeleton() {
  return (
    <section
      className="min-h-dvh bg-tobacco-950 px-6 md:p-10 py-6 md:py-12 my-4 md:my-20"
      aria-busy="true"
      aria-label="Cargando catálogo"
    >
      {/* Trust strip */}
      <div className="max-w-7xl mx-auto mb-10 border-y border-amber-400/15 py-3">
        <div className="h-3 w-72 max-w-full bg-amber-400/10 rounded-sm animate-pulse" />
      </div>

      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto flex flex-col gap-3">
        <div className="h-3 w-40 bg-amber-400/15 rounded-sm animate-pulse" />
        <div className="h-10 md:h-12 w-72 max-w-full bg-amber-100/10 rounded-sm animate-pulse" />
        <div className="h-3 w-64 max-w-full bg-amber-100/5 rounded-sm animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-5 max-w-6xl mx-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col h-full bg-stone-900 border border-amber-400/10 rounded-sm overflow-hidden"
          >
            <div className="w-full aspect-square bg-tobacco-900 animate-pulse" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-3 w-3/4 bg-amber-100/10 rounded-sm animate-pulse" />
              <div className="h-3 w-1/2 bg-amber-100/5 rounded-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
