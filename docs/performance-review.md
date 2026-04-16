# Revisão de Performance

Data: 2026-04-02

## Checagens executadas

- `cd apps/mobile && npx tsc --noEmit`
- `cd apps/mobile && npx expo-doctor`

Resultado:

- TypeScript passou sem erro
- `expo-doctor` passou em `17/17` checks

## Pontos positivos atuais

- filtros principais do mapa usam `useDeferredValue`, reduzindo trabalho imediato enquanto o usuário digita;
- realtime do chat fica escopado ao grupo ativo, em vez de escutar todos os grupos ao mesmo tempo;
- overlays e páginas principais ficam montados para evitar flicker visual e remounts desnecessários;
- o mapa abre direto no contexto principal do produto, sem navegação pesada antes da primeira renderização útil;
- dados de demo entram só como fallback visual quando a conta ainda está vazia.

## Riscos de performance ainda existentes

- `apps/mobile/src/features/map/MapHomeScreen.tsx` ainda concentra muita responsabilidade e merece um refactor em componentes menores;
- a thread do chat usa `ScrollView`; para grupos muito grandes, uma `FlatList` tende a escalar melhor;
- muitos markers simultâneos no mapa ainda merecem profiling em aparelhos mais modestos;
- animações e overlays precisam de validação final em build nativa, não apenas no Expo Go.

## Recomendações antes da loja

- testar FPS e memória em build real iOS/Android com algumas dezenas de markers;
- validar grupos com histórico mais longo de mensagens;
- revisar consumo de rede em realtime com duas ou mais contas simultâneas;
- ligar analytics e crash reporting antes de abrir beta externo.
