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
import { createClient } from "@/lib/supabase/client";
import type { DocumentMeta } from "@/types/workspace";
import { deleteCloudDocument } from "@/features/documents/document-service";

type DeleteDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentMeta;
};

export function DeleteDocumentDialog({
  open,
  onOpenChange,
  document,
}: DeleteDocumentDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const result = await deleteCloudDocument(supabase, document.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete the document.");
        return;
      }
      router.refresh();
      onOpenChange(false);
    } catch {
      setError("Could not delete the document. Please try again.");
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
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &quot;{document.name}&quot;?</DialogTitle>
          <DialogDescription>
            This permanently deletes the document and its stored file from your
            cloud workspace. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {submitting ? "Deleting…" : "Delete document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
