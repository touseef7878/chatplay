create or replace function public.create_room(p_name text, p_description text, p_visibility text)
returns uuid
language sql
security definer
set search_path = public, chatplay_private
as $$
  select chatplay_private.create_room(p_name, p_description, p_visibility);
$$;

grant execute on function public.create_room(text, text, text) to authenticated;
