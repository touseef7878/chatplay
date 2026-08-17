import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type ProfileRow = { display_name: string; username: string | null; is_developer: boolean };

export type SupabaseAppUser = {
  openId: string;
  name: string;
  email: string | null;
  loginMethod: "password";
  isDeveloper: boolean;
};

async function toAppUser(authUser: SupabaseUser): Promise<SupabaseAppUser> {
  const profile = await supabase.from("profiles").select("display_name, username, is_developer").eq("id", authUser.id).maybeSingle();
  return {
    openId: authUser.id,
    name: profile.data?.display_name ?? authUser.user_metadata?.display_name ?? authUser.email?.split("@")[0] ?? "ChatPlay member",
    email: authUser.email ?? null,
    loginMethod: "password",
    isDeveloper: Boolean((profile.data as ProfileRow | null)?.is_developer),
  };
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<SupabaseAppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const current = await supabase.auth.getUser();
    if (current.error || !current.data.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(await toAppUser(current.data.user));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      void toAppUser(session.user).then(next => {
        setUser(next);
        setLoading(false);
      });
    });
    return () => subscription.data.subscription.unsubscribe();
  }, [refresh]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, isAuthenticated: Boolean(user), logout, refresh };
}
