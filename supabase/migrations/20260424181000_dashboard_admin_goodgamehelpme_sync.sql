create or replace function public.sync_dashboard_admin_goodgamehelpme()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from auth.users auth_user
    where auth_user.id = new.user_id
      and lower(auth_user.email) = lower('goodgamehelpme@gmail.com')
  ) then
    insert into public.dashboard_admin_users (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_dashboard_admin_goodgamehelpme on public.profiles;

create trigger profiles_dashboard_admin_goodgamehelpme
after insert or update on public.profiles
for each row
execute function public.sync_dashboard_admin_goodgamehelpme();

do $$
begin
  insert into public.dashboard_admin_users (user_id)
  select profile.user_id
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.user_id
  where lower(auth_user.email) = lower('goodgamehelpme@gmail.com')
  on conflict (user_id) do nothing;
end
$$;
