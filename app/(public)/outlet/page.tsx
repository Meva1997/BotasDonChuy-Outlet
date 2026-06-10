import { Suspense } from "react";
import OutletView from "@/components/outlet/OutletView";

export default function OutletPage() {
  return (
    <Suspense>
      <OutletView />
    </Suspense>
  );
}
