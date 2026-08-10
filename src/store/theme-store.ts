"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const currentTheme = get().theme;
        set({ theme: currentTheme === "dark" ? "light" : "dark" });
      },
    }),
    {
      name: "ramx-theme",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
