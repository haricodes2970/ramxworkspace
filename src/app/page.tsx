import { AppShell } from "@/components/layout/app-shell";
import { WorkspacePlaceholder } from "@/features/workspace/components/workspace-placeholder";

export default function Home() {
  return (
    <AppShell>
      <WorkspacePlaceholder />
    </AppShell>
  );
}
