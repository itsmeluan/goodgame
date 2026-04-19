-- Pro Player MVP: subscription flags + nearby players listing + simulated trial RPC

alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists pro_expires_at timestamptz,
  add column if not exists trial_used boolean not null default false;

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
  availability jsonb,
  is_pro boolean,
  pro_expires_at timestamptz,
  trial_used boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.profiles
  set is_pro = false
  where user_id = auth.uid()
    and is_pro = true
    and pro_expires_at is not null
    and pro_expires_at <= timezone('utc', now());

  return query
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
    ) as availability,
    profile.is_pro,
    profile.pro_expires_at,
    profile.trial_used
  from public.profiles profile
  where profile.user_id = auth.uid();
end;
$$;

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;

create or replace function public.list_nearby_players(p_limit integer default 80)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  distance_km double precision,
  is_online boolean
)
language sql
security definer
set search_path = public, extensions
stable
as $$
  with viewer as (
    select
      profiles.approximate_location as v_loc,
      (greatest(profiles.search_radius_km, 1)::double precision * 1000.0) as radius_m
    from public.profiles
    where profiles.user_id = auth.uid()
  )
  select
    p.user_id,
    p.display_name,
    p.handle,
    p.avatar_path,
    (extensions.st_distance(v.v_loc, p.approximate_location) / 1000.0)::double precision as distance_km,
    coalesce(
      pr.last_seen_at >= timezone('utc', now()) - interval '2 minutes',
      false
    ) as is_online
  from public.profiles p
  cross join viewer v
  left join public.user_presence pr on pr.user_id = p.user_id
  where p.user_id <> auth.uid()
    and p.approximate_location is not null
    and v.v_loc is not null
    and extensions.st_dwithin(v.v_loc, p.approximate_location, v.radius_m)
    and not public.users_are_blocked(auth.uid(), p.user_id)
    and not public.users_are_blocked(p.user_id, auth.uid())
  order by extensions.st_distance(v.v_loc, p.approximate_location) asc
  limit greatest(least(coalesce(p_limit, 80), 200), 1);
$$;

revoke all on function public.list_nearby_players(integer) from public;
grant execute on function public.list_nearby_players(integer) to authenticated;

create or replace function public.start_pro_trial()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set is_pro = false
  where user_id = auth.uid()
    and is_pro = true
    and pro_expires_at is not null
    and pro_expires_at <= timezone('utc', now());

  if (select trial_used from public.profiles where user_id = auth.uid()) then
    raise exception 'trial_already_used';
  end if;

  update public.profiles
  set
    is_pro = true,
    pro_expires_at = timezone('utc', now()) + interval '7 days',
    trial_used = true
  where user_id = auth.uid();
end;
$$;

revoke all on function public.start_pro_trial() from public;
grant execute on function public.start_pro_trial() to authenticated;
