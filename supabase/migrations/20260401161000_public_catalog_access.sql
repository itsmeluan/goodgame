grant usage on schema public to anon, authenticated;

grant select on table public.games to anon, authenticated;
grant select on table public.formats to anon, authenticated;

alter table public.games enable row level security;
alter table public.formats enable row level security;

create policy "games_are_readable"
on public.games
for select
to anon, authenticated
using (true);

create policy "formats_are_readable"
on public.formats
for select
to anon, authenticated
using (true);
