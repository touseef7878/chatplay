alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format_check;
alter table public.profiles add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

create or replace function public.handle_new_chatplay_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  if requested_username = '' then
    requested_username := lower(split_part(coalesce(new.email, new.id::text), '@', 1));
  end if;
  if requested_display_name = '' then
    requested_display_name := requested_username;
  end if;

  insert into public.profiles (id, manus_open_id, username, display_name, avatar_seed)
  values (
    new.id,
    'supabase_' || new.id::text,
    requested_username,
    left(requested_display_name, 48),
    new.id::text
  )
  on conflict (id) do update set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_chatplay on auth.users;
create trigger on_auth_user_created_chatplay
after insert on auth.users
for each row execute function public.handle_new_chatplay_user();

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
