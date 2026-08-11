import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GuestConversionDialog } from "@/features/guest/guest-conversion-dialog";
import { PdfWorkspace } from "@/features/pdf/components/pdf-workspace";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell>
      <AuthProvider
        initialUser={user ? { id: user.id, email: user.email ?? "" } : null}
      />
      <GuestConversionDialog />
      <PdfWorkspace />
    </AppShell>
  );
}
