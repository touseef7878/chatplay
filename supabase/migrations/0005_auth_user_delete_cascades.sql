-- Allow direct Supabase Auth user deletion to cascade through profile-owned content.
-- Notifications, memberships, reactions, players, and profile rows already cascade;
-- these ownership FKs were the remaining restrictive blockers.
alter table public.rooms drop constraint if exists rooms_created_by_fkey;
alter table public.rooms add constraint rooms_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete cascade;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

alter table public.game_sessions drop constraint if exists game_sessions_host_id_fkey;
alter table public.game_sessions add constraint game_sessions_host_id_fkey
  foreign key (host_id) references public.profiles(id) on delete cascade;
