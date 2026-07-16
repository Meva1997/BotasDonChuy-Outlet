import { Suspense } from "react";
import type { Metadata } from "next";
import OutletView from "@/components/outlet/OutletView";
import OutletSkeleton from "@/components/outlet/OutletSkeleton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";
import { pageMetadata } from "@/lib/seo/metadata";

// El canonical que arma pageMetadata() va sin query, y aquí eso importa de más:
// /outlet?categoria=bota&pagina=2 es esta misma página filtrada, no contenido
// nuevo. Sin canonical Google indexaría cada combinación de filtros como un
// duplicado y repartiría la autoridad entre todas.
export const metadata: Metadata = pageMetadata({
  title: "Outlet — botas, sombreros y ropa vaquera",
  description:
    "Todo el inventario final de bodega: botas vaqueras, sombreros y ropa de piel a precio de liquidación. Piezas únicas, sin reposición. Envíos a todo México.",
  path: "/outlet",
  ogDescription:
    "Inventario final de bodega a precio de liquidación. Lo que ves es lo que queda.",
});

export default function OutletPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Outlet", path: "/outlet" },
        ])}
      />

      <Suspense fallback={<OutletSkeleton />}>
        <OutletView />
      </Suspense>
    </>
  );
}
