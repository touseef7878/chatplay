create or replace function public.join_public_room(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
declare
  target_visibility text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select visibility into target_visibility from public.rooms where id = p_room_id;
  if target_visibility is null then raise exception 'Room not found'; end if;
  if target_visibility <> 'public' then raise exception 'This private room requires an invitation'; end if;
  insert into public.room_members (room_id, user_id, membership_role)
  values (p_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;
  return p_room_id;
end;
$$;

grant execute on function public.join_public_room(uuid) to authenticated;

create or replace function public.invite_room_member(p_room_id uuid, p_invitee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
declare
  target_room public.rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into target_room from public.rooms where id = p_room_id;
  if target_room.id is null then raise exception 'Room not found'; end if;
  if target_room.visibility <> 'private' then raise exception 'Only existing private rooms can send invitations'; end if;
  if target_room.created_by <> auth.uid() then raise exception 'Only the room owner can invite another member'; end if;
  if p_invitee_id = auth.uid() then raise exception 'You cannot invite yourself'; end if;
  insert into public.room_members (room_id, user_id, membership_role)
  values (p_room_id, p_invitee_id, 'member')
  on conflict (room_id, user_id) do nothing;
  insert into public.notifications (recipient_id, actor_id, room_id, kind, title, body, metadata)
  values (p_invitee_id, auth.uid(), p_room_id, 'room_invite', 'Invitation to ' || target_room.name, 'You were invited to join ' || target_room.name || '.', jsonb_build_object('room_id', p_room_id));
  return jsonb_build_object('roomId', p_room_id, 'inviteeId', p_invitee_id, 'invited', true);
end;
$$;

grant execute on function public.invite_room_member(uuid, uuid) to authenticated;

create or replace function public.accept_room_invitation(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
declare
  target_room_id uuid;
  target_kind text;
  target_recipient uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select room_id, kind, recipient_id into target_room_id, target_kind, target_recipient
  from public.notifications where id = p_notification_id;
  if target_room_id is null or target_kind <> 'room_invite' or target_recipient <> auth.uid() then
    raise exception 'This room invitation is invalid or no longer available';
  end if;
  if not exists (select 1 from public.rooms where id = target_room_id) then raise exception 'This room no longer exists'; end if;
  insert into public.room_members (room_id, user_id, membership_role)
  values (target_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;
  update public.notifications set read_at = now() where id = p_notification_id and recipient_id = auth.uid();
  return target_room_id;
end;
$$;

grant execute on function public.accept_room_invitation(uuid) to authenticated;

create or replace function public.leave_room(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
declare
  target_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select membership_role into target_role from public.room_members where room_id = p_room_id and user_id = auth.uid();
  if target_role is null then raise exception 'You are not a member of this room'; end if;
  if target_role = 'owner' then raise exception 'Room owners must delete the room instead of leaving it'; end if;
  delete from public.room_members where room_id = p_room_id and user_id = auth.uid();
  return p_room_id;
end;
$$;

grant execute on function public.leave_room(uuid) to authenticated;

create or replace function public.delete_room(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.rooms where id = p_room_id and created_by = auth.uid()) then raise exception 'Only the room owner can delete this room'; end if;
  delete from public.rooms where id = p_room_id;
  return p_room_id;
end;
$$;

grant execute on function public.delete_room(uuid) to authenticated;

create or replace function public.update_my_profile(p_display_name text, p_avatar_url text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 48 then raise exception 'Display name must be 1-48 characters'; end if;
  update public.profiles set display_name = trim(p_display_name), avatar_url = p_avatar_url where id = auth.uid() returning * into updated_profile;
  if updated_profile.id is null then raise exception 'Profile not found'; end if;
  return updated_profile;
end;
$$;

grant execute on function public.update_my_profile(text, text) to authenticated;
