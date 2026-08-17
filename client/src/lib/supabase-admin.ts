import { supabase } from "./supabase";

export type FreshDeveloperUser = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  is_developer: boolean;
  created_at: string;
};

export type FreshAuditEntry = {
  id: string;
  actor_id: string;
  target_id: string;
  target_username: string | null;
  action: string;
  created_at: string;
};

async function invoke<T>(body: Record<string, unknown>) {
  const result = await supabase.functions.invoke<T>("chatplay-admin", { body });
  if (result.error) throw new Error(result.error.message || "Developer operation failed");
  return result.data as T;
}

export async function listFreshDeveloperUsers() {
  return (await invoke<{ users: FreshDeveloperUser[] }>({ action: "list_users" })).users;
}

export async function listFreshDeveloperAudit() {
  return (await invoke<{ entries: FreshAuditEntry[] }>({ action: "list_audit" })).entries;
}

export async function deleteFreshDeveloperUser(targetId: string) {
  return invoke<{ deletedId: string }>({ action: "delete_user", targetId });
}
