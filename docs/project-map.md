# Project Map

## Visão geral

O projeto está organizado em duas frentes:

- `apps/mobile`: cliente mobile em Expo/React Native
- `supabase/migrations`: backend, auth, storage, realtime e regras de negócio

## Mobile

### Shell do app

- `apps/mobile/src/features/app/AppShell.tsx`
  Responsável por boot da sessão, aceite legal, carregamento do perfil, registro de push e roteamento entre login, aceite, onboarding e app logado.

### Componentes reutilizáveis

- `apps/mobile/src/components/Avatar.tsx`
- `apps/mobile/src/components/ChoiceChip.tsx`
- `apps/mobile/src/components/GoodGameLogo.tsx`
- `apps/mobile/src/components/PrimaryButton.tsx`
- `apps/mobile/src/components/SheetBackButton.tsx`
  Botão de voltar para stacks de sheet (iOS/Android), usado no fluxo mapa → jogos → detalhes.
- `apps/mobile/src/components/SlidingSheetStack.tsx`
  Stack de conteúdos em sheet com transições e suporte a header com voltar.
- `apps/mobile/src/components/SectionCard.tsx`
- `apps/mobile/src/components/TextField.tsx`

### Entrada e autenticação

- `apps/mobile/src/features/auth/AuthScreen.tsx`
  Landing/login com e-mail, criação de conta e recuperação de senha. Google/Apple continuam preparados, mas escondidos por feature flag nesta primeira release.

- `apps/mobile/src/lib/socialAuth.ts`
  Fluxo OAuth com Supabase Auth e Expo mantido no código para reativação futura.

### Legal

- `apps/mobile/src/features/legal/LegalAgreementScreen.tsx`
- `apps/mobile/src/features/legal/LegalDocumentModal.tsx`
- `apps/mobile/src/features/legal/legalContent.ts`

### Perfil

- `apps/mobile/src/features/profile/ProfileSetupScreen.tsx`
  Onboarding/edição de perfil.

- `apps/mobile/src/features/profile/AvailabilityMatrix.tsx`
  Disponibilidade por dias da semana e períodos.

- `apps/mobile/src/features/profile/ProfileSummaryCard.tsx`

### Mapa e navegação principal

- `apps/mobile/src/features/map/MapHomeScreen.tsx`
  Shell principal do app logado. Concentra:
  - mapa em tela cheia
  - drawer lateral
  - filtros
  - jogos
  - overlays
  - páginas de avisos, locais, amigos e conta
  - integração com notificações, amigos, reputação e safety

- `apps/mobile/src/features/map/InteractiveMap.native.tsx`
  Mapa nativo com markers, localização atual, cone de direção, botão de recentralizar e ancoragem de overlays (ex.: balões) a coordenadas de tela.

- `apps/mobile/src/features/map/components/MapGamesSheet.tsx` e tabs (`GamesSheetMeetupsTab`, `GamesSheetVenuesTab`, etc.)
  Sheet principal de “Jogos” sobre o mapa.

- `apps/mobile/src/features/map/components/MeetupSheetCard.tsx` / `MeetupSheetCardContainer.tsx`
  Card e container de detalhe de meetup dentro do sheet.

- `apps/mobile/src/features/map/components/MeetupSheetParticipantsScene.tsx`
  Cena de participantes do meetup no contexto do sheet.

- `apps/mobile/src/features/map/components/ChatMeetupListLeading.tsx`
  Leading/acessório de lista de chats de meetup no drawer.

- `apps/mobile/src/features/map/InteractiveMap.tsx`
  Fallback web.

- `apps/mobile/src/features/map/mapFilters.ts`
  Filtros de busca do mapa.

### Chat

- `apps/mobile/src/features/chat/MeetupChatScreen.tsx`
  Tela de grupo inspirada em apps de chat, com:
  - cabeçalho do grupo
  - imagem do grupo
  - detalhes recolhíveis
  - strip horizontal de participantes
  - thread de mensagens (balões próprios com fundo em `palette.ember` / laranja de marca)
  - composer estilo mensageria
  - bloco de confiança pós-jogo

- `apps/mobile/src/features/chat/MeetupParticipantsBlock.tsx`
  Bloco de participantes, presença e avaliação pós-partida reutilizável no chat.

- `apps/mobile/src/features/chat/MeetupChatPreview.tsx`
  Componente legado do chat antigo. Pode ser removido depois de uma rodada final de limpeza.

### Localização

- `apps/mobile/src/features/location/LocationPickerMap.native.tsx`
- `apps/mobile/src/features/location/LocationPickerMap.tsx`
- `apps/mobile/src/features/location/LocationPickerMap.types.ts`

### Demo data

- `apps/mobile/src/features/demo/demoData.ts`
  Dados fictícios de fallback para chats, avisos e amigos quando a conta ainda não tem massa crítica real.

### Camada de integração

- `apps/mobile/src/lib/api.ts`
  Cliente de dados do app para Supabase RPC, storage, auth e perfil.

- `apps/mobile/src/lib/supabase.ts`
- `apps/mobile/src/lib/location.ts`
- `apps/mobile/src/lib/notifications.ts`
- `apps/mobile/src/lib/formatting.ts`
- `apps/mobile/src/lib/env.ts`
- `apps/mobile/src/lib/appInfo.ts`

### Tipos e tema

- `apps/mobile/src/types/domain.ts`
- `apps/mobile/src/theme/tokens.ts`

## Backend

### Linha do tempo das migrations

- `supabase/migrations/20260401143000_initial_mvp.sql`
  Base do produto: perfis, formatos, disponibilidade, venues, jogos, membros, mensagens.

- `supabase/migrations/20260401161000_public_catalog_access.sql`
  Leitura pública de catálogo para o app.

- `supabase/migrations/20260401190000_app_flow_helpers.sql`
  Helpers principais para perfil, venues, meetup cards, chat e seeds iniciais.

- `supabase/migrations/20260401203000_meetup_status_notifications.sql`
  Status de jogos e notificações.

- `supabase/migrations/20260401220000_safety_controls.sql`
  Leave group, bloqueio, denúncia e privacidade de localização.

- `supabase/migrations/20260401235000_friends_avatars_games.sql`
  Amigos, presença online, avatares e overview social.

- `supabase/migrations/20260402043000_product_readiness.sql`
  Aceite legal, push, attendance, reputação e readiness de produto.

- `supabase/migrations/20260402120000_chat_media_fields.sql`
  Imagem do grupo, mensagens enriquecidas e campos extras para a nova experiência de chat.

## Fluxos principais do produto hoje

### Usuário deslogado

1. Abre `AuthScreen`
2. Escolhe entrar com e-mail, criar conta ou recuperar senha
3. Após autenticar, passa pelo aceite legal vigente

### Usuário logado sem perfil completo

1. Vai para `ProfileSetupScreen`
2. Define foto, interesses, formatos e dados opcionais de perfil
3. Salva perfil

### Usuário logado

1. Entra em `MapHomeScreen`
2. Vê o mapa em tela cheia
3. Abre `Jogos`, `Filtros`, `Menu`, `Amigos`, `Conta`
4. Pode criar jogo, entrar em grupo, abrir chat, gerenciar presença e ver avisos

## Pontos de atenção

- `MapHomeScreen.tsx` ainda concentra muita lógica; um refactor futuro pode quebrar essa tela em subfeatures menores.
- `MeetupChatPreview.tsx` é legado.
- Os dados fictícios são apenas para preview visual; ações reais continuam vindo do Supabase.
