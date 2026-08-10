"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useThemeStore } from "@/store/theme-store";

type SystemTheme = "light" | "dark";

type ThemeProviderProps = {
  children: ReactNode;
};

function getSystemTheme(): SystemTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.theme);
  const [systemTheme, setSystemTheme] = useState<SystemTheme>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(getSystemTheme());

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    const root = document.documentElement;

    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [systemTheme, theme]);

  return children;
}
