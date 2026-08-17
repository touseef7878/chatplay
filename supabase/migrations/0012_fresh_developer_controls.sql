alter table public.profiles add column if not exists is_developer boolean not null default false;

create table if not exists public.developer_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null,
  target_username text,
  action text not null check (action in ('delete_user')),
  created_at timestamptz not null default now()
);

create index if not exists developer_audit_log_created_at_idx
  on public.developer_audit_log (created_at desc);

create or replace function public.is_chatplay_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_developer = true);
$$;

grant execute on function public.is_chatplay_developer() to authenticated;

alter table public.developer_audit_log enable row level security;
create policy developer_audit_select on public.developer_audit_log
  for select to authenticated using (public.is_chatplay_developer());
