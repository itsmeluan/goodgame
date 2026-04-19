alter table public.player_games enable row level security;

drop policy if exists "player_games_readable" on public.player_games;
create policy "player_games_readable"
on public.player_games
for select
to authenticated
using (true);

drop policy if exists "player_games_manage_own" on public.player_games;
create policy "player_games_manage_own"
on public.player_games
for all
to authenticated
using (auth.uid() = player_id)
with check (auth.uid() = player_id);
