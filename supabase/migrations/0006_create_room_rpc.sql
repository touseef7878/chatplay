create or replace function chatplay_private.create_room(p_name text, p_description text, p_visibility text)
returns uuid
language plpgsql
security definer
set search_path = public, chatplay_private
as $$
declare
  new_room_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 60 then raise exception 'Room name must be 2-60 characters'; end if;
  if p_visibility not in ('public', 'private') then raise exception 'Invalid room visibility'; end if;
  insert into public.rooms (name, description, visibility, created_by)
  values (trim(p_name), coalesce(trim(p_description), ''), p_visibility, auth.uid())
  returning id into new_room_id;
  return new_room_id;
end;
$$;

grant execute on function chatplay_private.create_room(text, text, text) to authenticated;
