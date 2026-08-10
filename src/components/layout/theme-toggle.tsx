"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useThemeStore } from "@/store/theme-store";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleTheme}
        >
          <Icon className="size-5" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {dark ? "Switch to light theme" : "Switch to dark theme"}
      </TooltipContent>
    </Tooltip>
  );
}
