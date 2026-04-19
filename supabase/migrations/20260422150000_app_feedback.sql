-- Feedback in-app: envios autenticados via RPC (sem acesso direto à tabela).

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_type text not null,
  message text not null,
  app_area text,
  app_version text,
  platform text,
  user_email text,
  user_display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint app_feedback_type_check check (
    feedback_type in ('bug', 'suggestion', 'praise', 'question')
  ),
  constraint app_feedback_message_nonempty check (char_length(trim(message)) > 0),
  constraint app_feedback_message_len check (char_length(message) <= 8000)
);

create index if not exists app_feedback_created_idx
  on public.app_feedback (created_at desc);

comment on table public.app_feedback is
  'Feedback enviado pelo app (bugs, sugestões, etc.). Leitura apenas no painel/SQL; escrita via submit_app_feedback.';

alter table public.app_feedback enable row level security;

revoke all on public.app_feedback from public;
revoke all on public.app_feedback from anon, authenticated;

drop function if exists public.submit_app_feedback(text, text, text, text, text);

create function public.submit_app_feedback(
  p_feedback_type text,
  p_message text,
  p_app_area text default null,
  p_app_version text default null,
  p_platform text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_display_name text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_feedback_type is null
     or p_feedback_type not in ('bug', 'suggestion', 'praise', 'question') then
    raise exception 'invalid_feedback_type';
  end if;

  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'message_required';
  end if;

  select u.email::text into v_email from auth.users u where u.id = v_uid;
  select p.display_name into v_display_name from public.profiles p where p.user_id = v_uid;

  insert into public.app_feedback (
    user_id,
    feedback_type,
    message,
    app_area,
    app_version,
    platform,
    user_email,
    user_display_name
  )
  values (
    v_uid,
    p_feedback_type,
    trim(p_message),
    nullif(trim(coalesce(p_app_area, '')), ''),
    nullif(trim(coalesce(p_app_version, '')), ''),
    nullif(trim(coalesce(p_platform, '')), ''),
    v_email,
    v_display_name
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_app_feedback(text, text, text, text, text) from public;
grant execute on function public.submit_app_feedback(text, text, text, text, text) to authenticated;
