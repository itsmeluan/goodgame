# Dashboard de Metricas do Produto - Etapa 2

Esta etapa evolui a ETAPA 1 sem reconstruir a interface. O dashboard em `site-public/dashboard/` continua sendo a entrada principal, agora alimentado tambem por uma trilha oficial de eventos multiplataforma em `public.product_events`.

## O que foi entregue

- nova migration aplicada no Supabase remoto:
  - `supabase/migrations/20260424170000_product_metrics_dashboard_stage2.sql`
- instrumentacao de eventos no app React Native compartilhado entre iOS e Android
- extensao do dashboard existente para:
  - DAU, WAU, MAU
  - stickiness
  - atividade por funcionalidade
  - funil principal
  - retencao D1, D7 e D30
  - cohorts mensais
  - liquidez por regiao
  - comparacao iOS vs Android
  - comparacao por app version
  - historico Pro
  - alertas de saude do produto

## Estruturas criadas no banco

### Tabelas

- `public.product_events`
- `public.product_event_user_markers`
- `public.pro_status_history`

### View

- `public.dashboard_product_events_enriched`

### Functions / RPCs

- `public.track_product_event(...)`
- `public.sync_pro_status_history_for_user(...)`
- `public.dashboard_product_metadata_stage1()`
- `public.dashboard_product_metadata()` atualizado para stage 2
- `public.dashboard_product_advanced_metrics(...)`
- `public.dashboard_product_funnel(...)`
- `public.dashboard_product_retention(...)`
- `public.dashboard_product_alerts(...)`
- `public.dashboard_product_feedback(integer, text, text, text)` sobrecarga nova
- `public.start_pro_trial()` atualizado para sincronizar historico Pro

### Triggers

- `profiles_sync_pro_status_history`
- `app_config_sync_pro_status_history`

## Eventos instrumentados na ETAPA 2

### Ja instrumentados

- `signup_completed`
- `first_app_open`
- `app_opened`
- `onboarding_completed`
- `profile_completed`
- `map_viewed`
- `game_list_viewed`
- `game_details_viewed`
- `profile_viewed`
- `search_performed`
- `filter_used`
- `game_created`
- `game_edited`
- `game_cancelled`
- `game_join_intent_registered`
- `game_contact_action`
- `game_shared`
- `feedback_screen_viewed`
- `feedback_submitted`
- `pro_enabled`
- `pro_feature_used`
- `pro_screen_viewed`
- `first_game_created`
- `first_game_viewed`
- `first_meaningful_action_completed`

### Ainda nao instrumentados como evento de produto explicito

- `pro_disabled`
  - hoje nao existe um fluxo de disable manual claro no app; expiracao e mudancas globais passam a aparecer com confianca em `pro_status_history`

## Arquivos principais alterados

- `apps/mobile/src/lib/appInfo.ts`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/lib/productAnalytics.ts`
- `apps/mobile/src/features/app/AppShell.tsx`
- `apps/mobile/src/features/profile/ProfileSetupScreen.tsx`
- `apps/mobile/src/features/map/MapHomeScreen.tsx`
- `apps/mobile/src/features/map/components/FeedbackPage.tsx`
- `apps/mobile/src/features/map/components/NearbyPlayersPage.tsx`
- `site-public/dashboard/index.html`
- `site-public/dashboard/dashboard.css`
- `site-public/dashboard/dashboard.js`

## Como abrir o dashboard

Se ainda nao estiver com um servidor estatico rodando:

```bash
cd /Users/martinsluan/good-game
python3 -m http.server 4173
```

Abra:

`http://localhost:4173/site-public/dashboard/`

## Acesso

O dashboard continua exigindo:

1. `Supabase URL`
2. `anon key`
3. login com e-mail e senha
4. usuario presente em `public.dashboard_admin_users`

## Observacoes sobre confiabilidade

- DAU/WAU/MAU e stickiness passam a funcionar imediatamente conforme novos eventos entram.
- retencao D1/D7/D30 e cohorts dependem de maturacao temporal dos cohorts de `signup_completed`.
- comparativos oficiais iOS vs Android agora passam a vir de `product_events`, nao de `push_devices`.
- a ETAPA 1 continua preservada para metricas consolidadas vindas de tabelas operacionais.

## Limitacoes atuais

- nao existe historico retroativo completo de eventos antes do rollout da ETAPA 2
- metricas de retencao, cohorts e alguns alertas precisam de mais dias de coleta para ganharem leitura estatistica melhor
- `pro_disabled` ainda nao tem evento de interface dedicado; a fonte oficial para desligamento hoje e o `pro_status_history`
- o painel continua exigindo usuario autorizado em `dashboard_admin_users`

## Validacoes executadas

- `node --check site-public/dashboard/dashboard.js`
- `cd apps/mobile && npx tsc --noEmit`
- `npx supabase migration list`
- `npx supabase db push`
