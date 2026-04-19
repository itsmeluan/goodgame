-- Allow finding players by account email in friend search (email never returned in results).

create or replace function public.search_players(p_query text default null)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  neighborhood text,
  bio text,
  avatar_path text,
  relationship_state text,
  is_online boolean
)
language sql
security definer
set search_path = public, auth
as $$
  with normalized as (
    select nullif(trim(coalesce(p_query, '')), '') as query
  ),
  relationships as (
    select
      profile.user_id,
      case
        when friendship.status = 'accepted' then 'friend'
        when friendship.requester_user_id = auth.uid() then 'outgoing'
        when friendship.addressee_user_id = auth.uid() then 'incoming'
        else 'none'
      end as relationship_state
    from public.profiles profile
    left join public.friendships friendship
      on (
        (friendship.requester_user_id = auth.uid() and friendship.addressee_user_id = profile.user_id)
        or (friendship.addressee_user_id = auth.uid() and friendship.requester_user_id = profile.user_id)
      )
  )
  select
    profile.user_id,
    profile.display_name,
    profile.handle,
    profile.neighborhood,
    profile.bio,
    profile.avatar_path,
    coalesce(relationships.relationship_state, 'none') as relationship_state,
    coalesce(presence.last_seen_at >= timezone('utc', now()) - interval '2 minutes', false) as is_online
  from public.profiles profile
  cross join normalized
  left join auth.users auth_account on auth_account.id = profile.user_id
  left join relationships on relationships.user_id = profile.user_id
  left join public.user_presence presence on presence.user_id = profile.user_id
  where auth.uid() is not null
    and profile.user_id <> auth.uid()
    and not public.users_are_blocked(auth.uid(), profile.user_id)
    and (
      normalized.query is null
      or profile.display_name ilike '%' || normalized.query || '%'
      or profile.handle ilike '%' || normalized.query || '%'
      or coalesce(profile.neighborhood, '') ilike '%' || normalized.query || '%'
      or coalesce(auth_account.email, '') ilike '%' || normalized.query || '%'
    )
  order by
    case coalesce(relationships.relationship_state, 'none')
      when 'friend' then 0
      when 'incoming' then 1
      when 'outgoing' then 2
      else 3
    end,
    coalesce(presence.last_seen_at, profile.updated_at) desc,
    profile.display_name asc
  limit 12;
$$;

revoke all on function public.search_players(text) from public;
grant execute on function public.search_players(text) to authenticated;
