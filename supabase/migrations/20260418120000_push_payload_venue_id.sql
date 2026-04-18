-- Inclui venueId no payload das push (metadata.venue_id) para deep link em notificações de local.
create or replace function public.queue_push_delivery_from_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_deliveries (
    notification_id,
    user_id,
    push_device_id,
    expo_push_token,
    payload
  )
  select
    new.id,
    new.user_id,
    device.id,
    device.expo_push_token,
    jsonb_build_object(
      'to', device.expo_push_token,
      'sound', 'default',
      'title', new.title,
      'body', new.body,
      'data', jsonb_build_object(
        'notificationId', new.id::text,
        'kind', new.kind::text,
        'meetupId', coalesce(new.meetup_id::text, ''),
        'venueId', coalesce(new.metadata->>'venue_id', ''),
        'deepLink', case
          when new.meetup_id is not null then 'goodgame://'
          else 'goodgame://'
        end
      )
    )
  from public.push_devices device
  where device.user_id = new.user_id
    and device.is_active
    and device.permission_status = 'granted';

  return new;
end;
$$;
