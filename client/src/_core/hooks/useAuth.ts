import { useSupabaseAuth } from "./useSupabaseAuth";
import { useCallback, useEffect } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Redirect only from an effect, never during render, so auth state changes do not cause navigation loops.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const supabaseAuth = useSupabaseAuth();
  const { user, loading, isAuthenticated } = supabaseAuth;
  const error = null;

  const logout = useCallback(async () => {
    await supabaseAuth.logout();
    try { sessionStorage.removeItem("manus-cookie"); } catch {}
  }, [supabaseAuth]);

  const state = { user, loading, error, isAuthenticated };

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate only after the Supabase session has finished loading.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      window.location.href = "/";
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: supabaseAuth.refresh,
    logout,
  };
}
