"use client";

import { Badge } from "@/components/ui/badge";
import {
  GUEST_MAX_EXPORTS,
  useGuestExportStore,
} from "@/features/guest/guest-export-store";

export function GuestExportStatus() {
  const exportsUsed = useGuestExportStore((state) => state.exportsUsed);
  return (
    <Badge
      variant="secondary"
      className="hidden sm:inline-flex"
      title="Guest exports are tracked locally in your browser"
    >
      Guest · {exportsUsed}/{GUEST_MAX_EXPORTS} exports
    </Badge>
  );
}
