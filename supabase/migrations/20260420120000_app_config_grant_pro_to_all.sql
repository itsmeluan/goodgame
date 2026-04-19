-- Flag global: Pro para todos, sem alterar colunas em `profiles`.
-- Ligar/desligar no SQL Editor (ou psql), sem publicar novo app:
--
--   update public.app_config
--   set grant_pro_to_all_users = true,
--       updated_at = timezone('utc', now())
--   where singleton_key = 1;
--
--   update public.app_config
--   set grant_pro_to_all_users = false,
--       updated_at = timezone('utc', now())
--   where singleton_key = 1;

create table if not exists public.app_config (
  singleton_key smallint primary key default 1,
  grant_pro_to_all_users boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_config_singleton_only check (singleton_key = 1)
);

comment on table public.app_config is
  'Configuração global (uma linha: singleton_key = 1). grant_pro_to_all_users força Pro no retorno de my_profile_details.';

insert into public.app_config (singleton_key, grant_pro_to_all_users)
values (1, false)
on conflict (singleton_key) do nothing;

alter table public.app_config enable row level security;

-- Sem policies: clientes (anon/authenticated) não leem nem escrevem; ajustes via SQL/service role.

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
  format_details jsonb,
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
            'format_id', player_format.format_id,
            'detail_tags', player_format.detail_tags
          )
          order by format.name
        )
        from public.player_formats player_format
        join public.formats format on format.id = player_format.format_id
        where player_format.player_id = profile.user_id
      ),
      '[]'::jsonb
    ) as format_details,
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
    (
      cfg.grant_pro_all
      or (
        profile.is_pro
        and (
          profile.pro_expires_at is null
          or profile.pro_expires_at > timezone('utc', now())
        )
      )
    ) as is_pro,
    case
      when cfg.grant_pro_all then null::timestamptz
      else profile.pro_expires_at
    end as pro_expires_at,
    profile.trial_used
  from public.profiles profile
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
  where profile.user_id = auth.uid();
end;
$$;

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;
