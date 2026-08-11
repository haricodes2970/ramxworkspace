"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
