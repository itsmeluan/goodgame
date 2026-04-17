-- Novos jogos no catálogo: Tabuleiro (genérico), Yu-Gi-Oh!, Pokémon TCG.
-- Meetup cards passam a expor game_slug para o app (pins e filtros).

insert into public.games (slug, name)
values
  ('board-games', 'Tabuleiro'),
  ('yugioh', 'Yu-Gi-Oh!'),
  ('pokemon-tcg', 'Pokémon TCG')
on conflict (slug) do update
set name = excluded.name;

with
  board as (select id from public.games where slug = 'board-games'),
  ygo as (select id from public.games where slug = 'yugioh'),
  pkm as (select id from public.games where slug = 'pokemon-tcg')
insert into public.formats (game_id, slug, name)
select board.id, seed.slug, seed.name
from board
cross join (
  values
    ('tabuleiro-casual', 'Tabuleiro · Casual'),
    ('tabuleiro-competitivo', 'Tabuleiro · Competitivo'),
    ('tabuleiro-aprendizado', 'Tabuleiro · Aprendizado')
) as seed(slug, name)
on conflict (game_id, slug) do update
set name = excluded.name;

with ygo as (select id from public.games where slug = 'yugioh')
insert into public.formats (game_id, slug, name)
select ygo.id, seed.slug, seed.name
from ygo
cross join (
  values
    ('yugioh-torneio', 'Yu-Gi-Oh! · Torneio'),
    ('yugioh-casual', 'Yu-Gi-Oh! · Casual')
) as seed(slug, name)
on conflict (game_id, slug) do update
set name = excluded.name;

with pkm as (select id from public.games where slug = 'pokemon-tcg')
insert into public.formats (game_id, slug, name)
select pkm.id, seed.slug, seed.name
from pkm
cross join (
  values
    ('pokemon-torneio', 'Pokémon TCG · Torneio'),
    ('pokemon-casual', 'Pokémon TCG · Casual')
) as seed(slug, name)
on conflict (game_id, slug) do update
set name = excluded.name;

-- list_meetup_cards: incluir game_slug
drop function if exists public.list_meetup_cards();
create function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
  description text,
  format_name text,
  game_slug text,
  starts_at timestamptz,
  host_mode text,
  status text,
  max_players smallint,
  joined_players integer,
  confirmed_players integer,
  lat double precision,
  lng double precision,
  venue_name text,
  address_label text,
  location_hint text,
  is_location_exact boolean,
  chat_image_path text,
  creator_user_id uuid,
  creator_display_name text,
  creator_handle text,
  creator_bio text,
  creator_neighborhood text,
  creator_can_host boolean,
  is_member boolean,
  is_creator boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  with member_counts as (
    select
      meetup_id,
      count(*)::integer as joined_players,
      count(*) filter (
        where attendance_status = 'confirmed'
      )::integer as confirmed_players
    from public.meetup_members
    group by meetup_id
  ),
  visibility as (
    select
      meetup.id as meetup_id,
      (
        meetup.creator_id = auth.uid()
        or exists (
          select 1
          from public.meetup_members membership
          where membership.meetup_id = meetup.id
            and membership.user_id = auth.uid()
        )
      ) as is_location_exact
    from public.meetup_posts meetup
  )
  select
    meetup.id,
    meetup.title,
    meetup.description,
    coalesce(format.name, 'Casual') as format_name,
    coalesce(game.slug, '') as game_slug,
    meetup.starts_at,
    meetup.host_mode::text,
    meetup.status::text,
    meetup.max_players,
    coalesce(member_counts.joined_players, 0) as joined_players,
    coalesce(member_counts.confirmed_players, 0) as confirmed_players,
    case
      when visibility.is_location_exact
        then extensions.st_y(meetup.location::extensions.geometry)
      else (round((extensions.st_y(meetup.location::extensions.geometry)::numeric) * 400) / 400)::double precision
    end as lat,
    case
      when visibility.is_location_exact
        then extensions.st_x(meetup.location::extensions.geometry)
      else (round((extensions.st_x(meetup.location::extensions.geometry)::numeric) * 400) / 400)::double precision
    end as lng,
    case
      when visibility.is_location_exact then venue.name
      else null
    end as venue_name,
    case
      when visibility.is_location_exact and venue.address is not null then venue.address
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when visibility.is_location_exact and venue.name is not null then venue.name
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as address_label,
    case
      when visibility.is_location_exact and venue.name is not null then venue.name
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as location_hint,
    visibility.is_location_exact,
    meetup.chat_image_path,
    meetup.creator_id as creator_user_id,
    profile.display_name as creator_display_name,
    profile.handle as creator_handle,
    profile.bio as creator_bio,
    profile.neighborhood as creator_neighborhood,
    profile.can_host as creator_can_host,
    exists (
      select 1
      from public.meetup_members membership
      where membership.meetup_id = meetup.id
        and membership.user_id = auth.uid()
    ) as is_member,
    meetup.creator_id = auth.uid() as is_creator
  from public.meetup_posts meetup
  join public.profiles profile on profile.user_id = meetup.creator_id
  left join public.formats format on format.id = meetup.desired_format_id
  left join public.games game on game.id = format.game_id
  left join public.venues venue on venue.id = meetup.venue_id
  left join member_counts on member_counts.meetup_id = meetup.id
  join visibility on visibility.meetup_id = meetup.id
  where auth.uid() is not null
    and not public.users_are_blocked(auth.uid(), meetup.creator_id)
    and (
      meetup.status = 'open'
      or meetup.creator_id = auth.uid()
      or exists (
        select 1
        from public.meetup_members membership
        where membership.meetup_id = meetup.id
          and membership.user_id = auth.uid()
      )
    )
  order by meetup.starts_at asc;
$$;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

-- list_meetup_cards_in_bounds: incluir game_slug
drop function if exists public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision);
create function public.list_meetup_cards_in_bounds(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision
)
returns table (
  id uuid,
  title text,
  description text,
  format_name text,
  game_slug text,
  starts_at timestamptz,
  host_mode text,
  status text,
  max_players smallint,
  joined_players integer,
  confirmed_players integer,
  lat double precision,
  lng double precision,
  venue_name text,
  address_label text,
  location_hint text,
  is_location_exact boolean,
  chat_image_path text,
  creator_user_id uuid,
  creator_display_name text,
  creator_handle text,
  creator_bio text,
  creator_neighborhood text,
  creator_can_host boolean,
  is_member boolean,
  is_creator boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  with member_counts as (
    select
      meetup_id,
      count(*)::integer as joined_players,
      count(*) filter (
        where attendance_status = 'confirmed'
      )::integer as confirmed_players
    from public.meetup_members
    group by meetup_id
  ),
  visibility as (
    select
      meetup.id as meetup_id,
      (
        meetup.creator_id = auth.uid()
        or exists (
          select 1
          from public.meetup_members membership
          where membership.meetup_id = meetup.id
            and membership.user_id = auth.uid()
        )
      ) as is_location_exact
    from public.meetup_posts meetup
  )
  select
    meetup.id,
    meetup.title,
    meetup.description,
    coalesce(format.name, 'Casual') as format_name,
    coalesce(game.slug, '') as game_slug,
    meetup.starts_at,
    meetup.host_mode::text,
    meetup.status::text,
    meetup.max_players,
    coalesce(member_counts.joined_players, 0) as joined_players,
    coalesce(member_counts.confirmed_players, 0) as confirmed_players,
    case
      when visibility.is_location_exact
        then extensions.st_y(meetup.location::extensions.geometry)
      else (round((extensions.st_y(meetup.location::extensions.geometry)::numeric) * 400) / 400)::double precision
    end as lat,
    case
      when visibility.is_location_exact
        then extensions.st_x(meetup.location::extensions.geometry)
      else (round((extensions.st_x(meetup.location::extensions.geometry)::numeric) * 400) / 400)::double precision
    end as lng,
    case
      when visibility.is_location_exact then venue.name
      else null
    end as venue_name,
    case
      when visibility.is_location_exact and venue.address is not null then venue.address
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when visibility.is_location_exact and venue.name is not null then venue.name
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as address_label,
    case
      when visibility.is_location_exact and venue.name is not null then venue.name
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as location_hint,
    visibility.is_location_exact,
    meetup.chat_image_path,
    meetup.creator_id as creator_user_id,
    profile.display_name as creator_display_name,
    profile.handle as creator_handle,
    profile.bio as creator_bio,
    profile.neighborhood as creator_neighborhood,
    profile.can_host as creator_can_host,
    exists (
      select 1
      from public.meetup_members membership
      where membership.meetup_id = meetup.id
        and membership.user_id = auth.uid()
    ) as is_member,
    meetup.creator_id = auth.uid() as is_creator
  from public.meetup_posts meetup
  join public.profiles profile on profile.user_id = meetup.creator_id
  left join public.formats format on format.id = meetup.desired_format_id
  left join public.games game on game.id = format.game_id
  left join public.venues venue on venue.id = meetup.venue_id
  left join member_counts on member_counts.meetup_id = meetup.id
  join visibility on visibility.meetup_id = meetup.id
  where auth.uid() is not null
    and not public.users_are_blocked(auth.uid(), meetup.creator_id)
    and (
      meetup.status = 'open'
      or meetup.creator_id = auth.uid()
      or exists (
        select 1
        from public.meetup_members membership
        where membership.meetup_id = meetup.id
          and membership.user_id = auth.uid()
      )
    )
    and extensions.st_y(meetup.location::extensions.geometry) between p_min_lat and p_max_lat
    and extensions.st_x(meetup.location::extensions.geometry) between p_min_lng and p_max_lng
  order by meetup.starts_at asc;
$$;

revoke all on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision) from public;
grant execute on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision) to authenticated;
