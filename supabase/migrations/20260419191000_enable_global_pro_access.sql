-- Release posture: keep Pro Player access unlocked for all users until the real App Store
-- subscription flow is implemented and reviewed.

update public.app_config
set
  grant_pro_to_all_users = true,
  updated_at = timezone('utc', now())
where singleton_key = 1;
