-- Detalhes de formato: brackets Commander, tipo de partida Magic, power level Yu-Gi-Oh, nível Pokémon.
-- Colunas jsonb em meetup_posts e player_formats; RPCs atualizados.

alter table public.meetup_posts
  add column if not exists format_detail_tags jsonb not null default '{}'::jsonb;

alter table public.player_formats
  add column if not exists detail_tags jsonb not null default '{}'::jsonb;

create or replace function public.detail_tag_arrays_overlap(p_a jsonb, p_b jsonb)
returns boolean
language sql
immutable
as $$
  select
    p_b is null
    or jsonb_typeof(p_b) <> 'array'
    or jsonb_array_length(p_b) = 0
    or (
      p_a is not null
      and jsonb_typeof(p_a) = 'array'
      and jsonb_array_length(p_a) > 0
      and exists (
        select 1
        from jsonb_array_elements_text(p_a) a
        inner join jsonb_array_elements_text(p_b) b on a.value = b.value
      )
    );
$$;

create or replace function public.meetup_passes_detail_tag_filter(
  p_meetup_tags jsonb,
  p_filter jsonb
)
returns boolean
language sql
immutable
as $$
  select
    p_filter is null
    or p_filter = '{}'::jsonb
    or (
      public.detail_tag_arrays_overlap(
        coalesce(p_meetup_tags->'magic_brackets', '[]'::jsonb),
        p_filter->'magic_brackets'
      )
      and public.detail_tag_arrays_overlap(
        coalesce(p_meetup_tags->'magic_match_types', '[]'::jsonb),
        p_filter->'magic_match_types'
      )
      and public.detail_tag_arrays_overlap(
        coalesce(p_meetup_tags->'yugioh_power_levels', '[]'::jsonb),
        p_filter->'yugioh_power_levels'
      )
      and public.detail_tag_arrays_overlap(
        coalesce(p_meetup_tags->'pokemon_deck_tiers', '[]'::jsonb),
        p_filter->'pokemon_deck_tiers'
      )
    );
$$;

-- create_meetup_post: tags opcionais
drop function if exists public.create_meetup_post(
  text,
  text,
  uuid,
  public.host_mode,
  timestamptz,
  smallint,
  double precision,
  double precision,
  uuid,
  text
);

create or replace function public.create_meetup_post(
  p_title text,
  p_description text,
  p_format_id uuid,
  p_host_mode public.host_mode,
  p_starts_at timestamptz,
  p_max_players smallint,
  p_lat double precision default null,
  p_lng double precision default null,
  p_venue_id uuid default null,
  p_address_label text default null,
  p_format_detail_tags jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_location extensions.geography;
  new_meetup_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_venue_id is not null then
    select venue.location
    into target_location
    from public.venues venue
    where venue.id = p_venue_id;

    if target_location is null then
      raise exception 'Local nao encontrado';
    end if;
  elsif p_lat is not null and p_lng is not null then
    target_location := extensions.st_setsrid(
      extensions.st_makepoint(p_lng, p_lat),
      4326
    )::extensions.geography;
  else
    raise exception 'Escolha um local cadastrado ou pesquise um endereco';
  end if;

  insert into public.meetup_posts (
    creator_id,
    desired_format_id,
    venue_id,
    title,
    description,
    host_mode,
    starts_at,
    expires_at,
    max_players,
    status,
    location,
    custom_address_label,
    format_detail_tags
  )
  values (
    current_user_id,
    p_format_id,
    p_venue_id,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_host_mode,
    p_starts_at,
    p_starts_at + interval '6 hours',
    coalesce(p_max_players, 4),
    'open',
    target_location,
    case
      when p_venue_id is null then nullif(trim(coalesce(p_address_label, '')), '')
      else null
    end,
    coalesce(p_format_detail_tags, '{}'::jsonb)
  )
  returning id into new_meetup_id;

  return new_meetup_id;
end;
$$;

revoke all on function public.create_meetup_post(
  text,
  text,
  uuid,
  public.host_mode,
  timestamptz,
  smallint,
  double precision,
  double precision,
  uuid,
  text,
  jsonb
) from public;

grant execute on function public.create_meetup_post(
  text,
  text,
  uuid,
  public.host_mode,
  timestamptz,
  smallint,
  double precision,
  double precision,
  uuid,
  text,
  jsonb
) to authenticated;

-- save_my_profile: p_format_details jsonb array of { format_id, ...tag fields }
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
  p_availability jsonb default '[]'::jsonb,
  p_format_details jsonb default '[]'::jsonb
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
  fid uuid;
  detail jsonb;
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

  foreach fid in array coalesce(p_format_ids, '{}'::uuid[])
  loop
    detail := coalesce((
      select (elem - 'format_id')
      from jsonb_array_elements(coalesce(p_format_details, '[]'::jsonb)) elem
      where (elem->>'format_id')::uuid = fid
      limit 1
    ), '{}'::jsonb);

    insert into public.player_formats (player_id, format_id, detail_tags)
    values (current_user_id, fid, detail);
  end loop;

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
  jsonb,
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
  jsonb,
  jsonb
) to authenticated;

-- my_profile_details: incluir format_details (jsonb array)
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
    profile.is_pro,
    profile.pro_expires_at,
    profile.trial_used
  from public.profiles profile
  where profile.user_id = auth.uid();
end;
$$;

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;

-- list_meetup_cards: + format_detail_tags
drop function if exists public.list_meetup_cards();

create function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
  description text,
  format_name text,
  game_slug text,
  format_detail_tags jsonb,
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
    coalesce(meetup.format_detail_tags, '{}'::jsonb) as format_detail_tags,
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

-- list_meetup_cards_in_bounds: + format_detail_tags + filtro opcional
drop function if exists public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision);

create function public.list_meetup_cards_in_bounds(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_detail_tag_filter jsonb default null
)
returns table (
  id uuid,
  title text,
  description text,
  format_name text,
  game_slug text,
  format_detail_tags jsonb,
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
    coalesce(meetup.format_detail_tags, '{}'::jsonb) as format_detail_tags,
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
    and public.meetup_passes_detail_tag_filter(meetup.format_detail_tags, p_detail_tag_filter)
  order by meetup.starts_at asc;
$$;

revoke all on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision, jsonb) from public;
grant execute on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision, jsonb) to authenticated;

-- Sobrecarga 4-arg (compatível com clientes antigos): sem filtro de tags
create or replace function public.list_meetup_cards_in_bounds(
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
  format_detail_tags jsonb,
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
  select *
  from public.list_meetup_cards_in_bounds(
    p_min_lat,
    p_max_lat,
    p_min_lng,
    p_max_lng,
    null::jsonb
  );
$$;

revoke all on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision) from public;
grant execute on function public.list_meetup_cards_in_bounds(double precision, double precision, double precision, double precision) to authenticated;
