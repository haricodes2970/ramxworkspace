import { AppShell } from "@/components/layout/app-shell";
import { GuestConversionDialog } from "@/features/guest/guest-conversion-dialog";
import { PdfWorkspace } from "@/features/pdf/components/pdf-workspace";

export default function WorkspacePage() {
  return (
    <AppShell>
      <GuestConversionDialog />
      <PdfWorkspace />
    </AppShell>
  );
}
