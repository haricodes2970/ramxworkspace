"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type DeleteFolderDialogProps = {
  folderId: string;
  folderName: string;
  documentCount: number;
};

export function DeleteFolderDialog({
  folderId,
  folderName,
  documentCount,
}: DeleteFolderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blocked = documentCount > 0;

  const handleDelete = async () => {
    if (submitting || blocked) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const { error: deleteError } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);
      if (deleteError) {
        setError("Could not delete the folder. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
      setSubmitting(false);
    } catch {
      setError("Could not delete the folder. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setSubmitting(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={blocked}
          aria-disabled={blocked}
          title={
            blocked
              ? "Move or delete the documents in this folder first"
              : undefined
          }
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{folderName}&quot;?</DialogTitle>
          <DialogDescription>
            This permanently deletes the folder. Documents inside it are not
            deleted.
            {blocked &&
              " This folder contains documents, so it cannot be deleted yet — move them to another folder first."}
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
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting || blocked}
          >
            {submitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {submitting ? "Deleting…" : "Delete folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
