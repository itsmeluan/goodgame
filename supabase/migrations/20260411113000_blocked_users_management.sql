create or replace function public.block_user(
  p_blocked_user_id uuid,
  p_reason text default null
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
    raise exception 'Usuario nao autenticado';
  end if;

  if p_blocked_user_id is null or p_blocked_user_id = current_user_id then
    raise exception 'Escolha um jogador valido para bloquear';
  end if;

  insert into public.user_blocks (
    blocker_user_id,
    blocked_user_id,
    reason
  )
  values (
    current_user_id,
    p_blocked_user_id,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  on conflict (blocker_user_id, blocked_user_id) do update
  set reason = excluded.reason;

  delete from public.friendships friendship
  where (
    friendship.requester_user_id = current_user_id
    and friendship.addressee_user_id = p_blocked_user_id
  ) or (
    friendship.requester_user_id = p_blocked_user_id
    and friendship.addressee_user_id = current_user_id
  );

  delete from public.meetup_members member
  using public.meetup_posts meetup
  where member.meetup_id = meetup.id
    and meetup.creator_id = p_blocked_user_id
    and member.user_id = current_user_id
    and member.role <> 'creator';

  delete from public.meetup_members member
  using public.meetup_posts meetup
  where member.meetup_id = meetup.id
    and meetup.creator_id = current_user_id
    and member.user_id = p_blocked_user_id
    and member.role <> 'creator';
end;
$$;

create or replace function public.unblock_user(
  p_blocked_user_id uuid
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
    raise exception 'Usuario nao autenticado';
  end if;

  if p_blocked_user_id is null or p_blocked_user_id = current_user_id then
    raise exception 'Escolha um jogador valido para desbloquear';
  end if;

  delete from public.user_blocks block
  where block.blocker_user_id = current_user_id
    and block.blocked_user_id = p_blocked_user_id;
end;
$$;

create or replace function public.list_my_blocked_users()
returns table (
  blocked_user_id uuid,
  display_name text,
  handle text,
  neighborhood text,
  bio text,
  avatar_path text,
  blocked_at timestamptz,
  reason text
)
language sql
security definer
set search_path = public
as $$
  select
    profile.user_id as blocked_user_id,
    profile.display_name,
    profile.handle,
    profile.neighborhood,
    profile.bio,
    profile.avatar_path,
    block.created_at as blocked_at,
    block.reason
  from public.user_blocks block
  join public.profiles profile
    on profile.user_id = block.blocked_user_id
  where block.blocker_user_id = auth.uid()
  order by block.created_at desc;
$$;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    execute 'alter publication supabase_realtime add table public.user_blocks';
  end if;
exception
  when duplicate_object then null;
end;
$$;

alter table public.user_blocks replica identity full;

revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

revoke all on function public.list_my_blocked_users() from public;
grant execute on function public.list_my_blocked_users() to authenticated;
