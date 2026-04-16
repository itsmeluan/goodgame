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
  existing_handle text;
  existing_display_name text;
  auth_email text;
  raw_handle text;
  safe_handle text;
  resolved_handle text;
  resolved_display_name text;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select profile.handle, profile.display_name
  into existing_handle, existing_display_name
  from public.profiles profile
  where profile.user_id = current_user_id;

  select users.email
  into auth_email
  from auth.users users
  where users.id = current_user_id;

  raw_handle := coalesce(
    nullif(trim(coalesce(p_handle, '')), ''),
    nullif(trim(coalesce(existing_handle, '')), ''),
    split_part(coalesce(auth_email, ''), '@', 1),
    'player'
  );
  safe_handle := lower(regexp_replace(raw_handle, '[^a-zA-Z0-9_]+', '', 'g'));

  if safe_handle = '' then
    safe_handle := 'player';
  end if;

  resolved_handle := case
    when trim(coalesce(p_handle, '')) <> '' then lower(trim(p_handle))
    when existing_handle is not null then existing_handle
    else left(safe_handle, 20) || '_' || replace(left(current_user_id::text, 8), '-', '')
  end;

  resolved_display_name := coalesce(
    nullif(trim(coalesce(p_display_name, '')), ''),
    nullif(trim(coalesce(existing_display_name, '')), ''),
    nullif(split_part(coalesce(auth_email, ''), '@', 1), ''),
    'Novo jogador'
  );

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
    resolved_handle,
    resolved_display_name,
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
      greatest(0, least(6, coalesce((slot ->> 'weekday')::smallint, 0))),
      coalesce((slot ->> 'start_time')::time, time '18:00'),
      coalesce((slot ->> 'end_time')::time, time '22:00'),
      coalesce(nullif(slot ->> 'timezone', ''), 'America/Sao_Paulo')
    );
  end loop;
end;
$$;

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
