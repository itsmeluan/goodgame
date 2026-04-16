drop function if exists public.list_venue_cards();
create function public.list_venue_cards()
returns table (
  id uuid,
  name text,
  neighborhood text,
  address text,
  supports_events boolean,
  owner_display_name text,
  creator_user_id uuid,
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
    venue.address,
    venue.supports_events,
    coalesce(profile.display_name, 'Comunidade') as owner_display_name,
    venue.created_by as creator_user_id,
    coalesce(
      array_agg(distinct format.name order by format.name)
      filter (where format.name is not null),
      '{}'::text[]
    ) as formats,
    extensions.st_y(venue.location::extensions.geometry) as lat,
    extensions.st_x(venue.location::extensions.geometry) as lng
  from public.venues venue
  left join public.profiles profile on profile.user_id = venue.created_by
  left join public.venue_formats venue_format on venue_format.venue_id = venue.id
  left join public.formats format on format.id = venue_format.format_id
  where auth.uid() is not null
  group by venue.id, profile.display_name;
$$;

create or replace function public.create_my_venue(
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
  p_format_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  new_venue_id uuid;
  format_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Informe o nome do local';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'Escolha um ponto no mapa para o local';
  end if;

  insert into public.venues (
    source,
    name,
    neighborhood,
    address,
    location,
    supports_events,
    details,
    created_by,
    approved_at
  )
  values (
    'community',
    trim(p_name),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    true,
    nullif(trim(coalesce(p_details, '')), ''),
    current_user_id,
    timezone('utc', now())
  )
  returning id into new_venue_id;

  if coalesce(array_length(p_format_ids, 1), 0) > 0 then
    foreach format_id in array p_format_ids loop
      if format_id is not null then
        insert into public.venue_formats (venue_id, format_id)
        values (new_venue_id, format_id)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return new_venue_id;
end;
$$;

create or replace function public.delete_my_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  delete from public.venues venue
  where venue.id = p_venue_id
    and venue.created_by = current_user_id;

  if not found then
    raise exception 'Local nao encontrado ou sem permissao';
  end if;
end;
$$;

create or replace function public.delete_my_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  delete from public.meetup_posts meetup
  where meetup.id = p_meetup_id
    and meetup.creator_id = current_user_id;

  if not found then
    raise exception 'Jogo nao encontrado ou sem permissao';
  end if;
end;
$$;

revoke all on function public.list_venue_cards() from public;
grant execute on function public.list_venue_cards() to authenticated;

revoke all on function public.create_my_venue(text, text, text, text, double precision, double precision, uuid[]) from public;
grant execute on function public.create_my_venue(text, text, text, text, double precision, double precision, uuid[]) to authenticated;

revoke all on function public.delete_my_venue(uuid) from public;
grant execute on function public.delete_my_venue(uuid) to authenticated;

revoke all on function public.delete_my_meetup(uuid) from public;
grant execute on function public.delete_my_meetup(uuid) to authenticated;
