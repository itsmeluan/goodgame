create or replace function public.player_public_profile(p_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  bio text,
  neighborhood text,
  avatar_path text,
  can_host boolean,
  format_names text[],
  availability jsonb,
  relationship_state text,
  is_online boolean,
  last_seen_at timestamptz,
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
  with target_profile as (
    select profile.*
    from public.profiles profile
    where profile.user_id = p_user_id
      and auth.uid() is not null
      and not public.users_are_blocked(auth.uid(), profile.user_id)
  ),
  relationship as (
    select
      case
        when friendship.status = 'accepted' then 'friend'
        when friendship.requester_user_id = auth.uid() then 'outgoing'
        when friendship.addressee_user_id = auth.uid() then 'incoming'
        else 'none'
      end as relationship_state
    from target_profile profile
    left join public.friendships friendship
      on (
        (friendship.requester_user_id = auth.uid() and friendship.addressee_user_id = profile.user_id)
        or (friendship.addressee_user_id = auth.uid() and friendship.requester_user_id = profile.user_id)
      )
  ),
  rating_stats as (
    select
      round(avg(rating)::numeric, 2) as average_rating,
      count(rating)::integer as ratings_count,
      count(*) filter (where attended)::integer as attended_count,
      count(*) filter (where not attended)::integer as no_show_count
    from public.meetup_ratings
    where reviewed_user_id = p_user_id
  ),
  host_stats as (
    select count(*)::integer as hosted_count
    from public.meetup_posts
    where creator_id = p_user_id
  )
  select
    profile.user_id,
    profile.display_name,
    profile.handle,
    profile.bio,
    profile.neighborhood,
    profile.avatar_path,
    profile.can_host,
    coalesce(
      (
        select array_agg(format.name order by format.name)
        from public.player_formats profile_format
        join public.formats format on format.id = profile_format.format_id
        where profile_format.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as format_names,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'weekday', availability_slot.weekday,
            'start_time', to_char(availability_slot.start_time, 'HH24:MI'),
            'end_time', to_char(availability_slot.end_time, 'HH24:MI'),
            'timezone', availability_slot.timezone
          )
          order by availability_slot.weekday, availability_slot.start_time
        )
        from public.availability_slots availability_slot
        where availability_slot.player_id = profile.user_id
      ),
      '[]'::jsonb
    ) as availability,
    coalesce((select relationship_state from relationship limit 1), 'none') as relationship_state,
    coalesce(presence.last_seen_at >= timezone('utc', now()) - interval '2 minutes', false) as is_online,
    presence.last_seen_at,
    coalesce(rating_stats.average_rating, 0)::numeric,
    coalesce(rating_stats.ratings_count, 0),
    coalesce(rating_stats.attended_count, 0),
    coalesce(rating_stats.no_show_count, 0),
    coalesce(host_stats.hosted_count, 0)
  from target_profile profile
  left join public.user_presence presence on presence.user_id = profile.user_id
  cross join rating_stats
  cross join host_stats;
$$;

revoke all on function public.player_public_profile(uuid) from public;
grant execute on function public.player_public_profile(uuid) to authenticated;
