insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy avatar_upload_self on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy avatar_update_self on storage.objects for update to authenticated using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text) with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy avatar_delete_self on storage.objects for delete to authenticated using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

create or replace function chatplay_private.can_access_realtime_topic(p_topic text)
returns boolean language plpgsql stable security definer set search_path = public, chatplay_private as $$
begin
  if p_topic ~ '^room:[0-9a-fA-F-]{36}$' then
    return chatplay_private.is_room_member(substring(p_topic from 6)::uuid);
  elsif p_topic ~ '^game:[0-9a-fA-F-]{36}$' then
    return chatplay_private.is_game_participant(substring(p_topic from 6)::uuid);
  elsif p_topic ~ '^user:[0-9a-fA-F-]{36}$' then
    return substring(p_topic from 6)::uuid = auth.uid();
  end if;
  return false;
exception when others then
  return false;
end;
$$;

grant execute on function chatplay_private.can_access_realtime_topic(text) to authenticated;
