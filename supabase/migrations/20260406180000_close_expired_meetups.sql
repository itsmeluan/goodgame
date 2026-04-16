create or replace function public.close_expired_meetups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer := 0;
begin
  update public.meetup_posts
  set status = 'closed'
  where status not in ('closed', 'cancelled')
    and starts_at <= now() - interval '24 hours';

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function public.close_expired_meetups() from public;
grant execute on function public.close_expired_meetups() to authenticated;
