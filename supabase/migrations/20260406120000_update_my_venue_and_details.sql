drop function if exists public.list_venue_cards();
create function public.list_venue_cards()
returns table (
  id uuid,
  name text,
  neighborhood text,
  address text,
  details text,
  kind text,
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
    venue.details,
    venue.kind::text,
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

drop function if exists public.update_my_venue(uuid, text, text, text, text, double precision, double precision, public.venue_kind, uuid[]);
create function public.update_my_venue(
  p_venue_id uuid,
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
  p_kind public.venue_kind default 'public_place',
  p_format_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  format_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_venue_id is null then
    raise exception 'Informe o local que deseja atualizar';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Informe o nome do local';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'Escolha um endereco para o local';
  end if;

  if not exists (
    select 1
    from public.venues venue
    where venue.id = p_venue_id
      and venue.created_by = current_user_id
  ) then
    raise exception 'Voce nao pode editar esse local';
  end if;

  update public.venues
  set
    name = trim(p_name),
    neighborhood = nullif(trim(coalesce(p_neighborhood, '')), ''),
    address = nullif(trim(coalesce(p_address, '')), ''),
    details = nullif(trim(coalesce(p_details, '')), ''),
    kind = coalesce(p_kind, 'public_place'),
    location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    updated_at = timezone('utc', now())
  where id = p_venue_id
    and created_by = current_user_id;

  delete from public.venue_formats
  where venue_id = p_venue_id;

  foreach format_id in array coalesce(p_format_ids, '{}'::uuid[])
  loop
    if format_id is not null then
      insert into public.venue_formats (venue_id, format_id)
      values (p_venue_id, format_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function public.list_venue_cards() from public;
grant execute on function public.list_venue_cards() to authenticated;

revoke all on function public.update_my_venue(uuid, text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) from public;
grant execute on function public.update_my_venue(uuid, text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) to authenticated;
