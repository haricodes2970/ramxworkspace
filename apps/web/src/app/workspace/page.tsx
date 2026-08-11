import { AppShell } from "@/components/layout/app-shell";
import { PdfWorkspace } from "@/features/pdf/components/pdf-workspace";

export default function WorkspacePage() {
  return (
    <AppShell>
      <PdfWorkspace />
    </AppShell>
  );
}
