"use client";

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

type StaleSaveDialogProps = {
  open: boolean;
  saving: boolean;
  onSaveAnyway: () => void;
  onCancel: () => void;
};

export function StaleSaveDialog({
  open,
  saving,
  onSaveAnyway,
  onCancel,
}: StaleSaveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document was updated</DialogTitle>
          <DialogDescription>
            This document was changed after you opened it. Saving will overwrite
            those changes with your current edits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSaveAnyway} disabled={saving}>
            {saving && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {saving ? "Saving…" : "Save anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
