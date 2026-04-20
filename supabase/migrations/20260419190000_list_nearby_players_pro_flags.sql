-- Nearby players: include Pro flags and honor the global grant_pro_to_all_users switch.

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
  is_online boolean,
  is_pro boolean,
  pro_expires_at timestamptz
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
    ) as is_online,
    (
      cfg.grant_pro_all
      or (
        p.is_pro
        and (
          p.pro_expires_at is null
          or p.pro_expires_at > timezone('utc', now())
        )
      )
    ) as is_pro,
    case
      when cfg.grant_pro_all then null::timestamptz
      else p.pro_expires_at
    end as pro_expires_at
  from public.profiles p
  cross join viewer v
  cross join lateral (
    select coalesce(
      (
        select ac.grant_pro_to_all_users
        from public.app_config ac
        where ac.singleton_key = 1
      ),
      false
    ) as grant_pro_all
  ) cfg
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
