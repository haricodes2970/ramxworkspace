import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, FolderClosed } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { DeleteFolderDialog } from "@/features/folders/delete-folder-dialog";
import { RenameFolderDialog } from "@/features/folders/rename-folder-dialog";
import { getFolder, getUserFolders } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login");

  const [folders, folderData] = await Promise.all([
    getUserFolders(supabase),
    getFolder(supabase, id),
  ]);

  if (!folderData) notFound();

  const { folder, documents } = folderData;

  return (
    <AppShell folders={folders}>
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                <FolderClosed
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {folder.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {documents.length}{" "}
                  {documents.length === 1 ? "document" : "documents"} · created{" "}
                  {formatDate(folder.created_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RenameFolderDialog folderId={folder.id} folderName={folder.name} />
            <DeleteFolderDialog
              folderId={folder.id}
              folderName={folder.name}
              documentCount={documents.length}
            />
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-background px-5 py-10">
            <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
              <FileText
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-base font-semibold">This folder is empty</h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Cloud upload is coming in the next update. You can still work on
              PDFs from your device — the editor keeps everything in your
              browser.
            </p>
            <Link
              href="/workspace"
              className="mt-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Open local PDF →
            </Link>
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
