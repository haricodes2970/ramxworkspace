import { FileText, Lock, MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const foundationItems = [
  {
    label: "Application shell",
    detail: "Header, sidebar, mobile navigation, and workspace surface.",
  },
  {
    label: "Local-first stance",
    detail: "No backend, database, upload flow, telemetry, or PDF libraries.",
  },
  {
    label: "Ready for modules",
    detail: "PDF, Word, Excel, PowerPoint, and image areas are separated.",
  },
];

export function WorkspacePlaceholder() {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold">PDF Workspace</h1>
            <Badge variant="secondary">Foundation</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Phase 2 will introduce the PDF viewer and editing workflow.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
              <FileText
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <h2 className="mt-5 text-xl font-semibold">
              PDF tools arrive in Phase 2
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              This phase establishes the production foundation for a private,
              browser-based document workspace.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {foundationItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-background p-4"
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
              <Lock
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">Privacy-first baseline</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The MVP starts with no server-side document handling.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
              <MonitorSmartphone
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">Responsive workspace</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The shell adapts from desktop panels to mobile navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
