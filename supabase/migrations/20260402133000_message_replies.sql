alter table public.meetup_messages
add column if not exists reply_to_message_id uuid references public.meetup_messages (id) on delete set null;

create index if not exists meetup_messages_reply_to_idx
on public.meetup_messages (reply_to_message_id);

drop function if exists public.list_meetup_messages(uuid);
create function public.list_meetup_messages(p_meetup_id uuid)
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
  from public.meetup_messages message
  join public.profiles profile on profile.user_id = message.author_id
  left join public.meetup_messages replied_message on replied_message.id = message.reply_to_message_id
  left join public.profiles replied_profile on replied_profile.user_id = replied_message.author_id
  where message.meetup_id = p_meetup_id
    and exists (
      select 1
      from public.meetup_members member
      where member.meetup_id = p_meetup_id
        and member.user_id = auth.uid()
    )
  order by message.created_at asc;
$$;

drop function if exists public.send_meetup_message(uuid, text);
create function public.send_meetup_message(
  p_meetup_id uuid,
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

  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.meetup_messages message
    where message.id = p_reply_to_message_id
      and message.meetup_id = p_meetup_id
  ) then
    raise exception 'A mensagem respondida nao pertence a este grupo';
  end if;

  insert into public.meetup_messages (meetup_id, author_id, body, reply_to_message_id)
  values (p_meetup_id, current_user_id, trim(p_body), p_reply_to_message_id)
  returning id into new_message_id;

  return new_message_id;
end;
$$;

revoke all on function public.list_meetup_messages(uuid) from public;
grant execute on function public.list_meetup_messages(uuid) to authenticated;

revoke all on function public.send_meetup_message(uuid, text, uuid) from public;
grant execute on function public.send_meetup_message(uuid, text, uuid) to authenticated;
