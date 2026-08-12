"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { DocumentMeta, Folder } from "@/types/workspace";
import { moveCloudDocument } from "@/features/documents/document-service";

type MoveDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentMeta;
  folders: Folder[];
};

export function MoveDocumentDialog({
  open,
  onOpenChange,
  document,
  folders,
}: MoveDocumentDialogProps) {
  const router = useRouter();
  const [folderId, setFolderId] = useState<string>(document.folder_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const result = await moveCloudDocument(
        supabase,
        document.id,
        folderId || null,
      );
      if (!result.ok) {
        setError(result.error ?? "Could not move the document.");
        return;
      }
      router.refresh();
      onOpenChange(false);
    } catch {
      setError("Could not move the document. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting && !next) return;
        onOpenChange(next);
        if (!next) {
          setFolderId(document.folder_id ?? "");
          setError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move document</DialogTitle>
          <DialogDescription>
            Moving a document only changes where it appears — the file itself is
            not copied or moved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="move-folder">Destination folder</Label>
          <select
            id="move-folder"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            disabled={submitting}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No folder</option>
            {folders
              .filter((folder) => folder.id !== document.folder_id)
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={submitting}>
            {submitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {submitting ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
