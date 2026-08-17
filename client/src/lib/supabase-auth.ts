import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthResponse = { session: Session; user: SupabaseUser };

async function invokeAuth(body: Record<string, unknown>) {
  const result = await supabase.functions.invoke<AuthResponse>("chatplay-auth", { body });
  if (result.error) throw new Error(result.error.message || "Authentication request failed");
  if (!result.data?.session) throw new Error("Authentication did not return a session");
  const sessionResult = await supabase.auth.setSession(result.data.session);
  if (sessionResult.error) throw sessionResult.error;
  return result.data;
}

export function registerWithSupabase(username: string, password: string, displayName: string) {
  return invokeAuth({ action: "register", username, password, displayName });
}

export function loginWithSupabase(username: string, password: string) {
  return invokeAuth({ action: "login", username, password });
}

export async function getCurrentSupabaseUser() {
  const result = await supabase.auth.getUser();
  if (result.error) return null;
  return result.data.user;
}
