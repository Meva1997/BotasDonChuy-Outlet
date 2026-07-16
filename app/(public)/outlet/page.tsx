import { Suspense } from "react";
import type { Metadata } from "next";
import OutletView from "@/components/outlet/OutletView";
import OutletSkeleton from "@/components/outlet/OutletSkeleton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Outlet — botas, sombreros y ropa vaquera",
  description:
    "Todo el inventario final de bodega: botas vaqueras, sombreros y ropa de piel a precio de liquidación. Piezas únicas, sin reposición. Envíos a todo México.",
  // Canonical sin query: /outlet?categoria=bota&pagina=2 es la misma página
  // filtrada, no contenido nuevo. Sin esto Google indexaría cada combinación de
  // filtros como un duplicado y repartiría la autoridad entre todas.
  alternates: { canonical: "/outlet" },
  openGraph: {
    title: "Outlet — botas, sombreros y ropa vaquera",
    description:
      "Inventario final de bodega a precio de liquidación. Lo que ves es lo que queda.",
    url: "/outlet",
  },
};

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
