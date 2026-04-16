do $$
begin
  create type public.venue_kind as enum ('public_place', 'specialty_store');
exception
  when duplicate_object then null;
end;
$$;

alter type public.notification_kind add value if not exists 'nearby_meetup_created';
alter type public.notification_kind add value if not exists 'nearby_venue_created';

alter table public.venues
add column if not exists kind public.venue_kind;

update public.venues
set kind = case
  when created_by is null then 'specialty_store'::public.venue_kind
  else 'public_place'::public.venue_kind
end
where kind is null;

alter table public.venues
alter column kind set default 'public_place';

alter table public.venues
alter column kind set not null;

alter table public.venue_suggestions
add column if not exists kind public.venue_kind;

update public.venue_suggestions
set kind = 'public_place'::public.venue_kind
where kind is null;

alter table public.venue_suggestions
alter column kind set default 'public_place';

update public.meetup_posts
set status = 'open'
where status in ('filled', 'confirmed');

create or replace function public.sync_meetup_capacity_status(p_meetup_id uuid)
returns public.meetup_status
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.meetup_status;
begin
  select meetup.status
  into current_status
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    return null;
  end if;

  if current_status in ('closed', 'cancelled') then
    return current_status;
  end if;

  if current_status <> 'open' then
    update public.meetup_posts
    set status = 'open'
    where id = p_meetup_id;
  end if;

  return 'open';
end;
$$;

drop function if exists public.update_my_meetup(uuid, smallint, public.meetup_status);
create function public.update_my_meetup(
  p_meetup_id uuid,
  p_max_players smallint default null,
  p_status public.meetup_status default null,
  p_starts_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_joined_count integer;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_max_players is null and p_status is null and p_starts_at is null then
    raise exception 'Informe ao menos uma alteracao';
  end if;

  if not exists (
    select 1
    from public.meetup_posts meetup
    where meetup.id = p_meetup_id
      and meetup.creator_id = current_user_id
  ) then
    raise exception 'Somente o criador pode editar este jogo';
  end if;

  if p_status is not null and p_status not in ('open', 'closed', 'cancelled') then
    raise exception 'Use apenas os status aberto, encerrado ou cancelado';
  end if;

  select count(*)::integer
  into current_joined_count
  from public.meetup_members member
  where member.meetup_id = p_meetup_id;

  if p_max_players is not null and p_max_players < current_joined_count then
    raise exception 'As vagas nao podem ficar abaixo dos jogadores ja confirmados';
  end if;

  update public.meetup_posts
  set
    max_players = coalesce(p_max_players, max_players),
    status = coalesce(p_status, status),
    starts_at = coalesce(p_starts_at, starts_at),
    expires_at = case
      when p_starts_at is not null then p_starts_at + interval '6 hours'
      else expires_at
    end,
    updated_at = timezone('utc', now())
  where id = p_meetup_id
    and creator_id = current_user_id;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

create or replace function public.notify_members_when_meetup_status_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  target_member record;
  notification_title text;
  notification_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  notification_title := case new.status
    when 'open' then 'Partida reaberta'
    when 'closed' then 'Partida encerrada'
    when 'cancelled' then 'Partida cancelada'
    else 'Partida atualizada'
  end;

  notification_body := case new.status
    when 'open' then '"' || new.title || '" voltou a aceitar jogadores.'
    when 'closed' then 'A partida "' || new.title || '" foi encerrada.'
    when 'cancelled' then 'A partida "' || new.title || '" foi cancelada.'
    else 'O status de "' || new.title || '" mudou.'
  end;

  for target_member in
    select member.user_id
    from public.meetup_members member
    where member.meetup_id = new.id
      and (actor_user_id is null or member.user_id <> actor_user_id)
  loop
    perform public.create_user_notification(
      target_member.user_id,
      new.id,
      actor_user_id,
      'meetup_status_changed',
      notification_title,
      notification_body,
      null,
      jsonb_build_object(
        'previous_status', old.status::text,
        'next_status', new.status::text
      )
    );
  end loop;

  return new;
end;
$$;

drop function if exists public.list_venue_cards();
create function public.list_venue_cards()
returns table (
  id uuid,
  name text,
  neighborhood text,
  address text,
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

drop function if exists public.create_my_venue(text, text, text, text, double precision, double precision, uuid[]);
create function public.create_my_venue(
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
  p_kind public.venue_kind default 'public_place',
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
    raise exception 'Escolha um endereco para o local';
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
    coalesce(p_kind, 'public_place'),
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

drop function if exists public.create_venue_suggestion(text, text, text, text, double precision, double precision, uuid[]);
create function public.create_venue_suggestion(
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
  p_kind public.venue_kind default 'public_place',
  p_format_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  suggestion_id uuid;
  format_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe o nome do local';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'Informe a localizacao do local';
  end if;

  insert into public.venue_suggestions (
    suggested_by,
    name,
    neighborhood,
    address,
    details,
    kind,
    location
  )
  values (
    current_user_id,
    trim(p_name),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_details, '')), ''),
    coalesce(p_kind, 'public_place'),
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  )
  returning id into suggestion_id;

  foreach format_id in array coalesce(p_format_ids, '{}'::uuid[])
  loop
    insert into public.venue_suggestion_formats (suggestion_id, format_id)
    values (suggestion_id, format_id)
    on conflict (suggestion_id, format_id) do nothing;
  end loop;

  return suggestion_id;
end;
$$;

drop function if exists public.list_my_venue_suggestions();
create function public.list_my_venue_suggestions()
returns table (
  id uuid,
  name text,
  neighborhood text,
  kind text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    suggestion.id,
    suggestion.name,
    suggestion.neighborhood,
    suggestion.kind::text,
    suggestion.status::text,
    suggestion.created_at
  from public.venue_suggestions suggestion
  where suggestion.suggested_by = auth.uid()
  order by suggestion.created_at desc;
$$;

create or replace function public.notify_players_about_nearby_meetup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_profile record;
  distance_meters double precision;
begin
  for target_profile in
    select profile.user_id, profile.display_name, profile.approximate_location
    from public.profiles profile
    where profile.user_id <> new.creator_id
      and profile.approximate_location is not null
      and extensions.st_dwithin(profile.approximate_location, new.location, 10000)
      and not public.users_are_blocked(profile.user_id, new.creator_id)
  loop
    distance_meters := extensions.st_distance(target_profile.approximate_location, new.location);

    perform public.create_user_notification(
      target_profile.user_id,
      new.id,
      new.creator_id,
      'nearby_meetup_created',
      'Nova partida perto de você',
      '"' || new.title || '" apareceu a até 10 km da sua localização.',
      'nearby-meetup:' || new.id::text,
      jsonb_build_object(
        'distance_meters', round(distance_meters)::integer,
        'entity', 'meetup'
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists meetup_posts_notify_nearby_after_insert on public.meetup_posts;
create trigger meetup_posts_notify_nearby_after_insert
after insert on public.meetup_posts
for each row
execute function public.notify_players_about_nearby_meetup();

create or replace function public.notify_players_about_nearby_venue()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_profile record;
  distance_meters double precision;
begin
  for target_profile in
    select profile.user_id, profile.approximate_location
    from public.profiles profile
    where profile.approximate_location is not null
      and (new.created_by is null or profile.user_id <> new.created_by)
      and extensions.st_dwithin(profile.approximate_location, new.location, 10000)
      and (new.created_by is null or not public.users_are_blocked(profile.user_id, new.created_by))
  loop
    distance_meters := extensions.st_distance(target_profile.approximate_location, new.location);

    perform public.create_user_notification(
      target_profile.user_id,
      null,
      new.created_by,
      'nearby_venue_created',
      'Novo local perto de você',
      '"' || new.name || '" entrou no mapa a até 10 km da sua localização.',
      'nearby-venue:' || new.id::text,
      jsonb_build_object(
        'distance_meters', round(distance_meters)::integer,
        'entity', 'venue',
        'venue_id', new.id::text
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists venues_notify_nearby_after_insert on public.venues;
create trigger venues_notify_nearby_after_insert
after insert on public.venues
for each row
execute function public.notify_players_about_nearby_venue();

create or replace function public.create_due_meetup_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  insert into public.user_notifications (
    user_id,
    meetup_id,
    actor_user_id,
    kind,
    title,
    body,
    unique_key,
    metadata
  )
  select
    current_user_id,
    due_meetups.meetup_id,
    null,
    'meetup_reminder',
    case due_meetups.reminder_key
      when '15m' then 'Sua partida começa em 15 min'
      else 'Sua partida começa em 1 hora'
    end,
    '"' || due_meetups.title || '" começa ' ||
      case due_meetups.reminder_key
        when '15m' then 'em até 15 minutos.'
        else 'em até 1 hora.'
      end,
    'reminder:' || due_meetups.meetup_id::text || ':' || due_meetups.reminder_key,
    jsonb_build_object('reminder_key', due_meetups.reminder_key)
  from (
    select
      meetup.id as meetup_id,
      meetup.title,
      case
        when meetup.starts_at <= timezone('utc', now()) + interval '15 minutes' then '15m'
        when meetup.starts_at <= timezone('utc', now()) + interval '1 hour' then '1h'
        else null
      end as reminder_key
    from public.meetup_posts meetup
    join public.meetup_members member
      on member.meetup_id = meetup.id
     and member.user_id = current_user_id
    where meetup.status = 'open'
      and meetup.starts_at > timezone('utc', now())
      and meetup.starts_at <= timezone('utc', now()) + interval '1 hour'
  ) as due_meetups
  where due_meetups.reminder_key is not null
  on conflict (user_id, kind, unique_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

drop function if exists public.list_my_notifications(integer);
create function public.list_my_notifications(p_limit integer default 10)
returns table (
  id uuid,
  kind text,
  title text,
  body text,
  meetup_id uuid,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    notification.id,
    notification.kind::text,
    notification.title,
    notification.body,
    notification.meetup_id,
    notification.metadata,
    notification.read_at,
    notification.created_at
  from public.user_notifications notification
  where notification.user_id = auth.uid()
  order by notification.read_at asc nulls first, notification.created_at desc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

revoke all on function public.update_my_meetup(uuid, smallint, public.meetup_status, timestamptz) from public;
grant execute on function public.update_my_meetup(uuid, smallint, public.meetup_status, timestamptz) to authenticated;

revoke all on function public.create_my_venue(text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) from public;
grant execute on function public.create_my_venue(text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) to authenticated;

revoke all on function public.create_venue_suggestion(text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) from public;
grant execute on function public.create_venue_suggestion(text, text, text, text, double precision, double precision, public.venue_kind, uuid[]) to authenticated;

revoke all on function public.list_my_venue_suggestions() from public;
grant execute on function public.list_my_venue_suggestions() to authenticated;

revoke all on function public.list_my_notifications(integer) from public;
grant execute on function public.list_my_notifications(integer) to authenticated;

revoke all on function public.list_venue_cards() from public;
grant execute on function public.list_venue_cards() to authenticated;
