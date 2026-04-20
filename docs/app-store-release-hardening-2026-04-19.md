# App Store Release Hardening — 2026-04-19

Checklist e decisões de release consolidados para a próxima atualização do Good Game.

## 0. Release candidata atual

- Versão do app: `1.1.0`
- Nome na App Store: `Good Game: Sua Próxima Partida`
- Nome instalado no aparelho: `Good Game`
- Status esperado desta build: pronta para `Submit for Review` depois de preencher os campos manuais do App Store Connect.

## 1. Monetização desta release

- O app **não deve expor** compra dentro do app, checkout de assinatura ou teste grátis nesta versão.
- A flag de release é `EXPO_PUBLIC_PRO_PLAYER_PAYWALL_ENABLED=false`.
- O backend pode manter `grant_pro_to_all_users = true` em `public.app_config` para liberar a experiência sem bloquear jogadores próximos.
- A UI de Pro Player foi mantida no código como base futura, mas fica desligada por padrão até existir integração real com App Store / StoreKit.

## 2. Ajustes aplicados no app

- Nearby Players não bloqueia mais a lista quando o paywall está desligado.
- O modal de teste grátis / assinatura só pode aparecer se a flag de release for ligada.
- O fallback de links compartilhados não aponta mais para `goodgame.app`, que hoje redireciona para um domínio externo de outro produto.
- O app agora usa o site público do GitHub Pages como fallback seguro para links compartilhados, com landing `?meetup=` e `?venue=`.
- `list_nearby_players` foi alinhada para devolver `is_pro` e `pro_expires_at`, respeitando `grant_pro_to_all_users`.
- Perfis públicos não forçam mais um recarregamento visível depois de alguns segundos por causa de refresh de relacionamento.
- O drawer lateral agora pode rolar quando houver conteúdo maior que a altura da tela.
- A sala de chat suporta gesto de swipe da borda esquerda para voltar para a tela anterior.
- O overlay inicial de Novidades no mapa agora respeita fila: se houver mais de uma novidade pendente, elas aparecem da mais antiga para a mais nova.
- O destaque do seletor `Jogos/Locais` foi simplificado para um visual sólido e estável, evitando artefatos gráficos no review.

## 3. URLs públicas para o App Store Connect

- Support URL: `https://itsmeluan.github.io/good-game-pages/support/`
- Privacy Policy URL: `https://itsmeluan.github.io/good-game-pages/privacy/`
- Community Safety URL: `https://itsmeluan.github.io/good-game-pages/safety/`
- Terms of Use URL: `https://itsmeluan.github.io/good-game-pages/terms/`

## 4. App Privacy: pontos para revisar no Connect

Responda o questionário com base **nesta versão publicada**, não em planos futuros.

Coleta/uso visíveis no código desta release:

- conta e identificadores de usuário;
- localização para ordenar jogadores/partidas/locais;
- fotos/imagens escolhidas pelo usuário;
- conteúdo gerado pelo usuário: perfil, chats, partidas, locais;
- notificações push e respectivos tokens operacionais;
- analytics e diagnostics, se `Sentry` / `PostHog` estiverem ativos no ambiente de produção.

## 5. Campos de metadata recomendados

- Nome da App Store: `Good Game: Sua Próxima Partida`
- Nome instalado no aparelho: `Good Game`
- Subtítulo sugerido: `Ache jogadores e partidas`

## 6. Review Notes sugeridas

Use algo nessa linha:

```text
Good Game is a community app for discovering and organizing in-person tabletop and card game meetups nearby.

Important for this review:
- This release supports email/password sign in.
- Social login with Google and Apple is not enabled in this release.
- This release does not expose in-app purchases or subscription checkout.
- The Pro Player trial/purchase UI is disabled in this submitted build.
- Nearby players access is unlocked in this version without App Store payment flow.
- The app includes user-generated content such as public profiles, chats, meetup descriptions, and venue suggestions.
- Users can report and block other users from the public profile screen.
- Account deletion is available inside My Account.
```

## 7. Variáveis de ambiente importantes

Em `apps/mobile/.env.local` ou no ambiente de build:

```env
EXPO_PUBLIC_PRO_PLAYER_PAYWALL_ENABLED=false
EXPO_PUBLIC_MEETUP_SHARE_WEB_BASE=https://itsmeluan.github.io/good-game-pages
EXPO_PUBLIC_SOCIAL_AUTH_ENABLED=false
```

## 8. Pendências manuais antes de clicar em Submit for Review

- preencher no App Store Connect o **Review contact phone** com o número real de contato;
- revisar se a **Support URL** pública está com os dados de contato que você quer expor;
- preencher nas **Review Notes** pelo menos uma conta real de review com e-mail e senha válidos;
- subir screenshots finais e revisar o questionário de App Privacy com a mesma configuração de ambiente usada no archive;
- aumentar o **build number** no Xcode/App Store Connect se já existir uma build `1.1.0` anterior processada;
- validar a build Release em aparelho físico;
- revisar o questionário de App Privacy com base nas variáveis ativas em produção;
- confirmar `grant_pro_to_all_users = true` no Supabase se a intenção for deixar todos liberados nesta versão.
