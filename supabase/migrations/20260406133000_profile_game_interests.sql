create table if not exists public.player_games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (user_id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id, game_id)
);

insert into public.player_games (player_id, game_id)
select distinct player_format.player_id, format.game_id
from public.player_formats player_format
join public.formats format on format.id = player_format.format_id
on conflict (player_id, game_id) do nothing;

drop function if exists public.my_profile_details();
create function public.my_profile_details()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  bio text,
  neighborhood text,
  avatar_path text,
  can_host boolean,
  search_radius_km integer,
  lat double precision,
  lng double precision,
  game_ids uuid[],
  game_names text[],
  format_ids uuid[],
  format_names text[],
  availability jsonb
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    profile.user_id,
    profile.handle,
    profile.display_name,
    profile.bio,
    profile.neighborhood,
    profile.avatar_path,
    profile.can_host,
    profile.search_radius_km,
    extensions.st_y(profile.approximate_location::extensions.geometry) as lat,
    extensions.st_x(profile.approximate_location::extensions.geometry) as lng,
    coalesce(
      (
        select array_agg(player_game.game_id order by game.name)
        from public.player_games player_game
        join public.games game on game.id = player_game.game_id
        where player_game.player_id = profile.user_id
      ),
      '{}'::uuid[]
    ) as game_ids,
    coalesce(
      (
        select array_agg(game.name order by game.name)
        from public.player_games player_game
        join public.games game on game.id = player_game.game_id
        where player_game.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as game_names,
    coalesce(
      (
        select array_agg(player_format.format_id order by format.name)
        from public.player_formats player_format
        join public.formats format on format.id = player_format.format_id
        where player_format.player_id = profile.user_id
      ),
      '{}'::uuid[]
    ) as format_ids,
    coalesce(
      (
        select array_agg(format.name order by format.name)
        from public.player_formats player_format
        join public.formats format on format.id = player_format.format_id
        where player_format.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as format_names,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'weekday', availability.weekday,
            'start_time', to_char(availability.start_time, 'HH24:MI'),
            'end_time', to_char(availability.end_time, 'HH24:MI'),
            'timezone', availability.timezone
          )
          order by availability.weekday, availability.start_time
        )
        from public.availability_slots availability
        where availability.player_id = profile.user_id
      ),
      '[]'::jsonb
    ) as availability
  from public.profiles profile
  where profile.user_id = auth.uid();
$$;

drop function if exists public.save_my_profile(
  text,
  text,
  text,
  text,
  boolean,
  integer,
  double precision,
  double precision,
  uuid[],
  jsonb
);

create function public.save_my_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_neighborhood text,
  p_can_host boolean,
  p_search_radius_km integer,
  p_lat double precision,
  p_lng double precision,
  p_game_ids uuid[] default '{}'::uuid[],
  p_format_ids uuid[] default '{}'::uuid[],
  p_availability jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  slot jsonb;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if coalesce(trim(p_handle), '') = '' then
    raise exception 'Handle e obrigatorio';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'Nome de exibicao e obrigatorio';
  end if;

  insert into public.profiles (
    user_id,
    handle,
    display_name,
    bio,
    neighborhood,
    can_host,
    search_radius_km,
    approximate_location
  )
  values (
    current_user_id,
    lower(trim(p_handle)),
    trim(p_display_name),
    nullif(trim(coalesce(p_bio, '')), ''),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    coalesce(p_can_host, false),
    greatest(coalesce(p_search_radius_km, 10), 1),
    case
      when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end
  )
  on conflict (user_id) do update
  set
    handle = excluded.handle,
    display_name = excluded.display_name,
    bio = excluded.bio,
    neighborhood = excluded.neighborhood,
    can_host = excluded.can_host,
    search_radius_km = excluded.search_radius_km,
    approximate_location = excluded.approximate_location,
    updated_at = timezone('utc', now());

  delete from public.player_games
  where player_id = current_user_id;

  insert into public.player_games (player_id, game_id)
  select distinct current_user_id, selected_game.game_id
  from (
    select unnest(coalesce(p_game_ids, '{}'::uuid[])) as game_id
    union
    select format.game_id
    from public.formats format
    where format.id = any(coalesce(p_format_ids, '{}'::uuid[]))
  ) selected_game
  where selected_game.game_id is not null
  on conflict (player_id, game_id) do nothing;

  delete from public.player_formats
  where player_id = current_user_id;

  insert into public.player_formats (player_id, format_id)
  select current_user_id, format_id
  from unnest(coalesce(p_format_ids, '{}'::uuid[])) as format_id
  on conflict (player_id, format_id) do nothing;

  delete from public.availability_slots
  where player_id = current_user_id;

  for slot in select value from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb))
  loop
    insert into public.availability_slots (
      player_id,
      weekday,
      start_time,
      end_time,
      timezone
    )
    values (
      current_user_id,
      (slot ->> 'weekday')::smallint,
      (slot ->> 'start_time')::time,
      (slot ->> 'end_time')::time,
      coalesce(slot ->> 'timezone', 'America/Sao_Paulo')
    );
  end loop;
end;
$$;

drop function if exists public.player_public_profile(uuid);
create function public.player_public_profile(p_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  bio text,
  neighborhood text,
  avatar_path text,
  can_host boolean,
  game_names text[],
  format_names text[],
  availability jsonb,
  relationship_state text,
  is_online boolean,
  last_seen_at timestamptz,
  average_rating numeric,
  ratings_count integer,
  attended_count integer,
  no_show_count integer,
  hosted_count integer
)
language sql
security definer
set search_path = public
as $$
  with target_profile as (
    select profile.*
    from public.profiles profile
    where profile.user_id = p_user_id
      and auth.uid() is not null
      and not public.users_are_blocked(auth.uid(), profile.user_id)
  ),
  relationship as (
    select
      case
        when friendship.status = 'accepted' then 'friend'
        when friendship.requester_user_id = auth.uid() then 'outgoing'
        when friendship.addressee_user_id = auth.uid() then 'incoming'
        else 'none'
      end as relationship_state
    from target_profile profile
    left join public.friendships friendship
      on (
        (friendship.requester_user_id = auth.uid() and friendship.addressee_user_id = profile.user_id)
        or (friendship.addressee_user_id = auth.uid() and friendship.requester_user_id = profile.user_id)
      )
  ),
  rating_stats as (
    select
      round(avg(rating)::numeric, 2) as average_rating,
      count(rating)::integer as ratings_count,
      count(*) filter (where attended)::integer as attended_count,
      count(*) filter (where not attended)::integer as no_show_count
    from public.meetup_ratings
    where reviewed_user_id = p_user_id
  ),
  host_stats as (
    select count(*)::integer as hosted_count
    from public.meetup_posts
    where creator_id = p_user_id
  )
  select
    profile.user_id,
    profile.display_name,
    profile.handle,
    profile.bio,
    profile.neighborhood,
    profile.avatar_path,
    profile.can_host,
    coalesce(
      (
        select array_agg(game.name order by game.name)
        from public.player_games player_game
        join public.games game on game.id = player_game.game_id
        where player_game.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as game_names,
    coalesce(
      (
        select array_agg(format.name order by format.name)
        from public.player_formats profile_format
        join public.formats format on format.id = profile_format.format_id
        where profile_format.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as format_names,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'weekday', availability_slot.weekday,
            'start_time', to_char(availability_slot.start_time, 'HH24:MI'),
            'end_time', to_char(availability_slot.end_time, 'HH24:MI'),
            'timezone', availability_slot.timezone
          )
          order by availability_slot.weekday, availability_slot.start_time
        )
        from public.availability_slots availability_slot
        where availability_slot.player_id = profile.user_id
      ),
      '[]'::jsonb
    ) as availability,
    coalesce((select relationship_state from relationship limit 1), 'none') as relationship_state,
    coalesce(presence.last_seen_at >= timezone('utc', now()) - interval '2 minutes', false) as is_online,
    presence.last_seen_at,
    coalesce(rating_stats.average_rating, 0)::numeric,
    coalesce(rating_stats.ratings_count, 0),
    coalesce(rating_stats.attended_count, 0),
    coalesce(rating_stats.no_show_count, 0),
    coalesce(host_stats.hosted_count, 0)
  from target_profile profile
  left join public.user_presence presence on presence.user_id = profile.user_id
  cross join rating_stats
  cross join host_stats;
$$;

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;

revoke all on function public.save_my_profile(
  text,
  text,
  text,
  text,
  boolean,
  integer,
  double precision,
  double precision,
  uuid[],
  uuid[],
  jsonb
) from public;
grant execute on function public.save_my_profile(
  text,
  text,
  text,
  text,
  boolean,
  integer,
  double precision,
  double precision,
  uuid[],
  uuid[],
  jsonb
) to authenticated;

revoke all on function public.player_public_profile(uuid) from public;
grant execute on function public.player_public_profile(uuid) to authenticated;
