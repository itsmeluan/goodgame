alter table public.meetup_posts
add column if not exists custom_address_label text;

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
  p_address_label text default null
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
    custom_address_label
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
    end
  )
  returning id into new_meetup_id;

  return new_meetup_id;
end;
$$;

create or replace function public.update_my_meetup_location(
  p_meetup_id uuid,
  p_lat double precision default null,
  p_lng double precision default null,
  p_address_label text default null,
  p_venue_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  target_location extensions.geography;
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

  update public.meetup_posts meetup
  set
    venue_id = p_venue_id,
    location = target_location,
    custom_address_label = case
      when p_venue_id is null then nullif(trim(coalesce(p_address_label, '')), '')
      else null
    end,
    updated_at = timezone('utc', now())
  where meetup.id = p_meetup_id
    and meetup.creator_id = current_user_id;

  if not found then
    raise exception 'Jogo nao encontrado ou sem permissao';
  end if;
end;
$$;

drop function if exists public.list_meetup_cards();
create function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
  description text,
  format_name text,
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
        where attendance_status in ('going', 'on_the_way', 'arrived', 'left')
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
  left join public.venues venue on venue.id = meetup.venue_id
  left join member_counts on member_counts.meetup_id = meetup.id
  join visibility on visibility.meetup_id = meetup.id
  where auth.uid() is not null
    and not public.users_are_blocked(auth.uid(), meetup.creator_id)
    and (
      meetup.status in ('open', 'filled', 'confirmed')
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

revoke all on function public.update_my_meetup_location(uuid, double precision, double precision, text, uuid) from public;
grant execute on function public.update_my_meetup_location(uuid, double precision, double precision, text, uuid) to authenticated;

revoke all on function public.create_meetup_post(text, text, uuid, public.host_mode, timestamptz, smallint, double precision, double precision, uuid, text) from public;
grant execute on function public.create_meetup_post(text, text, uuid, public.host_mode, timestamptz, smallint, double precision, double precision, uuid, text) to authenticated;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;
