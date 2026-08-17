-- notifications has no updated_at column. Its actor_id is intentionally nullable
-- and may be set to NULL when an actor profile is deleted, so do not attach
-- the generic updated_at trigger to this table.
drop trigger if exists notifications_set_updated_at on public.notifications;
