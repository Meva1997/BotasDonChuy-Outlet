import { Suspense } from "react";
import OutletView from "@/components/outlet/OutletView";

export default function SombrerosPage() {
  return (
    <Suspense>
      <OutletView defaultCategoria="sombrero" />
    </Suspense>
  );
}
