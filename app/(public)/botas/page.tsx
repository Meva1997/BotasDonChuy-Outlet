import { Suspense } from "react";
import OutletView from "@/components/outlet/OutletView";

export default function BotsPage() {
  return (
    <Suspense>
      <OutletView defaultCategoria="bota" />
    </Suspense>
  );
}
