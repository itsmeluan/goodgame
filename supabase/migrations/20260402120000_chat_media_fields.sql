alter table public.meetup_posts
add column if not exists chat_image_path text;

insert into storage.buckets (id, name, public)
values ('meetup-chat-images', 'meetup-chat-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "meetup_chat_images_public_read" on storage.objects;
create policy "meetup_chat_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'meetup-chat-images');

drop policy if exists "meetup_chat_images_insert_own" on storage.objects;
create policy "meetup_chat_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'meetup-chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meetup_chat_images_update_own" on storage.objects;
create policy "meetup_chat_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'meetup-chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'meetup-chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meetup_chat_images_delete_own" on storage.objects;
create policy "meetup_chat_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'meetup-chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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
        where attendance_status in ('going', 'on_the_way', 'arrived', 'left')
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
      when visibility.is_location_exact and venue.name is not null then venue.name
      when venue.neighborhood is not null then venue.neighborhood
      when profile.neighborhood is not null then profile.neighborhood
      else 'Região aproximada'
    end as address_label,
    case
      when visibility.is_location_exact and venue.name is not null then venue.name
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

drop function if exists public.list_meetup_messages(uuid);
create function public.list_meetup_messages(p_meetup_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar_path text,
  sent_at timestamptz,
  body text
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
    message.body
  from public.meetup_messages message
  join public.profiles profile on profile.user_id = message.author_id
  where message.meetup_id = p_meetup_id
    and exists (
      select 1
      from public.meetup_members member
      where member.meetup_id = p_meetup_id
        and member.user_id = auth.uid()
    )
  order by message.created_at asc;
$$;

create or replace function public.set_my_meetup_chat_image(
  p_meetup_id uuid,
  p_chat_image_path text
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
    raise exception 'Usuário não autenticado';
  end if;

  update public.meetup_posts
  set chat_image_path = nullif(trim(coalesce(p_chat_image_path, '')), '')
  where id = p_meetup_id
    and creator_id = current_user_id;

  if not found then
    raise exception 'Apenas o criador pode atualizar a imagem do grupo';
  end if;
end;
$$;

revoke all on function public.list_meetup_cards() from public;
grant execute on function public.list_meetup_cards() to authenticated;

revoke all on function public.list_meetup_messages(uuid) from public;
grant execute on function public.list_meetup_messages(uuid) to authenticated;

revoke all on function public.set_my_meetup_chat_image(uuid, text) from public;
grant execute on function public.set_my_meetup_chat_image(uuid, text) to authenticated;
