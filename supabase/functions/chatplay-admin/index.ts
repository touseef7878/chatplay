import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const token = authorization.slice("Bearer ".length);
    const url = required("SUPABASE_URL");
    const anonKey = required("SUPABASE_ANON_KEY");
    const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const current = await userClient.auth.getUser(token);
    if (current.error || !current.data.user) return json({ error: "Authentication required" }, 401);
    const developer = await userClient.rpc("is_chatplay_developer");
    if (developer.error || developer.data !== true) return json({ error: "Developer access required" }, 403);
    const input = await request.json();
    const action = String(input?.action ?? "");

    if (action === "list_users") {
      const result = await userClient.from("profiles").select("id, username, display_name, avatar_url, is_developer, created_at").order("created_at", { ascending: true });
      if (result.error) throw result.error;
      return json({ users: result.data ?? [] });
    }
    if (action === "list_audit") {
      const result = await userClient.from("developer_audit_log").select("id, actor_id, target_id, target_username, action, created_at").order("created_at", { ascending: false }).limit(100);
      if (result.error) throw result.error;
      return json({ entries: result.data ?? [] });
    }
    if (action === "delete_user") {
      const targetId = String(input?.targetId ?? "");
      if (!targetId || targetId === current.data.user.id) return json({ error: "The developer account cannot be deleted" }, 403);
      const target = await adminClient.from("profiles").select("id, username").eq("id", targetId).maybeSingle();
      if (target.error) throw target.error;
      if (!target.data) return json({ error: "User account was not found" }, 404);
      const media = await adminClient.from("messages").select("voice_path, image_path").eq("sender_id", targetId);
      if (media.error) throw media.error;
      const voicePaths = (media.data ?? []).map(row => row.voice_path).filter((value): value is string => Boolean(value));
      const imagePaths = (media.data ?? []).map(row => row.image_path).filter((value): value is string => Boolean(value));
      if (voicePaths.length) { const removed = await adminClient.storage.from("voice-messages").remove(voicePaths); if (removed.error) throw removed.error; }
      if (imagePaths.length) { const removed = await adminClient.storage.from("chat-images").remove(imagePaths); if (removed.error) throw removed.error; }
      const deleted = await adminClient.auth.admin.deleteUser(targetId);
      if (deleted.error) throw deleted.error;
      const audit = await adminClient.from("developer_audit_log").insert({ actor_id: current.data.user.id, target_id: targetId, target_username: target.data.username, action: "delete_user" });
      if (audit.error) throw audit.error;
      return json({ deletedId: targetId });
    }
    return json({ error: "Unknown admin action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Admin operation failed" }, 400);
  }
});
