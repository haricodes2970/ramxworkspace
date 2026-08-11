"use client";

import {
  selectCanExport,
  useGuestExportStore,
} from "@/features/guest/guest-export-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Export permission boundary between authentication state and the guest
 * export limit. Authenticated users bypass the guest limit entirely;
 * guests use the local 3-export counter.
 */
export function useExportPermission(): boolean {
  const user = useAuthStore((state) => state.user);
  const canGuestExport = useGuestExportStore(selectCanExport);
  if (user) return true;
  return canGuestExport;
}
