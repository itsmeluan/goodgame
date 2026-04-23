create or replace function public.dashboard_is_test_user(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from auth.users auth_user
    where auth_user.id = p_user_id
      and lower(coalesce(auth_user.email, '')) in (
        'm.luan.mobile@gmail.com',
        'martinsluan@icloud.com',
        'martins.luan@live.com',
        'goodgamehelpme@gmail.com'
      )
  );
end;
$$;

revoke all on function public.dashboard_is_test_user(uuid) from public;
grant execute on function public.dashboard_is_test_user(uuid) to authenticated;

create or replace function public.dashboard_should_include_user(
  p_user_id uuid,
  p_include_test_data boolean default true
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(p_include_test_data, true) or not public.dashboard_is_test_user(p_user_id);
$$;

revoke all on function public.dashboard_should_include_user(uuid, boolean) from public;
grant execute on function public.dashboard_should_include_user(uuid, boolean) to authenticated;

create or replace function public.dashboard_product_summary(
  p_game_slug text default null,
  p_region text default null,
  p_pro_status text default 'all',
  p_feedback_type text default null,
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        public.dashboard_should_include_user(profile.user_id, v_include_test_data)
        and (
          v_region is null
          or coalesce(nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') = v_region
        )
        and (
          v_game_slug is null
          or exists (
            select 1
            from public.player_games player_game
            join public.games game on game.id = player_game.game_id
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
      left join public.formats format on format.id = meetup.desired_format_id
      left join public.games game on game.id = format.game_id
      left join public.venues venue on venue.id = meetup.venue_id
      left join public.profiles creator on creator.user_id = meetup.creator_id
      where
        public.dashboard_should_include_user(meetup.creator_id, v_include_test_data)
        and (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (v_game_slug is null or game.slug = v_game_slug)
    ),
    feedback_all as (
      select count(*)::integer as total_feedbacks
      from public.app_feedback feedback
      where
        public.dashboard_should_include_user(feedback.user_id, v_include_test_data)
        and (v_feedback_type is null or feedback.feedback_type = v_feedback_type)
    ),
    feedback_by_platform as (
      select
        public.dashboard_normalize_platform(feedback.platform) as platform_name,
        count(*)::integer as total_feedbacks
      from public.app_feedback feedback
      where
        public.dashboard_should_include_user(feedback.user_id, v_include_test_data)
        and (v_feedback_type is null or feedback.feedback_type = v_feedback_type)
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
            select jsonb_object_agg(coalesce(platform_name, 'unknown'), total_feedbacks)
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
        ),
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_summary(text, text, text, text, boolean) from public;
grant execute on function public.dashboard_product_summary(text, text, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_growth(
  p_days integer default 90,
  p_game_slug text default null,
  p_region text default null,
  p_pro_status text default 'all',
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        public.dashboard_should_include_user(profile.user_id, v_include_test_data)
        and (
          v_region is null
          or coalesce(nullif(trim(profile.neighborhood), ''), 'Regiao nao informada') = v_region
        )
        and (
          v_game_slug is null
          or exists (
            select 1
            from public.player_games player_game
            join public.games game on game.id = player_game.game_id
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
      select meetup.id, meetup.created_at
      from public.meetup_posts meetup
      left join public.formats format on format.id = meetup.desired_format_id
      left join public.games game on game.id = format.game_id
      left join public.venues venue on venue.id = meetup.venue_id
      left join public.profiles creator on creator.user_id = meetup.creator_id
      where
        public.dashboard_should_include_user(meetup.creator_id, v_include_test_data)
        and (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (v_game_slug is null or game.slug = v_game_slug)
    ),
    daily_range as (
      select generate_series(
        date_trunc('day', timezone('utc', now())) - ((v_days - 1) * interval '1 day'),
        date_trunc('day', timezone('utc', now())),
        interval '1 day'
      ) as bucket_start
    ),
    daily_users as (
      select range.bucket_start, count(scoped_user.user_id)::integer as total
      from daily_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
       and scoped_user.created_at < range.bucket_start + interval '1 day'
      group by range.bucket_start
    ),
    daily_meetups as (
      select range.bucket_start, count(meetup.id)::integer as total
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
      select range.bucket_start, count(scoped_user.user_id)::integer as total
      from weekly_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
       and scoped_user.created_at < range.bucket_start + interval '1 week'
      group by range.bucket_start
    ),
    weekly_meetups as (
      select range.bucket_start, count(meetup.id)::integer as total
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
      select range.bucket_start, count(scoped_user.user_id)::integer as total
      from monthly_range range
      left join scoped_users scoped_user
        on scoped_user.created_at >= range.bucket_start
       and scoped_user.created_at < range.bucket_start + interval '1 month'
      group by range.bucket_start
    ),
    monthly_meetups as (
      select range.bucket_start, count(meetup.id)::integer as total
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
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
            '[]'::jsonb
          )
          from daily_users
        ),
        'weekly', (
          select coalesce(
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
            '[]'::jsonb
          )
          from weekly_users
        ),
        'monthly', (
          select coalesce(
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
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
            case when previous_period = 0 then null else round(((current_period - previous_period)::numeric / previous_period::numeric) * 100.0, 2) end
          )
          from comparison_users
        )
      ),
      'meetups', jsonb_build_object(
        'daily', (
          select coalesce(
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
            '[]'::jsonb
          )
          from daily_meetups
        ),
        'weekly', (
          select coalesce(
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
            '[]'::jsonb
          )
          from weekly_meetups
        ),
        'monthly', (
          select coalesce(
            jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'total', total) order by bucket_start),
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
            case when previous_period = 0 then null else round(((current_period - previous_period)::numeric / previous_period::numeric) * 100.0, 2) end
          )
          from comparison_meetups
        )
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_supported', false,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_growth(integer, text, text, text, boolean) from public;
grant execute on function public.dashboard_product_growth(integer, text, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_operations(
  p_days integer default 30,
  p_game_slug text default null,
  p_region text default null,
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
      left join public.formats format on format.id = meetup.desired_format_id
      left join public.games game on game.id = format.game_id
      left join public.venues venue on venue.id = meetup.venue_id
      left join public.profiles creator on creator.user_id = meetup.creator_id
      where
        public.dashboard_should_include_user(meetup.creator_id, v_include_test_data)
        and meetup.created_at >= timezone('utc', now()) - make_interval(days => v_days)
        and (
          v_region is null
          or coalesce(
            nullif(trim(venue.neighborhood), ''),
            nullif(trim(creator.neighborhood), ''),
            'Regiao nao informada'
          ) = v_region
        )
        and (v_game_slug is null or game.slug = v_game_slug)
    ),
    region_rollup as (
      select region_name, count(*)::integer as total_meetups
      from filtered_meetups
      group by region_name
      order by total_meetups desc, region_name asc
      limit 10
    ),
    game_rollup as (
      select game_name, game_slug, count(*)::integer as total_meetups
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
    weekday_range as (select generate_series(0, 6) as weekday_index),
    hour_range as (select generate_series(0, 23) as hour_index),
    weekday_rollup as (
      select weekday_range.weekday_index, count(filtered_meetups.id)::integer as total_meetups
      from weekday_range
      left join filtered_meetups on filtered_meetups.created_weekday_utc = weekday_range.weekday_index
      group by weekday_range.weekday_index
      order by weekday_range.weekday_index
    ),
    hour_rollup as (
      select hour_range.hour_index, count(filtered_meetups.id)::integer as total_meetups
      from hour_range
      left join filtered_meetups on filtered_meetups.created_hour_utc = hour_range.hour_index
      group by hour_range.hour_index
      order by hour_range.hour_index
    ),
    status_rollup as (
      select
        count(*)::integer as total_meetups,
        count(*) filter (where status in ('open', 'filled') and expires_at > timezone('utc', now()))::integer as active_meetups,
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
          jsonb_agg(jsonb_build_object('region', region_name, 'total', total_meetups) order by total_meetups desc, region_name asc),
          '[]'::jsonb
        )
        from region_rollup
      ),
      'meetups_by_game', (
        select coalesce(
          jsonb_agg(jsonb_build_object('game_name', game_name, 'game_slug', game_slug, 'total', total_meetups) order by total_meetups desc, game_name asc),
          '[]'::jsonb
        )
        from game_rollup
      ),
      'top_creators', (
        select coalesce(
          jsonb_agg(jsonb_build_object('creator_id', creator_id, 'display_name', display_name, 'handle', handle, 'total', total_meetups) order by total_meetups desc, display_name asc),
          '[]'::jsonb
        )
        from top_creators
      ),
      'distribution_by_weekday', (
        select coalesce(
          jsonb_agg(jsonb_build_object('weekday_index', weekday_index, 'total', total_meetups) order by weekday_index),
          '[]'::jsonb
        )
        from weekday_rollup
      ),
      'distribution_by_hour', (
        select coalesce(
          jsonb_agg(jsonb_build_object('hour', hour_index, 'total', total_meetups) order by hour_index),
          '[]'::jsonb
        )
        from hour_rollup
      ),
      'quality', jsonb_build_object(
        'platform_segmentation_supported', false,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_operations(integer, text, text, boolean) from public;
grant execute on function public.dashboard_product_operations(integer, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_feedback(
  p_days integer,
  p_feedback_type text,
  p_platform text,
  p_app_version text,
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        public.dashboard_should_include_user(feedback.user_id, v_include_test_data)
        and (v_feedback_type is null or feedback.feedback_type = v_feedback_type)
        and (v_platform is null or public.dashboard_normalize_platform(feedback.platform) = v_platform)
        and (v_app_version is null or nullif(trim(feedback.app_version), '') = v_app_version)
    ),
    period_feedback as (
      select * from filtered_feedback
      where created_at >= timezone('utc', now()) - make_interval(days => v_days)
    ),
    by_type_all as (
      select feedback_type, count(*)::integer as total_feedbacks
      from filtered_feedback
      group by feedback_type
      order by feedback_type
    ),
    by_platform_filtered as (
      select coalesce(platform_name, 'unknown') as platform_name, count(*)::integer as total_feedbacks
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
          jsonb_agg(jsonb_build_object('feedback_type', feedback_type, 'total', total_feedbacks) order by feedback_type),
          '[]'::jsonb
        )
        from by_type_all
      ),
      'by_platform', (
        select coalesce(
          jsonb_agg(jsonb_build_object('platform', platform_name, 'total', total_feedbacks) order by platform_name),
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
        'app_version_available', true,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_feedback(integer, text, text, text, boolean) from public;
grant execute on function public.dashboard_product_feedback(integer, text, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_advanced_metrics(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null,
  p_event_name text default null,
  p_region text default null,
  p_game_type text default null,
  p_pro_status text default 'all',
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
      where public.dashboard_should_include_user(profile.user_id, v_include_test_data)
    ),
    filtered_events as (
      select event.*
      from public.dashboard_product_events_enriched event
      left join current_users user_state on user_state.user_id = event.user_id
      where
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.occurred_at >= timezone('utc', now()) - make_interval(days => v_days)
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
      left join current_users user_state on user_state.user_id = event.user_id
      where
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.occurred_at >= timezone('utc', now()) - interval '30 days'
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
      where
        public.dashboard_should_include_user(history.user_id, v_include_test_data)
        and history.started_at >= date_trunc('month', timezone('utc', now())) - interval '11 months'
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
          case when mau = 0 then 0 else round((dau::numeric / mau::numeric) * 100.0, 2) end,
          'window_days', v_days,
          'tracked_events_in_window', coalesce((select count(*)::integer from filtered_events), 0),
          'tracked_users_in_window', coalesce((select count(distinct user_id)::integer from filtered_events where user_id is not null), 0)
        )
        from active_users
      ),
      'feature_activity', (
        select coalesce(
          jsonb_agg(jsonb_build_object('event_name', event_name, 'event_category', event_category, 'total_events', total_events, 'unique_users', unique_users) order by total_events desc, event_name asc),
          '[]'::jsonb
        )
        from feature_activity
      ),
      'platform_comparison', (
        select coalesce(
          jsonb_agg(jsonb_build_object('platform', platform_name, 'total_events', total_events, 'active_users', active_users, 'signups', signups, 'games_created', games_created, 'feedback_submitted', feedback_submitted) order by total_events desc, platform_name asc),
          '[]'::jsonb
        )
        from platform_rollup
      ),
      'version_comparison', (
        select coalesce(
          jsonb_agg(jsonb_build_object('app_version', app_version, 'total_events', total_events, 'active_users', active_users, 'signups', signups, 'games_created', games_created, 'bug_feedbacks', bug_feedbacks) order by total_events desc, app_version asc),
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
              case when games_created = 0 then null else round((join_intents::numeric / games_created::numeric), 2) end
            )
            order by games_created desc, join_intents desc, region asc
          ),
          '[]'::jsonb
        )
        from liquidity_rollup
      ),
      'pro_history', (
        select coalesce(
          jsonb_agg(jsonb_build_object('bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'pro_enabled', pro_enabled, 'pro_disabled', pro_disabled) order by bucket_start),
          '[]'::jsonb
        )
        from pro_timeline
      ),
      'quality', jsonb_build_object(
        'retention_depends_on_signup_events', true,
        'official_platform_segmentation', true,
        'official_app_version_segmentation', true,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_advanced_metrics(integer, text, text, text, text, text, text, boolean) from public;
grant execute on function public.dashboard_product_advanced_metrics(integer, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_funnel(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null,
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.occurred_at >= timezone('utc', now()) - make_interval(days => v_days)
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
        and event.user_id is not null
    ),
    funnel_steps as (
      select 1 as step_order, 'signup_completed'::text as event_name, 'Signup completed'::text as label
      union all select 2, 'profile_completed', 'Profile completed'
      union all select 3, 'map_viewed', 'Map viewed'
      union all select 4, 'first_game_viewed', 'First game viewed'
      union all select 5, 'first_game_created', 'First game created'
    ),
    per_step as (
      select
        step.step_order,
        step.event_name,
        step.label,
        count(distinct event.user_id)::integer as users_count
      from funnel_steps step
      left join filtered_events event on event.event_name = step.event_name
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
        'depends_on_accumulated_product_events', true,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_funnel(integer, text, text, boolean) from public;
grant execute on function public.dashboard_product_funnel(integer, text, text, boolean) to authenticated;

create or replace function public.dashboard_product_retention(
  p_platform text default null,
  p_app_version text default null,
  p_include_test_data boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_platform text := nullif(trim(coalesce(p_platform, '')), '');
  v_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        min(event.occurred_on) as signup_day
      from public.dashboard_product_events_enriched event
      where
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.event_name = 'signup_completed'
        and event.user_id is not null
        and (v_platform is null or event.platform = v_platform)
        and (v_app_version is null or event.app_version = v_app_version)
      group by event.user_id
    ),
    activity_days as (
      select distinct event.user_id, event.occurred_on
      from public.dashboard_product_events_enriched event
      where
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.user_id is not null
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
          select 1 from activity_days activity
          where activity.user_id = signup.user_id
            and activity.occurred_on = signup.signup_day + 1
        ) as retained_d1,
        exists (
          select 1 from activity_days activity
          where activity.user_id = signup.user_id
            and activity.occurred_on = signup.signup_day + 7
        ) as retained_d7,
        exists (
          select 1 from activity_days activity
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
          'd1', case when eligible_d1 = 0 then null else round((retained_d1::numeric / eligible_d1::numeric) * 100.0, 2) end,
          'd7', case when eligible_d7 = 0 then null else round((retained_d7::numeric / eligible_d7::numeric) * 100.0, 2) end,
          'd30', case when eligible_d30 = 0 then null else round((retained_d30::numeric / eligible_d30::numeric) * 100.0, 2) end,
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
              'd1', case when eligible_d1 = 0 then null else round((retained_d1::numeric / eligible_d1::numeric) * 100.0, 2) end,
              'd7', case when eligible_d7 = 0 then null else round((retained_d7::numeric / eligible_d7::numeric) * 100.0, 2) end,
              'd30', case when eligible_d30 = 0 then null else round((retained_d30::numeric / eligible_d30::numeric) * 100.0, 2) end,
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
        'retention_depends_on_signup_accumulation', true,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_retention(text, text, boolean) from public;
grant execute on function public.dashboard_product_retention(text, text, boolean) to authenticated;

create or replace function public.dashboard_product_alerts(
  p_days integer default 30,
  p_platform text default null,
  p_app_version text default null,
  p_region text default null,
  p_game_type text default null,
  p_include_test_data boolean default true
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
  v_include_test_data boolean := coalesce(p_include_test_data, true);
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
        public.dashboard_should_include_user(event.user_id, v_include_test_data)
        and event.occurred_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
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
          where public.dashboard_should_include_user(feedback.user_id, v_include_test_data)
            and feedback.created_at >= timezone('utc', now()) - make_interval(days => v_half)
            and feedback.feedback_type = 'bug'
            and (v_platform is null or public.dashboard_normalize_platform(feedback.platform) = v_platform)
            and (v_app_version is null or nullif(trim(feedback.app_version), '') = v_app_version)
        )::integer as bug_current,
        count(*) filter (
          where public.dashboard_should_include_user(feedback.user_id, v_include_test_data)
            and feedback.created_at >= timezone('utc', now()) - make_interval(days => (v_half * 2))
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
      select platform, count(distinct user_id)::integer as active_users
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
        select coalesce(jsonb_agg(alert_obj order by (alert_obj ->> 'severity') desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
            'severity', 'high',
            'type', 'new_users_drop',
            'title', 'Queda brusca de novos usuarios',
            'description', format('Janela atual: %s. Janela anterior: %s.', signups_current, signups_previous)
          ) as alert_obj
          from event_comparison
          where signups_previous >= 5 and signups_current < signups_previous * 0.7

          union all

          select jsonb_build_object(
            'severity', 'high',
            'type', 'activity_drop',
            'title', 'Queda de atividade',
            'description', format('Usuarios ativos: %s vs %s no periodo anterior.', active_users_current, active_users_previous)
          )
          from event_comparison
          where active_users_previous >= 8 and active_users_current < active_users_previous * 0.75

          union all

          select jsonb_build_object(
            'severity', 'high',
            'type', 'game_creation_drop',
            'title', 'Queda de criacao de partidas',
            'description', format('Partidas criadas: %s vs %s no periodo anterior.', games_created_current, games_created_previous)
          )
          from event_comparison
          where games_created_previous >= 5 and games_created_current < games_created_previous * 0.75

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'bug_spike',
            'title', 'Aumento de bugs reportados',
            'description', format('Bugs no feedback: %s vs %s no periodo anterior.', bug_current, bug_previous)
          )
          from bug_comparison
          where bug_previous >= 2 and bug_current > bug_previous * 1.4

          union all

          select jsonb_build_object(
            'severity', 'medium',
            'type', 'low_liquidity_region',
            'title', 'Baixa liquidez em regiao relevante',
            'description', format('%s tem %s partidas criadas e %s intencoes de entrada na janela recente.', region, games_created, join_intents)
          )
          from liquidity_regions
          where games_created >= 3 and (join_intents::numeric / greatest(games_created, 1)::numeric) < 0.5

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
            'description', format('Versao %s com %s bugs reportados para %s app opens.', app_version, bug_feedbacks, app_opens)
          )
          from problematic_versions
          where app_opens >= 5 and (bug_feedbacks::numeric / greatest(app_opens, 1)::numeric) > 0.25
        ) alerts
      ),
      'quality', jsonb_build_object(
        'alerts_are_rule_based', true,
        'window_days', v_days,
        'test_data_included', false
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_product_alerts(integer, text, text, text, text, boolean) from public;
grant execute on function public.dashboard_product_alerts(integer, text, text, text, text, boolean) to authenticated;
