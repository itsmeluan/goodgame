# GG (Good Game)

App mobile em Expo + Supabase para conectar jogadores de card games e jogos de tabuleiro em mesas presenciais. O catálogo inclui **Magic: The Gathering**, **Tabuleiro** (genérico), **Yu-Gi-Oh!** e **Pokémon TCG**; filtros, perfil e pins do mapa derivam de `public.games` / `public.formats` no Supabase.

## Status oficial

Em 14 de abril de 2026, o GG já estava:

- aprovado no review da Apple;
- publicado e disponível na App Store.

Este `README` passa a funcionar como memória operacional de alto nível do projeto. Se algum documento mais antigo ainda falar em "primeira submissão", "beta" ou "pré-loja", leia como contexto histórico do processo de lançamento, não como status atual do produto.

## O que o GG já entrega hoje

- autenticação por e-mail/senha, criação de conta e recuperação de senha;
- aceite legal versionado antes do uso completo do app;
- onboarding e edição de perfil com foto, localização aproximada, interesses, formatos, disponibilidade e dados opcionais;
- mapa nativo como tela principal do produto;
- navegação map-first com drawer, overlays e páginas auxiliares montadas no shell principal;
- filtros de mapa por entidade, tipo de jogo (vários jogos no catálogo), formato, distância, data e período;
- criação, edição, entrada, saída e encerramento de partidas presenciais;
- locais para jogar e fluxo de sugestão/gestão de venues;
- chat de grupo por partida com presença, replies, imagem do grupo e sincronização incremental; balões do próprio usuário alinhados à cor de marca (laranja `ember`);
- amizades, pedidos de amizade, presença online e perfil público de jogador;
- reputação, presença confirmada e no-show;
- denúncia, bloqueio, desbloqueio e exclusão de conta;
- notificações in-app e base pronta para push remoto;
- dados de demonstração como fallback visual quando a conta ainda está vazia;
- páginas públicas de suporte, privacidade e segurança em `site-public/`.

## Memória operacional: o que não pode regredir

- O fluxo de entrada do app é: sessão -> aceite legal vigente -> perfil completo -> mapa. Isso continua sendo orquestrado por `apps/mobile/src/features/app/AppShell.tsx`.
- O mapa é o centro do produto logado. Não devemos introduzir uma navegação mais pesada antes da primeira renderização útil.
- A localização do usuário deve continuar aproximada por padrão. O produto não deve depender de endereço exato residencial para funcionar.
- A localização do perfil e a localização de uma partida não são a mesma coisa. Essa separação é parte da privacidade e da modelagem do produto.
- Login social existe no código, mas segue escondido por feature flag (`EXPO_PUBLIC_SOCIAL_AUTH_ENABLED`). Não devemos reexpor Google/Apple por acidente.
- O registro de push fica condicionado a sessão válida, aceite legal vigente e permissão concedida.
- Os dados do mapa devem continuar vindo por bounds/região visível, com buffering, em vez de carregar o mundo inteiro de uma vez.
- Os filtros de distância, data e período já existem e não devem sumir em futuras refatorações.
- O chat em tempo real deve continuar escopado ao grupo ativo. Não devemos voltar a escutar todos os grupos ao mesmo tempo.
- O chat já suporta replies, imagem do grupo e sincronização incremental. Essas capacidades fazem parte do estado atual do produto.
- Os dados demo são fallback visual. Eles não substituem gravações reais e não devem contaminar ações persistidas no Supabase.
- Denúncia, bloqueio, desbloqueio e exclusão de conta já estão expostos na interface. Depois da denúncia, o app já oferece a opção de bloquear no mesmo fluxo.
- Bloquear um jogador precisa continuar removendo novas interações visíveis e encerrando a amizade atual, se existir.
- O sistema de amizades já cobre convite, aceite, recusa, cancelamento, remoção e atualização em tempo real.
- O ciclo de meetup já cobre criação, participação, presença, avaliação, no-show e fechamento automático de partidas expiradas.
- Perfis públicos de jogador e gestão de usuários bloqueados já existem e não devem ser tratados como backlog futuro.
- `MapHomeScreen.tsx` ainda é uma tela sensível porque concentra muita lógica. Refactors ali precisam preservar comportamento antes de buscar limpeza estrutural.
- Meetups expõem **`game_slug`** vindo das RPCs `list_meetup_cards` / `list_meetup_cards_in_bounds` (join `formats` → `games`). O app usa isso para pins e filtros; heurísticas em `gameLabels.ts` completam quando o slug ainda não existe.
- Pins no mapa: **Magic** (sprites dedicados), **Tabuleiro** (reutiliza sprites de “dados”), **Yu-Gi-Oh!** e **Pokémon TCG** (sprites e ícones de lista ainda **placeholder** — substituir quando as artes finais estiverem prontas; ficheiros em `apps/mobile/assets/map/marker-meetup-yugioh*` e `marker-meetup-pokemon*`, SVGs em `listRowIconsSvgXml.ts`).

## Estrutura principal

- `apps/mobile`: app Expo/React Native
- `supabase/migrations`: schema, regras de negócio e evolução do backend
- `site-public`: páginas públicas de suporte, privacidade e segurança
- `docs/product-mvp.md`: visão original do produto
- `docs/architecture.md`: arquitetura geral
- `docs/project-map.md`: mapa do projeto
- `docs/performance-review.md`: revisão técnica e de performance
- `docs/release-readiness.md`: checklist histórico de lançamento
- `docs/apple-polish-review.md`: revisão Apple para polish visual e performance
- `docs/apple-performance-runbook.md`: playbook de Organizer, App Store Connect, MetricKit e Instruments

### Snapshots Git (referência)

- `snapshot/app-store-resubmit-2026-04-17` — preparação para nova submissão na App Store: ícones e assets de mapa (Magic/Dice, clusters, venues), ícones SVG em listas de jogos/locais, validação de título de meetup alinhada ao banco (4–80 caracteres), ajustes de auth/perfil público e documentação de revisão. Use `git checkout snapshot/app-store-resubmit-2026-04-17` para rollback ou ramificação.
- `snapshot/app-2026-04-16` — estado consolidado anterior: mapa (games sheet, balões e coordenadas), stack de sheets com botão de voltar dedicado, chat de meetup com balões do próprio usuário na cor de marca (`palette.ember`) e bloco de participantes/pós-jogo.

## Backend

O app usa:

- Supabase Auth
- Postgres
- Realtime
- Storage
- PostGIS

As migrations em `supabase/migrations` já cobrem, além da base inicial:

- controles de safety, bloqueio e denúncia;
- amizades, presença online e avatares;
- readiness de produto, aceite legal, presença e reputação;
- mídia no chat e replies em mensagens;
- perfis públicos de jogador;
- gestão de entidades do mapa e busca/localização de meetup;
- histórico, status e tipos de venue;
- interesses de jogo no perfil;
- refresh de membership de meetup;
- fechamento automático de partidas expiradas;
- sincronização incremental de mensagens;
- feed do dashboard por bounds;
- reparo de auth/profile;
- campos opcionais de perfil;
- exclusão de conta e realtime de amizades;
- gestão de usuários bloqueados;
- catálogo ampliado de jogos e formatos (Tabuleiro, Yu-Gi-Oh!, Pokémon TCG) e coluna lógica `game_slug` nas RPCs de cards de meetup (`20260417180000_catalog_games_tabuleiro_yugioh_pokemon.sql`).

## Rodando localmente

```bash
cd apps/mobile
npm install
npx expo start
```

Para abrir o app no iOS Simulator com build nativa local:

```bash
cd apps/mobile
npx expo run:ios
```

Para iPhone físico com Expo Go:

```bash
cd apps/mobile
npm run start:tunnel
```

## Validações locais úteis

- As validações locais de UI e polish do GG passam a ser feitas por padrão no iOS Simulator, não no Expo Go.
- `cd apps/mobile && npx tsc --noEmit`
- `cd apps/mobile && npx eslint src --max-warnings 0` (o projeto trata avisos do ESLint como falha; corrija antes de merge)
- `cd apps/mobile && npm run lint -- --quiet=false`
- `cd apps/mobile && npx expo-doctor`
- `cd apps/mobile && xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

## App Store Connect (revisão e URLs)

Antes de enviar cada build, confira no App Store Connect que **Support URL**, **Privacy Policy URL** e (se usado) **Marketing URL** apontam para páginas HTTPS públicas, sem login, com conteúdo coerente com o app e com o questionário de privacidade da loja. O site estático em `site-public/` é publicado no GitHub Pages; as URLs usadas na documentação de submissão são:

- Suporte: `https://itsmeluan.github.io/good-game-pages/support/`
- Privacidade: `https://itsmeluan.github.io/good-game-pages/privacy/`
- Segurança e moderação: `https://itsmeluan.github.io/good-game-pages/safety/`

Se o repositório ou o domínio de Pages mudar, atualize estas URLs no Connect **e** em `docs/good-game-submission-package.html` para não haver divergência. O binário iOS já declara `ITSAppUsesNonExemptEncryption` como `false` e inclui textos de uso para localização e fotos em `Info.plist` (revisar se novas permissões forem adicionadas).

## Observações importantes

- `react-native-maps` funciona no Expo Go durante desenvolvimento, mas decisões finais de UX/performance devem ser validadas em build nativa.
- O backend deste workspace já está conectado ao projeto Supabase real usado pelo app.
- O `projectId` do EAS já está configurado no projeto.
- Sentry e PostHog já estão integrados no código, mas continuam dependentes das variáveis de ambiente corretas para operação fora de `__DEV__`.
- No iOS, o pipeline atual de monitoramento já sobe `MetricKit` via Sentry para observabilidade de produção.
- Alguns documentos em `docs/` ainda registram o momento pré-lançamento. O `README` deve ser tratado como a referência mais atual do estado do produto.

## Pontos de atenção atuais

- `apps/mobile/src/features/map/MapHomeScreen.tsx` ainda concentra muita responsabilidade.
- A thread do chat ainda usa `ScrollView`; históricos muito longos merecem atenção.
- Muitos markers simultâneos e algumas animações do mapa ainda pedem profiling em aparelhos mais modestos.
- Arte final para pins e ícones de lista **Yu-Gi-Oh!** e **Pokémon TCG** (hoje cópias/placeholders dos assets de dados e letras Y/P nos SVGs).
