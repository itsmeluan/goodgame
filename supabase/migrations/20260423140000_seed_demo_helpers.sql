-- Helpers só para scripts de seed com service_role (não usados pelo app cliente).

create or replace function public.seed_set_profile_geo(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update public.profiles
  set
    approximate_location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    updated_at = timezone('utc', now())
  where user_id = p_user_id;
$$;

revoke all on function public.seed_set_profile_geo(uuid, double precision, double precision) from public;
grant execute on function public.seed_set_profile_geo(uuid, double precision, double precision) to service_role;

create or replace function public.seed_create_venue(
  p_created_by uuid,
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
  p_kind public.venue_kind,
  p_format_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_venue_id uuid;
  format_id uuid;
begin
  if p_created_by is null then
    raise exception 'created_by required';
  end if;

  insert into public.venues (
    source,
    name,
    neighborhood,
    address,
    kind,
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
    p_kind,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    true,
    nullif(trim(coalesce(p_details, '')), ''),
    p_created_by,
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

revoke all on function public.seed_create_venue(uuid, text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) from public;
grant execute on function public.seed_create_venue(uuid, text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) to service_role;
