import { LandingPage } from "@/features/landing/landing-page";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  return <LandingPage authenticated={Boolean(user)} />;
}
