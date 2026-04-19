-- Direct (1:1) private chats between players. Same message shape as meetup chats.
-- Future: restrict to Pro Players at send/list entry points.

create table public.private_chats (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles (user_id) on delete cascade,
  user_high uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint private_chats_ordered_users check (user_low < user_high),
  constraint private_chats_unique_pair unique (user_low, user_high)
);

create index private_chats_user_low_idx on public.private_chats (user_low);
create index private_chats_user_high_idx on public.private_chats (user_high);

create table public.private_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.private_chats (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null,
  reply_to_message_id uuid references public.private_messages (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index private_messages_chat_created_idx on public.private_messages (chat_id, created_at);
create index private_messages_reply_to_idx on public.private_messages (reply_to_message_id);

alter table public.private_chats enable row level security;
alter table public.private_messages enable row level security;

create policy "private_chats_select_participant"
on public.private_chats
for select
to authenticated
using (auth.uid() = user_low or auth.uid() = user_high);

create policy "private_messages_select_participant"
on public.private_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.private_chats chat
    where chat.id = private_messages.chat_id
      and (chat.user_low = auth.uid() or chat.user_high = auth.uid())
  )
);

alter table public.private_messages replica identity full;

-- ---------------------------------------------------------------------------
-- get_or_create_private_chat
-- ---------------------------------------------------------------------------
drop function if exists public.get_or_create_private_chat(uuid);
create function public.get_or_create_private_chat(p_other_user_id uuid)
returns table (
  chat_id uuid,
  can_send_messages boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  low_user uuid;
  high_user uuid;
  other_user uuid;
  found_id uuid;
  can_send boolean;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if p_other_user_id is null or p_other_user_id = current_user_id then
    raise exception 'Conversa invalida';
  end if;

  if not exists (select 1 from public.profiles p where p.user_id = p_other_user_id) then
    raise exception 'Jogador nao encontrado';
  end if;

  if current_user_id < p_other_user_id then
    low_user := current_user_id;
    high_user := p_other_user_id;
  else
    low_user := p_other_user_id;
    high_user := current_user_id;
  end if;

  insert into public.private_chats (user_low, user_high)
  values (low_user, high_user)
  on conflict (user_low, user_high) do nothing;

  select c.id
  into found_id
  from public.private_chats c
  where c.user_low = low_user
    and c.user_high = high_user;

  if found_id is null then
    raise exception 'Nao foi possivel abrir o chat';
  end if;

  other_user := p_other_user_id;
  can_send := not public.users_are_blocked(current_user_id, other_user);

  return query
  select found_id, can_send;
end;
$$;

revoke all on function public.get_or_create_private_chat(uuid) from public;
grant execute on function public.get_or_create_private_chat(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_private_chats
-- ---------------------------------------------------------------------------
drop function if exists public.list_private_chats();
create function public.list_private_chats()
returns table (
  chat_id uuid,
  other_user_id uuid,
  other_display_name text,
  other_handle text,
  other_avatar_path text,
  last_message_body text,
  last_message_at timestamptz,
  can_send_messages boolean
)
language sql
security definer
set search_path = public
as $$
  with my_chats as (
    select
      c.id,
      c.created_at as chat_created_at,
      case
        when c.user_low = auth.uid() then c.user_high
        else c.user_low
      end as other_id
    from public.private_chats c
    where c.user_low = auth.uid()
       or c.user_high = auth.uid()
  ),
  last_per_chat as (
    select distinct on (m.chat_id)
      m.chat_id,
      m.body as last_body,
      m.created_at as last_at
    from public.private_messages m
    order by m.chat_id, m.created_at desc
  )
  select
    mc.id as chat_id,
    profile.user_id as other_user_id,
    profile.display_name as other_display_name,
    profile.handle as other_handle,
    profile.avatar_path as other_avatar_path,
    lp.last_body as last_message_body,
    lp.last_at as last_message_at,
    not public.users_are_blocked(auth.uid(), profile.user_id) as can_send_messages
  from my_chats mc
  join public.profiles profile on profile.user_id = mc.other_id
  left join last_per_chat lp on lp.chat_id = mc.id
  order by coalesce(lp.last_at, mc.chat_created_at) desc nulls last;
$$;

revoke all on function public.list_private_chats() from public;
grant execute on function public.list_private_chats() to authenticated;

-- ---------------------------------------------------------------------------
-- list_private_messages
-- ---------------------------------------------------------------------------
drop function if exists public.list_private_messages(uuid);
create function public.list_private_messages(p_chat_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar_path text,
  sent_at timestamptz,
  body text,
  reply_to_message_id uuid,
  reply_preview_author_name text,
  reply_preview_body text
)
language sql
security definer
set search_path = public
as $$
  select
    message.id,
    message.author_id,
    profile.display_name as author_name,
    profile.avatar_path as author_avatar_path,
    message.created_at as sent_at,
    message.body,
    message.reply_to_message_id,
    replied_profile.display_name as reply_preview_author_name,
    replied_message.body as reply_preview_body
  from public.private_messages message
  join public.profiles profile on profile.user_id = message.author_id
  left join public.private_messages replied_message on replied_message.id = message.reply_to_message_id
  left join public.profiles replied_profile on replied_profile.user_id = replied_message.author_id
  where message.chat_id = p_chat_id
    and exists (
      select 1
      from public.private_chats chat
      where chat.id = p_chat_id
        and (chat.user_low = auth.uid() or chat.user_high = auth.uid())
    )
  order by message.created_at asc;
$$;

revoke all on function public.list_private_messages(uuid) from public;
grant execute on function public.list_private_messages(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_private_messages_after (incremental)
-- ---------------------------------------------------------------------------
drop function if exists public.list_private_messages_after(uuid, timestamptz);
create function public.list_private_messages_after(
  p_chat_id uuid,
  p_after timestamptz
)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar_path text,
  sent_at timestamptz,
  body text,
  reply_to_message_id uuid,
  reply_preview_author_name text,
  reply_preview_body text
)
language sql
security definer
set search_path = public
as $$
  select
    message.id,
    message.author_id,
    profile.display_name as author_name,
    profile.avatar_path as author_avatar_path,
    message.created_at as sent_at,
    message.body,
    message.reply_to_message_id,
    replied_profile.display_name as reply_preview_author_name,
    replied_message.body as reply_preview_body
  from public.private_messages message
  join public.profiles profile on profile.user_id = message.author_id
  left join public.private_messages replied_message on replied_message.id = message.reply_to_message_id
  left join public.profiles replied_profile on replied_profile.user_id = replied_message.author_id
  where message.chat_id = p_chat_id
    and message.created_at > p_after
    and exists (
      select 1
      from public.private_chats chat
      where chat.id = p_chat_id
        and (chat.user_low = auth.uid() or chat.user_high = auth.uid())
    )
  order by message.created_at asc;
$$;

revoke all on function public.list_private_messages_after(uuid, timestamptz) from public;
grant execute on function public.list_private_messages_after(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- send_private_message
-- ---------------------------------------------------------------------------
drop function if exists public.send_private_message(uuid, text, uuid);
create function public.send_private_message(
  p_chat_id uuid,
  p_body text,
  p_reply_to_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  other_user_id uuid;
  new_message_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select
    case
      when c.user_low = current_user_id then c.user_high
      else c.user_low
    end
  into other_user_id
  from public.private_chats c
  where c.id = p_chat_id
    and (c.user_low = current_user_id or c.user_high = current_user_id);

  if other_user_id is null then
    raise exception 'Conversa nao encontrada';
  end if;

  if public.users_are_blocked(current_user_id, other_user_id) then
    raise exception 'Nao e possivel enviar mensagens devido a bloqueio entre voces';
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.private_messages message
    where message.id = p_reply_to_message_id
      and message.chat_id = p_chat_id
  ) then
    raise exception 'A mensagem respondida nao pertence a esta conversa';
  end if;

  insert into public.private_messages (chat_id, author_id, body, reply_to_message_id)
  values (p_chat_id, current_user_id, trim(p_body), p_reply_to_message_id)
  returning id into new_message_id;

  return new_message_id;
end;
$$;

revoke all on function public.send_private_message(uuid, text, uuid) from public;
grant execute on function public.send_private_message(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (reuse message_received; meetup_id null; private_chat_id in metadata)
-- ---------------------------------------------------------------------------
create or replace function public.notify_peer_when_private_message_arrives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
  recipient_id uuid;
  chat_user_low uuid;
  chat_user_high uuid;
begin
  select c.user_low, c.user_high
  into chat_user_low, chat_user_high
  from public.private_chats c
  where c.id = new.chat_id;

  if chat_user_low is null then
    return new;
  end if;

  if new.author_id = chat_user_low then
    recipient_id := chat_user_high;
  else
    recipient_id := chat_user_low;
  end if;

  select profile.display_name
  into author_name
  from public.profiles profile
  where profile.user_id = new.author_id;

  perform public.create_user_notification(
    recipient_id,
    null,
    new.author_id,
    'message_received',
    'Mensagem direta',
    coalesce(author_name, 'Alguem') || ': ' || left(new.body, 120),
    null,
    jsonb_build_object(
      'private_chat_id', new.chat_id::text,
      'message_id', new.id::text
    )
  );

  return new;
end;
$$;

drop trigger if exists private_messages_notify_peer_after_insert on public.private_messages;
create trigger private_messages_notify_peer_after_insert
after insert on public.private_messages
for each row
execute function public.notify_peer_when_private_message_arrives();

do $$
begin
  alter publication supabase_realtime add table public.private_messages;
exception
  when duplicate_object then null;
end;
$$;
