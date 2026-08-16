create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  manus_open_id text unique not null,
  display_name text not null check (char_length(display_name) between 1 and 48),
  avatar_seed text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 280),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  max_members integer not null default 50 check (max_members between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'member' check (membership_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  kind text not null default 'text' check (kind in ('text', 'voice', 'game_invite', 'game_result', 'system')),
  body text,
  voice_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 60),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((kind <> 'voice') or voice_path is not null)
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete restrict,
  game_type text not null check (game_type in ('tic_tac_toe', 'word_scramble', 'trivia')),
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  state jsonb not null default '{}'::jsonb,
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_players (
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'declined')),
  score integer not null default 0 check (score >= 0),
  player_meta jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  primary key (game_session_id, user_id)
);

create index rooms_visibility_created_at_idx on public.rooms (visibility, created_at desc);
create index room_members_user_id_idx on public.room_members (user_id, room_id);
create index messages_room_created_at_idx on public.messages (room_id, created_at desc);
create index message_reactions_message_id_idx on public.message_reactions (message_id);
create index game_sessions_room_created_at_idx on public.game_sessions (room_id, created_at desc);
create index game_players_user_id_idx on public.game_players (user_id, game_session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger game_sessions_set_updated_at before update on public.game_sessions for each row execute function public.set_updated_at();

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id and rm.user_id = auth.uid()
  );
$$;

create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id and r.created_by = auth.uid()
  );
$$;

create or replace function public.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id and (r.visibility = 'public' or public.is_room_member(p_room_id))
  );
$$;

create or replace function public.is_game_host(p_game_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_sessions gs
    where gs.id = p_game_session_id and gs.host_id = auth.uid()
  );
$$;

create or replace function public.is_game_participant(p_game_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_players gp
    where gp.game_session_id = p_game_session_id
      and gp.user_id = auth.uid()
      and gp.invite_status = 'accepted'
  );
$$;

create or replace function public.is_message_room_member(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id and public.is_room_member(m.room_id)
  );
$$;

create or replace function public.can_access_voice_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.is_room_member(split_part(p_object_name, '/', 1)::uuid);
exception when others then
  return false;
end;
$$;

create or replace function public.is_voice_object_owner(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select split_part(p_object_name, '/', 2) = auth.uid()::text;
$$;

create or replace function public.can_access_realtime_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_topic ~ '^room:[0-9a-fA-F-]{36}$' then
    return public.is_room_member(substring(p_topic from 6)::uuid);
  elsif p_topic ~ '^game:[0-9a-fA-F-]{36}$' then
    return public.is_game_participant(substring(p_topic from 6)::uuid);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

create or replace function public.add_room_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.room_members (room_id, user_id, membership_role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger rooms_add_creator after insert on public.rooms for each row execute function public.add_room_creator();

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy rooms_select on public.rooms for select to authenticated using (public.can_access_room(id));
create policy rooms_insert on public.rooms for insert to authenticated with check (created_by = auth.uid());
create policy rooms_update on public.rooms for update to authenticated using (public.is_room_owner(id)) with check (public.is_room_owner(id));
create policy rooms_delete on public.rooms for delete to authenticated using (public.is_room_owner(id));

create policy room_members_select on public.room_members for select to authenticated using (public.can_access_room(room_id));
create policy room_members_insert on public.room_members for insert to authenticated with check (
  public.is_room_owner(room_id) or (
    user_id = auth.uid() and exists (
      select 1 from public.rooms r where r.id = room_id and r.visibility = 'public'
    )
  )
);
create policy room_members_update on public.room_members for update to authenticated using (
  public.is_room_owner(room_id) or user_id = auth.uid()
) with check (
  public.is_room_owner(room_id) or (user_id = auth.uid() and membership_role = 'member')
);
create policy room_members_delete on public.room_members for delete to authenticated using (public.is_room_owner(room_id) or user_id = auth.uid());

create policy messages_select on public.messages for select to authenticated using (public.is_room_member(room_id));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_room_member(room_id));
create policy messages_delete on public.messages for delete to authenticated using (sender_id = auth.uid() or public.is_room_owner(room_id));

create policy message_reactions_select on public.message_reactions for select to authenticated using (public.is_message_room_member(message_id));
create policy message_reactions_insert on public.message_reactions for insert to authenticated with check (user_id = auth.uid() and public.is_message_room_member(message_id));
create policy message_reactions_delete on public.message_reactions for delete to authenticated using (user_id = auth.uid());

create policy game_sessions_select on public.game_sessions for select to authenticated using (public.is_room_member(room_id));
create policy game_sessions_insert on public.game_sessions for insert to authenticated with check (host_id = auth.uid() and public.is_room_member(room_id));
create policy game_sessions_update on public.game_sessions for update to authenticated using (public.is_game_participant(id)) with check (public.is_game_participant(id));
create policy game_sessions_delete on public.game_sessions for delete to authenticated using (host_id = auth.uid());

create policy game_players_select on public.game_players for select to authenticated using (
  exists (select 1 from public.game_sessions gs where gs.id = game_session_id and public.is_room_member(gs.room_id))
);
create policy game_players_insert on public.game_players for insert to authenticated with check (public.is_game_host(game_session_id));
create policy game_players_update on public.game_players for update to authenticated using (public.is_game_host(game_session_id) or user_id = auth.uid()) with check (public.is_game_host(game_session_id) or user_id = auth.uid());
create policy game_players_delete on public.game_players for delete to authenticated using (public.is_game_host(game_session_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-messages', 'voice-messages', false, 10485760, array['audio/webm', 'audio/ogg', 'audio/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy voice_messages_select on storage.objects for select to authenticated using (bucket_id = 'voice-messages' and public.can_access_voice_object(name));
create policy voice_messages_insert on storage.objects for insert to authenticated with check (bucket_id = 'voice-messages' and public.can_access_voice_object(name) and public.is_voice_object_owner(name));
create policy voice_messages_delete on storage.objects for delete to authenticated using (bucket_id = 'voice-messages' and public.is_voice_object_owner(name));

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_owner(uuid) to authenticated;
grant execute on function public.can_access_room(uuid) to authenticated;
grant execute on function public.is_game_host(uuid) to authenticated;
grant execute on function public.is_game_participant(uuid) to authenticated;
grant execute on function public.is_message_room_member(uuid) to authenticated;
grant execute on function public.can_access_voice_object(text) to authenticated;
grant execute on function public.is_voice_object_owner(text) to authenticated;
grant execute on function public.can_access_realtime_topic(text) to authenticated;

create policy chatplay_realtime_read on realtime.messages for select to authenticated using (extension in ('broadcast', 'presence') and public.can_access_realtime_topic(realtime.topic()));
create policy chatplay_realtime_write on realtime.messages for insert to authenticated with check (extension in ('broadcast', 'presence') and public.can_access_realtime_topic(realtime.topic()));

alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;
alter table public.game_sessions replica identity full;
alter table public.game_players replica identity full;
alter table public.room_members replica identity full;
alter publication supabase_realtime add table public.messages, public.message_reactions, public.game_sessions, public.game_players, public.room_members;
