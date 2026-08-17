import { supabase } from "./supabase";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function joinPublicRoom(roomId: string) {
  const data = unwrap(await supabase.rpc("join_public_room", { p_room_id: roomId }));
  return { roomId: data, joined: true };
}

export async function inviteRoomMember(roomId: string, inviteeId: string) {
  const data = unwrap(await supabase.rpc("invite_room_member", { p_room_id: roomId, p_invitee_id: inviteeId }));
  return data as { roomId: string; inviteeId: string; invited: boolean };
}

export async function acceptRoomInvitation(notificationId: string) {
  const data = unwrap(await supabase.rpc("accept_room_invitation", { p_notification_id: notificationId }));
  return { roomId: data, accepted: true };
}

export async function leaveRoom(roomId: string) {
  const data = unwrap(await supabase.rpc("leave_room", { p_room_id: roomId }));
  return { roomId: data, left: true };
}

export async function deleteRoom(roomId: string) {
  const data = unwrap(await supabase.rpc("delete_room", { p_room_id: roomId }));
  return { roomId: data, deleted: true };
}

export async function updateMyProfile(displayName: string, avatarUrl: string | null) {
  return unwrap(await supabase.rpc("update_my_profile", { p_display_name: displayName, p_avatar_url: avatarUrl }));
}
