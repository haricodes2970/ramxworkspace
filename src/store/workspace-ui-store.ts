"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type WorkspaceUiState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
};

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: "ramx-workspace-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
