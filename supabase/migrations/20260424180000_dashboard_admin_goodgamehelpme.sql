do $$
declare
  v_user_id uuid;
begin
  select profile.user_id
  into v_user_id
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.user_id
  where lower(auth_user.email) = lower('goodgamehelpme@gmail.com')
  limit 1;

  if v_user_id is null then
    raise notice 'dashboard admin not granted because user goodgamehelpme@gmail.com was not found in auth.users/profiles';
    return;
  end if;

  insert into public.dashboard_admin_users (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
end
$$;
