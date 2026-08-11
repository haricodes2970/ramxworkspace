"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const GUEST_MAX_EXPORTS = 3;
export const GUEST_STORAGE_KEY = "ramspace-guest-export-count";

export type SessionType = "guest" | "authenticated";

type GuestExportState = {
  sessionType: SessionType;
  exportsUsed: number;
  conversionOpen: boolean;
  recordSuccessfulExport: () => void;
  openConversion: () => void;
  closeConversion: () => void;
  resetExports: () => void;
};

export const useGuestExportStore = create<GuestExportState>()(
  persist(
    (set) => ({
      sessionType: "guest",
      exportsUsed: 0,
      conversionOpen: false,
      recordSuccessfulExport: () =>
        set((state) => ({
          exportsUsed: Math.min(state.exportsUsed + 1, GUEST_MAX_EXPORTS),
        })),
      openConversion: () => set({ conversionOpen: true }),
      closeConversion: () => set({ conversionOpen: false }),
      resetExports: () => set({ exportsUsed: 0 }),
    }),
    {
      name: GUEST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ exportsUsed: state.exportsUsed }),
    },
  ),
);

export const selectCanExport = (state: GuestExportState) =>
  state.exportsUsed < GUEST_MAX_EXPORTS;

export const selectRemainingExports = (state: GuestExportState) =>
  Math.max(GUEST_MAX_EXPORTS - state.exportsUsed, 0);
