import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUsername(value: unknown) {
  const username = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error("Use 3-24 lowercase letters, numbers, or underscores");
  }
  return username;
}

async function localEmail(username: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(username));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `user-${hex.slice(0, 32)}@accounts.chatplay.local`;
}

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const input = await request.json();
    const action = String(input?.action ?? "");
    const username = normalizeUsername(input?.username);
    const email = await localEmail(username);
    const supabaseUrl = required("SUPABASE_URL");
    const anonKey = required("SUPABASE_ANON_KEY");
    const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    if (action === "register") {
      const password = String(input?.password ?? "");
      const displayName = String(input?.displayName ?? "").trim();
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      if (displayName.length < 1 || displayName.length > 48) throw new Error("Display name must be 1-48 characters");
      const created = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      });
      if (created.error) throw created.error;
      const signedIn = await publicClient.auth.signInWithPassword({ email, password });
      if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Unable to create session");
      return response({ session: signedIn.data.session, user: signedIn.data.user });
    }

    if (action === "login") {
      const password = String(input?.password ?? "");
      const signedIn = await publicClient.auth.signInWithPassword({ email, password });
      if (signedIn.error || !signedIn.data.session) throw new Error("Invalid username or password");
      return response({ session: signedIn.data.session, user: signedIn.data.user });
    }

    return response({ error: "Unknown auth action" }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Authentication failed" }, 400);
  }
});
