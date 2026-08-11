import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FolderClosed } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getUserDocuments, getUserFolders } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login");

  const [folders, documents] = await Promise.all([
    getUserFolders(supabase),
    getUserDocuments(supabase),
  ]);

  return (
    <AppShell folders={folders}>
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              My Documents
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your document library. Cloud upload is coming in the next update.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/workspace">
              <FileText className="size-4" aria-hidden="true" />
              Open local PDF
            </Link>
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-background px-5 py-10">
            <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
              <FileText
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-base font-semibold">No documents yet</h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Cloud upload is coming next. Until then, you can open PDFs
              directly from your device in the editor — everything stays in your
              browser.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/workspace">
                <FileText className="size-4" aria-hidden="true" />
                Open local PDF
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {doc.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {doc.folder_name ? (
                    <>
                      <FolderClosed className="size-3" aria-hidden="true" />
                      {doc.folder_name}
                    </>
                  ) : (
                    "No folder"
                  )}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {doc.file_type.toUpperCase()}
                </span>
                <span className="hidden text-xs text-muted-foreground md:block">
                  Modified {formatDate(doc.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
