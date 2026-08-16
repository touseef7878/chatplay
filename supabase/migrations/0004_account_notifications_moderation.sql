alter table public.profiles add column if not exists avatar_url text;

alter table public.room_members drop constraint if exists room_members_membership_role_check;
alter table public.room_members add constraint room_members_membership_role_check check (membership_role in ('owner', 'admin', 'member'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete cascade,
  game_session_id uuid references public.game_sessions(id) on delete cascade,
  kind text not null check (kind in ('room_invite', 'game_invite', 'moderation')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_at_idx on public.notifications (recipient_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy notifications_select on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check (actor_id = auth.uid() and recipient_id <> auth.uid());
create policy notifications_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (recipient_id = auth.uid());

create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_update on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

create or replace function chatplay_private.is_room_admin(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public, chatplay_private as $$
  select exists (
    select 1 from public.room_members rm
    where rm.room_id = p_room_id and rm.user_id = auth.uid() and rm.membership_role in ('owner', 'admin')
  );
$$;

grant execute on function chatplay_private.is_room_admin(uuid) to authenticated;

create policy room_members_admin_update on public.room_members for update to authenticated using (chatplay_private.is_room_owner(room_id)) with check (chatplay_private.is_room_owner(room_id));
create policy room_members_admin_delete on public.room_members for delete to authenticated using (chatplay_private.is_room_admin(room_id) and user_id <> auth.uid());

alter table public.notifications replica identity full;
alter publication supabase_realtime add table public.notifications;

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

alter table public.notifications add constraint notifications_kind_room_or_game_check check (kind <> 'room_invite' or room_id is not null);
alter table public.notifications add constraint notifications_game_invite_game_check check (kind <> 'game_invite' or game_session_id is not null);
