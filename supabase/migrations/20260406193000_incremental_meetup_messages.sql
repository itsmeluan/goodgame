drop function if exists public.list_meetup_messages_after(uuid, timestamptz);
create function public.list_meetup_messages_after(
  p_meetup_id uuid,
  p_after timestamptz default null
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
    and (
      p_after is null
      or message.created_at >= (p_after - interval '2 seconds')
    )
  order by message.created_at asc;
$$;

revoke all on function public.list_meetup_messages_after(uuid, timestamptz) from public;
grant execute on function public.list_meetup_messages_after(uuid, timestamptz) to authenticated;
