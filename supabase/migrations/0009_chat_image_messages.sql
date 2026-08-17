alter table public.messages add column if not exists image_path text;

do $$
begin
  alter table public.messages drop constraint if exists messages_kind_check;
exception when undefined_object then
  null;
end $$;

alter table public.messages add constraint messages_kind_check check (kind in ('text', 'voice', 'image', 'game_invite', 'game_result', 'system'));
alter table public.messages drop constraint if exists messages_image_path_check;
alter table public.messages add constraint messages_image_path_check check ((kind <> 'image') or image_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function chatplay_private.can_access_image_object(p_object_name text)
returns boolean language plpgsql stable security definer set search_path = public, chatplay_private as $$
begin
  return chatplay_private.is_room_member(split_part(p_object_name, '/', 1)::uuid);
exception when others then
  return false;
end;
$$;

grant execute on function chatplay_private.can_access_image_object(text) to authenticated;

create or replace function chatplay_private.is_image_object_owner(p_object_name text)
returns boolean language sql stable security definer set search_path = public, chatplay_private as $$
  select split_part(p_object_name, '/', 2) = auth.uid()::text;
$$;

grant execute on function chatplay_private.is_image_object_owner(text) to authenticated;

drop policy if exists chat_images_select on storage.objects;
drop policy if exists chat_images_insert on storage.objects;
drop policy if exists chat_images_delete on storage.objects;
create policy chat_images_select on storage.objects for select to authenticated using (bucket_id = 'chat-images' and chatplay_private.can_access_image_object(name));
create policy chat_images_insert on storage.objects for insert to authenticated with check (bucket_id = 'chat-images' and chatplay_private.can_access_image_object(name) and chatplay_private.is_image_object_owner(name));
create policy chat_images_delete on storage.objects for delete to authenticated using (bucket_id = 'chat-images' and chatplay_private.is_image_object_owner(name));
