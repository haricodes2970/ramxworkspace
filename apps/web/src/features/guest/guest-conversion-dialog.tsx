"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGuestExportStore } from "@/features/guest/guest-export-store";

export function GuestConversionDialog() {
  const open = useGuestExportStore((state) => state.conversionOpen);
  const closeConversion = useGuestExportStore((state) => state.closeConversion);
  const [comingSoon, setComingSoon] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setComingSoon(false);
          closeConversion();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        {comingSoon ? (
          <DialogHeader>
            <DialogTitle>Account creation is coming soon</DialogTitle>
            <DialogDescription>
              Sign-up arrives in a later update. Until then you can keep
              editing this PDF — reopening a document after closing it is not
              available to guests yet.
            </DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader>
            <DialogTitle>You&apos;ve used your 3 free exports</DialogTitle>
            <DialogDescription>
              Creating an account will unlock more of the workspace: your
              documents, cloud storage and folders. For now you can keep
              editing this PDF — only exporting is limited for guests.
            </DialogDescription>
          </DialogHeader>
        )}
        <DialogFooter>
          {comingSoon ? (
            <Button
              type="button"
              onClick={() => {
                setComingSoon(false);
                closeConversion();
              }}
            >
              Back to editing
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeConversion}
              >
                Continue editing
              </Button>
              <Button
                type="button"
                onClick={() => setComingSoon(true)}
              >
                Create free account
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
