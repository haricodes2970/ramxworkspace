import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GuestConversionDialog } from "@/features/guest/guest-conversion-dialog";
import { PdfWorkspace } from "@/features/pdf/components/pdf-workspace";
import { getUserFolders } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const folders = supabase && user ? await getUserFolders(supabase) : [];

  return (
    <AppShell folders={folders}>
      <AuthProvider
        initialUser={user ? { id: user.id, email: user.email ?? "" } : null}
      />
      <GuestConversionDialog />
      <PdfWorkspace />
    </AppShell>
  );
}
