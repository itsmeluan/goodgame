alter type public.meetup_status add value if not exists 'confirmed';

do $$
begin
  create type public.notification_kind as enum (
    'member_joined',
    'message_received',
    'meetup_status_changed',
    'meetup_reminder'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  meetup_id uuid references public.meetup_posts (id) on delete cascade,
  actor_user_id uuid references public.profiles (user_id) on delete set null,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  unique_key text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, kind, unique_key)
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, read_at, created_at desc);

alter table public.user_notifications enable row level security;

create policy "user_notifications_read_own"
on public.user_notifications
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_notifications_update_own"
on public.user_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.create_user_notification(
  p_user_id uuid,
  p_meetup_id uuid,
  p_actor_user_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_unique_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.user_notifications (
    user_id,
    meetup_id,
    actor_user_id,
    kind,
    title,
    body,
    unique_key,
    metadata
  )
  values (
    p_user_id,
    p_meetup_id,
    p_actor_user_id,
    p_kind,
    trim(p_title),
    trim(p_body),
    nullif(trim(coalesce(p_unique_key, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, kind, unique_key) do nothing;
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
    raise exception 'Chamado nao encontrado';
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

create or replace function public.handle_meetup_membership_status_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_meetup_capacity_status(coalesce(new.meetup_id, old.meetup_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists meetup_members_sync_status_after_insert on public.meetup_members;
create trigger meetup_members_sync_status_after_insert
after insert on public.meetup_members
for each row
execute function public.handle_meetup_membership_status_sync();

drop trigger if exists meetup_members_sync_status_after_delete on public.meetup_members;
create trigger meetup_members_sync_status_after_delete
after delete on public.meetup_members
for each row
execute function public.handle_meetup_membership_status_sync();

create or replace function public.notify_creator_when_member_joins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meetup_title text;
  creator_id uuid;
  participant_name text;
begin
  if new.role = 'creator' then
    return new;
  end if;

  select meetup.title, meetup.creator_id, profile.display_name
  into meetup_title, creator_id, participant_name
  from public.meetup_posts meetup
  join public.profiles profile on profile.user_id = new.user_id
  where meetup.id = new.meetup_id;

  if creator_id is null or creator_id = new.user_id then
    return new;
  end if;

  perform public.create_user_notification(
    creator_id,
    new.meetup_id,
    new.user_id,
    'member_joined',
    'Novo participante no seu grupo',
    coalesce(participant_name, 'Um jogador') || ' entrou em "' || meetup_title || '".',
    null,
    jsonb_build_object('member_user_id', new.user_id::text)
  );

  return new;
end;
$$;

drop trigger if exists meetup_members_notify_creator_after_insert on public.meetup_members;
create trigger meetup_members_notify_creator_after_insert
after insert on public.meetup_members
for each row
execute function public.notify_creator_when_member_joins();

create or replace function public.notify_members_when_message_arrives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meetup_title text;
  author_name text;
  target_member record;
begin
  select meetup.title, profile.display_name
  into meetup_title, author_name
  from public.meetup_posts meetup
  join public.profiles profile on profile.user_id = new.author_id
  where meetup.id = new.meetup_id;

  for target_member in
    select member.user_id
    from public.meetup_members member
    where member.meetup_id = new.meetup_id
      and member.user_id <> new.author_id
  loop
    perform public.create_user_notification(
      target_member.user_id,
      new.meetup_id,
      new.author_id,
      'message_received',
      'Nova mensagem em "' || meetup_title || '"',
      coalesce(author_name, 'Alguem') || ': ' || left(new.body, 120),
      null,
      jsonb_build_object('message_id', new.id::text)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists meetup_messages_notify_members_after_insert on public.meetup_messages;
create trigger meetup_messages_notify_members_after_insert
after insert on public.meetup_messages
for each row
execute function public.notify_members_when_message_arrives();

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
    when 'open' then 'Chamado reaberto'
    when 'filled' then 'Grupo lotado'
    when 'confirmed' then 'Encontro confirmado'
    when 'closed' then 'Grupo encerrado'
    when 'cancelled' then 'Chamado cancelado'
    else 'Chamado atualizado'
  end;

  notification_body := case new.status
    when 'open' then '"' || new.title || '" voltou a aceitar jogadores.'
    when 'filled' then '"' || new.title || '" atingiu o limite de participantes.'
    when 'confirmed' then 'O encontro "' || new.title || '" foi confirmado.'
    when 'closed' then 'O grupo de "' || new.title || '" foi encerrado.'
    when 'cancelled' then 'O chamado "' || new.title || '" foi cancelado.'
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
    extensions.st_y(meetup.location::extensions.geometry) as lat,
    extensions.st_x(meetup.location::extensions.geometry) as lng,
    venue.name as venue_name,
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
  where auth.uid() is not null
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
    raise exception 'Chamado nao encontrado';
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

  select meetup.status
  into current_status
  from public.meetup_posts meetup
  where meetup.id = p_meetup_id;

  if current_status in ('closed', 'cancelled') then
    raise exception 'Este grupo esta encerrado para novas mensagens';
  end if;

  insert into public.meetup_messages (meetup_id, author_id, body)
  values (p_meetup_id, current_user_id, trim(p_body))
  returning id into new_message_id;

  return new_message_id;
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
    raise exception 'Somente o criador pode editar este chamado';
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

create or replace function public.create_due_meetup_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  insert into public.user_notifications (
    user_id,
    meetup_id,
    actor_user_id,
    kind,
    title,
    body,
    unique_key,
    metadata
  )
  select
    current_user_id,
    due_meetups.meetup_id,
    null,
    'meetup_reminder',
    case due_meetups.reminder_key
      when '15m' then 'Seu jogo comeca em 15 min'
      else 'Seu jogo comeca em 1 hora'
    end,
    '"' || due_meetups.title || '" comeca ' ||
      case due_meetups.reminder_key
        when '15m' then 'em ate 15 minutos.'
        else 'em ate 1 hora.'
      end,
    'reminder:' || due_meetups.meetup_id::text || ':' || due_meetups.reminder_key,
    jsonb_build_object('reminder_key', due_meetups.reminder_key)
  from (
    select
      meetup.id as meetup_id,
      meetup.title,
      case
        when meetup.starts_at <= timezone('utc', now()) + interval '15 minutes' then '15m'
        when meetup.starts_at <= timezone('utc', now()) + interval '1 hour' then '1h'
        else null
      end as reminder_key
    from public.meetup_posts meetup
    join public.meetup_members member
      on member.meetup_id = meetup.id
     and member.user_id = current_user_id
    where meetup.status in ('open', 'filled', 'confirmed')
      and meetup.starts_at > timezone('utc', now())
      and meetup.starts_at <= timezone('utc', now()) + interval '1 hour'
  ) as due_meetups
  where due_meetups.reminder_key is not null
  on conflict (user_id, kind, unique_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.list_my_notifications(p_limit integer default 10)
returns table (
  id uuid,
  kind text,
  title text,
  body text,
  meetup_id uuid,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    notification.id,
    notification.kind::text,
    notification.title,
    notification.body,
    notification.meetup_id,
    notification.read_at,
    notification.created_at
  from public.user_notifications notification
  where notification.user_id = auth.uid()
  order by notification.read_at asc nulls first, notification.created_at desc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

create or replace function public.mark_my_notifications_read(
  p_notification_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  update public.user_notifications notification
  set read_at = timezone('utc', now())
  where notification.user_id = current_user_id
    and notification.read_at is null
    and (
      p_notification_ids is null
      or notification.id = any(p_notification_ids)
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.create_user_notification(uuid, uuid, uuid, public.notification_kind, text, text, text, jsonb) from public;

revoke all on function public.sync_meetup_capacity_status(uuid) from public;
grant execute on function public.sync_meetup_capacity_status(uuid) to authenticated;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

revoke all on function public.join_meetup(uuid) from public;
grant execute on function public.join_meetup(uuid) to authenticated;

revoke all on function public.send_meetup_message(uuid, text) from public;
grant execute on function public.send_meetup_message(uuid, text) to authenticated;

revoke all on function public.update_my_meetup(uuid, smallint, public.meetup_status) from public;
grant execute on function public.update_my_meetup(uuid, smallint, public.meetup_status) to authenticated;

revoke all on function public.create_due_meetup_reminders() from public;
grant execute on function public.create_due_meetup_reminders() to authenticated;

revoke all on function public.list_my_notifications(integer) from public;
grant execute on function public.list_my_notifications(integer) to authenticated;

revoke all on function public.mark_my_notifications_read(uuid[]) from public;
grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.meetup_posts;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.meetup_members;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.meetup_messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
end;
$$;
