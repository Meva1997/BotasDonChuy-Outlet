import { Suspense } from "react";
import type { Metadata } from "next";
import OutletView from "@/components/outlet/OutletView";
import OutletSkeleton from "@/components/outlet/OutletSkeleton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Sombreros vaqueros de outlet",
  description:
    "Sombreros vaqueros de outlet en materiales y hormas originales. Piezas finales de inventario, sin reposición. Envíos a todo México desde Celaya, Guanajuato.",
  alternates: { canonical: "/sombreros" },
  openGraph: {
    title: "Sombreros vaqueros de outlet",
    description:
      "Sombreros vaqueros a precio de liquidación. Piezas únicas, sin reposición.",
    url: "/sombreros",
  },
};

export default function SombrerosPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Sombreros", path: "/sombreros" },
        ])}
      />

      <Suspense fallback={<OutletSkeleton />}>
        <OutletView defaultCategoria="sombrero" />
      </Suspense>
    </>
  );
}
