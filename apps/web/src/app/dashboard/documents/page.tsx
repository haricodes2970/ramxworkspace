import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DocumentRow } from "@/features/documents/document-row";
import { UploadDocumentDialog } from "@/features/documents/upload-document-dialog";
import { getUserDocuments, getUserFolders } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

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
              {documents.length}{" "}
              {documents.length === 1 ? "document" : "documents"} stored in your
              cloud workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UploadDocumentDialog folders={folders} />
            <Button asChild variant="outline" size="sm">
              <Link href="/workspace">
                <FileText className="size-4" aria-hidden="true" />
                Open local PDF
              </Link>
            </Button>
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
            <h2 className="text-base font-semibold">No documents yet</h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Upload your first PDF — it will be stored privately in your cloud
              workspace and ready to open from anywhere.
            </p>
            <div className="mt-1">
              <UploadDocumentDialog folders={folders} />
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} document={doc} folders={folders} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
