import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { User } from "../drizzle/schema";
import { getUserBySupabaseAuthId, getUserByUsername, upsertUser } from "./db";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Supabase server configuration is unavailable");
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getSupabasePublicClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase browser configuration is unavailable");
  return createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function managedEmail(openId: string) {
  return `manus-${createHash("sha256").update(openId).digest("hex").slice(0, 32)}@users.chatplay.local`;
}

function localEmail(username: string) {
  return `user-${createHash("sha256").update(username).digest("hex").slice(0, 32)}@accounts.chatplay.local`;
}

export async function registerLocalAccount(username: string, password: string, displayName: string) {
  const normalized = username.trim().toLowerCase();
  if (await getUserByUsername(normalized)) throw new Error("That username is already taken");
  const admin = getSupabaseAdmin();
  const created = await admin.auth.admin.createUser({
    email: localEmail(normalized),
    password,
    email_confirm: true,
    user_metadata: { username: normalized, display_name: displayName.trim() },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Unable to create account");
  const authUser = created.data.user;
  const openId = `local_${authUser.id}`;
  await upsertUser({
    openId,
    username: normalized,
    supabaseAuthId: authUser.id,
    name: displayName.trim(),
    email: localEmail(normalized),
    loginMethod: "password",
    lastSignedIn: new Date(),
  });
  const user = await getUserBySupabaseAuthId(authUser.id);
  if (!user) throw new Error("Account was created but could not be persisted");
  return user;
}

export async function loginLocalAccount(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  const auth = await getSupabasePublicClient().auth.signInWithPassword({ email: localEmail(normalized), password });
  if (auth.error || !auth.data.user) throw new Error("Invalid username or password");
  const user = await getUserBySupabaseAuthId(auth.data.user.id);
  if (!user) throw new Error("Account profile is missing");
  await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

export async function createLinkedSupabaseSession(user: User) {
  const admin = getSupabaseAdmin();
  let email = managedEmail(user.openId);
  if (user.supabaseAuthId) {
    const existing = await admin.auth.admin.getUserById(user.supabaseAuthId);
    if (existing.error || !existing.data.user?.email) throw existing.error ?? new Error("Supabase account is missing");
    email = existing.data.user.email;
  }
  let link = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (link.error && /not found|does not exist/i.test(link.error.message)) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { manus_open_id: user.openId, display_name: user.name ?? "ChatPlay member" },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("Unable to provision Supabase user");
    link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  }

  if (link.error || !link.data.properties.hashed_token || !link.data.user) {
    throw link.error ?? new Error("Unable to create Supabase session link");
  }

  const sessionResult = await getSupabasePublicClient().auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink",
  });
  if (sessionResult.error || !sessionResult.data.session) {
    throw sessionResult.error ?? new Error("Unable to exchange Supabase session link");
  }

  const displayName = (user.name || "ChatPlay member").slice(0, 48);
  const profile = await admin.from("profiles").upsert({
    id: link.data.user.id,
    manus_open_id: user.openId,
    display_name: displayName,
    avatar_seed: user.openId,
  });
  if (profile.error) throw profile.error;

  return {
    accessToken: sessionResult.data.session.access_token,
    refreshToken: sessionResult.data.session.refresh_token,
  };
}
