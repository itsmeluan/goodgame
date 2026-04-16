create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.meetup_status as enum ('open', 'filled', 'closed', 'cancelled');
create type public.host_mode as enum ('public_place', 'can_host', 'looking_for_host');
create type public.venue_source as enum ('community', 'imported');
create type public.participant_role as enum ('creator', 'participant');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, handle, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'player'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Novo jogador')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.formats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, slug)
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text,
  neighborhood text,
  can_host boolean not null default false,
  search_radius_km integer not null default 10,
  approximate_location extensions.geography(Point, 4326),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.player_formats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (user_id) on delete cascade,
  format_id uuid not null references public.formats (id) on delete cascade,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id, format_id)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  source public.venue_source not null default 'community',
  name text not null,
  neighborhood text,
  address text,
  location extensions.geography(Point, 4326) not null,
  supports_events boolean not null default false,
  details text,
  created_by uuid references public.profiles (user_id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.meetup_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (user_id) on delete cascade,
  desired_format_id uuid references public.formats (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  title text not null check (char_length(title) between 4 and 80),
  description text,
  host_mode public.host_mode not null default 'public_place',
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  max_players smallint not null default 4 check (max_players between 2 and 12),
  status public.meetup_status not null default 'open',
  location extensions.geography(Point, 4326) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (starts_at < expires_at)
);

create table public.meetup_members (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetup_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role public.participant_role not null default 'participant',
  joined_at timestamptz not null default timezone('utc', now()),
  unique (meetup_id, user_id)
);

create table public.meetup_messages (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetup_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index profiles_location_idx on public.profiles using gist (approximate_location);
create index venues_location_idx on public.venues using gist (location);
create index meetup_posts_location_idx on public.meetup_posts using gist (location);
create index meetup_posts_status_starts_idx on public.meetup_posts (status, starts_at);
create index meetup_messages_meetup_idx on public.meetup_messages (meetup_id, created_at);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

create trigger venues_touch_updated_at
before update on public.venues
for each row
execute function public.touch_updated_at();

create trigger meetup_posts_touch_updated_at
before update on public.meetup_posts
for each row
execute function public.touch_updated_at();

create or replace function public.add_creator_to_meetup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meetup_members (meetup_id, user_id, role)
  values (new.id, new.creator_id, 'creator')
  on conflict (meetup_id, user_id) do nothing;

  return new;
end;
$$;

create trigger meetup_posts_add_creator
after insert on public.meetup_posts
for each row
execute function public.add_creator_to_meetup();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.player_formats enable row level security;
alter table public.availability_slots enable row level security;
alter table public.venues enable row level security;
alter table public.meetup_posts enable row level security;
alter table public.meetup_members enable row level security;
alter table public.meetup_messages enable row level security;

create policy "profiles_are_readable"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "player_formats_readable"
on public.player_formats
for select
to authenticated
using (true);

create policy "player_formats_manage_own"
on public.player_formats
for all
to authenticated
using (auth.uid() = player_id)
with check (auth.uid() = player_id);

create policy "availability_readable"
on public.availability_slots
for select
to authenticated
using (true);

create policy "availability_manage_own"
on public.availability_slots
for all
to authenticated
using (auth.uid() = player_id)
with check (auth.uid() = player_id);

create policy "venues_are_readable"
on public.venues
for select
to authenticated
using (true);

create policy "venues_insert_authenticated"
on public.venues
for insert
to authenticated
with check (created_by = auth.uid());

create policy "venues_update_creator"
on public.venues
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "meetups_are_readable"
on public.meetup_posts
for select
to authenticated
using (status = 'open' or creator_id = auth.uid());

create policy "meetups_insert_own"
on public.meetup_posts
for insert
to authenticated
with check (creator_id = auth.uid());

create policy "meetups_update_creator"
on public.meetup_posts
for update
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "meetup_members_readable"
on public.meetup_members
for select
to authenticated
using (true);

create policy "meetup_members_join_self"
on public.meetup_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "meetup_members_leave_self"
on public.meetup_members
for delete
to authenticated
using (user_id = auth.uid());

create policy "meetup_messages_read_for_members"
on public.meetup_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = meetup_messages.meetup_id
      and member.user_id = auth.uid()
  )
);

create policy "meetup_messages_insert_for_members"
on public.meetup_messages
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = meetup_messages.meetup_id
      and member.user_id = auth.uid()
  )
);

create or replace function public.map_items_in_view(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns table (
  item_type text,
  item_id uuid,
  title text,
  subtitle text,
  lat double precision,
  lng double precision,
  starts_at timestamptz,
  status text
)
language sql
set search_path = public, extensions
as $$
  with bbox as (
    select extensions.st_setsrid(
      extensions.st_makebox2d(
        extensions.st_point(min_lng, min_lat),
        extensions.st_point(max_lng, max_lat)
      ),
      4326
    ) as view_box
  )
  select
    'meetup'::text as item_type,
    meetup.id as item_id,
    meetup.title,
    coalesce(format.name, 'Casual') || coalesce(' · ' || venue.name, '') as subtitle,
    extensions.st_y(meetup.location::extensions.geometry) as lat,
    extensions.st_x(meetup.location::extensions.geometry) as lng,
    meetup.starts_at,
    meetup.status::text as status
  from public.meetup_posts meetup
  left join public.formats format on format.id = meetup.desired_format_id
  left join public.venues venue on venue.id = meetup.venue_id
  cross join bbox
  where meetup.status = 'open'
    and meetup.location operator(extensions.&&) bbox.view_box

  union all

  select
    'venue'::text as item_type,
    venue.id as item_id,
    venue.name,
    coalesce(venue.neighborhood, 'Local para jogar') as subtitle,
    extensions.st_y(venue.location::extensions.geometry) as lat,
    extensions.st_x(venue.location::extensions.geometry) as lng,
    null::timestamptz as starts_at,
    'available'::text as status
  from public.venues venue
  cross join bbox
  where venue.location operator(extensions.&&) bbox.view_box;
$$;

insert into public.games (slug, name)
values ('magic-the-gathering', 'Magic: The Gathering')
on conflict (slug) do nothing;

with magic_game as (
  select id
  from public.games
  where slug = 'magic-the-gathering'
)
insert into public.formats (game_id, slug, name)
select magic_game.id, seed.slug, seed.name
from magic_game
cross join (
  values
    ('commander', 'Commander'),
    ('modern', 'Modern'),
    ('pioneer', 'Pioneer'),
    ('standard', 'Standard'),
    ('pauper', 'Pauper'),
    ('draft', 'Draft'),
    ('sealed', 'Sealed'),
    ('legacy', 'Legacy')
) as seed(slug, name)
on conflict (game_id, slug) do nothing;
