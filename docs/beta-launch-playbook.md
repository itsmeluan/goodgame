# Beta Launch Playbook

## 1. Preparar contas

- entrar no Expo / EAS com sua conta;
- criar ou acessar Apple Developer;
- criar ou acessar Google Play Console;
- confirmar que o projeto Supabase final será este mesmo.

## 2. Configurar variáveis locais

Em `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_EAS_PROJECT_ID=...
```

## 3. Conectar o app ao EAS

Dentro de `apps/mobile`:

```bash
npx eas-cli login
npx eas-cli init
```

Depois disso, copie o `projectId` para o `.env.local`.

## 4. Configurar login social (opcional para uma release futura)

### Redirect URL do app

`goodgame://auth/callback`

### Callback do Supabase

`https://<seu-project-ref>.supabase.co/auth/v1/callback`

### Onde configurar

- Google Cloud
- Apple Developer
- Supabase Auth > Providers
- Supabase Auth > URL Configuration

## 5. Gerar builds beta

```bash
cd apps/mobile
npm run eas:build:beta:ios
npm run eas:build:beta:android
```

## 6. Subir para teste

```bash
cd apps/mobile
npm run eas:submit:beta:ios
npm run eas:submit:beta:android
```

## 7. Smoke test mínimo

- login por e-mail;
- onboarding;
- criação de partida;
- chat;
- avisos;
- amizades;
- exclusão/cancelamento/encerramento;
- denúncia/bloqueio/desbloqueio.

## 8. Só depois abrir para beta externo

- screenshots finais;
- política de privacidade pública;
- data safety / privacy labels;
- analytics;
- crash reporting;
- suporte e canal de contato.
