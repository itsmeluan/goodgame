create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

do $$
begin
  create type public.legal_document_kind as enum ('privacy_policy', 'terms_of_service');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.attendance_status as enum (
    'going',
    'on_the_way',
    'arrived',
    'left',
    'cant_make_it'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.venue_suggestion_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.push_delivery_status as enum ('queued', 'sent', 'error');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind public.legal_document_kind not null,
  version text not null,
  title text not null,
  summary text not null,
  effective_at timestamptz not null default timezone('utc', now()),
  is_current boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (kind, version)
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  document_id uuid not null references public.legal_documents (id) on delete cascade,
  platform text,
  app_version text,
  accepted_at timestamptz not null default timezone('utc', now()),
  unique (user_id, document_id)
);

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null,
  device_name text,
  app_version text,
  permission_status text not null default 'unknown',
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.user_notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  push_device_id uuid not null references public.push_devices (id) on delete cascade,
  expo_push_token text not null,
  payload jsonb not null,
  status public.push_delivery_status not null default 'queued',
  provider_request_id bigint,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.venue_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggested_by uuid not null references public.profiles (user_id) on delete cascade,
  name text not null,
  neighborhood text,
  address text,
  details text,
  location extensions.geography(Point, 4326) not null,
  status public.venue_suggestion_status not null default 'pending',
  reviewed_by uuid references public.profiles (user_id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.venue_suggestion_formats (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.venue_suggestions (id) on delete cascade,
  format_id uuid not null references public.formats (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (suggestion_id, format_id)
);

create table if not exists public.meetup_ratings (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetup_posts (id) on delete cascade,
  reviewer_user_id uuid not null references public.profiles (user_id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles (user_id) on delete cascade,
  attended boolean not null default true,
  rating smallint check (rating between 1 and 5),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (meetup_id, reviewer_user_id, reviewed_user_id),
  check (reviewer_user_id <> reviewed_user_id)
);

alter table public.meetup_members
add column if not exists attendance_status public.attendance_status not null default 'going';

alter table public.meetup_members
add column if not exists attendance_marked_at timestamptz not null default timezone('utc', now());

create index if not exists legal_documents_current_idx
  on public.legal_documents (kind, is_current, effective_at desc);

create index if not exists legal_acceptances_user_idx
  on public.legal_acceptances (user_id, accepted_at desc);

create index if not exists push_devices_user_idx
  on public.push_devices (user_id, is_active, last_seen_at desc);

create index if not exists push_deliveries_status_idx
  on public.push_notification_deliveries (status, created_at asc);

create index if not exists venue_suggestions_status_idx
  on public.venue_suggestions (status, created_at desc);

create index if not exists meetup_members_attendance_idx
  on public.meetup_members (meetup_id, attendance_status);

create index if not exists meetup_ratings_reviewed_idx
  on public.meetup_ratings (reviewed_user_id, created_at desc);

drop trigger if exists push_devices_touch_updated_at on public.push_devices;
create trigger push_devices_touch_updated_at
before update on public.push_devices
for each row
execute function public.touch_updated_at();

drop trigger if exists venue_suggestions_touch_updated_at on public.venue_suggestions;
create trigger venue_suggestions_touch_updated_at
before update on public.venue_suggestions
for each row
execute function public.touch_updated_at();

drop trigger if exists meetup_ratings_touch_updated_at on public.meetup_ratings;
create trigger meetup_ratings_touch_updated_at
before update on public.meetup_ratings
for each row
execute function public.touch_updated_at();

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.push_devices enable row level security;
alter table public.push_notification_deliveries enable row level security;
alter table public.venue_suggestions enable row level security;
alter table public.venue_suggestion_formats enable row level security;
alter table public.meetup_ratings enable row level security;

drop policy if exists "legal_documents_readable" on public.legal_documents;
create policy "legal_documents_readable"
on public.legal_documents
for select
to authenticated
using (is_current);

drop policy if exists "legal_acceptances_read_own" on public.legal_acceptances;
create policy "legal_acceptances_read_own"
on public.legal_acceptances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "push_devices_manage_own" on public.push_devices;
create policy "push_devices_manage_own"
on public.push_devices
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "push_deliveries_read_own" on public.push_notification_deliveries;
create policy "push_deliveries_read_own"
on public.push_notification_deliveries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "venue_suggestions_read_authenticated" on public.venue_suggestions;
create policy "venue_suggestions_read_authenticated"
on public.venue_suggestions
for select
to authenticated
using (
  status = 'approved'
  or auth.uid() = suggested_by
);

drop policy if exists "venue_suggestions_insert_own" on public.venue_suggestions;
create policy "venue_suggestions_insert_own"
on public.venue_suggestions
for insert
to authenticated
with check (auth.uid() = suggested_by);

drop policy if exists "venue_suggestions_update_own_pending" on public.venue_suggestions;
create policy "venue_suggestions_update_own_pending"
on public.venue_suggestions
for update
to authenticated
using (auth.uid() = suggested_by and status = 'pending')
with check (auth.uid() = suggested_by and status = 'pending');

drop policy if exists "venue_suggestion_formats_read_authenticated" on public.venue_suggestion_formats;
create policy "venue_suggestion_formats_read_authenticated"
on public.venue_suggestion_formats
for select
to authenticated
using (
  exists (
    select 1
    from public.venue_suggestions suggestion
    where suggestion.id = venue_suggestion_formats.suggestion_id
      and (suggestion.status = 'approved' or suggestion.suggested_by = auth.uid())
  )
);

drop policy if exists "venue_suggestion_formats_manage_own" on public.venue_suggestion_formats;
create policy "venue_suggestion_formats_manage_own"
on public.venue_suggestion_formats
for all
to authenticated
using (
  exists (
    select 1
    from public.venue_suggestions suggestion
    where suggestion.id = venue_suggestion_formats.suggestion_id
      and suggestion.suggested_by = auth.uid()
      and suggestion.status = 'pending'
  )
)
with check (
  exists (
    select 1
    from public.venue_suggestions suggestion
    where suggestion.id = venue_suggestion_formats.suggestion_id
      and suggestion.suggested_by = auth.uid()
      and suggestion.status = 'pending'
  )
);

drop policy if exists "meetup_ratings_read_authenticated" on public.meetup_ratings;
create policy "meetup_ratings_read_authenticated"
on public.meetup_ratings
for select
to authenticated
using (true);

drop policy if exists "meetup_ratings_insert_own" on public.meetup_ratings;
create policy "meetup_ratings_insert_own"
on public.meetup_ratings
for insert
to authenticated
with check (auth.uid() = reviewer_user_id);

update public.legal_documents
set is_current = false
where kind in ('privacy_policy', 'terms_of_service');

insert into public.legal_documents (
  kind,
  version,
  title,
  summary,
  effective_at,
  is_current
)
values
  (
    'privacy_policy',
    '2026-04-02',
    'Política de Privacidade',
    'Explica quais dados pessoais são coletados, como são usados para operar o mapa, chats, amizades, notificações e recursos de segurança, e como o usuário pode exercer seus direitos.',
    timezone('utc', now()),
    true
  ),
  (
    'terms_of_service',
    '2026-04-02',
    'Termos de Uso',
    'Define as regras de uso da plataforma, comportamento esperado, responsabilidades sobre encontros presenciais, moderação, bloqueios, denúncias e encerramento de contas.',
    timezone('utc', now()),
    true
  )
on conflict (kind, version) do update
set
  title = excluded.title,
  summary = excluded.summary,
  effective_at = excluded.effective_at,
  is_current = excluded.is_current;

create or replace function public.list_current_legal_documents()
returns table (
  id uuid,
  kind text,
  version text,
  title text,
  summary text,
  effective_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    document.id,
    document.kind::text,
    document.version,
    document.title,
    document.summary,
    document.effective_at,
    acceptance.accepted_at
  from public.legal_documents document
  left join public.legal_acceptances acceptance
    on acceptance.document_id = document.id
   and acceptance.user_id = auth.uid()
  where document.is_current
  order by document.kind, document.effective_at desc;
$$;

create or replace function public.accept_current_legal_documents(
  p_platform text default null,
  p_app_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  insert into public.legal_acceptances (
    user_id,
    document_id,
    platform,
    app_version
  )
  select
    current_user_id,
    document.id,
    nullif(trim(coalesce(p_platform, '')), ''),
    nullif(trim(coalesce(p_app_version, '')), '')
  from public.legal_documents document
  where document.is_current
  on conflict (user_id, document_id) do update
  set
    platform = excluded.platform,
    app_version = excluded.app_version,
    accepted_at = timezone('utc', now());
end;
$$;

create or replace function public.has_accepted_current_legal_documents()
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.legal_documents document
    where document.is_current
      and not exists (
        select 1
        from public.legal_acceptances acceptance
        where acceptance.user_id = auth.uid()
          and acceptance.document_id = document.id
      )
  );
$$;

create or replace function public.register_push_device(
  p_expo_push_token text,
  p_platform text,
  p_device_name text default null,
  p_app_version text default null,
  p_permission_status text default 'granted'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  registered_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if coalesce(trim(p_expo_push_token), '') = '' then
    raise exception 'Informe um token de push válido';
  end if;

  insert into public.push_devices (
    user_id,
    expo_push_token,
    platform,
    device_name,
    app_version,
    permission_status,
    is_active,
    last_seen_at
  )
  values (
    current_user_id,
    trim(p_expo_push_token),
    lower(trim(coalesce(p_platform, 'mobile'))),
    nullif(trim(coalesce(p_device_name, '')), ''),
    nullif(trim(coalesce(p_app_version, '')), ''),
    lower(trim(coalesce(p_permission_status, 'granted'))),
    true,
    timezone('utc', now())
  )
  on conflict (expo_push_token) do update
  set
    user_id = excluded.user_id,
    platform = excluded.platform,
    device_name = excluded.device_name,
    app_version = excluded.app_version,
    permission_status = excluded.permission_status,
    is_active = true,
    last_seen_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning id into registered_id;

  return registered_id;
end;
$$;

create or replace function public.disable_push_device(
  p_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  update public.push_devices
  set
    is_active = false,
    updated_at = timezone('utc', now())
  where user_id = current_user_id
    and expo_push_token = trim(coalesce(p_expo_push_token, ''));
end;
$$;

create or replace function public.queue_push_delivery_from_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_deliveries (
    notification_id,
    user_id,
    push_device_id,
    expo_push_token,
    payload
  )
  select
    new.id,
    new.user_id,
    device.id,
    device.expo_push_token,
    jsonb_build_object(
      'to', device.expo_push_token,
      'sound', 'default',
      'title', new.title,
      'body', new.body,
      'data', jsonb_build_object(
        'notificationId', new.id::text,
        'kind', new.kind::text,
        'meetupId', coalesce(new.meetup_id::text, ''),
        'deepLink', case
          when new.meetup_id is not null then 'goodgame://'
          else 'goodgame://'
        end
      )
    )
  from public.push_devices device
  where device.user_id = new.user_id
    and device.is_active
    and device.permission_status = 'granted';

  return new;
end;
$$;

drop trigger if exists user_notifications_queue_push_after_insert on public.user_notifications;
create trigger user_notifications_queue_push_after_insert
after insert on public.user_notifications
for each row
execute function public.queue_push_delivery_from_notification();

create or replace function public.send_pending_push_notifications(
  p_limit integer default 50
)
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  queued_delivery record;
  request_id bigint;
  processed_count integer := 0;
begin
  for queued_delivery in
    select delivery.id, delivery.payload
    from public.push_notification_deliveries delivery
    where delivery.status = 'queued'
    order by delivery.created_at asc
    limit greatest(coalesce(p_limit, 50), 1)
  loop
    begin
      select net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := queued_delivery.payload,
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Accept', 'application/json'
        ),
        timeout_milliseconds := 5000
      )
      into request_id;

      update public.push_notification_deliveries
      set
        status = 'sent',
        provider_request_id = request_id,
        sent_at = timezone('utc', now()),
        updated_at = timezone('utc', now()),
        last_error = null
      where id = queued_delivery.id;
    exception
      when others then
        update public.push_notification_deliveries
        set
          status = 'error',
          updated_at = timezone('utc', now()),
          last_error = sqlerrm
        where id = queued_delivery.id;
    end;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

do $$
begin
  perform cron.unschedule('good_game_push_dispatch');
exception
  when invalid_parameter_value then null;
  when undefined_function then null;
  when others then null;
end;
$$;

select cron.schedule(
  'good_game_push_dispatch',
  '* * * * *',
  $$select public.send_pending_push_notifications(100);$$
)
where not exists (
  select 1
  from cron.job
  where jobname = 'good_game_push_dispatch'
);

create or replace function public.set_my_attendance_status(
  p_meetup_id uuid,
  p_status public.attendance_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_count integer;
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  update public.meetup_members
  set
    attendance_status = coalesce(p_status, attendance_status),
    attendance_marked_at = timezone('utc', now())
  where meetup_id = p_meetup_id
    and user_id = current_user_id;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'Você precisa entrar no jogo antes de atualizar sua presença';
  end if;
end;
$$;

drop function if exists public.list_meetup_cards();
create function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
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
  location_hint text,
  is_location_exact boolean,
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
      when visibility.is_location_exact and venue.name is not null then venue.name
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as location_hint,
    visibility.is_location_exact,
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

create or replace function public.list_meetup_member_presence(
  p_meetup_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  avatar_path text,
  attendance_status text,
  role text,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    member.user_id,
    profile.display_name,
    profile.handle,
    profile.avatar_path,
    member.attendance_status::text,
    member.role::text,
    member.joined_at
  from public.meetup_members member
  join public.profiles profile on profile.user_id = member.user_id
  where member.meetup_id = p_meetup_id
    and exists (
      select 1
      from public.meetup_members own_membership
      where own_membership.meetup_id = p_meetup_id
        and own_membership.user_id = auth.uid()
    )
  order by
    case member.role when 'creator' then 0 else 1 end,
    profile.display_name;
$$;

create or replace function public.rate_meetup_player(
  p_meetup_id uuid,
  p_reviewed_user_id uuid,
  p_attended boolean,
  p_rating smallint default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  rating_id uuid;
  meetup_start timestamptz;
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_reviewed_user_id is null or p_reviewed_user_id = current_user_id then
    raise exception 'Escolha outro jogador para avaliar';
  end if;

  select starts_at
  into meetup_start
  from public.meetup_posts
  where id = p_meetup_id;

  if meetup_start is null then
    raise exception 'Jogo não encontrado';
  end if;

  if meetup_start > timezone('utc', now()) - interval '15 minutes' then
    raise exception 'A avaliação fica disponível após o início do jogo';
  end if;

  if not exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = p_meetup_id
      and member.user_id = current_user_id
  ) then
    raise exception 'Você precisa participar desse jogo para avaliar';
  end if;

  if not exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = p_meetup_id
      and member.user_id = p_reviewed_user_id
  ) then
    raise exception 'Esse jogador não participou desse jogo';
  end if;

  insert into public.meetup_ratings (
    meetup_id,
    reviewer_user_id,
    reviewed_user_id,
    attended,
    rating,
    note
  )
  values (
    p_meetup_id,
    current_user_id,
    p_reviewed_user_id,
    coalesce(p_attended, true),
    case when p_attended then p_rating else null end,
    nullif(trim(coalesce(p_note, '')), '')
  )
  on conflict (meetup_id, reviewer_user_id, reviewed_user_id) do update
  set
    attended = excluded.attended,
    rating = excluded.rating,
    note = excluded.note,
    updated_at = timezone('utc', now())
  returning id into rating_id;

  return rating_id;
end;
$$;

create or replace function public.my_reputation_summary()
returns table (
  average_rating numeric,
  ratings_count integer,
  attended_count integer,
  no_show_count integer,
  hosted_count integer
)
language sql
security definer
set search_path = public
as $$
  with rating_stats as (
    select
      round(avg(rating)::numeric, 2) as average_rating,
      count(rating)::integer as ratings_count,
      count(*) filter (where attended)::integer as attended_count,
      count(*) filter (where not attended)::integer as no_show_count
    from public.meetup_ratings
    where reviewed_user_id = auth.uid()
  ),
  host_stats as (
    select count(*)::integer as hosted_count
    from public.meetup_posts
    where creator_id = auth.uid()
  )
  select
    coalesce(rating_stats.average_rating, 0)::numeric,
    coalesce(rating_stats.ratings_count, 0),
    coalesce(rating_stats.attended_count, 0),
    coalesce(rating_stats.no_show_count, 0),
    coalesce(host_stats.hosted_count, 0)
  from rating_stats
  cross join host_stats;
$$;

create or replace function public.create_venue_suggestion(
  p_name text,
  p_neighborhood text,
  p_address text,
  p_details text,
  p_lat double precision,
  p_lng double precision,
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
    raise exception 'Usuário não autenticado';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe o nome do local';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'Informe a localização aproximada do local';
  end if;

  insert into public.venue_suggestions (
    suggested_by,
    name,
    neighborhood,
    address,
    details,
    location
  )
  values (
    current_user_id,
    trim(p_name),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_details, '')), ''),
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

create or replace function public.list_my_venue_suggestions()
returns table (
  id uuid,
  name text,
  neighborhood text,
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
    suggestion.status::text,
    suggestion.created_at
  from public.venue_suggestions suggestion
  where suggestion.suggested_by = auth.uid()
  order by suggestion.created_at desc;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = current_user_id::text;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.list_current_legal_documents() from public;
grant execute on function public.list_current_legal_documents() to authenticated;

revoke all on function public.accept_current_legal_documents(text, text) from public;
grant execute on function public.accept_current_legal_documents(text, text) to authenticated;

revoke all on function public.has_accepted_current_legal_documents() from public;
grant execute on function public.has_accepted_current_legal_documents() to authenticated;

revoke all on function public.register_push_device(text, text, text, text, text) from public;
grant execute on function public.register_push_device(text, text, text, text, text) to authenticated;

revoke all on function public.disable_push_device(text) from public;
grant execute on function public.disable_push_device(text) to authenticated;

revoke all on function public.send_pending_push_notifications(integer) from public;
grant execute on function public.send_pending_push_notifications(integer) to authenticated;

revoke all on function public.set_my_attendance_status(uuid, public.attendance_status) from public;
grant execute on function public.set_my_attendance_status(uuid, public.attendance_status) to authenticated;

revoke all on function public.list_meetup_member_presence(uuid) from public;
grant execute on function public.list_meetup_member_presence(uuid) to authenticated;

revoke all on function public.rate_meetup_player(uuid, uuid, boolean, smallint, text) from public;
grant execute on function public.rate_meetup_player(uuid, uuid, boolean, smallint, text) to authenticated;

revoke all on function public.my_reputation_summary() from public;
grant execute on function public.my_reputation_summary() to authenticated;

revoke all on function public.create_venue_suggestion(text, text, text, text, double precision, double precision, uuid[]) from public;
grant execute on function public.create_venue_suggestion(text, text, text, text, double precision, double precision, uuid[]) to authenticated;

revoke all on function public.list_my_venue_suggestions() from public;
grant execute on function public.list_my_venue_suggestions() to authenticated;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
