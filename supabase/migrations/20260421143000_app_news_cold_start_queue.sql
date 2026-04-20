drop function if exists public.list_app_news_cold_start_queue();
create function public.list_app_news_cold_start_queue()
returns table (
  id uuid,
  title text,
  body text,
  image_path text,
  published_at timestamptz,
  sort_key integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.title,
    n.body,
    n.image_path,
    n.published_at,
    n.sort_key
  from public.app_news_items n
  where n.is_active
    and n.published_at <= timezone('utc', now())
    and n.show_on_map_cold_start
    and not exists (
      select 1
      from public.app_news_cold_dismissals d
      where d.user_id = auth.uid()
        and d.news_id = n.id
    )
  order by n.sort_key asc, n.published_at asc;
$$;

grant execute on function public.list_app_news_cold_start_queue() to authenticated;
