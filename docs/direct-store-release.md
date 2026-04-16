# Direct Store Release

Guia para publicar o app direto na loja, sem rodada prévia em TestFlight.

## Observabilidade já integrada no código

- crash reporting: `@sentry/react-native`
- product analytics: `posthog-react-native`

### Variáveis públicas que ainda precisam ser preenchidas

No arquivo de ambiente local usado para release:

```bash
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_POSTHOG_API_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## O que precisa estar pronto antes de publicar

### Produto

- checklist de QA do iPhone concluído;
- fluxos ponta a ponta validados com mais de uma conta real;
- textos legais revisados;
- suporte e moderação definidos.

### Infra

- Supabase em produção;
- buckets de avatar e imagem de chat funcionando;
- login por e-mail/senha funcionando em build Release;
- Sentry e PostHog configurados, se quiser observabilidade já no primeiro envio;
- push remoto configurado, se quiser incluir essa validação no go-live inicial.

### App Store Connect

- app criado no App Store Connect;
- nome, subtítulo e descrição finalizados;
- screenshots finais;
- ícone final;
- categoria e age rating;
- privacy policy URL;
- support URL;
- app privacy questionnaire preenchido.

## Publicação direta no iOS

### Opção mais segura no estado atual do projeto

Como o projeto está com `ios/` como fonte da verdade, a rota mais consistente é:

1. abrir o projeto no Xcode;
2. selecionar `Release`;
3. gerar `Product > Archive`;
4. enviar pelo Organizer do Xcode ou pelo app Transporter;
5. completar o envio no App Store Connect;
6. escolher `manual release` ou `automatic release after review`.

## Antes de subir o archive

- limpar o build folder;
- confirmar `Bundle Identifier`, signing e version/build;
- conferir permissões em `Info.plist`;
- conferir que o app abre sem Metro;
- validar login, mapa e chat em `Release`.

## Itens críticos para este app

### 1. Login social

Se o app continuar sem exibir login social na UI, Google e Apple não são bloqueadores desta primeira submissão.

### 2. Conteúdo gerado por usuário

Como o app tem chats, perfis, amizades e locais sugeridos, a operação precisa ter:

- bloquear usuário;
- denunciar usuário;
- canal de suporte;
- política de moderação.

### 3. Push remoto

Push precisa ser testado em aparelho físico, fora do Expo Go e fora do Metro, apenas se entrar como requisito do go-live inicial.

## O que eu recomendo marcar como “bloqueador de release”

- qualquer crash em onboarding, mapa ou chat;
- erro de criação/edição de partida;
- erro de criação/edição de local;
- falha de login por e-mail;
- falha de exclusão de conta, denúncia ou bloqueio;
- links legais ou URLs públicas ausentes.
