"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
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

export function NewFolderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setOpen(false);
    setName("");
    setError(null);
    setSubmitting(false);
  };

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
      const { error: insertError } = await supabase.from("folders").insert({
        name: trimmed,
      });
      if (insertError) {
        setError("Could not create the folder. Please try again.");
        return;
      }
      router.refresh();
      reset();
    } catch {
      setError("Could not create the folder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : reset())}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <FolderPlus className="size-4" aria-hidden="true" />
          New folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Folders help you keep your documents organized.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              type="text"
              placeholder="e.g. Personal"
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
              onClick={reset}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {submitting ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
