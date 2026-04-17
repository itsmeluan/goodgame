# Release Readiness

## Produto já implementado

- mapa como tela principal do app;
- criação e descoberta de jogos presenciais;
- chat de grupo por jogo;
- avisos in-app;
- lista de locais para jogar;
- conta, reputação, presença e no-show;
- amizades, pedidos de amizade, bloqueio e denúncia;
- aceite legal versionado;
- exclusão de conta.

## Infra já pronta

- Supabase Auth, Postgres, Realtime, Storage e PostGIS;
- push devices e base para push remoto;
- storage para avatar e imagem do grupo;
- migrations versionadas no repositório.

## O que já foi preparado no projeto

- perfis EAS para `development`, `preview`, `beta` e `production`;
- scripts de build e submit no `apps/mobile/package.json`;
- `projectId` do EAS configurado no app;
- fallback para `EXPO_PUBLIC_EAS_PROJECT_ID` no registro de push;
- documentação operacional atualizada para beta e publicação.
- login social escondido por feature flag até as credenciais finais ficarem prontas (`EXPO_PUBLIC_SOCIAL_AUTH_ENABLED=true`).
- páginas públicas de suporte, privacidade e segurança já publicadas.
- denúncia, bloqueio, desbloqueio e exclusão de conta disponíveis na interface.

## O que ainda falta antes de publicar

- ícone final do app, splash, screenshots e texto das lojas (para uma nova versão, revisar se assets ainda representam o produto);
- rodada forte de QA em build nativa;
- contas de review prontas e confirmadas;
- revisão final dos campos do App Store Connect (URLs de suporte e privacidade HTTPS, questionário de privacidade alinhado ao app);
- testes com duas contas reais em iOS;
- archive/upload final do app principal no Xcode ou via EAS Submit.

## Dependências externas obrigatórias

- Apple Developer
  Necessário para TestFlight e App Store. `Sign in with Apple` só volta a ser requisito quando o login social for reativado.

- Google Play Console
  Necessário para Android internal testing e publicação na Play Store.

- Expo / EAS
  Necessário para gerar builds nativas e upload via EAS, se desejado.

- Supabase Auth providers
  Google e Apple só são necessárias quando o login social for reativado.

## Push remoto: o que falta exatamente para uma release futura

1. Confirmar que o `projectId` continua correto no projeto e no ambiente usado para build.
2. Gerar uma build nativa.
3. Testar push em aparelho físico fora do Expo Go.

## Build e submit

Dentro de `apps/mobile`:

```bash
npx eas-cli login
npm run eas:build:beta:ios
npm run eas:build:beta:android
npm run eas:submit:beta:ios
npm run eas:submit:beta:android
```

Produção:

```bash
npm run eas:build:prod:ios
npm run eas:build:prod:android
npm run eas:submit:prod:ios
npm run eas:submit:prod:android
```

## Checklist operacional

- validar login por e-mail em build real;
- validar permissões de localização, fotos e notificações;
- validar criação, edição, cancelamento e encerramento de partida;
- validar denúncia, bloqueio, desbloqueio e exclusão de conta;
- validar App Store privacy labels e Google Play Data safety;
- validar o fluxo com 2 contas reais;
- subir beta interno antes de abrir para usuários externos, se desejar.

## Observabilidade

Já está integrado no código:

- crash reporting: Sentry;
- product analytics: PostHog.

Ainda falta configurar os valores de produção:

- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_POSTHOG_API_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`

## Status recomendado hoje

O projeto está em ponto bom para:

- beta interno / fechado;
- TestFlight;
- Google Play internal testing.
- submissão inicial na App Store com login por e-mail/senha.

Ainda não está em ponto ideal para loja pública sem:

- screenshots finais;
- contas de review prontas;
- QA nativo forte concluído;
- App Store Connect preenchido e revisado.

## Itens não bloqueadores para tratar depois da primeira submissão

- reativar e fechar login social com Google e Apple;
- validar e ligar push remoto fim a fim;
- configurar Sentry e PostHog com chaves de produção;
- continuar o desmembramento de `MapHomeScreen.tsx` em subfeatures menores;

## Checklist rápido Apple (revisão de binário)

- **Permissões**: cada chave em `Info.plist` com texto claro em português; não pedir permissão antes do contexto de uso.
- **Criptografia**: `ITSAppUsesNonExemptEncryption` coerente com o que o app faz (hoje `false` no projeto nativo).
- **Conta de demonstração**: se o app exigir login, fornecer credenciais nas notas de revisão e garantir que o backend aceite o fluxo.
- **Conteúdo gerado por usuários**: moderação e denúncia acessíveis (o app já expõe denúncia e bloqueio); URL de segurança pública alinhada ao Connect.
- **Rastreamento**: sem ATT, não rastrear entre apps/sites de terceiros sem consentimento; se PostHog/Sentry forem configurados, refletir no questionário de privacidade da loja.
