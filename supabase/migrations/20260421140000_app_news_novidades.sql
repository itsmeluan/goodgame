-- Novidades: mensagens do sistema sem atualizar o app (texto + imagem opcional).
-- Inserir/atualizar linhas via SQL Editor; imagens no bucket público `app-news` (path em image_path).
--
-- Exemplo (só texto, só na lista + bolinha quando novo):
--   insert into public.app_news_items (title, body, show_on_map_cold_start, sort_key)
--   values ('Bem-vindo', 'Texto...', false, 10);
--
-- Exemplo (modal no mapa na 1ª abertura após cold start, e também na lista):
--   insert into public.app_news_items (title, body, image_path, show_on_map_cold_start, sort_key)
--   values ('Novidade', 'Detalhes...', 'folder/banner.png', true, 20);

create table if not exists public.app_news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  image_path text,
  sort_key integer not null default 0,
  is_active boolean not null default true,
  published_at timestamptz not null default timezone('utc', now()),
  /** Se true, pode aparecer em modal no mapa até o usuário dispensar (cold start). */
  show_on_map_cold_start boolean not null default false,
  constraint app_news_title_nonempty check (char_length(trim(title)) > 0)
);

create index if not exists app_news_items_list_idx
  on public.app_news_items (is_active, sort_key desc, published_at desc);

comment on table public.app_news_items is
  'Mensagens de Novidades (conteúdo editorial). Atualização via SQL; clientes só leem via RPC.';

create table if not exists public.app_news_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  inbox_last_opened_at timestamptz not null default to_timestamp(0)
);

create table if not exists public.app_news_cold_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  news_id uuid not null references public.app_news_items (id) on delete cascade,
  dismissed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, news_id)
);

alter table public.app_news_items enable row level security;
alter table public.app_news_user_state enable row level security;
alter table public.app_news_cold_dismissals enable row level security;

-- Sem policies: leitura/escrita só via funções security definer.

drop function if exists public.list_app_news();
create function public.list_app_news()
returns table (
  id uuid,
  title text,
  body text,
  image_path text,
  published_at timestamptz,
  sort_key integer,
  show_on_map_cold_start boolean
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
    n.sort_key,
    n.show_on_map_cold_start
  from public.app_news_items n
  where n.is_active
    and n.published_at <= timezone('utc', now())
  order by n.sort_key desc, n.published_at desc;
$$;

drop function if exists public.count_unread_app_news();
create function public.count_unread_app_news()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  last_open timestamptz;
  c integer;
begin
  select coalesce(s.inbox_last_opened_at, to_timestamp(0))
  into last_open
  from public.app_news_user_state s
  where s.user_id = auth.uid();

  if not found then
    last_open := to_timestamp(0);
  end if;

  select count(*)::integer into c
  from public.app_news_items n
  where n.is_active
    and n.published_at <= timezone('utc', now())
    and n.published_at > last_open;

  return coalesce(c, 0);
end;
$$;

drop function if exists public.mark_app_news_inbox_opened();
create function public.mark_app_news_inbox_opened()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_news_user_state (user_id, inbox_last_opened_at)
  values (auth.uid(), timezone('utc', now()))
  on conflict (user_id) do update
  set inbox_last_opened_at = excluded.inbox_last_opened_at;
end;
$$;

drop function if exists public.get_app_news_cold_start_candidate();
create function public.get_app_news_cold_start_candidate()
returns table (
  id uuid,
  title text,
  body text,
  image_path text,
  published_at timestamptz
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
    n.published_at
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
  order by n.published_at desc, n.sort_key desc
  limit 1;
$$;

drop function if exists public.dismiss_app_news_cold_start(uuid);
create function public.dismiss_app_news_cold_start(p_news_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_news_cold_dismissals (user_id, news_id, dismissed_at)
  values (auth.uid(), p_news_id, timezone('utc', now()))
  on conflict (user_id, news_id) do nothing;
end;
$$;

grant execute on function public.list_app_news() to authenticated;
grant execute on function public.count_unread_app_news() to authenticated;
grant execute on function public.mark_app_news_inbox_opened() to authenticated;
grant execute on function public.get_app_news_cold_start_candidate() to authenticated;
grant execute on function public.dismiss_app_news_cold_start(uuid) to authenticated;

-- Imagens das novidades: leitura pública; envio via Dashboard (service role) ou política futura de admin.
insert into storage.buckets (id, name, public)
values ('app-news', 'app-news', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "app_news_public_read" on storage.objects;
create policy "app_news_public_read"
on storage.objects
for select
to public
using (bucket_id = 'app-news');
