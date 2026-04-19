-- Lightweight GPS sync (no full save_my_profile) + optional live viewer point for list_nearby_players.

create or replace function public.update_my_approximate_location(
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'invalid_coordinates';
  end if;

  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_coordinates';
  end if;

  update public.profiles
  set
    approximate_location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    updated_at = timezone('utc', now())
  where user_id = current_user_id;
end;
$$;

revoke all on function public.update_my_approximate_location(double precision, double precision) from public;
grant execute on function public.update_my_approximate_location(double precision, double precision) to authenticated;

-- Replace list_nearby_players: optional live viewer lat/lng (when both set) overrides profile geography for distance.
drop function if exists public.list_nearby_players(integer);
drop function if exists public.list_nearby_players(integer, double precision, double precision);

create or replace function public.list_nearby_players(
  p_limit integer default 80,
  p_viewer_lat double precision default null,
  p_viewer_lng double precision default null
)
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
      case
        when p_viewer_lat is not null
          and p_viewer_lng is not null
          and p_viewer_lat between -90 and 90
          and p_viewer_lng between -180 and 180
        then extensions.st_setsrid(
          extensions.st_makepoint(p_viewer_lng, p_viewer_lat),
          4326
        )::extensions.geography
        else profiles.approximate_location
      end as v_loc,
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

revoke all on function public.list_nearby_players(integer, double precision, double precision) from public;
grant execute on function public.list_nearby_players(integer, double precision, double precision) to authenticated;
