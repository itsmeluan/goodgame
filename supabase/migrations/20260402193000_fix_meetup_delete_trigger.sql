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
    return null;
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
