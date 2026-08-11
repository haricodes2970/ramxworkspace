"use client";

import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { Folder } from "@/types/workspace";

type AppShellProps = {
  children: ReactNode;
  folders?: Folder[];
};

export function AppShell({ children, folders = [] }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader folders={folders} />
      <div className="flex h-[calc(100svh-3.5rem)] min-h-0 border-t border-border">
        <AppSidebar folders={folders} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
