"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

type AuthProviderProps = {
  initialUser: AuthUser | null;
};

export function AuthProvider({ initialUser }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setReady = useAuthStore((state) => state.setReady);

  useEffect(() => {
    setUser(initialUser);
    setReady(true);

    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUser(user ? { id: user.id, email: user.email ?? "" } : null);
    });

    return () => subscription.unsubscribe();
  }, [initialUser, setUser, setReady]);

  return null;
}
