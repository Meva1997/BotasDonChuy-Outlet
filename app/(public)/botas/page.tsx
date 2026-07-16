import { Suspense } from "react";
import type { Metadata } from "next";
import OutletView from "@/components/outlet/OutletView";
import OutletSkeleton from "@/components/outlet/OutletSkeleton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Botas vaqueras de outlet",
  description:
    "Botas vaqueras de piel a precio de outlet: marcas premium como Cuadra, piezas finales de inventario sin reposición. Envíos a todo México desde Celaya, Guanajuato.",
  alternates: { canonical: "/botas" },
  openGraph: {
    title: "Botas vaqueras de outlet",
    description:
      "Botas de piel a precio de liquidación. Piezas únicas, sin reposición.",
    url: "/botas",
  },
};

export default function BotsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Botas", path: "/botas" },
        ])}
      />

      <Suspense fallback={<OutletSkeleton />}>
        <OutletView defaultCategoria="bota" />
      </Suspense>
    </>
  );
}
