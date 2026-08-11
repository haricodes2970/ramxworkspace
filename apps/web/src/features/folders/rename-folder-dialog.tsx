"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type RenameFolderDialogProps = {
  folderId: string;
  folderName: string;
};

export function RenameFolderDialog({
  folderId,
  folderName,
}: RenameFolderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(folderName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Folder name is required.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Folder name must be 100 characters or fewer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const { error: updateError } = await supabase
        .from("folders")
        .update({ name: trimmed })
        .eq("id", folderId);
      if (updateError) {
        setError("Could not rename the folder. Please try again.");
        return;
      }
      router.refresh();
      setOpen(false);
      setSubmitting(false);
    } catch {
      setError("Could not rename the folder. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(folderName);
        if (!next) {
          setError(null);
          setSubmitting(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden="true" />
          Rename
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogDescription>
            Choose a new name for this folder.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename-folder-name">Folder name</Label>
            <Input
              id="rename-folder-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className="h-11"
              required
            />
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
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {submitting ? "Renaming…" : "Rename folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
