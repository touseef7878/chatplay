import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type { User } from "../drizzle/schema";
import { deleteUserRecord, getUserByOpenId, getUserBySupabaseAuthId, getUserByUsername, insertDeveloperAuditEntry, upsertUser } from "./db";

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

export async function deleteChatPlayUser(openId: string, actorOpenId: string) {
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("User account was not found");
  if (!user.supabaseAuthId) {
    await deleteUserRecord(openId);
    await insertDeveloperAuditEntry({ actorOpenId, targetOpenId: openId, targetUsername: user.username, action: "delete_user" });
    return { deletedOpenId: openId };
  }

  const admin = getSupabaseAdmin();
  const authId = user.supabaseAuthId;
  const voiceMessages = await admin.from("messages").select("voice_path").eq("sender_id", authId).not("voice_path", "is", null);
  if (voiceMessages.error) throw voiceMessages.error;
  const voicePaths = (voiceMessages.data ?? []).map(row => row.voice_path).filter((path): path is string => Boolean(path));

  const cleanupSteps = [
    () => admin.from("notifications").delete().or(`recipient_id.eq.${authId},actor_id.eq.${authId}`),
    () => admin.from("game_players").delete().eq("user_id", authId),
    () => admin.from("game_sessions").delete().eq("host_id", authId),
    () => admin.from("messages").delete().eq("sender_id", authId),
    () => admin.from("room_members").delete().eq("user_id", authId),
    () => admin.from("rooms").delete().eq("created_by", authId),
  ];
  for (const cleanup of cleanupSteps) {
    const result = await cleanup();
    if (result.error) throw result.error;
  }
  if (voicePaths.length) await admin.storage.from("voice-messages").remove(voicePaths);

  const avatarFiles = await admin.storage.from("avatars").list(authId, { limit: 1000 });
  if (!avatarFiles.error && avatarFiles.data?.length) {
    await admin.storage.from("avatars").remove(avatarFiles.data.map(file => `${authId}/${file.name}`));
  }

  const deleted = await admin.auth.admin.deleteUser(authId);
  if (deleted.error) throw deleted.error;
  await deleteUserRecord(openId);
  await insertDeveloperAuditEntry({ actorOpenId, targetOpenId: openId, targetUsername: user.username, targetSupabaseAuthId: authId, action: "delete_user" });
  return { deletedOpenId: openId };
}

async function getSupabaseAuthIdForOpenId(openId: string) {
  const user = await getUserByOpenId(openId);
  if (!user?.supabaseAuthId) throw new Error("Your secure chat profile is not ready yet");
  return user.supabaseAuthId;
}

export const CHAT_CLEANUP_BATCH_SIZE = 100;

export function cleanupBatchCount(totalMessages: number, batchSize = CHAT_CLEANUP_BATCH_SIZE) {
  if (totalMessages <= 0) return 0;
  return Math.ceil(totalMessages / batchSize);
}

export async function clearMyChatData(openId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const batchSize = CHAT_CLEANUP_BATCH_SIZE;
  let deletedMessages = 0;
  let deletedVoiceFiles = 0;
  let batchesProcessed = 0;

  while (true) {
    const batch = await admin.from("messages").select("id, voice_path").eq("sender_id", authId).order("created_at", { ascending: true }).limit(batchSize);
    if (batch.error) throw batch.error;
    const rows = batch.data ?? [];
    if (!rows.length) break;
    const ids = rows.map(row => row.id);
    const voicePaths = rows.map(row => row.voice_path).filter((path): path is string => Boolean(path));
    if (voicePaths.length) {
      const removed = await admin.storage.from("voice-messages").remove(voicePaths);
      if (removed.error) throw removed.error;
      deletedVoiceFiles += voicePaths.length;
    }
    const removedMessages = await admin.from("messages").delete().in("id", ids);
    if (removedMessages.error) throw removedMessages.error;
    deletedMessages += ids.length;
    batchesProcessed += 1;
  }

  return { deletedMessages, deletedVoiceFiles, batchesProcessed, batchSize };
}

export function canLeaveChatRoom(membershipRole: string) {
  return membershipRole !== "owner";
}

export function canDeleteChatRoom(roomOwnerId: string, callerId: string) {
  return roomOwnerId === callerId;
}

export function isValidRoomInvitation(notification: { recipient_id: string; kind: string; room_id: string | null } | null, recipientId: string) {
  return Boolean(notification && notification.recipient_id === recipientId && notification.kind === "room_invite" && notification.room_id);
}

export function canInviteRoomMember(roomOwnerId: string, callerId: string, inviteeId: string) {
  return roomOwnerId === callerId && inviteeId !== callerId;
}

export function canJoinPublicRoom(visibility: string) {
  return visibility === "public";
}

export async function joinPublicRoom(openId: string, roomId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const room = await admin.from("rooms").select("id, visibility").eq("id", roomId).maybeSingle();
  if (room.error) throw room.error;
  if (!room.data || !canJoinPublicRoom(room.data.visibility)) throw new Error("This private room requires an invitation");
  const membership = await admin.from("room_members").upsert({ room_id: roomId, user_id: authId, membership_role: "member" }, { onConflict: "room_id,user_id" });
  if (membership.error) throw membership.error;
  return { roomId, joined: true };
}

export async function inviteRoomMember(openId: string, roomId: string, inviteeId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const room = await admin.from("rooms").select("id, name, created_by, visibility").eq("id", roomId).maybeSingle();
  if (room.error) throw room.error;
  if (!room.data || room.data.visibility !== "private") throw new Error("Only existing private rooms can send invitations");
  if (!canInviteRoomMember(room.data.created_by, authId, inviteeId)) throw new Error("Only the room owner can invite another member");
  const membership = await admin.from("room_members").upsert({ room_id: roomId, user_id: inviteeId, membership_role: "member" }, { onConflict: "room_id,user_id" });
  if (membership.error) throw membership.error;
  const notification = await admin.from("notifications").insert({ recipient_id: inviteeId, actor_id: authId, room_id: roomId, kind: "room_invite", title: `Invitation to ${room.data.name}`, body: `You were invited to join ${room.data.name}.`, metadata: { room_id: roomId } });
  if (notification.error) throw notification.error;
  return { roomId, inviteeId, invited: true };
}

export async function acceptRoomInvitation(openId: string, notificationId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const notification = await admin.from("notifications").select("id, recipient_id, room_id, kind, read_at").eq("id", notificationId).maybeSingle();
  if (notification.error) throw notification.error;
  const invite = notification.data;
  if (!invite || !isValidRoomInvitation(invite, authId)) {
    throw new Error("This room invitation is invalid or no longer available");
  }
  const roomId = invite.room_id;
  const room = await admin.from("rooms").select("id").eq("id", roomId).maybeSingle();
  if (room.error) throw room.error;
  if (!room.data) throw new Error("This room no longer exists");
  const membership = await admin.from("room_members").upsert({ room_id: roomId, user_id: authId, membership_role: "member" }, { onConflict: "room_id,user_id" });
  if (membership.error) throw membership.error;
  const marked = await admin.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("recipient_id", authId);
  if (marked.error) throw marked.error;
  return { roomId, accepted: true };
}

export async function leaveChatRoom(openId: string, roomId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const membership = await admin.from("room_members").select("membership_role").eq("room_id", roomId).eq("user_id", authId).maybeSingle();
  if (membership.error) throw membership.error;
  if (!membership.data) throw new Error("You are not a member of this room");
  if (!canLeaveChatRoom(membership.data.membership_role)) throw new Error("Room owners must delete the room instead of leaving it");
  const result = await admin.from("room_members").delete().eq("room_id", roomId).eq("user_id", authId);
  if (result.error) throw result.error;
  return { roomId, left: true };
}

export async function deleteChatRoom(openId: string, roomId: string) {
  const authId = await getSupabaseAuthIdForOpenId(openId);
  const admin = getSupabaseAdmin();
  const room = await admin.from("rooms").select("id, created_by").eq("id", roomId).maybeSingle();
  if (room.error) throw room.error;
  if (!room.data) throw new Error("Room not found");
  if (!canDeleteChatRoom(room.data.created_by, authId)) throw new Error("Only the room owner can delete this room");
  const voiceMessages = await admin.from("messages").select("voice_path").eq("room_id", roomId).not("voice_path", "is", null);
  if (voiceMessages.error) throw voiceMessages.error;
  const voicePaths = (voiceMessages.data ?? []).map(row => row.voice_path).filter((path): path is string => Boolean(path));
  if (voicePaths.length) {
    const removed = await admin.storage.from("voice-messages").remove(voicePaths);
    if (removed.error) throw removed.error;
  }
  const result = await admin.from("rooms").delete().eq("id", roomId);
  if (result.error) throw result.error;
  return { roomId, deleted: true, deletedVoiceFiles: voicePaths.length };
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
