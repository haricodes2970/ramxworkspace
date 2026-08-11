import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/login");

  return (
    <>
      <AuthProvider initialUser={{ id: user.id, email: user.email ?? "" }} />
      {children}
    </>
  );
}
