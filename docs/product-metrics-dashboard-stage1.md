# Dashboard de Metricas do Produto - Etapa 1

Esta etapa entrega um dashboard web em `site-public/dashboard/` conectado ao Supabase atual do Good Game, usando apenas dados reais que ja existem hoje no projeto e no banco.

## O que foi criado

- pagina web estatica para navegador:
  - `site-public/dashboard/index.html`
  - `site-public/dashboard/dashboard.css`
  - `site-public/dashboard/dashboard.js`
- migration Supabase:
  - `supabase/migrations/20260424120000_product_metrics_dashboard_stage1.sql`

## Estrutura de dados utilizada

O dashboard usa apenas tabelas ja existentes no projeto:

- `public.profiles`
  - total de usuarios, novos usuarios, base Pro, regiao aproximada
- `public.player_games`
  - filtro por jogo no recorte de usuarios
- `public.games`
  - dimensao de jogos
- `public.meetup_posts`
  - total de partidas, crescimento, status operacionais, top criadores
- `public.formats`
  - vinculo de meetup com jogo
- `public.venues`
  - enriquecimento de regiao de meetup
- `public.app_feedback`
  - feedback total, por tipo, por periodo, por plataforma, por versao e lista recente
- `public.push_devices`
  - apenas como sinal auxiliar para avaliar cobertura de plataforma na base
- `public.app_config`
  - comportamento global do Pro Player
- `public.dashboard_admin_users`
  - allowlist de quem pode abrir o dashboard

## Acesso e seguranca

O dashboard foi desenhado para abrir no navegador sem expor metricas privadas publicamente:

1. a pagina pede `Supabase URL` e `anon key`;
2. a pagina autentica com e-mail e senha via Supabase Auth;
3. as RPCs do dashboard exigem usuario autenticado e presence em `dashboard_admin_users`.

### Habilitar acesso para seu usuario

Depois de aplicar a migration, rode no SQL Editor do Supabase:

```sql
select user_id, handle, display_name
from public.profiles
order by created_at desc;
```

Em seguida, adicione o usuario que podera abrir o dashboard:

```sql
insert into public.dashboard_admin_users (user_id)
values ('SEU-USER-ID-AQUI')
on conflict (user_id) do nothing;
```

## Como rodar localmente

Opcao 1:

```bash
cd /Users/martinsluan/good-game
python3 -m http.server 4173
```

Depois abra:

`http://localhost:4173/site-public/dashboard/`

Opcao 2:

```bash
cd /Users/martinsluan/good-game/site-public
npx serve .
```

Depois abra `/dashboard/`.

## RPCs criadas

- `dashboard_product_metadata()`
- `dashboard_product_summary(p_game_slug, p_region, p_pro_status, p_feedback_type)`
- `dashboard_product_growth(p_days, p_game_slug, p_region, p_pro_status)`
- `dashboard_product_operations(p_days, p_game_slug, p_region)`
- `dashboard_product_feedback(p_days, p_feedback_type)`

## Metricas implementadas nesta etapa

### Resumo executivo

- total de usuarios cadastrados
- novos usuarios hoje
- novos usuarios ultimos 7 dias
- novos usuarios ultimos 30 dias
- total de partidas criadas
- partidas criadas hoje
- partidas criadas ultimos 7 dias
- partidas criadas ultimos 30 dias
- total de feedbacks recebidos
- total de usuarios com Pro ativo
- percentual de usuarios Pro

### Crescimento

- evolucao diaria de novos usuarios
- evolucao semanal de novos usuarios
- evolucao mensal de novos usuarios
- evolucao diaria de partidas criadas
- evolucao semanal de partidas criadas
- evolucao mensal de partidas criadas
- comparacao entre periodo atual e periodo anterior para usuarios
- comparacao entre periodo atual e periodo anterior para partidas

### Uso operacional

- partidas por regiao
- partidas por tipo de jogo
- partidas abertas/ativas
- status operacionais (`open`, `filled`, `closed`, `cancelled`)
- usuarios com mais partidas criadas
- distribuicao temporal de criacao de partidas por hora UTC

### Feedback

- quantidade total de feedbacks
- feedbacks por tipo
- feedbacks por periodo
- feedbacks por plataforma
- feedbacks com versao do app
- tabela de feedbacks recentes

### Pro Player

- total de usuarios Pro ativos
- percentual da base com Pro
- indicacao se o flag global `grant_pro_to_all_users` esta afetando o calculo

## O que ainda nao pode ser calculado com precisao hoje

- DAU, WAU e MAU confiaveis no banco principal
- retencao por cohort
- funil de onboarding
- conversao de paywall/assinatura
- churn
- ativacao por feature
- segmentacao de usuarios por versao do app como metrica historica consolidada
- usuarios Pro recentes com data de ativacao confiavel

## Limitacoes especificas de segmentacao por plataforma

### Ja segmentavel com confianca

- feedback por iOS e Android
- feedback por versao do app

### Ainda nao segmentavel com confianca

- total de usuarios por iOS e Android
- novos usuarios por iOS e Android
- partidas criadas por iOS e Android
- usuarios Pro por iOS e Android
- crescimento consolidado de usuarios/meetups por plataforma

### Observacao importante

Existe dado de plataforma em `push_devices`, mas ele representa apenas dispositivos registrados e nao a origem nativa de cada cadastro, meetup ou evento de produto. Por isso, nesta etapa ele aparece apenas como indicativo de cobertura e nao como segmentacao oficial das metricas principais.

## Proximos passos recomendados

1. Registrar plataforma e versao de forma estruturada nos eventos principais do produto:
   - cadastro concluido
   - criacao de meetup
   - entrada em meetup
   - conversao Pro
   - feedback

2. Criar uma tabela de eventos de produto com colunas minimas:
   - `event_name`
   - `user_id`
   - `platform`
   - `app_version`
   - `occurred_at`
   - `context jsonb`

3. Persistir plataforma de origem de conta no momento do onboarding ou primeiro login validado.

4. Persistir historico de ativacao Pro com data de inicio e origem da conversao.

5. Na etapa seguinte, adicionar:
   - DAU/WAU/MAU confiaveis
   - cohorts de retencao
   - funil de onboarding
   - comparacao multiplataforma real de usuarios, meetups e monetizacao
