update public.meetup_members
set attendance_status = case
  when attendance_status::text in ('going', 'on_the_way', 'arrived', 'left') then 'confirmed'::public.attendance_status
  when attendance_status::text = 'cant_make_it' then 'not_going'::public.attendance_status
  else attendance_status
end
where attendance_status::text in ('going', 'on_the_way', 'arrived', 'left', 'cant_make_it');

alter table public.meetup_members
alter column attendance_status set default 'interested';

create or replace function public.join_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.meetup_status;
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

  select meetup.status
  into current_status
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    raise exception 'Jogo nao encontrado';
  end if;

  if current_status <> 'open' then
    raise exception 'Esta partida nao esta mais aberta';
  end if;

  insert into public.meetup_members (meetup_id, user_id, role, attendance_status)
  values (p_meetup_id, current_user_id, 'participant', 'interested')
  on conflict (meetup_id, user_id) do nothing;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

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

  if p_status::text not in ('interested', 'confirmed', 'not_going') then
    raise exception 'Use apenas os status tenho interesse, confirmado ou não vou';
  end if;

  update public.meetup_members
  set
    attendance_status = p_status,
    attendance_marked_at = timezone('utc', now())
  where meetup_id = p_meetup_id
    and user_id = current_user_id;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'Você precisa entrar no jogo antes de atualizar seu status';
  end if;
end;
$$;

create or replace function public.remove_meetup_member(
  p_meetup_id uuid,
  p_member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_role public.participant_role;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not exists (
    select 1
    from public.meetup_posts meetup
    where meetup.id = p_meetup_id
      and meetup.creator_id = current_user_id
  ) then
    raise exception 'Somente o criador pode remover participantes';
  end if;

  select role
  into member_role
  from public.meetup_members
  where meetup_id = p_meetup_id
    and user_id = p_member_user_id;

  if member_role is null then
    raise exception 'Participante nao encontrado';
  end if;

  if member_role = 'creator' then
    raise exception 'O criador nao pode ser removido da propria partida';
  end if;

  delete from public.meetup_members
  where meetup_id = p_meetup_id
    and user_id = p_member_user_id;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

drop function if exists public.list_meetup_cards();
create function public.list_meetup_cards()
returns table (
  id uuid,
  title text,
  description text,
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
  address_label text,
  location_hint text,
  is_location_exact boolean,
  chat_image_path text,
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
        where attendance_status = 'confirmed'
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
    meetup.description,
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
      when visibility.is_location_exact and venue.address is not null then venue.address
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when visibility.is_location_exact and venue.name is not null then venue.name
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as address_label,
    case
      when visibility.is_location_exact and venue.name is not null then venue.name
      when visibility.is_location_exact and meetup.custom_address_label is not null then meetup.custom_address_label
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as location_hint,
    visibility.is_location_exact,
    meetup.chat_image_path,
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
      meetup.status = 'open'
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
    case member.attendance_status::text
      when 'confirmed' then 0
      when 'interested' then 1
      when 'not_going' then 2
      else 3
    end,
    member.joined_at;
$$;

revoke all on function public.join_meetup(uuid) from public;
grant execute on function public.join_meetup(uuid) to authenticated;

revoke all on function public.set_my_attendance_status(uuid, public.attendance_status) from public;
grant execute on function public.set_my_attendance_status(uuid, public.attendance_status) to authenticated;

revoke all on function public.remove_meetup_member(uuid, uuid) from public;
grant execute on function public.remove_meetup_member(uuid, uuid) to authenticated;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

revoke all on function public.list_meetup_member_presence(uuid) from public;
grant execute on function public.list_meetup_member_presence(uuid) to authenticated;
