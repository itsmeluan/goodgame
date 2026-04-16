create table if not exists public.venue_formats (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  format_id uuid not null references public.formats (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (venue_id, format_id)
);

alter table public.venue_formats enable row level security;

create policy "venue_formats_readable"
on public.venue_formats
for select
to authenticated
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_handle text;
  safe_handle text;
begin
  raw_handle := coalesce(split_part(new.email, '@', 1), 'player');
  safe_handle := lower(regexp_replace(raw_handle, '[^a-zA-Z0-9_]+', '', 'g'));

  if safe_handle = '' then
    safe_handle := 'player';
  end if;

  insert into public.profiles (user_id, handle, display_name)
  values (
    new.id,
    left(safe_handle, 20) || '_' || replace(left(new.id::text, 8), '-', ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', raw_handle, 'Novo jogador')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.my_profile_details()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  bio text,
  neighborhood text,
  can_host boolean,
  search_radius_km integer,
  lat double precision,
  lng double precision,
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
    profile.can_host,
    profile.search_radius_km,
    extensions.st_y(profile.approximate_location::extensions.geometry) as lat,
    extensions.st_x(profile.approximate_location::extensions.geometry) as lng,
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

create or replace function public.save_my_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_neighborhood text,
  p_can_host boolean,
  p_search_radius_km integer,
  p_lat double precision,
  p_lng double precision,
  p_format_ids uuid[],
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

create or replace function public.list_venue_cards()
returns table (
  id uuid,
  name text,
  neighborhood text,
  supports_events boolean,
  formats text[],
  lat double precision,
  lng double precision
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    venue.id,
    venue.name,
    venue.neighborhood,
    venue.supports_events,
    coalesce(array_agg(distinct format.name order by format.name) filter (where format.name is not null), '{}'::text[]) as formats,
    extensions.st_y(venue.location::extensions.geometry) as lat,
    extensions.st_x(venue.location::extensions.geometry) as lng
  from public.venues venue
  left join public.venue_formats venue_format on venue_format.venue_id = venue.id
  left join public.formats format on format.id = venue_format.format_id
  where auth.uid() is not null
  group by venue.id;
$$;

create or replace function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
  format_name text,
  starts_at timestamptz,
  host_mode text,
  max_players smallint,
  joined_players integer,
  lat double precision,
  lng double precision,
  venue_name text,
  creator_display_name text,
  creator_handle text,
  creator_bio text,
  creator_neighborhood text,
  creator_can_host boolean,
  is_member boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  with member_counts as (
    select meetup_id, count(*)::integer as joined_players
    from public.meetup_members
    group by meetup_id
  )
  select
    meetup.id,
    meetup.title,
    coalesce(format.name, 'Casual') as format_name,
    meetup.starts_at,
    meetup.host_mode::text,
    meetup.max_players,
    coalesce(member_counts.joined_players, 0) as joined_players,
    extensions.st_y(meetup.location::extensions.geometry) as lat,
    extensions.st_x(meetup.location::extensions.geometry) as lng,
    venue.name as venue_name,
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
    ) as is_member
  from public.meetup_posts meetup
  join public.profiles profile on profile.user_id = meetup.creator_id
  left join public.formats format on format.id = meetup.desired_format_id
  left join public.venues venue on venue.id = meetup.venue_id
  left join member_counts on member_counts.meetup_id = meetup.id
  where auth.uid() is not null
    and (meetup.status = 'open' or meetup.creator_id = auth.uid())
  order by meetup.starts_at asc;
$$;

create or replace function public.list_meetup_messages(p_meetup_id uuid)
returns table (
  id uuid,
  author_name text,
  sent_at timestamptz,
  body text
)
language sql
security definer
set search_path = public
as $$
  select
    message.id,
    profile.display_name as author_name,
    message.created_at as sent_at,
    message.body
  from public.meetup_messages message
  join public.profiles profile on profile.user_id = message.author_id
  where message.meetup_id = p_meetup_id
    and exists (
      select 1
      from public.meetup_members member
      where member.meetup_id = p_meetup_id
        and member.user_id = auth.uid()
    )
  order by message.created_at asc;
$$;

create or replace function public.create_meetup_post(
  p_title text,
  p_description text,
  p_format_id uuid,
  p_host_mode public.host_mode,
  p_starts_at timestamptz,
  p_max_players smallint,
  p_lat double precision default null,
  p_lng double precision default null,
  p_venue_id uuid default null
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
  elsif p_lat is not null and p_lng is not null then
    target_location := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  else
    raise exception 'Escolha uma localizacao aproximada ou um local cadastrado';
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
    location
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
    target_location
  )
  returning id into new_meetup_id;

  return new_meetup_id;
end;
$$;

create or replace function public.join_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.meetup_status;
  allowed_players smallint;
  joined_count integer;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select meetup.status, meetup.max_players
  into current_status, allowed_players
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    raise exception 'Chamado nao encontrado';
  end if;

  if current_status <> 'open' then
    raise exception 'Este chamado nao esta mais aberto';
  end if;

  select count(*)::integer
  into joined_count
  from public.meetup_members member
  where member.meetup_id = p_meetup_id;

  if joined_count >= allowed_players then
    raise exception 'Este chamado ja esta lotado';
  end if;

  insert into public.meetup_members (meetup_id, user_id, role)
  values (p_meetup_id, current_user_id, 'participant')
  on conflict (meetup_id, user_id) do nothing;
end;
$$;

create or replace function public.send_meetup_message(
  p_meetup_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_message_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = p_meetup_id
      and member.user_id = current_user_id
  ) then
    raise exception 'Entre no grupo antes de mandar mensagens';
  end if;

  insert into public.meetup_messages (meetup_id, author_id, body)
  values (p_meetup_id, current_user_id, trim(p_body))
  returning id into new_message_id;

  return new_message_id;
end;
$$;

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;

revoke all on function public.save_my_profile(text, text, text, text, boolean, integer, double precision, double precision, uuid[], jsonb) from public;
grant execute on function public.save_my_profile(text, text, text, text, boolean, integer, double precision, double precision, uuid[], jsonb) to authenticated;

revoke all on function public.list_venue_cards() from public;
grant execute on function public.list_venue_cards() to authenticated;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

revoke all on function public.list_meetup_messages(uuid) from public;
grant execute on function public.list_meetup_messages(uuid) to authenticated;

revoke all on function public.create_meetup_post(text, text, uuid, public.host_mode, timestamptz, smallint, double precision, double precision, uuid) from public;
grant execute on function public.create_meetup_post(text, text, uuid, public.host_mode, timestamptz, smallint, double precision, double precision, uuid) to authenticated;

revoke all on function public.join_meetup(uuid) from public;
grant execute on function public.join_meetup(uuid) to authenticated;

revoke all on function public.send_meetup_message(uuid, text) from public;
grant execute on function public.send_meetup_message(uuid, text) to authenticated;

insert into public.venues (
  source,
  name,
  neighborhood,
  address,
  location,
  supports_events,
  details,
  approved_at
)
select
  'community',
  seed.name,
  seed.neighborhood,
  seed.address,
  extensions.st_setsrid(extensions.st_makepoint(seed.lng, seed.lat), 4326)::extensions.geography,
  seed.supports_events,
  seed.details,
  timezone('utc', now())
from (
  values
    ('Mana Forge', 'Pinheiros', 'Rua dos Pinheiros, Sao Paulo', -23.5679::double precision, -46.6921::double precision, true, 'Loja para Commander, Modern e eventos casuais.'),
    ('Taverna do Meeple', 'Vila Mariana', 'Rua Vergueiro, Sao Paulo', -23.5874::double precision, -46.6347::double precision, true, 'Espaco comunitario com mesas para card games e board games.'),
    ('Casa Arcana', 'Bela Vista', 'Avenida Paulista, Sao Paulo', -23.5614::double precision, -46.6559::double precision, false, 'Ponto casual para encontros menores no meio da semana.')
) as seed(name, neighborhood, address, lat, lng, supports_events, details)
where not exists (
  select 1
  from public.venues venue
  where venue.name = seed.name
);

insert into public.venue_formats (venue_id, format_id)
select
  venue.id,
  format.id
from (
  values
    ('Mana Forge', 'Commander'),
    ('Mana Forge', 'Modern'),
    ('Mana Forge', 'Draft'),
    ('Taverna do Meeple', 'Commander'),
    ('Taverna do Meeple', 'Pioneer'),
    ('Taverna do Meeple', 'Pauper'),
    ('Casa Arcana', 'Modern'),
    ('Casa Arcana', 'Pauper')
) as seed(venue_name, format_name)
join public.venues venue on venue.name = seed.venue_name
join public.formats format on format.name = seed.format_name
on conflict (venue_id, format_id) do nothing;
