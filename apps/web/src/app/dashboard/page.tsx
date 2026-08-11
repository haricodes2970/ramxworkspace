import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FolderClosed, History } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { NewFolderDialog } from "@/features/folders/new-folder-dialog";
import { getRecentDocuments, getUserFolders } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login");

  const [folders, recent] = await Promise.all([
    getUserFolders(supabase),
    getRecentDocuments(supabase),
  ]);

  const name = (user.email?.split("@")[0] ?? "there").replace(/[._-]/g, " ");

  return (
    <AppShell folders={folders}>
      <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting()}, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your private document workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/workspace">
                <FileText className="size-4" aria-hidden="true" />
                Open local PDF
              </Link>
            </Button>
            <NewFolderDialog />
          </div>
        </section>

        <section id="recent" aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center gap-2">
            <History
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 id="recent-heading" className="text-sm font-semibold">
              Recent documents
            </h2>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-background px-5 py-6">
              <p className="text-sm text-muted-foreground">
                No recent documents. Cloud upload is coming in the next update —
                for now you can work on local PDFs.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/workspace">
                  <FileText className="size-4" aria-hidden="true" />
                  Open local PDF
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {recent.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {doc.name}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {doc.folder_name ?? "No folder"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(doc.last_opened_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="folders-heading">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderClosed
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 id="folders-heading" className="text-sm font-semibold">
                Folders
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {folders.length} {folders.length === 1 ? "folder" : "folders"}
            </span>
          </div>
          {folders.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-background px-5 py-6">
              <p className="text-sm text-muted-foreground">
                No folders yet. Create your first folder to organize your
                documents.
              </p>
              <NewFolderDialog />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <Link
                    href={`/dashboard/folders/${folder.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                      <FolderClosed
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {folder.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {folder.document_count}{" "}
                      {folder.document_count === 1 ? "document" : "documents"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
