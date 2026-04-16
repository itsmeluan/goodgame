alter table public.profiles
add column if not exists avatar_path text;

do $$
begin
  create type public.friendship_status as enum ('pending', 'accepted');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles (user_id) on delete cascade,
  addressee_user_id uuid not null references public.profiles (user_id) on delete cascade,
  status public.friendship_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (requester_user_id <> addressee_user_id)
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (
    (least(requester_user_id, addressee_user_id)),
    (greatest(requester_user_id, addressee_user_id))
  );

create index if not exists friendships_requester_idx
  on public.friendships (requester_user_id, status, updated_at desc);

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_user_id, status, updated_at desc);

create index if not exists user_presence_seen_idx
  on public.user_presence (last_seen_at desc);

drop trigger if exists friendships_touch_updated_at on public.friendships;
create trigger friendships_touch_updated_at
before update on public.friendships
for each row
execute function public.touch_updated_at();

drop trigger if exists user_presence_touch_updated_at on public.user_presence;
create trigger user_presence_touch_updated_at
before update on public.user_presence
for each row
execute function public.touch_updated_at();

alter table public.friendships enable row level security;
alter table public.user_presence enable row level security;

drop policy if exists "friendships_read_participants" on public.friendships;
create policy "friendships_read_participants"
on public.friendships
for select
to authenticated
using (auth.uid() in (requester_user_id, addressee_user_id));

drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester"
on public.friendships
for insert
to authenticated
with check (auth.uid() = requester_user_id);

drop policy if exists "friendships_update_participants" on public.friendships;
create policy "friendships_update_participants"
on public.friendships
for update
to authenticated
using (auth.uid() in (requester_user_id, addressee_user_id))
with check (auth.uid() in (requester_user_id, addressee_user_id));

drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants"
on public.friendships
for delete
to authenticated
using (auth.uid() in (requester_user_id, addressee_user_id));

drop policy if exists "user_presence_manage_own" on public.user_presence;
create policy "user_presence_manage_own"
on public.user_presence
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop function if exists public.my_profile_details();
create function public.my_profile_details()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  bio text,
  neighborhood text,
  avatar_path text,
  can_host boolean,
  search_radius_km integer,
  lat double precision,
  lng double precision,
  format_ids uuid[],
  format_names text[],
  availability jsonb
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    profile.user_id,
    profile.handle,
    profile.display_name,
    profile.bio,
    profile.neighborhood,
    profile.avatar_path,
    profile.can_host,
    profile.search_radius_km,
    extensions.st_y(profile.approximate_location::extensions.geometry) as lat,
    extensions.st_x(profile.approximate_location::extensions.geometry) as lng,
    coalesce(
      (
        select array_agg(player_format.format_id order by format.name)
        from public.player_formats player_format
        join public.formats format on format.id = player_format.format_id
        where player_format.player_id = profile.user_id
      ),
      '{}'::uuid[]
    ) as format_ids,
    coalesce(
      (
        select array_agg(format.name order by format.name)
        from public.player_formats player_format
        join public.formats format on format.id = player_format.format_id
        where player_format.player_id = profile.user_id
      ),
      '{}'::text[]
    ) as format_names,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'weekday', availability.weekday,
            'start_time', to_char(availability.start_time, 'HH24:MI'),
            'end_time', to_char(availability.end_time, 'HH24:MI'),
            'timezone', availability.timezone
          )
          order by availability.weekday, availability.start_time
        )
        from public.availability_slots availability
        where availability.player_id = profile.user_id
      ),
      '[]'::jsonb
    ) as availability
  from public.profiles profile
  where profile.user_id = auth.uid();
$$;

drop function if exists public.list_venue_cards();
create function public.list_venue_cards()
returns table (
  id uuid,
  name text,
  neighborhood text,
  supports_events boolean,
  owner_display_name text,
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
    venue.supports_events,
    coalesce(profile.display_name, 'Comunidade') as owner_display_name,
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

create or replace function public.upsert_my_presence()
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

  insert into public.user_presence (user_id, last_seen_at)
  values (current_user_id, timezone('utc', now()))
  on conflict (user_id) do update
  set
    last_seen_at = excluded.last_seen_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.list_friend_overview()
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
  last_seen_at timestamptz
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
    presence.last_seen_at
  from my_friendships friendship
  join public.profiles profile on profile.user_id = friendship.other_user_id
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
set search_path = public
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

create or replace function public.send_friend_request(p_target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_friendship public.friendships%rowtype;
  friendship_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_target_user_id is null or p_target_user_id = current_user_id then
    raise exception 'Escolha um jogador valido';
  end if;

  if public.users_are_blocked(current_user_id, p_target_user_id) then
    raise exception 'Nao foi possivel enviar o convite para este jogador';
  end if;

  select *
  into existing_friendship
  from public.friendships friendship
  where (friendship.requester_user_id = current_user_id and friendship.addressee_user_id = p_target_user_id)
     or (friendship.requester_user_id = p_target_user_id and friendship.addressee_user_id = current_user_id)
  limit 1;

  if existing_friendship.id is not null then
    if existing_friendship.status = 'accepted' then
      return existing_friendship.id;
    end if;

    if existing_friendship.requester_user_id = p_target_user_id
      and existing_friendship.addressee_user_id = current_user_id then
      update public.friendships
      set
        status = 'accepted',
        responded_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      where id = existing_friendship.id;

      return existing_friendship.id;
    end if;

    return existing_friendship.id;
  end if;

  insert into public.friendships (
    requester_user_id,
    addressee_user_id,
    status
  )
  values (
    current_user_id,
    p_target_user_id,
    'pending'
  )
  returning id into friendship_id;

  return friendship_id;
end;
$$;

create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_friendship public.friendships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select *
  into target_friendship
  from public.friendships friendship
  where friendship.id = p_friendship_id;

  if target_friendship.id is null then
    raise exception 'Convite nao encontrado';
  end if;

  if target_friendship.addressee_user_id <> current_user_id then
    raise exception 'Somente quem recebeu o convite pode responder';
  end if;

  if target_friendship.status <> 'pending' then
    return;
  end if;

  if coalesce(p_accept, false) then
    update public.friendships
    set
      status = 'accepted',
      responded_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = p_friendship_id;
  else
    delete from public.friendships
    where id = p_friendship_id;
  end if;
end;
$$;

create or replace function public.remove_friend(p_other_user_id uuid)
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

  delete from public.friendships friendship
  where (friendship.requester_user_id = current_user_id and friendship.addressee_user_id = p_other_user_id)
     or (friendship.requester_user_id = p_other_user_id and friendship.addressee_user_id = current_user_id);
end;
$$;

create or replace function public.sync_meetup_capacity_status(p_meetup_id uuid)
returns public.meetup_status
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.meetup_status;
  allowed_players smallint;
  joined_count integer;
  next_status public.meetup_status;
begin
  select meetup.status, meetup.max_players
  into current_status, allowed_players
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    raise exception 'Jogo nao encontrado';
  end if;

  if current_status in ('confirmed', 'closed', 'cancelled') then
    return current_status;
  end if;

  select count(*)::integer
  into joined_count
  from public.meetup_members member
  where member.meetup_id = p_meetup_id;

  next_status := case
    when joined_count >= allowed_players then 'filled'
    else 'open'
  end;

  if next_status <> current_status then
    update public.meetup_posts
    set status = next_status
    where id = p_meetup_id;
  end if;

  return next_status;
end;
$$;

create or replace function public.leave_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.participant_role;
  deleted_count integer;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select member.role
  into current_role
  from public.meetup_members member
  where member.meetup_id = p_meetup_id
    and member.user_id = current_user_id;

  if current_role is null then
    raise exception 'Voce nao esta neste grupo';
  end if;

  if current_role = 'creator' then
    raise exception 'O criador nao pode sair do proprio grupo. Encerre ou cancele o jogo.';
  end if;

  delete from public.meetup_members member
  where member.meetup_id = p_meetup_id
    and member.user_id = current_user_id;

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'Nao foi possivel sair deste grupo';
  end if;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

create or replace function public.join_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.meetup_status;
  allowed_players smallint;
  joined_count integer;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = p_meetup_id
      and member.user_id = current_user_id
  ) then
    return;
  end if;

  select meetup.status, meetup.max_players
  into current_status, allowed_players
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    raise exception 'Jogo nao encontrado';
  end if;

  if current_status <> 'open' then
    raise exception 'Este jogo nao esta mais aberto';
  end if;

  select count(*)::integer
  into joined_count
  from public.meetup_members member
  where member.meetup_id = p_meetup_id;

  if joined_count >= allowed_players then
    raise exception 'Este jogo ja esta lotado';
  end if;

  insert into public.meetup_members (meetup_id, user_id, role)
  values (p_meetup_id, current_user_id, 'participant')
  on conflict (meetup_id, user_id) do nothing;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

create or replace function public.update_my_meetup(
  p_meetup_id uuid,
  p_max_players smallint default null,
  p_status public.meetup_status default null
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

  if p_max_players is null and p_status is null then
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

  if p_status = 'filled' then
    raise exception 'O status lotado e controlado automaticamente';
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
    status = coalesce(p_status, status)
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
    when 'open' then 'Jogo reaberto'
    when 'filled' then 'Mesa lotada'
    when 'confirmed' then 'Jogo confirmado'
    when 'closed' then 'Mesa encerrada'
    when 'cancelled' then 'Jogo cancelado'
    else 'Jogo atualizado'
  end;

  notification_body := case new.status
    when 'open' then '"' || new.title || '" voltou a aceitar jogadores.'
    when 'filled' then '"' || new.title || '" atingiu o limite de participantes.'
    when 'confirmed' then 'O jogo "' || new.title || '" foi confirmado.'
    when 'closed' then 'A mesa de "' || new.title || '" foi encerrada.'
    when 'cancelled' then 'O jogo "' || new.title || '" foi cancelado.'
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

drop trigger if exists meetup_posts_notify_status_after_update on public.meetup_posts;
create trigger meetup_posts_notify_status_after_update
after update of status on public.meetup_posts
for each row
execute function public.notify_members_when_meetup_status_changes();

revoke all on function public.my_profile_details() from public;
grant execute on function public.my_profile_details() to authenticated;

revoke all on function public.list_venue_cards() from public;
grant execute on function public.list_venue_cards() to authenticated;

revoke all on function public.upsert_my_presence() from public;
grant execute on function public.upsert_my_presence() to authenticated;

revoke all on function public.list_friend_overview() from public;
grant execute on function public.list_friend_overview() to authenticated;

revoke all on function public.search_players(text) from public;
grant execute on function public.search_players(text) to authenticated;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;
