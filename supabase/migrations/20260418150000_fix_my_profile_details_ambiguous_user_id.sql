-- PL/pgSQL: RETURNS TABLE(...) cria variáveis de saída com os mesmos nomes das colunas.
-- `WHERE user_id = ...` no UPDATE ficava ambíguo (coluna vs variável de saída `user_id`).

create or replace function public.my_profile_details()
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
  update public.profiles p
  set is_pro = false
  where p.user_id = auth.uid()
    and p.is_pro = true
    and p.pro_expires_at is not null
    and p.pro_expires_at <= timezone('utc', now());

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
