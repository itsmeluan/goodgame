create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.profiles (user_id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (user_id) on delete cascade,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles (user_id) on delete cascade,
  reported_user_id uuid not null references public.profiles (user_id) on delete cascade,
  meetup_id uuid references public.meetup_posts (id) on delete set null,
  reason text not null,
  details text,
  created_at timestamptz not null default timezone('utc', now()),
  check (reporter_user_id <> reported_user_id)
);

create index if not exists user_blocks_blocker_idx
  on public.user_blocks (blocker_user_id, blocked_user_id);

create index if not exists user_reports_reporter_idx
  on public.user_reports (reporter_user_id, created_at desc);

alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;

create policy "user_blocks_read_own"
on public.user_blocks
for select
to authenticated
using (auth.uid() = blocker_user_id);

create policy "user_blocks_insert_own"
on public.user_blocks
for insert
to authenticated
with check (auth.uid() = blocker_user_id);

create policy "user_blocks_delete_own"
on public.user_blocks
for delete
to authenticated
using (auth.uid() = blocker_user_id);

create policy "user_reports_insert_own"
on public.user_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

create or replace function public.users_are_blocked(
  p_left_user_id uuid,
  p_right_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks block
    where (block.blocker_user_id = p_left_user_id and block.blocked_user_id = p_right_user_id)
       or (block.blocker_user_id = p_right_user_id and block.blocked_user_id = p_left_user_id)
  );
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
    raise exception 'O criador nao pode sair do proprio grupo. Encerre ou cancele o chamado.';
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
  on conflict (blocker_user_id, blocked_user_id) do nothing;

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

create or replace function public.report_user(
  p_reported_user_id uuid,
  p_meetup_id uuid default null,
  p_reason text default null,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_report_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_reported_user_id is null or p_reported_user_id = current_user_id then
    raise exception 'Escolha um jogador valido para denunciar';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Selecione um motivo para a denuncia';
  end if;

  insert into public.user_reports (
    reporter_user_id,
    reported_user_id,
    meetup_id,
    reason,
    details
  )
  values (
    current_user_id,
    p_reported_user_id,
    p_meetup_id,
    trim(p_reason),
    nullif(trim(coalesce(p_details, '')), '')
  )
  returning id into new_report_id;

  return new_report_id;
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
    select meetup_id, count(*)::integer as joined_players
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
      else 'Regiao aproximada'
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

create or replace function public.join_meetup(p_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  creator_user_id uuid;
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

  select meetup.creator_id, meetup.status, meetup.max_players
  into creator_user_id, current_status, allowed_players
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status is null then
    raise exception 'Chamado nao encontrado';
  end if;

  if public.users_are_blocked(current_user_id, creator_user_id) then
    raise exception 'Esse grupo nao esta disponivel para voce';
  end if;

  if current_status <> 'open' then
    raise exception 'Este chamado nao esta mais aberto';
  end if;

  select count(*)::integer
  into joined_count
  from public.meetup_members member
  where member.meetup_id = p_meetup_id;

  if joined_count >= allowed_players then
    raise exception 'Este chamado ja esta lotado';
  end if;

  insert into public.meetup_members (meetup_id, user_id, role)
  values (p_meetup_id, current_user_id, 'participant')
  on conflict (meetup_id, user_id) do nothing;

  perform public.sync_meetup_capacity_status(p_meetup_id);
end;
$$;

create or replace function public.send_meetup_message(
  p_meetup_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  creator_user_id uuid;
  current_status public.meetup_status;
  new_message_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not exists (
    select 1
    from public.meetup_members member
    where member.meetup_id = p_meetup_id
      and member.user_id = current_user_id
  ) then
    raise exception 'Entre no grupo antes de mandar mensagens';
  end if;

  select meetup.creator_id, meetup.status
  into creator_user_id, current_status
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if public.users_are_blocked(current_user_id, creator_user_id) then
    raise exception 'Esse grupo nao esta disponivel para mensagens';
  end if;

  if current_status in ('closed', 'cancelled') then
    raise exception 'Este grupo esta encerrado para novas mensagens';
  end if;

  insert into public.meetup_messages (meetup_id, author_id, body)
  values (p_meetup_id, current_user_id, trim(p_body))
  returning id into new_message_id;

  return new_message_id;
end;
$$;

revoke all on function public.users_are_blocked(uuid, uuid) from public;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

revoke all on function public.leave_meetup(uuid) from public;
grant execute on function public.leave_meetup(uuid) to authenticated;

revoke all on function public.block_user(uuid, text) from public;
grant execute on function public.block_user(uuid, text) to authenticated;

revoke all on function public.report_user(uuid, uuid, text, text) from public;
grant execute on function public.report_user(uuid, uuid, text, text) to authenticated;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

revoke all on function public.join_meetup(uuid) from public;
grant execute on function public.join_meetup(uuid) to authenticated;

revoke all on function public.send_meetup_message(uuid, text) from public;
grant execute on function public.send_meetup_message(uuid, text) to authenticated;
