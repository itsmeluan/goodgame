create or replace function public.ensure_profile_for_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_user record;
  raw_handle text;
  safe_handle text;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select
    id,
    email,
    raw_user_meta_data
  into current_auth_user
  from auth.users
  where id = auth.uid();

  if current_auth_user.id is null then
    raise exception 'Usuario auth nao encontrado';
  end if;

  raw_handle := coalesce(split_part(current_auth_user.email, '@', 1), 'player');
  safe_handle := lower(regexp_replace(raw_handle, '[^a-zA-Z0-9_]+', '', 'g'));

  if safe_handle = '' then
    safe_handle := 'player';
  end if;

  insert into public.profiles (user_id, handle, display_name)
  values (
    current_auth_user.id,
    left(safe_handle, 20) || '_' || replace(left(current_auth_user.id::text, 8), '-', ''),
    coalesce(
      current_auth_user.raw_user_meta_data ->> 'display_name',
      raw_handle,
      'Novo jogador'
    )
  )
  on conflict (user_id) do nothing;
end;
$$;

insert into public.profiles (user_id, handle, display_name)
select
  auth_user.id,
  left(
    case
      when coalesce(
        lower(regexp_replace(split_part(auth_user.email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g')),
        ''
      ) = '' then 'player'
      else lower(regexp_replace(split_part(auth_user.email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g'))
    end,
    20
  ) || '_' || replace(left(auth_user.id::text, 8), '-', ''),
  coalesce(
    auth_user.raw_user_meta_data ->> 'display_name',
    split_part(auth_user.email, '@', 1),
    'Novo jogador'
  )
from auth.users auth_user
left join public.profiles profile on profile.user_id = auth_user.id
where profile.user_id is null
on conflict (user_id) do nothing;

revoke all on function public.ensure_profile_for_current_user() from public;
grant execute on function public.ensure_profile_for_current_user() to authenticated;
