import { Suspense } from "react";
import OutletView from "@/components/outlet/OutletView";

export default function RopaPage() {
  return (
    <Suspense>
      <OutletView defaultCategoria="ropa" />
    </Suspense>
  );
}
