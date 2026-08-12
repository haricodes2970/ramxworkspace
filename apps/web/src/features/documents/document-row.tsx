"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  FolderClosed,
  MoreHorizontal,
  Pencil,
  FolderInput,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { DocumentMeta, Folder } from "@/types/workspace";
import { downloadCloudDocument } from "@/features/documents/document-service";
import { formatBytes } from "@/features/documents/pdf-upload-validation";
import { RenameDocumentDialog } from "@/features/documents/rename-document-dialog";
import { MoveDocumentDialog } from "@/features/documents/move-document-dialog";
import { DeleteDocumentDialog } from "@/features/documents/delete-document-dialog";

type DocumentRowProps = {
  document: DocumentMeta;
  folders: Folder[];
  showFolder?: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Action = "rename" | "move" | "delete" | null;

export function DocumentRow({
  document,
  folders,
  showFolder = true,
}: DocumentRowProps) {
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    router.push(`/workspace?document=${encodeURIComponent(document.id)}`);
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud storage is not configured yet.");
        return;
      }
      const result = await downloadCloudDocument(supabase, document);
      if (!result.ok) {
        setError(result.error ?? "Could not download the document.");
      }
    } catch {
      setError("Could not download the document. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FileText
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {document.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {document.size_bytes !== null && (
              <span>{formatBytes(document.size_bytes)}</span>
            )}
            {showFolder && (
              <span className="flex items-center gap-1">
                <FolderClosed className="size-3" aria-hidden="true" />
                {document.folder_name ?? "No folder"}
              </span>
            )}
            <span>Modified {formatDate(document.updated_at)}</span>
            <span>Opened {formatDate(document.last_opened_at)}</span>
          </span>
        </span>
      </button>

      {error && (
        <span
          role="alert"
          className="w-full text-xs text-destructive sm:w-auto"
        >
          {error}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={`Actions for ${document.name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={open}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleDownload()}
            disabled={downloading}
          >
            <Download className="size-4" aria-hidden="true" />
            {downloading ? "Downloading…" : "Download"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAction("rename")}>
            <Pencil className="size-4" aria-hidden="true" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("move")}>
            <FolderInput className="size-4" aria-hidden="true" />
            Move
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setAction("delete")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDocumentDialog
        open={action === "rename"}
        onOpenChange={(next) => setAction(next ? "rename" : null)}
        document={document}
      />
      <MoveDocumentDialog
        open={action === "move"}
        onOpenChange={(next) => setAction(next ? "move" : null)}
        document={document}
        folders={folders}
      />
      <DeleteDocumentDialog
        open={action === "delete"}
        onOpenChange={(next) => setAction(next ? "delete" : null)}
        document={document}
      />
    </li>
  );
}
