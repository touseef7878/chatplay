drop policy game_players_insert on public.game_players;

create policy game_players_insert on public.game_players
for insert to authenticated
with check (
  chatplay_private.is_game_host(game_session_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.game_sessions gs
      where gs.id = game_session_id
        and chatplay_private.is_room_member(gs.room_id)
    )
  )
);
