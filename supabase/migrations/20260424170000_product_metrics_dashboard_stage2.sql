do $$
begin
  create type public.product_event_category as enum (
    'lifecycle',
    'navigation',
    'onboarding',
    'discovery',
    'meetup',
    'feedback',
    'monetization',
    'engagement'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null,
  event_category public.product_event_category not null default 'engagement',
  platform text,
  app_version text,
  app_build_number text,
  os_version text,
  device_model text,
  session_id text,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  region text,
  game_type text,
  related_entity_id uuid,
  screen_name text,
  acquisition_source text,
  context jsonb not null default '{}'::jsonb,
  constraint product_events_event_name_nonempty check (char_length(trim(event_name)) > 0),
  constraint product_events_context_is_object check (jsonb_typeof(context) = 'object')
);

comment on table public.product_events is
  'Trilha oficial de analytics do produto para ETAPA 2 do dashboard.';

create table if not exists public.product_event_user_markers (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  context jsonb not null default '{}'::jsonb,
  primary key (user_id, event_name),
  constraint product_event_user_markers_event_name_nonempty check (char_length(trim(event_name)) > 0)
);

comment on table public.product_event_user_markers is
  'Marcadores de eventos once-per-user para evitar duplicidade em first_app_open, first_game_created etc.';

create table if not exists public.pro_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  source text not null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  context jsonb not null default '{}'::jsonb,
  constraint pro_status_history_status_check check (status in ('enabled', 'disabled')),
  constraint pro_status_history_context_is_object check (jsonb_typeof(context) = 'object'),
  constraint pro_status_history_ended_after_started check (
    ended_at is null or ended_at >= started_at
  )
);

comment on table public.pro_status_history is
  'Historico efetivo de Pro do usuario, incluindo trial, manual, pago e grant global.';

create index if not exists product_events_occurred_idx
  on public.product_events (occurred_at desc);

create index if not exists product_events_event_name_idx
  on public.product_events (event_name, occurred_at desc);

create index if not exists product_events_user_idx
  on public.product_events (user_id, occurred_at desc);

create index if not exists product_events_platform_idx
  on public.product_events (platform, occurred_at desc);

create index if not exists product_events_app_version_idx
  on public.product_events (app_version, occurred_at desc);

create index if not exists product_events_region_idx
  on public.product_events (region, occurred_at desc);

create index if not exists product_events_game_type_idx
  on public.product_events (game_type, occurred_at desc);

create index if not exists pro_status_history_user_idx
  on public.pro_status_history (user_id, started_at desc);

create index if not exists pro_status_history_status_idx
  on public.pro_status_history (status, started_at desc);

alter table public.product_events enable row level security;
alter table public.product_event_user_markers enable row level security;
alter table public.pro_status_history enable row level security;

revoke all on public.product_events from public, anon, authenticated;
revoke all on public.product_event_user_markers from public, anon, authenticated;
revoke all on public.pro_status_history from public, anon, authenticated;

create or replace function public.dashboard_normalize_event_category(p_category text)
returns public.product_event_category
language plpgsql
immutable
as $$
declare
  v_category text := lower(trim(coalesce(p_category, '')));
begin
  if v_category = 'lifecycle' then
    return 'lifecycle';
  elsif v_category = 'navigation' then
    return 'navigation';
  elsif v_category = 'onboarding' then
    return 'onboarding';
  elsif v_category = 'discovery' then
    return 'discovery';
  elsif v_category = 'meetup' then
    return 'meetup';
  elsif v_category = 'feedback' then
    return 'feedback';
  elsif v_category = 'monetization' then
    return 'monetization';
  else
    return 'engagement';
  end if;
end;
$$;

create or replace function public.track_product_event(
  p_event_name text,
  p_event_category text default 'engagement',
  p_platform text default null,
  p_app_version text default null,
  p_app_build_number text default null,
  p_os_version text default null,
  p_device_model text default null,
  p_session_id text default null,
  p_occurred_at timestamptz default timezone('utc', now()),
  p_context jsonb default '{}'::jsonb,
  p_region text default null,
  p_game_type text default null,
  p_related_entity_id uuid default null,
  p_screen_name text default null,
  p_acquisition_source text default null,
  p_once_per_user boolean default false,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_user_id uuid;
  v_event_name text := trim(coalesce(p_event_name, ''));
  v_context jsonb := coalesce(p_context, '{}'::jsonb);
  v_event_id uuid;
begin
  if v_event_name = '' then
    raise exception 'event_name_required';
  end if;

  if jsonb_typeof(v_context) is distinct from 'object' then
    raise exception 'context_must_be_object';
  end if;

  if v_auth_uid is not null then
    if p_user_id is not null and p_user_id <> v_auth_uid then
      raise exception 'invalid_user';
    end if;
    v_user_id := v_auth_uid;
  else
    if v_event_name <> 'signup_completed' or p_user_id is null then
      raise exception 'not_authenticated';
    end if;

    if not exists (
      select 1
      from auth.users auth_user
      where auth_user.id = p_user_id
    ) then
      raise exception 'unknown_user';
    end if;

    v_user_id := p_user_id;
  end if;

  if p_once_per_user and v_user_id is not null then
    insert into public.product_event_user_markers (user_id, event_name, occurred_at, context)
    values (v_user_id, v_event_name, coalesce(p_occurred_at, timezone('utc', now())), v_context)
    on conflict (user_id, event_name) do nothing;

    if not found then
      return null;
    end if;
  end if;

  insert into public.product_events (
    user_id,
    event_name,
    event_category,
    platform,
    app_version,
    app_build_number,
    os_version,
    device_model,
    session_id,
    occurred_at,
    region,
    game_type,
    related_entity_id,
    screen_name,
    acquisition_source,
    context
  )
  values (
    v_user_id,
    v_event_name,
    public.dashboard_normalize_event_category(p_event_category),
    public.dashboard_normalize_platform(p_platform),
    nullif(trim(coalesce(p_app_version, '')), ''),
    nullif(trim(coalesce(p_app_build_number, '')), ''),
    nullif(trim(coalesce(p_os_version, '')), ''),
    nullif(trim(coalesce(p_device_model, '')), ''),
    nullif(trim(coalesce(p_session_id, '')), ''),
    coalesce(p_occurred_at, timezone('utc', now())),
    nullif(trim(coalesce(p_region, '')), ''),
    nullif(trim(coalesce(p_game_type, '')), ''),
    p_related_entity_id,
    nullif(trim(coalesce(p_screen_name, '')), ''),
    nullif(trim(coalesce(p_acquisition_source, '')), ''),
    v_context
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.track_product_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
) from public;

grant execute on function public.track_product_event(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
) to anon, authenticated;

create or replace function public.sync_pro_status_history_for_user(
  p_user_id uuid,
  p_effective_at timestamptz default timezone('utc', now()),
  p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_grant_all boolean := false;
  v_should_enable boolean := false;
  v_source text := 'manual';
  v_current record;
begin
  if p_user_id is null then
    return;
  end if;

  select
    profile.user_id,
    profile.is_pro,
    profile.pro_expires_at,
    profile.trial_used
  into v_profile
  from public.profiles profile
  where profile.user_id = p_user_id;

  if v_profile.user_id is null then
    return;
  end if;

  select coalesce(app_config.grant_pro_to_all_users, false)
  into v_grant_all
  from public.app_config app_config
  where app_config.singleton_key = 1;

  v_should_enable :=
    v_grant_all
    or (
      coalesce(v_profile.is_pro, false)
      and (
        v_profile.pro_expires_at is null
        or v_profile.pro_expires_at > coalesce(p_effective_at, timezone('utc', now()))
      )
    );

  if v_grant_all then
    v_source := 'global_grant';
  elsif coalesce(v_profile.is_pro, false) and coalesce(v_profile.trial_used, false) then
    v_source := 'trial';
  elsif coalesce(v_profile.is_pro, false) then
    v_source := 'manual';
  end if;

  select
    history.id,
    history.status,
    history.source
  into v_current
  from public.pro_status_history history
  where history.user_id = p_user_id
    and history.ended_at is null
  order by history.started_at desc, history.created_at desc
  limit 1;

  if v_should_enable then
    if v_current.id is not null and v_current.status = 'enabled' and v_current.source = v_source then
      return;
    end if;

    if v_current.id is not null then
      update public.pro_status_history
      set ended_at = coalesce(p_effective_at, timezone('utc', now()))
      where id = v_current.id
        and ended_at is null;
    end if;

    insert into public.pro_status_history (
      user_id,
      status,
      source,
      started_at,
      context
    )
    values (
      p_user_id,
      'enabled',
      v_source,
      coalesce(p_effective_at, timezone('utc', now())),
      coalesce(p_context, '{}'::jsonb)
    );

    return;
  end if;

  if v_current.id is not null then
    update public.pro_status_history
    set ended_at = coalesce(p_effective_at, timezone('utc', now()))
    where id = v_current.id
      and ended_at is null;

    insert into public.pro_status_history (
      user_id,
      status,
      source,
      started_at,
      context
    )
    values (
      p_user_id,
      'disabled',
      coalesce(v_current.source, 'manual'),
      coalesce(p_effective_at, timezone('utc', now())),
      coalesce(p_context, '{}'::jsonb)
    );
  end if;
end;
$$;

revoke all on function public.sync_pro_status_history_for_user(uuid, timestamptz, jsonb) from public;
grant execute on function public.sync_pro_status_history_for_user(uuid, timestamptz, jsonb) to authenticated;

create or replace function public.handle_profiles_pro_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_pro_status_history_for_user(
    new.user_id,
    timezone('utc', now()),
    jsonb_build_object(
      'source', 'profiles_trigger',
      'is_pro', new.is_pro,
      'pro_expires_at', new.pro_expires_at,
      'trial_used', new.trial_used
    )
  );
  return new;
end;
$$;

drop trigger if exists profiles_sync_pro_status_history on public.profiles;
create trigger profiles_sync_pro_status_history
after insert or update of is_pro, pro_expires_at, trial_used on public.profiles
for each row
execute function public.handle_profiles_pro_status_history();

create or replace function public.handle_app_config_pro_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.grant_pro_to_all_users, false) is distinct from coalesce(new.grant_pro_to_all_users, false) then
    perform public.sync_pro_status_history_for_user(
      profile.user_id,
      timezone('utc', now()),
      jsonb_build_object(
        'source', 'app_config_trigger',
        'grant_pro_to_all_users', new.grant_pro_to_all_users
      )
    )
    from public.profiles profile;
  end if;

  return new;
end;
$$;

drop trigger if exists app_config_sync_pro_status_history on public.app_config;
create trigger app_config_sync_pro_status_history
after update of grant_pro_to_all_users on public.app_config
for each row
execute function public.handle_app_config_pro_status_history();

select public.sync_pro_status_history_for_user(
  profile.user_id,
  timezone('utc', now()),
  jsonb_build_object('source', 'stage2_migration_snapshot')
)
from public.profiles profile;

create or replace view public.dashboard_product_events_enriched as
select
  event.id,
  event.user_id,
  event.event_name,
  event.event_category,
  public.dashboard_normalize_platform(event.platform) as platform,
  nullif(trim(coalesce(event.app_version, '')), '') as app_version,
  nullif(trim(coalesce(event.app_build_number, '')), '') as app_build_number,
  nullif(trim(coalesce(event.os_version, '')), '') as os_version,
  nullif(trim(coalesce(event.device_model, '')), '') as device_model,
  nullif(trim(coalesce(event.session_id, '')), '') as session_id,
  event.occurred_at,
  event.created_at,
  event.occurred_at::date as occurred_on,
  coalesce(nullif(trim(event.region), ''), nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') as region,
  coalesce(nullif(trim(event.game_type), ''), nullif(trim(game.slug), ''), 'unknown') as game_type,
  event.related_entity_id,
  nullif(trim(coalesce(event.screen_name, '')), '') as screen_name,
  nullif(trim(coalesce(event.acquisition_source, '')), '') as acquisition_source,
  event.context
from public.product_events event
left join public.profiles profile
  on profile.user_id = event.user_id
left join public.meetup_posts meetup
  on meetup.id = event.related_entity_id
left join public.formats format
  on format.id = meetup.desired_format_id
left join public.games game
  on game.id = format.game_id;

grant select on public.dashboard_product_events_enriched to authenticated;

create or replace function public.dashboard_product_metadata_stage1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_regions jsonb;
  v_games jsonb;
  v_feedback_platforms jsonb;
  v_push_platforms jsonb;
  v_versions jsonb;
  v_known_push_users integer;
  v_total_push_users integer;
begin
  perform public.assert_dashboard_access();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', region_name,
        'value', region_name
      )
      order by region_name
    ),
    '[]'::jsonb
  )
  into v_regions
  from (
    select distinct region_name
    from (
      select nullif(trim(neighborhood), '') as region_name
      from public.profiles
      union
      select nullif(trim(neighborhood), '') as region_name
      from public.venues
    ) regions
    where region_name is not null
    order by region_name
    limit 60
  ) distinct_regions;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', game.id,
        'slug', game.slug,
        'name', game.name
      )
      order by game.name
    ),
    '[]'::jsonb
  )
  into v_games
  from public.games game;

  select coalesce(
    jsonb_agg(to_jsonb(platform_name) order by platform_name),
    '[]'::jsonb
  )
  into v_feedback_platforms
  from (
    select distinct public.dashboard_normalize_platform(feedback.platform) as platform_name
    from public.app_feedback feedback
    where public.dashboard_normalize_platform(feedback.platform) is not null
  ) feedback_platforms;

  select coalesce(
    jsonb_agg(to_jsonb(platform_name) order by platform_name),
    '[]'::jsonb
  )
  into v_push_platforms
  from (
    select distinct public.dashboard_normalize_platform(device.platform) as platform_name
    from public.push_devices device
    where public.dashboard_normalize_platform(device.platform) is not null
  ) push_platforms;

  select coalesce(
    jsonb_agg(to_jsonb(app_version) order by app_version desc),
    '[]'::jsonb
  )
  into v_versions
  from (
    select distinct nullif(trim(feedback.app_version), '') as app_version
    from public.app_feedback feedback
    where nullif(trim(feedback.app_version), '') is not null
    order by app_version desc
    limit 12
  ) versions;

  with latest_active_device as (
    select distinct on (device.user_id)
      device.user_id,
      public.dashboard_normalize_platform(device.platform) as platform_name
    from public.push_devices device
    where device.is_active = true
    order by
      device.user_id,
      coalesce(device.last_seen_at, device.updated_at, device.created_at) desc,
      device.created_at desc
  )
  select
    count(*) filter (where platform_name in ('ios', 'android'))::integer,
    count(*)::integer
  into v_known_push_users, v_total_push_users
  from latest_active_device;

  return jsonb_build_object(
    'filters', jsonb_build_object(
      'period_options', jsonb_build_array(7, 30, 90, 365),
      'feedback_types', jsonb_build_array('bug', 'suggestion', 'praise', 'question'),
      'pro_status_options', jsonb_build_array('all', 'pro', 'non_pro'),
      'games', v_games,
      'regions', v_regions,
      'platform_options', jsonb_build_array('all', 'ios', 'android')
    ),
    'platform_tracking', jsonb_build_object(
      'feedback_platforms', v_feedback_platforms,
      'push_device_platforms', v_push_platforms,
      'app_versions_seen_in_feedback', v_versions,
      'can_segment_feedback_directly', true,
      'can_segment_users_directly', false,
      'can_segment_meetups_directly', false,
      'can_segment_pro_directly', false,
      'known_user_platform_source', 'push_devices_last_seen',
      'known_user_platform_coverage', jsonb_build_object(
        'known_users', coalesce(v_known_push_users, 0),
        'users_with_active_device', coalesce(v_total_push_users, 0)
      )
    ),
    'notes', jsonb_build_array(
      'Feedback usa plataforma direta vinda do app_feedback.',
      'Usuarios, meetups e Pro ainda nao possuem plataforma estruturada diretamente na modelagem principal.',
      'Push devices podem indicar plataforma conhecida de parte da base, mas isso nao substitui instrumentacao nativa de origem por evento.'
    )
  );
end;
$$;

revoke all on function public.dashboard_product_metadata_stage1() from public;
grant execute on function public.dashboard_product_metadata_stage1() to authenticated;

create or replace function public.dashboard_product_metadata()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_app_versions jsonb;
  v_event_names jsonb;
begin
  perform public.assert_dashboard_access();

  v_base := public.dashboard_product_metadata_stage1();

  select coalesce(
    jsonb_agg(to_jsonb(app_version) order by app_version desc),
    '[]'::jsonb
  )
  into v_app_versions
  from (
    select distinct app_version
    from public.dashboard_product_events_enriched
    where app_version is not null
    order by app_version desc
    limit 20
  ) versions;

  select coalesce(
    jsonb_agg(to_jsonb(event_name) order by event_name),
    '[]'::jsonb
  )
  into v_event_names
  from (
    select distinct event_name
    from public.dashboard_product_events_enriched
    order by event_name
  ) event_names;

  return jsonb_set(
    jsonb_set(
      jsonb_set(
        v_base,
        '{filters,app_versions}',
        v_app_versions,
        true
      ),
      '{filters,event_names}',
      v_event_names,
      true
    ),
    '{tracking_stage}',
    jsonb_build_object(
      'stage', 2,
      'advanced_analytics_enabled', true,
      'retention_depends_on_event_accumulation', true,
      'platform_segmentation_source', 'product_events'
    ),
    true
  );
end;
$$;

revoke all on function public.dashboard_product_metadata() from public;
grant execute on function public.dashboard_product_metadata() to authenticated;

create or replace function public.dashboard_product_advanced_metrics(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null,
  p_event_name text default null,
  p_region text default null,
  p_game_type text default null,
  p_pro_status text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 7);
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  v_event_name text := nullif(trim(coalesce(p_event_name, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_game_type text := nullif(trim(coalesce(p_game_type, '')), '');
  v_pro_status text := lower(trim(coalesce(p_pro_status, 'all')));
begin
  perform public.assert_dashboard_access();

  if v_platform = 'all' then
    v_platform := null;
  end if;

  if v_app_version = 'all' then
    v_app_version := null;
  end if;

  if v_event_name = 'all' then
    v_event_name := null;
  end if;

  if v_pro_status not in ('all', 'pro', 'non_pro') then
    v_pro_status := 'all';
  end if;

  return (
    with config as (
      select coalesce(
        (
          select app_config.grant_pro_to_all_users
          from public.app_config app_config
          where app_config.singleton_key = 1
        ),
        false
      ) as grant_pro_all
    ),
    current_users as (
      select
        profile.user_id,
        coalesce(nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') as region_name,
        (
          config.grant_pro_all
          or (
            profile.is_pro
            and (
              profile.pro_expires_at is null
              or profile.pro_expires_at > timezone('utc', now())
            )
          )
        ) as is_pro_effective
      from public.profiles profile
      cross join config
    ),
    filtered_events as (
      select event.*
      from public.dashboard_product_events_enriched event
      left join current_users user_state
        on user_state.user_id = event.user_id
      where
        event.occurred_at >= timezone('utc', now()) - make_interval(days => v_days)
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
        and (v_event_name is null or event.event_name = v_event_name)
        and (v_region is null or event.region = v_region)
        and (v_game_type is null or event.game_type = v_game_type)
        and (
          v_pro_status = 'all'
          or (v_pro_status = 'pro' and coalesce(user_state.is_pro_effective, false) = true)
          or (v_pro_status = 'non_pro' and coalesce(user_state.is_pro_effective, false) = false)
        )
    ),
    active_users as (
      select
        count(distinct event.user_id) filter (
          where event.user_id is not null
            and event.occurred_at >= timezone('utc', now()) - interval '1 day'
        )::integer as dau,
        count(distinct event.user_id) filter (
          where event.user_id is not null
            and event.occurred_at >= timezone('utc', now()) - interval '7 days'
        )::integer as wau,
        count(distinct event.user_id) filter (
          where event.user_id is not null
            and event.occurred_at >= timezone('utc', now()) - interval '30 days'
        )::integer as mau
      from public.dashboard_product_events_enriched event
      left join current_users user_state
        on user_state.user_id = event.user_id
      where
        event.occurred_at >= timezone('utc', now()) - interval '30 days'
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
        and (v_region is null or event.region = v_region)
        and (v_game_type is null or event.game_type = v_game_type)
        and (
          v_pro_status = 'all'
          or (v_pro_status = 'pro' and coalesce(user_state.is_pro_effective, false) = true)
          or (v_pro_status = 'non_pro' and coalesce(user_state.is_pro_effective, false) = false)
        )
    ),
    feature_activity as (
      select
        event.event_name,
        event.event_category,
        count(*)::integer as total_events,
        count(distinct event.user_id)::integer as unique_users
      from filtered_events event
      group by event.event_name, event.event_category
      order by total_events desc, event.event_name asc
      limit 15
    ),
    platform_rollup as (
      select
        coalesce(event.platform, 'unknown') as platform_name,
        count(*)::integer as total_events,
        count(distinct event.user_id)::integer as active_users,
        count(*) filter (where event.event_name = 'signup_completed')::integer as signups,
        count(*) filter (where event.event_name = 'game_created')::integer as games_created,
        count(*) filter (where event.event_name = 'feedback_submitted')::integer as feedback_submitted
      from filtered_events event
      group by coalesce(event.platform, 'unknown')
      order by total_events desc, platform_name asc
    ),
    version_rollup as (
      select
        coalesce(event.app_version, 'Sem versao') as app_version,
        count(*)::integer as total_events,
        count(distinct event.user_id)::integer as active_users,
        count(*) filter (where event.event_name = 'signup_completed')::integer as signups,
        count(*) filter (where event.event_name = 'game_created')::integer as games_created,
        count(*) filter (
          where event.event_name = 'feedback_submitted'
            and coalesce(event.context ->> 'feedback_type', '') = 'bug'
        )::integer as bug_feedbacks
      from filtered_events event
      group by coalesce(event.app_version, 'Sem versao')
      order by total_events desc, app_version asc
      limit 10
    ),
    liquidity_rollup as (
      select
        event.region,
        count(*) filter (where event.event_name = 'game_created')::integer as games_created,
        count(*) filter (where event.event_name = 'game_join_intent_registered')::integer as join_intents,
        count(distinct event.user_id) filter (
          where event.event_name in ('map_viewed', 'game_details_viewed', 'game_list_viewed')
        )::integer as engaged_users
      from filtered_events event
      group by event.region
      order by games_created desc, join_intents desc, event.region asc
      limit 12
    ),
    pro_timeline as (
      select
        date_trunc('month', history.started_at) as bucket_start,
        count(*) filter (where history.status = 'enabled')::integer as pro_enabled,
        count(*) filter (where history.status = 'disabled')::integer as pro_disabled
      from public.pro_status_history history
      where history.started_at >= date_trunc('month', timezone('utc', now())) - interval '11 months'
      group by date_trunc('month', history.started_at)
      order by bucket_start
    )
    select jsonb_build_object(
      'overview', (
        select jsonb_build_object(
          'dau', dau,
          'wau', wau,
          'mau', mau,
          'stickiness',
          case
            when mau = 0 then 0
            else round((dau::numeric / mau::numeric) * 100.0, 2)
          end,
          'window_days', v_days,
          'tracked_events_in_window', coalesce((select count(*)::integer from filtered_events), 0),
          'tracked_users_in_window', coalesce((select count(distinct user_id)::integer from filtered_events where user_id is not null), 0)
        )
        from active_users
      ),
      'feature_activity', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'event_name', event_name,
              'event_category', event_category,
              'total_events', total_events,
              'unique_users', unique_users
            )
            order by total_events desc, event_name asc
          ),
          '[]'::jsonb
        )
        from feature_activity
      ),
      'platform_comparison', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'platform', platform_name,
              'total_events', total_events,
              'active_users', active_users,
              'signups', signups,
              'games_created', games_created,
              'feedback_submitted', feedback_submitted
            )
            order by total_events desc, platform_name asc
          ),
          '[]'::jsonb
        )
        from platform_rollup
      ),
      'version_comparison', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'app_version', app_version,
              'total_events', total_events,
              'active_users', active_users,
              'signups', signups,
              'games_created', games_created,
              'bug_feedbacks', bug_feedbacks
            )
            order by total_events desc, app_version asc
          ),
          '[]'::jsonb
        )
        from version_rollup
      ),
      'liquidity', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'region', region,
              'games_created', games_created,
              'join_intents', join_intents,
              'engaged_users', engaged_users,
              'join_intents_per_game',
              case
                when games_created = 0 then null
                else round((join_intents::numeric / games_created::numeric), 2)
              end
            )
            order by games_created desc, join_intents desc, region asc
          ),
          '[]'::jsonb
        )
        from liquidity_rollup
      ),
      'pro_history', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              'pro_enabled', pro_enabled,
              'pro_disabled', pro_disabled
            )
            order by bucket_start
          ),
          '[]'::jsonb
        )
        from pro_timeline
      ),
      'quality', jsonb_build_object(
        'retention_depends_on_signup_events', true,
        'official_platform_segmentation', true,
        'official_app_version_segmentation', true
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_advanced_metrics(integer, text, text, text, text, text, text) from public;
grant execute on function public.dashboard_product_advanced_metrics(integer, text, text, text, text, text, text) to authenticated;

create or replace function public.dashboard_product_funnel(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 7);
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
begin
  perform public.assert_dashboard_access();

  if v_platform = 'all' then
    v_platform := null;
  end if;

  if v_app_version = 'all' then
    v_app_version := null;
  end if;

  return (
    with filtered_events as (
      select event.*
      from public.dashboard_product_events_enriched event
      where
        event.occurred_at >= timezone('utc', now()) - make_interval(days => v_days)
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
        and event.user_id is not null
    ),
    funnel_steps as (
      select 1 as step_order, 'signup_completed'::text as event_name, 'Signup completed'::text as label
      union all
      select 2, 'profile_completed', 'Profile completed'
      union all
      select 3, 'map_viewed', 'Map viewed'
      union all
      select 4, 'first_game_viewed', 'First game viewed'
      union all
      select 5, 'first_game_created', 'First game created'
    ),
    per_step as (
      select
        step.step_order,
        step.event_name,
        step.label,
        count(distinct event.user_id)::integer as users_count
      from funnel_steps step
      left join filtered_events event
        on event.event_name = step.event_name
      group by step.step_order, step.event_name, step.label
      order by step.step_order
    ),
    per_step_enriched as (
      select
        step_order,
        event_name,
        label,
        users_count,
        lag(users_count) over (order by step_order) as previous_users_count
      from per_step
    )
    select jsonb_build_object(
      'window_days', v_days,
      'steps', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'step_order', step_order,
              'event_name', event_name,
              'label', label,
              'users_count', users_count,
              'conversion_from_previous',
              case
                when previous_users_count is null then 100
                when previous_users_count = 0 then null
                else round((users_count::numeric / previous_users_count::numeric) * 100.0, 2)
              end
            )
            order by step_order
          ),
          '[]'::jsonb
        )
        from per_step_enriched
      ),
      'quality', jsonb_build_object(
        'depends_on_accumulated_product_events', true
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_funnel(integer, text, text) from public;
grant execute on function public.dashboard_product_funnel(integer, text, text) to authenticated;

create or replace function public.dashboard_product_retention(
  p_platform text default null,
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
begin
  perform public.assert_dashboard_access();

  if v_platform = 'all' then
    v_platform := null;
  end if;

  if v_app_version = 'all' then
    v_app_version := null;
  end if;

  return (
    with signup_events as (
      select
        event.user_id,
        min(event.occurred_on) as signup_day,
        min(event.platform) as signup_platform,
        min(event.app_version) as signup_app_version
      from public.dashboard_product_events_enriched event
      where event.event_name = 'signup_completed'
        and event.user_id is not null
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
      group by event.user_id
    ),
    activity_days as (
      select distinct
        event.user_id,
        event.occurred_on
      from public.dashboard_product_events_enriched event
      where event.user_id is not null
    ),
    retention_base as (
      select
        signup.user_id,
        signup.signup_day,
        date_trunc('month', signup.signup_day)::date as cohort_month,
        (current_date - signup.signup_day) >= 1 as eligible_d1,
        (current_date - signup.signup_day) >= 7 as eligible_d7,
        (current_date - signup.signup_day) >= 30 as eligible_d30,
        exists (
          select 1
          from activity_days activity
          where activity.user_id = signup.user_id
            and activity.occurred_on = signup.signup_day + 1
        ) as retained_d1,
        exists (
          select 1
          from activity_days activity
          where activity.user_id = signup.user_id
            and activity.occurred_on = signup.signup_day + 7
        ) as retained_d7,
        exists (
          select 1
          from activity_days activity
          where activity.user_id = signup.user_id
            and activity.occurred_on = signup.signup_day + 30
        ) as retained_d30
      from signup_events signup
    ),
    monthly_cohorts as (
      select
        cohort_month,
        count(*)::integer as cohort_size,
        count(*) filter (where eligible_d1 and retained_d1)::integer as retained_d1,
        count(*) filter (where eligible_d7 and retained_d7)::integer as retained_d7,
        count(*) filter (where eligible_d30 and retained_d30)::integer as retained_d30,
        count(*) filter (where eligible_d1)::integer as eligible_d1,
        count(*) filter (where eligible_d7)::integer as eligible_d7,
        count(*) filter (where eligible_d30)::integer as eligible_d30
      from retention_base
      group by cohort_month
      order by cohort_month desc
      limit 8
    ),
    overall as (
      select
        count(*) filter (where eligible_d1 and retained_d1)::integer as retained_d1,
        count(*) filter (where eligible_d7 and retained_d7)::integer as retained_d7,
        count(*) filter (where eligible_d30 and retained_d30)::integer as retained_d30,
        count(*) filter (where eligible_d1)::integer as eligible_d1,
        count(*) filter (where eligible_d7)::integer as eligible_d7,
        count(*) filter (where eligible_d30)::integer as eligible_d30
      from retention_base
    )
    select jsonb_build_object(
      'overall', (
        select jsonb_build_object(
          'd1',
          case when eligible_d1 = 0 then null else round((retained_d1::numeric / eligible_d1::numeric) * 100.0, 2) end,
          'd7',
          case when eligible_d7 = 0 then null else round((retained_d7::numeric / eligible_d7::numeric) * 100.0, 2) end,
          'd30',
          case when eligible_d30 = 0 then null else round((retained_d30::numeric / eligible_d30::numeric) * 100.0, 2) end,
          'eligible_d1', eligible_d1,
          'eligible_d7', eligible_d7,
          'eligible_d30', eligible_d30
        )
        from overall
      ),
      'cohorts', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'cohort_month', to_char(cohort_month, 'YYYY-MM-01'),
              'cohort_size', cohort_size,
              'd1',
              case when eligible_d1 = 0 then null else round((retained_d1::numeric / eligible_d1::numeric) * 100.0, 2) end,
              'd7',
              case when eligible_d7 = 0 then null else round((retained_d7::numeric / eligible_d7::numeric) * 100.0, 2) end,
              'd30',
              case when eligible_d30 = 0 then null else round((retained_d30::numeric / eligible_d30::numeric) * 100.0, 2) end,
              'eligible_d1', eligible_d1,
              'eligible_d7', eligible_d7,
              'eligible_d30', eligible_d30
            )
            order by cohort_month desc
          ),
          '[]'::jsonb
        )
        from monthly_cohorts
      ),
      'quality', jsonb_build_object(
        'retention_depends_on_signup_accumulation', true
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_retention(text, text) from public;
grant execute on function public.dashboard_product_retention(text, text) to authenticated;

create or replace function public.dashboard_product_alerts(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null,
  p_region text default null,
  p_game_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 120), 14);
  v_half integer := greatest(floor(v_days / 2.0)::integer, 7);
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_game_type text := nullif(trim(coalesce(p_game_type, '')), '');
begin
  perform public.assert_dashboard_access();

  if v_platform = 'all' then
    v_platform := null;
  end if;

  if v_app_version = 'all' then
    v_app_version := null;
  end if;

  return (
    with filtered_events as (
      select event.*
      from public.dashboard_product_events_enriched event
      where
        event.occurred_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
        and (v_region is null or event.region = v_region)
        and (v_game_type is null or event.game_type = v_game_type)
    ),
    event_comparison as (
      select
        count(*) filter (
          where event_name = 'signup_completed'
            and occurred_at >= timezone('utc', now()) - make_interval(days => v_half)
        )::integer as signups_current,
        count(*) filter (
          where event_name = 'signup_completed'
            and occurred_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
            and occurred_at < timezone('utc', now()) - make_interval(days => v_half)
        )::integer as signups_previous,
        count(distinct user_id) filter (
          where occurred_at >= timezone('utc', now()) - make_interval(days => v_half)
            and user_id is not null
        )::integer as active_users_current,
        count(distinct user_id) filter (
          where occurred_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
            and occurred_at < timezone('utc', now()) - make_interval(days => v_half)
            and user_id is not null
        )::integer as active_users_previous,
        count(*) filter (
          where event_name = 'game_created'
            and occurred_at >= timezone('utc', now()) - make_interval(days => v_half)
        )::integer as games_created_current,
        count(*) filter (
          where event_name = 'game_created'
            and occurred_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
            and occurred_at < timezone('utc', now()) - make_interval(days => v_half)
        )::integer as games_created_previous
      from filtered_events
    ),
    bug_comparison as (
      select
        count(*) filter (
          where feedback.created_at >= timezone('utc', now()) - make_interval(days => v_half)
            and feedback.feedback_type = 'bug'
            and (v_platform is null or public.dashboard_normalize_platform(feedback.platform) = v_platform)
            and (v_app_version is null or nullif(trim(feedback.app_version), '') = v_app_version)
        )::integer as bug_current,
        count(*) filter (
          where feedback.created_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
            and feedback.created_at < timezone('utc', now()) - make_interval(days => v_half)
            and feedback.feedback_type = 'bug'
            and (v_platform is null or public.dashboard_normalize_platform(feedback.platform) = v_platform)
            and (v_app_version is null or nullif(trim(feedback.app_version), '') = v_app_version)
        )::integer as bug_previous
      from public.app_feedback feedback
    ),
    liquidity_regions as (
      select
        event.region,
        count(*) filter (where event.event_name = 'game_created')::integer as games_created,
        count(*) filter (where event.event_name = 'game_join_intent_registered')::integer as join_intents
      from filtered_events event
      where event.occurred_at >= timezone('utc', now()) - make_interval(days => v_half)
      group by event.region
      having count(*) filter (where event.event_name = 'game_created') >= 3
    ),
    platform_spread as (
      select
        platform,
        count(distinct user_id)::integer as active_users
      from filtered_events
      where occurred_at >= timezone('utc', now()) - make_interval(days => v_half)
        and platform in ('ios', 'android')
      group by platform
    ),
    problematic_versions as (
      select
        coalesce(app_version, 'Sem versao') as app_version,
        count(*) filter (
          where event_name = 'feedback_submitted'
            and coalesce(context ->> 'feedback_type', '') = 'bug'
        )::integer as bug_feedbacks,
        count(*) filter (where event_name = 'app_opened')::integer as app_opens
      from filtered_events
      group by coalesce(app_version, 'Sem versao')
      having count(*) filter (
          where event_name = 'feedback_submitted'
            and coalesce(context ->> 'feedback_type', '') = 'bug'
        ) >= 3
    )
    select jsonb_build_object(
      'alerts', (
        select coalesce(
          jsonb_agg(alert_obj order by (alert_obj ->> 'severity') desc),
          '[]'::jsonb
        )
        from (
          select jsonb_build_object(
            'severity', 'high',
            'type', 'new_users_drop',
            'title', 'Queda brusca de novos usuarios',
            'description', format(
              'Janela atual: %s. Janela anterior: %s.',
              signups_current,
              signups_previous
            )
          ) as alert_obj
          from event_comparison
          where signups_previous >= 5
            and signups_current < signups_previous * 0.7

          union all

          select jsonb_build_object(
            'severity', 'high',
            'type', 'activity_drop',
            'title', 'Queda de atividade',
            'description', format(
              'Usuarios ativos: %s vs %s no periodo anterior.',
              active_users_current,
              active_users_previous
            )
          )
          from event_comparison
          where active_users_previous >= 8
            and active_users_current < active_users_previous * 0.75

          union all

          select jsonb_build_object(
            'severity', 'high',
            'type', 'game_creation_drop',
            'title', 'Queda de criacao de partidas',
            'description', format(
              'Partidas criadas: %s vs %s no periodo anterior.',
              games_created_current,
              games_created_previous
            )
          )
          from event_comparison
          where games_created_previous >= 5
            and games_created_current < games_created_previous * 0.75

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'bug_spike',
            'title', 'Aumento de bugs reportados',
            'description', format(
              'Bugs no feedback: %s vs %s no periodo anterior.',
              bug_current,
              bug_previous
            )
          )
          from bug_comparison
          where bug_previous >= 2
            and bug_current > bug_previous * 1.4

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'low_liquidity_region',
            'title', 'Baixa liquidez em regiao relevante',
            'description', format(
              '%s tem %s partidas criadas e %s intencoes de entrada na janela recente.',
              region,
              games_created,
              join_intents
            )
          )
          from liquidity_regions
          where games_created >= 3
            and (join_intents::numeric / greatest(games_created, 1)::numeric) < 0.5

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'platform_discrepancy',
            'title', 'Discrepancia relevante entre iOS e Android',
            'description', format(
              'Ativos iOS: %s. Ativos Android: %s.',
              coalesce((select active_users from platform_spread where platform = 'ios'), 0),
              coalesce((select active_users from platform_spread where platform = 'android'), 0)
            )
          )
          where exists (select 1 from platform_spread where platform = 'ios')
            and exists (select 1 from platform_spread where platform = 'android')
            and abs(
              coalesce((select active_users from platform_spread where platform = 'ios'), 0)
              - coalesce((select active_users from platform_spread where platform = 'android'), 0)
            ) >= 10

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'version_issue',
            'title', 'Problema concentrado em versao especifica',
            'description', format(
              'Versao %s com %s bugs reportados para %s app opens.',
              app_version,
              bug_feedbacks,
              app_opens
            )
          )
          from problematic_versions
          where app_opens >= 5
            and (bug_feedbacks::numeric / greatest(app_opens, 1)::numeric) > 0.25
        ) alerts
      ),
      'quality', jsonb_build_object(
        'alerts_are_rule_based', true,
        'window_days', v_days
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_alerts(integer, text, text, text, text) from public;
grant execute on function public.dashboard_product_alerts(integer, text, text, text, text) to authenticated;

create or replace function public.start_pro_trial()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set is_pro = false
  where user_id = auth.uid()
    and is_pro = true
    and pro_expires_at is not null
    and pro_expires_at <= timezone('utc', now());

  if (select trial_used from public.profiles where user_id = auth.uid()) then
    raise exception 'trial_already_used';
  end if;

  update public.profiles
  set
    is_pro = true,
    pro_expires_at = timezone('utc', now()) + interval '7 days',
    trial_used = true
  where user_id = auth.uid();

  perform public.sync_pro_status_history_for_user(
    auth.uid(),
    timezone('utc', now()),
    jsonb_build_object('source', 'start_pro_trial')
  );
end;
$$;

revoke all on function public.start_pro_trial() from public;
grant execute on function public.start_pro_trial() to authenticated;

create or replace function public.dashboard_product_feedback(
  p_days integer,
  p_feedback_type text,
  p_platform text,
  p_app_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 7);
  v_feedback_type text := nullif(trim(coalesce(p_feedback_type, '')), '');
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
begin
  perform public.assert_dashboard_access();

  if v_platform = 'all' then
    v_platform := null;
  end if;

  if v_app_version = 'all' then
    v_app_version := null;
  end if;

  return (
    with filtered_feedback as (
      select
        feedback.id,
        feedback.feedback_type,
        feedback.message,
        nullif(trim(feedback.app_area), '') as app_area,
        nullif(trim(feedback.app_version), '') as app_version,
        public.dashboard_normalize_platform(feedback.platform) as platform_name,
        feedback.created_at
      from public.app_feedback feedback
      where
        (v_feedback_type is null or feedback.feedback_type = v_feedback_type)
        and (v_platform is null or public.dashboard_normalize_platform(feedback.platform) = v_platform)
        and (v_app_version is null or nullif(trim(feedback.app_version), '') = v_app_version)
    ),
    period_feedback as (
      select *
      from filtered_feedback
      where created_at >= timezone('utc', now()) - make_interval(days => v_days)
    ),
    by_type_all as (
      select
        feedback_type,
        count(*)::integer as total_feedbacks
      from filtered_feedback
      group by feedback_type
      order by feedback_type
    ),
    by_platform_filtered as (
      select
        coalesce(platform_name, 'unknown') as platform_name,
        count(*)::integer as total_feedbacks
      from filtered_feedback
      group by 1
    ),
    daily_range as (
      select generate_series(
        date_trunc('day', timezone('utc', now())) - ((v_days - 1) * interval '1 day'),
        date_trunc('day', timezone('utc', now())),
        interval '1 day'
      ) as bucket_start
    ),
    daily_rollup as (
      select
        range.bucket_start,
        count(period_feedback.id)::integer as total_feedbacks,
        count(*) filter (where period_feedback.platform_name = 'ios')::integer as ios_feedbacks,
        count(*) filter (where period_feedback.platform_name = 'android')::integer as android_feedbacks,
        count(*) filter (
          where period_feedback.platform_name is null
            or period_feedback.platform_name not in ('ios', 'android')
        )::integer as other_feedbacks
      from daily_range range
      left join period_feedback
        on period_feedback.created_at >= range.bucket_start
        and period_feedback.created_at < range.bucket_start + interval '1 day'
      group by range.bucket_start
      order by range.bucket_start
    ),
    recent_feedback as (
      select
        id,
        feedback_type,
        message,
        app_area,
        app_version,
        coalesce(platform_name, 'unknown') as platform_name,
        created_at
      from filtered_feedback
      order by created_at desc
      limit 40
    )
    select jsonb_build_object(
      'window_days', v_days,
      'totals', jsonb_build_object(
        'all_time', (select count(*)::integer from filtered_feedback),
        'selected_period', (select count(*)::integer from period_feedback)
      ),
      'by_type', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'feedback_type', feedback_type,
              'total', total_feedbacks
            )
            order by feedback_type
          ),
          '[]'::jsonb
        )
        from by_type_all
      ),
      'by_platform', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'platform', platform_name,
              'total', total_feedbacks
            )
            order by platform_name
          ),
          '[]'::jsonb
        )
        from by_platform_filtered
      ),
      'timeline', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              'total', total_feedbacks,
              'ios', ios_feedbacks,
              'android', android_feedbacks,
              'other', other_feedbacks
            )
            order by bucket_start
          ),
          '[]'::jsonb
        )
        from daily_rollup
      ),
      'recent_feedback', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'feedback_type', feedback_type,
              'message', message,
              'app_area', app_area,
              'app_version', app_version,
              'platform', platform_name,
              'created_at', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            )
            order by created_at desc
          ),
          '[]'::jsonb
        )
        from recent_feedback
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_supported', true,
        'app_version_available', true
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_feedback(integer, text, text, text) from public;
grant execute on function public.dashboard_product_feedback(integer, text, text, text) to authenticated;
