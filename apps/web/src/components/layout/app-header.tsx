"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appConfig } from "@/lib/env";
import { useWorkspaceUiStore } from "@/store/workspace-ui-store";

export function AppHeader() {
  const sidebarCollapsed = useWorkspaceUiStore(
    (state) => state.sidebarCollapsed,
  );
  const toggleSidebar = useWorkspaceUiStore((state) => state.toggleSidebar);
  const mobileNavOpen = useWorkspaceUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useWorkspaceUiStore(
    (state) => state.setMobileNavOpen,
  );
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-background px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={toggleSidebar}
            >
              <SidebarIcon className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold">
            R
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5">
              {appConfig.name}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Private document workspace
            </p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Phase 1
        </Badge>
        <ThemeToggle />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>RamxWorkspace document modules</SheetDescription>
          </SheetHeader>
          <AppSidebar mobile />
        </SheetContent>
      </Sheet>
    </header>
  );
}
