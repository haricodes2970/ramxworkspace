"use client";

import type { ComponentType } from "react";
import {
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DOCUMENT_MODULES } from "@/features/document-modules";
import { cn } from "@/lib/utils";
import { useWorkspaceUiStore } from "@/store/workspace-ui-store";
import type { DocumentModuleId } from "@/types/document";

type AppSidebarProps = {
  mobile?: boolean;
};

const moduleIcons: Record<
  DocumentModuleId,
  ComponentType<{ className?: string }>
> = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
  images: FileImage,
};

export function AppSidebar({ mobile = false }: AppSidebarProps) {
  const collapsed = useWorkspaceUiStore((state) => state.sidebarCollapsed);
  const isCollapsed = !mobile && collapsed;

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex",
        isCollapsed ? "w-16" : "w-64",
        mobile && "flex w-full border-r-0 md:flex",
      )}
    >
      <div className={cn("px-3 py-4", isCollapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            isCollapsed && "justify-center",
          )}
        >
          {!isCollapsed && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Workspace
              </p>
              <p className="text-sm font-medium">Document modules</p>
            </div>
          )}
          {!isCollapsed && (
            <Badge variant="outline" className="font-normal">
              Local-first
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Workspace">
        {DOCUMENT_MODULES.map((module) => {
          const Icon = moduleIcons[module.id];
          const active = module.status === "active";
          const item = (
            <div
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground",
                isCollapsed && "justify-center px-0",
              )}
              aria-current={active ? "page" : undefined}
              aria-disabled={!active}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate">
                    {module.label}
                  </span>
                  {module.status === "planned" && (
                    <span className="text-xs text-muted-foreground">Later</span>
                  )}
                </>
              )}
            </div>
          );

          if (!isCollapsed) {
            return <div key={module.id}>{item}</div>;
          }

          return (
            <Tooltip key={module.id}>
              <TooltipTrigger asChild>{item}</TooltipTrigger>
              <TooltipContent side="right">{module.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
