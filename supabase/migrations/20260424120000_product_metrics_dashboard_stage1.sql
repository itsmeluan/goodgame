create table if not exists public.dashboard_admin_users (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.dashboard_admin_users is
  'Allowlist de usuarios com acesso ao dashboard de metricas do produto.';

alter table public.dashboard_admin_users enable row level security;

create or replace function public.dashboard_normalize_platform(p_platform text)
returns text
language plpgsql
immutable
as $$
declare
  v_platform text := lower(trim(coalesce(p_platform, '')));
begin
  if v_platform = '' then
    return null;
  end if;

  if v_platform like 'ios%' or v_platform in ('iphone', 'iphoneos') then
    return 'ios';
  end if;

  if v_platform like 'android%' then
    return 'android';
  end if;

  return v_platform;
end;
$$;

create or replace function public.assert_dashboard_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'dashboard_not_authenticated';
  end if;

  if not exists (
    select 1
    from public.dashboard_admin_users admin_user
    where admin_user.user_id = auth.uid()
  ) then
    raise exception 'dashboard_forbidden';
  end if;
end;
$$;

revoke all on function public.assert_dashboard_access() from public;
grant execute on function public.assert_dashboard_access() to authenticated;

create or replace function public.dashboard_product_metadata()
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

revoke all on function public.dashboard_product_metadata() from public;
grant execute on function public.dashboard_product_metadata() to authenticated;

create or replace function public.dashboard_product_summary(
  p_game_slug text default null,
  p_region text default null,
  p_pro_status text default 'all',
  p_feedback_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_slug text := nullif(trim(coalesce(p_game_slug, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_pro_status text := lower(trim(coalesce(p_pro_status, 'all')));
  v_feedback_type text := nullif(trim(coalesce(p_feedback_type, '')), '');
begin
  perform public.assert_dashboard_access();

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
    filtered_users as (
      select
        profile.user_id,
        profile.created_at,
        profile.neighborhood,
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
      where
        (
          v_region is null
          or coalesce(nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') = v_region
        )
        and (
          v_game_slug is null
          or exists (
            select 1
            from public.player_games player_game
            join public.games game
              on game.id = player_game.game_id
            where player_game.player_id = profile.user_id
              and game.slug = v_game_slug
          )
        )
    ),
    scoped_users as (
      select *
      from filtered_users
      where
        v_pro_status = 'all'
        or (v_pro_status = 'pro' and is_pro_effective = true)
        or (v_pro_status = 'non_pro' and is_pro_effective = false)
    ),
    filtered_meetups as (
      select
        meetup.id,
        meetup.created_at,
        meetup.status,
        meetup.expires_at
      from public.meetup_posts meetup
      left join public.formats format
        on format.id = meetup.desired_format_id
      left join public.games game
        on game.id = format.game_id
      left join public.venues venue
        on venue.id = meetup.venue_id
      left join public.profiles creator
        on creator.user_id = meetup.creator_id
      where
        (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (
          v_game_slug is null
          or game.slug = v_game_slug
        )
    ),
    feedback_all as (
      select
        count(*)::integer as total_feedbacks
      from public.app_feedback feedback
      where
        v_feedback_type is null
        or feedback.feedback_type = v_feedback_type
    ),
    feedback_by_platform as (
      select
        public.dashboard_normalize_platform(feedback.platform) as platform_name,
        count(*)::integer as total_feedbacks
      from public.app_feedback feedback
      where
        v_feedback_type is null
        or feedback.feedback_type = v_feedback_type
      group by 1
    ),
    user_stats as (
      select
        count(*)::integer as total_users,
        count(*) filter (
          where created_at >= date_trunc('day', timezone('utc', now()))
        )::integer as new_users_today,
        count(*) filter (
          where created_at >= timezone('utc', now()) - interval '7 days'
        )::integer as new_users_7d,
        count(*) filter (
          where created_at >= timezone('utc', now()) - interval '30 days'
        )::integer as new_users_30d,
        count(*) filter (where is_pro_effective = true)::integer as total_pro_users
      from scoped_users
    ),
    meetup_stats as (
      select
        count(*)::integer as total_meetups,
        count(*) filter (
          where created_at >= date_trunc('day', timezone('utc', now()))
        )::integer as meetups_today,
        count(*) filter (
          where created_at >= timezone('utc', now()) - interval '7 days'
        )::integer as meetups_7d,
        count(*) filter (
          where created_at >= timezone('utc', now()) - interval '30 days'
        )::integer as meetups_30d
      from filtered_meetups
    )
    select jsonb_build_object(
      'users', (
        select jsonb_build_object(
          'total', user_stats.total_users,
          'today', user_stats.new_users_today,
          'last_7_days', user_stats.new_users_7d,
          'last_30_days', user_stats.new_users_30d
        )
        from user_stats
      ),
      'meetups', (
        select jsonb_build_object(
          'total', meetup_stats.total_meetups,
          'today', meetup_stats.meetups_today,
          'last_7_days', meetup_stats.meetups_7d,
          'last_30_days', meetup_stats.meetups_30d
        )
        from meetup_stats
      ),
      'feedback', jsonb_build_object(
        'total', (select total_feedbacks from feedback_all),
        'by_platform', coalesce(
          (
            select jsonb_object_agg(
              coalesce(platform_name, 'unknown'),
              total_feedbacks
            )
            from feedback_by_platform
          ),
          '{}'::jsonb
        )
      ),
      'pro', (
        select jsonb_build_object(
          'total', user_stats.total_pro_users,
          'percent_of_base',
          case
            when user_stats.total_users = 0 then 0
            else round((user_stats.total_pro_users::numeric / user_stats.total_users::numeric) * 100.0, 2)
          end
        )
        from user_stats
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_users', false,
        'platform_segmentation_meetups', false,
        'platform_segmentation_feedback', true,
        'pro_is_affected_by_global_grant', coalesce(
          (
            select grant_pro_to_all_users
            from public.app_config
            where singleton_key = 1
          ),
          false
        )
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_summary(text, text, text, text) from public;
grant execute on function public.dashboard_product_summary(text, text, text, text) to authenticated;

create or replace function public.dashboard_product_growth(
  p_days integer default 90,
  p_game_slug text default null,
  p_region text default null,
  p_pro_status text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 90), 365), 7);
  v_game_slug text := nullif(trim(coalesce(p_game_slug, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
  v_pro_status text := lower(trim(coalesce(p_pro_status, 'all')));
begin
  perform public.assert_dashboard_access();

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
    filtered_users as (
      select
        profile.user_id,
        profile.created_at,
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
      where
        (
          v_region is null
          or coalesce(nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') = v_region
        )
        and (
          v_game_slug is null
          or exists (
            select 1
            from public.player_games player_game
            join public.games game
              on game.id = player_game.game_id
            where player_game.player_id = profile.user_id
              and game.slug = v_game_slug
          )
        )
    ),
    scoped_users as (
      select *
      from filtered_users
      where
        v_pro_status = 'all'
        or (v_pro_status = 'pro' and is_pro_effective = true)
        or (v_pro_status = 'non_pro' and is_pro_effective = false)
    ),
    filtered_meetups as (
      select
        meetup.id,
        meetup.created_at
      from public.meetup_posts meetup
      left join public.formats format
        on format.id = meetup.desired_format_id
      left join public.games game
        on game.id = format.game_id
      left join public.venues venue
        on venue.id = meetup.venue_id
      left join public.profiles creator
        on creator.user_id = meetup.creator_id
      where
        (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (
          v_game_slug is null
          or game.slug = v_game_slug
        )
    ),
    daily_range as (
      select generate_series(
        date_trunc('day', timezone('utc', now())) - ((v_days - 1) * interval '1 day'),
        date_trunc('day', timezone('utc', now())),
        interval '1 day'
      ) as bucket_start
    ),
    daily_users as (
      select
        range.bucket_start,
        count(scoped_user.user_id)::integer as total
      from daily_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
        and scoped_user.created_at < range.bucket_start + interval '1 day'
      group by range.bucket_start
    ),
    daily_meetups as (
      select
        range.bucket_start,
        count(meetup.id)::integer as total
      from daily_range range
      left join filtered_meetups meetup
        on meetup.created_at >= range.bucket_start
        and meetup.created_at < range.bucket_start + interval '1 day'
      group by range.bucket_start
    ),
    weekly_range as (
      select generate_series(
        date_trunc('week', timezone('utc', now())) - interval '11 weeks',
        date_trunc('week', timezone('utc', now())),
        interval '1 week'
      ) as bucket_start
    ),
    weekly_users as (
      select
        range.bucket_start,
        count(scoped_user.user_id)::integer as total
      from weekly_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
        and scoped_user.created_at < range.bucket_start + interval '1 week'
      group by range.bucket_start
    ),
    weekly_meetups as (
      select
        range.bucket_start,
        count(meetup.id)::integer as total
      from weekly_range range
      left join filtered_meetups meetup
        on meetup.created_at >= range.bucket_start
        and meetup.created_at < range.bucket_start + interval '1 week'
      group by range.bucket_start
    ),
    monthly_range as (
      select generate_series(
        date_trunc('month', timezone('utc', now())) - interval '11 months',
        date_trunc('month', timezone('utc', now())),
        interval '1 month'
      ) as bucket_start
    ),
    monthly_users as (
      select
        range.bucket_start,
        count(scoped_user.user_id)::integer as total
      from monthly_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
        and scoped_user.created_at < range.bucket_start + interval '1 month'
      group by range.bucket_start
    ),
    monthly_meetups as (
      select
        range.bucket_start,
        count(meetup.id)::integer as total
      from monthly_range range
      left join filtered_meetups meetup
        on meetup.created_at >= range.bucket_start
        and meetup.created_at < range.bucket_start + interval '1 month'
      group by range.bucket_start
    ),
    comparison_users as (
      select
        count(*) filter (
          where created_at >= timezone('utc', now()) - make_interval(days => v_days)
        )::integer as current_period,
        count(*) filter (
          where created_at >= timezone('utc', now()) - make_interval(days => (v_days * 2))
            and created_at < timezone('utc', now()) - make_interval(days => v_days)
        )::integer as previous_period
      from scoped_users
    ),
    comparison_meetups as (
      select
        count(*) filter (
          where created_at >= timezone('utc', now()) - make_interval(days => v_days)
        )::integer as current_period,
        count(*) filter (
          where created_at >= timezone('utc', now()) - make_interval(days => (v_days * 2))
            and created_at < timezone('utc', now()) - make_interval(days => v_days)
        )::integer as previous_period
      from filtered_meetups
    )
    select jsonb_build_object(
      'days', v_days,
      'users', jsonb_build_object(
        'daily', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from daily_users
        ),
        'weekly', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from weekly_users
        ),
        'monthly', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from monthly_users
        ),
        'comparison', (
          select jsonb_build_object(
            'current_period', current_period,
            'previous_period', previous_period,
            'delta', current_period - previous_period,
            'delta_percent',
            case
              when previous_period = 0 then null
              else round(((current_period - previous_period)::numeric / previous_period::numeric) * 100.0, 2)
            end
          )
          from comparison_users
        )
      ),
      'meetups', jsonb_build_object(
        'daily', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from daily_meetups
        ),
        'weekly', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from weekly_meetups
        ),
        'monthly', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'total', total
              )
              order by bucket_start
            ),
            '[]'::jsonb
          )
          from monthly_meetups
        ),
        'comparison', (
          select jsonb_build_object(
            'current_period', current_period,
            'previous_period', previous_period,
            'delta', current_period - previous_period,
            'delta_percent',
            case
              when previous_period = 0 then null
              else round(((current_period - previous_period)::numeric / previous_period::numeric) * 100.0, 2)
            end
          )
          from comparison_meetups
        )
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_supported', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_growth(integer, text, text, text) from public;
grant execute on function public.dashboard_product_growth(integer, text, text, text) to authenticated;

create or replace function public.dashboard_product_operations(
  p_days integer default 30,
  p_game_slug text default null,
  p_region text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 7);
  v_game_slug text := nullif(trim(coalesce(p_game_slug, '')), '');
  v_region text := nullif(trim(coalesce(p_region, '')), '');
begin
  perform public.assert_dashboard_access();

  return (
    with filtered_meetups as (
      select
        meetup.id,
        meetup.creator_id,
        meetup.created_at,
        meetup.status,
        meetup.expires_at,
        extract(hour from meetup.created_at at time zone 'utc')::integer as created_hour_utc,
        extract(dow from meetup.created_at at time zone 'utc')::integer as created_weekday_utc,
        creator.display_name,
        creator.handle,
        coalesce(
          nullif(trim(venue.neighborhood), ''),
          nullif(trim(creator.neighborhood), ''),
          'Regiao nao informada'
        ) as region_name,
        coalesce(game.name, 'Sem jogo informado') as game_name,
        coalesce(game.slug, 'unknown') as game_slug
      from public.meetup_posts meetup
      left join public.formats format
        on format.id = meetup.desired_format_id
      left join public.games game
        on game.id = format.game_id
      left join public.venues venue
        on venue.id = meetup.venue_id
      left join public.profiles creator
        on creator.user_id = meetup.creator_id
      where
        meetup.created_at >= timezone('utc', now()) - make_interval(days => v_days)
        and (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (
          v_game_slug is null
          or game.slug = v_game_slug
        )
    ),
    region_rollup as (
      select
        region_name,
        count(*)::integer as total_meetups
      from filtered_meetups
      group by region_name
      order by total_meetups desc, region_name asc
      limit 10
    ),
    game_rollup as (
      select
        game_name,
        game_slug,
        count(*)::integer as total_meetups
      from filtered_meetups
      group by game_name, game_slug
      order by total_meetups desc, game_name asc
    ),
    top_creators as (
      select
        creator_id,
        coalesce(display_name, 'Jogador sem nome') as display_name,
        handle,
        count(*)::integer as total_meetups
      from filtered_meetups
      group by creator_id, display_name, handle
      order by total_meetups desc, display_name asc
      limit 8
    ),
    weekday_range as (
      select generate_series(0, 6) as weekday_index
    ),
    hour_range as (
      select generate_series(0, 23) as hour_index
    ),
    weekday_rollup as (
      select
        weekday_range.weekday_index,
        count(filtered_meetups.id)::integer as total_meetups
      from weekday_range
      left join filtered_meetups
        on filtered_meetups.created_weekday_utc = weekday_range.weekday_index
      group by weekday_range.weekday_index
      order by weekday_range.weekday_index
    ),
    hour_rollup as (
      select
        hour_range.hour_index,
        count(filtered_meetups.id)::integer as total_meetups
      from hour_range
      left join filtered_meetups
        on filtered_meetups.created_hour_utc = hour_range.hour_index
      group by hour_range.hour_index
      order by hour_range.hour_index
    ),
    status_rollup as (
      select
        count(*)::integer as total_meetups,
        count(*) filter (
          where status in ('open', 'filled')
            and expires_at > timezone('utc', now())
        )::integer as active_meetups,
        count(*) filter (where status = 'open')::integer as open_meetups,
        count(*) filter (where status = 'filled')::integer as filled_meetups,
        count(*) filter (where status = 'closed')::integer as closed_meetups,
        count(*) filter (where status = 'cancelled')::integer as cancelled_meetups
      from filtered_meetups
    )
    select jsonb_build_object(
      'window_days', v_days,
      'status', (
        select jsonb_build_object(
          'total_meetups', total_meetups,
          'active_meetups', active_meetups,
          'open_meetups', open_meetups,
          'filled_meetups', filled_meetups,
          'closed_meetups', closed_meetups,
          'cancelled_meetups', cancelled_meetups
        )
        from status_rollup
      ),
      'meetups_by_region', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'region', region_name,
              'total', total_meetups
            )
            order by total_meetups desc, region_name asc
          ),
          '[]'::jsonb
        )
        from region_rollup
      ),
      'meetups_by_game', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'game_name', game_name,
              'game_slug', game_slug,
              'total', total_meetups
            )
            order by total_meetups desc, game_name asc
          ),
          '[]'::jsonb
        )
        from game_rollup
      ),
      'top_creators', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'creator_id', creator_id,
              'display_name', display_name,
              'handle', handle,
              'total', total_meetups
            )
            order by total_meetups desc, display_name asc
          ),
          '[]'::jsonb
        )
        from top_creators
      ),
      'distribution_by_weekday', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'weekday_index', weekday_index,
              'total', total_meetups
            )
            order by weekday_index
          ),
          '[]'::jsonb
        )
        from weekday_rollup
      ),
      'distribution_by_hour', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'hour', hour_index,
              'total', total_meetups
            )
            order by hour_index
          ),
          '[]'::jsonb
        )
        from hour_rollup
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_supported', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_operations(integer, text, text) from public;
grant execute on function public.dashboard_product_operations(integer, text, text) to authenticated;

create or replace function public.dashboard_product_feedback(
  p_days integer default 30,
  p_feedback_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(least(coalesce(p_days, 30), 365), 7);
  v_feedback_type text := nullif(trim(coalesce(p_feedback_type, '')), '');
begin
  perform public.assert_dashboard_access();

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
        v_feedback_type is null
        or feedback.feedback_type = v_feedback_type
    ),
    period_feedback as (
      select *
      from filtered_feedback
      where created_at >= timezone('utc', now()) - make_interval(days => v_days)
    ),
    by_type_all as (
      select
        feedback.feedback_type,
        count(*)::integer as total_feedbacks
      from public.app_feedback feedback
      group by feedback.feedback_type
      order by feedback.feedback_type
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

revoke all on function public.dashboard_product_feedback(integer, text) from public;
grant execute on function public.dashboard_product_feedback(integer, text) to authenticated;
