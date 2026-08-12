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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { DocumentMeta } from "@/types/workspace";
import { renameCloudDocument } from "@/features/documents/document-service";

type RenameDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentMeta;
};

function ensurePdfExtension(name: string): string {
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

export function RenameDocumentDialog({
  open,
  onOpenChange,
  document: { id, name },
}: RenameDocumentDialogProps) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (submitting) return;
    const next = value.trim();
    if (!next) {
      setError("The document name cannot be empty.");
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
      const result = await renameCloudDocument(
        supabase,
        id,
        ensurePdfExtension(next),
      );
      if (!result.ok) {
        setError(result.error ?? "Could not rename the document.");
        return;
      }
      router.refresh();
      onOpenChange(false);
    } catch {
      setError("Could not rename the document. Please try again.");
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
          setValue(name);
          setError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
          <DialogDescription>
            The name updates everywhere; the stored file stays where it is.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="document-name">Name</Label>
          <Input
            id="document-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSave();
            }}
            disabled={submitting}
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
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
