"use client";

import Link from "next/link";
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeConversion();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>You&apos;ve used your 3 free exports</DialogTitle>
          <DialogDescription>
            Creating a free account unlocks unlimited exports, and later your
            own documents and cloud storage. You can keep editing this PDF as a
            guest either way.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeConversion}>
            Continue editing
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/login" onClick={closeConversion}>
              Log in
            </Link>
          </Button>
          <Button type="button" asChild>
            <Link href="/signup" onClick={closeConversion}>
              Create free account
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
