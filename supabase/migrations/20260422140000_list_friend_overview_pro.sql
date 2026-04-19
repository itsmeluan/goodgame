-- Lista de amigos: expõe is_pro / pro_expires_at para a moldura Pro (mesma regra que player_public_profile).

drop function if exists public.list_friend_overview();

create function public.list_friend_overview()
returns table (
  friendship_id uuid,
  state text,
  user_id uuid,
  display_name text,
  handle text,
  neighborhood text,
  bio text,
  avatar_path text,
  is_online boolean,
  last_seen_at timestamptz,
  is_pro boolean,
  pro_expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with my_friendships as (
    select
      friendship.id,
      case
        when friendship.status = 'accepted' then 'friend'
        when friendship.requester_user_id = auth.uid() then 'outgoing'
        else 'incoming'
      end as state,
      case
        when friendship.requester_user_id = auth.uid() then friendship.addressee_user_id
        else friendship.requester_user_id
      end as other_user_id
    from public.friendships friendship
    where friendship.requester_user_id = auth.uid()
       or friendship.addressee_user_id = auth.uid()
  )
  select
    friendship.id as friendship_id,
    friendship.state,
    profile.user_id,
    profile.display_name,
    profile.handle,
    profile.neighborhood,
    profile.bio,
    profile.avatar_path,
    coalesce(presence.last_seen_at >= timezone('utc', now()) - interval '2 minutes', false) as is_online,
    presence.last_seen_at,
    (
      cfg.grant_pro_all
      or (
        profile.is_pro
        and (
          profile.pro_expires_at is null
          or profile.pro_expires_at > timezone('utc', now())
        )
      )
    ) as is_pro,
    case
      when cfg.grant_pro_all then null::timestamptz
      else profile.pro_expires_at
    end as pro_expires_at
  from my_friendships friendship
  join public.profiles profile on profile.user_id = friendship.other_user_id
  cross join lateral (
    select coalesce(
      (
        select ac.grant_pro_to_all_users
        from public.app_config ac
        where ac.singleton_key = 1
      ),
      false
    ) as grant_pro_all
  ) cfg
  left join public.user_presence presence on presence.user_id = friendship.other_user_id
  where not public.users_are_blocked(auth.uid(), profile.user_id)
  order by
    case friendship.state
      when 'incoming' then 0
      when 'friend' then 1
      else 2
    end,
    coalesce(presence.last_seen_at, profile.updated_at) desc,
    profile.display_name asc;
$$;

revoke all on function public.list_friend_overview() from public;
grant execute on function public.list_friend_overview() to authenticated;

