import { Suspense } from "react";
import type { Metadata } from "next";
import OutletView from "@/components/outlet/OutletView";
import OutletSkeleton from "@/components/outlet/OutletSkeleton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/jsonLd";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Ropa vaquera de outlet",
  description:
    "Ropa vaquera de outlet: camisas, cintos y prendas de piel a precio de liquidación. Piezas finales de inventario, sin reposición. Envíos a todo México.",
  path: "/ropa",
  ogDescription:
    "Ropa vaquera a precio de liquidación. Piezas únicas, sin reposición.",
});

export default function RopaPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Ropa", path: "/ropa" },
        ])}
      />

      <Suspense fallback={<OutletSkeleton />}>
        <OutletView defaultCategoria="ropa" />
      </Suspense>
    </>
  );
}
