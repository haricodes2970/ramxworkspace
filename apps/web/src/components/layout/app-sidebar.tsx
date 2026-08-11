"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Cloud,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder as FolderIcon,
  FolderClosed,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Presentation,
  Sparkles,
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
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceUiStore } from "@/store/workspace-ui-store";
import type { DocumentModuleId } from "@/types/document";
import type { Folder } from "@/types/workspace";

type AppSidebarProps = {
  mobile?: boolean;
  folders?: Folder[];
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
  "cloud-documents": Cloud,
  folders: FolderIcon,
  templates: LayoutTemplate,
  ai: Sparkles,
};

type NavItemProps = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
};

function NavItem({ href, icon: Icon, label, active, collapsed }: NavItemProps) {
  const item = (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return item;
}

function PlannedItem({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground",
        collapsed && "justify-center px-0",
      )}
      aria-disabled="true"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="text-xs text-muted-foreground">Later</span>
        </>
      )}
    </div>
  );
}

function AuthenticatedNav({
  folders,
  pathname,
  collapsed,
  mobile,
}: {
  folders: Folder[];
  pathname: string;
  collapsed: boolean;
  mobile: boolean;
}) {
  return (
    <nav
      className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
      aria-label="Workspace"
    >
      <NavItem
        href="/dashboard"
        icon={LayoutDashboard}
        label="Dashboard"
        active={pathname === "/dashboard"}
        collapsed={collapsed}
      />
      <NavItem
        href="/dashboard/documents"
        icon={FileText}
        label="My Documents"
        active={pathname === "/dashboard/documents"}
        collapsed={collapsed}
      />
      <NavItem
        href="/dashboard#recent"
        icon={History}
        label="Recent"
        active={false}
        collapsed={collapsed}
      />

      <Separator className="my-2" />

      <div
        className={cn(
          "mb-1 flex items-center justify-between px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Folders
          </p>
        )}
      </div>

      {folders.length === 0
        ? !collapsed && (
            <p className="px-3 py-1.5 text-xs leading-5 text-muted-foreground">
              No folders yet. Create one from the dashboard.
            </p>
          )
        : folders.map((folder) => {
            const active = pathname === `/dashboard/folders/${folder.id}`;
            return (
              <NavItem
                key={folder.id}
                href={`/dashboard/folders/${folder.id}`}
                icon={FolderClosed}
                label={folder.name}
                active={active}
                collapsed={collapsed}
              />
            );
          })}

      <Separator className="my-2" />

      <NavItem
        href="/workspace"
        icon={FileText}
        label="PDF Workspace"
        active={pathname === "/workspace"}
        collapsed={collapsed}
      />

      {!collapsed && (
        <p className="px-3 pt-2 text-xs font-medium uppercase text-muted-foreground">
          Coming soon
        </p>
      )}
      <PlannedItem icon={FileText} label="Word" collapsed={collapsed} />
      <PlannedItem icon={FileSpreadsheet} label="Excel" collapsed={collapsed} />
      <PlannedItem
        icon={Presentation}
        label="PowerPoint"
        collapsed={collapsed}
      />
      <PlannedItem icon={Cloud} label="Cloud Documents" collapsed={collapsed} />
      <PlannedItem icon={Sparkles} label="AI" collapsed={collapsed} />
      {mobile && folders.length > 6 && <div className="pb-4" />}
    </nav>
  );
}

function GuestNav({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Workspace">
      {DOCUMENT_MODULES.map((module) => {
        const Icon = moduleIcons[module.id];
        if (module.status === "active") {
          return (
            <NavItem
              key={module.id}
              href="/workspace"
              icon={Icon}
              label={module.label}
              active={pathname === "/workspace"}
              collapsed={collapsed}
            />
          );
        }
        return (
          <PlannedItem
            key={module.id}
            icon={Icon}
            label={module.label}
            collapsed={collapsed}
          />
        );
      })}
    </nav>
  );
}

export function AppSidebar({ mobile = false, folders = [] }: AppSidebarProps) {
  const collapsed = useWorkspaceUiStore((state) => state.sidebarCollapsed);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
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
              <p className="text-sm font-medium">
                {user ? "Your documents" : "Document modules"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <Badge variant="outline" className="font-normal">
              {user ? "Signed in" : "Local-first"}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {user ? (
        <AuthenticatedNav
          folders={folders}
          pathname={pathname}
          collapsed={isCollapsed}
          mobile={mobile}
        />
      ) : (
        <GuestNav collapsed={isCollapsed} pathname={pathname} />
      )}
    </aside>
  );
}
