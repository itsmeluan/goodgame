# GG (Good Game)

App mobile em Expo + Supabase para conectar jogadores de card games e jogos de tabuleiro em mesas presenciais, com foco inicial em Magic: The Gathering.

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
- filtros de mapa por entidade, tipo de jogo, formato, distância, data e período;
- criação, edição, entrada, saída e encerramento de partidas presenciais;
- locais para jogar e fluxo de sugestão/gestão de venues;
- chat de grupo por partida com presença, replies, imagem do grupo e sincronização incremental;
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
- gestão de usuários bloqueados.

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
- `cd apps/mobile && npm run lint -- --quiet=false`
- `cd apps/mobile && npx expo-doctor`
- `cd apps/mobile && xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

## Observações importantes

- `react-native-maps` funciona no Expo Go durante desenvolvimento, mas decisões finais de UX/performance devem ser validadas em build nativa.
- O backend deste workspace já está conectado ao projeto Supabase real usado pelo app.
- O `projectId` do EAS já está configurado no projeto.
- Sentry e PostHog já estão integrados no código, mas continuam dependentes das variáveis de ambiente corretas para operação fora de `__DEV__`.
- No iOS, o pipeline atual de monitoramento já sobe `MetricKit` via Sentry para observabilidade de produção.
- Alguns documentos em `docs/` ainda registram o momento pré-lançamento. O `README` deve ser tratado como a referência mais atual do estado do produto.

## Pontos de atenção atuais

- `apps/mobile/src/features/map/MapHomeScreen.tsx` ainda concentra muita responsabilidade.
- `apps/mobile/src/features/chat/MeetupChatPreview.tsx` é legado e pode ser removido depois de uma limpeza final.
- A thread do chat ainda usa `ScrollView`; históricos muito longos merecem atenção.
- Muitos markers simultâneos e algumas animações do mapa ainda pedem profiling em aparelhos mais modestos.
