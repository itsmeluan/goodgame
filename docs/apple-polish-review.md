# Revisao Apple: Performance e Polish do GG

Data: 2026-04-14

## Contexto

Esta revisao foi feita a partir de:

- codigo atual do app em `apps/mobile`;
- configuracao iOS nativa em `apps/mobile/ios`;
- screenshots usados na App Store;
- diretrizes e ferramentas oficiais da Apple para design, performance e observabilidade.

Objetivo:

- aproximar o GG do acabamento esperado por usuarios de iPhone;
- usar melhor as ferramentas da Apple no pos-lancamento;
- reduzir risco de regressao visual e de performance em futuras evolucoes.

## Resumo executivo

O GG ja tem identidade propria e uma base funcional forte, mas ainda transmite mais "app custom cross-platform" do que "produto lapidado para iPhone". O maior ganho agora nao esta em trocar a direcao visual do app, e sim em fazer a interface conversar melhor com o sistema da Apple:

- alinhar tema, materiais, icones e tipografia ao ecossistema iOS;
- aproveitar melhor as ferramentas de diagnostico da Apple apos o lancamento;
- suavizar interacoes-chave com feedback tatil e comportamento mais nativo;
- reduzir inconsistencias entre a configuracao do iOS e o visual real do app.

## Achados prioritarios

### P0. O app parece dark, mas o iOS esta configurado como Light

Hoje o `Info.plist` fixa `UIUserInterfaceStyle` como `Light`, enquanto o app usa uma linguagem visual essencialmente escura no mapa, chat, drawer e sheets. Isso prejudica consistencia com teclado, status bar, componentes do sistema e futuras adaptacoes de contraste/aparencia.

Impacto:

- sensacao de interface "quase nativa";
- risco de comportamento estranho em componentes do sistema;
- base ruim para refinamento visual orientado por HIG.

### P0. O GG nao parece estar usando as ferramentas Apple de observabilidade pos-lancamento

O projeto ja tem Sentry e PostHog, o que e bom, mas nao encontrei integracao com MetricKit nem um fluxo documentado de uso de Xcode Organizer, App Store Connect Analytics e Instruments como rotina de operacao do app na App Store.

Impacto:

- menos visibilidade sobre hangs, memory pressure, energy, launch e performance percebida em dispositivos reais;
- dependencia maior de ferramentas externas para diagnosticos que a Apple ja coleta no proprio ecossistema.

### P1. A linguagem de icones e controles ainda esta pouco alinhada ao iOS

O app usa `MaterialIcons` em praticamente toda a experiencia, apesar de `expo-symbols` ja estar instalado. Isso pesa muito na percepcao de polish no iPhone, especialmente em barra superior, menu, chat, listas e acoes circulares do mapa.

Impacto:

- interface menos coerente com o sistema;
- menor qualidade percebida mesmo quando o layout esta bom;
- perda de escalabilidade visual e de consistencia com tipografia San Francisco.

### P1. O GG ainda usa superficies muito opacas e "pesadas" para elementos flutuantes

Os botoes do mapa, drawer e sheets funcionam, mas estao mais proximos de um estilo custom solido do que do uso de materiais, translucidez e profundidade semantica recomendados pela Apple.

Impacto:

- menos leveza visual;
- hierarquia menos refinada sobre o mapa;
- oportunidade perdida de usar melhor recursos modernos do iOS.

### P1. Tipografia e acessibilidade existem, mas ainda nao parecem tratadas como sistema

Existe boa cobertura de `accessibilityLabel` em varios pontos, mas a composicao visual depende muito de tamanhos fixos, labels em caixa alta, botoes compactos e layouts densos. Isso sugere uma base parcialmente acessivel, porem ainda pouco auditada para Dynamic Type, contraste, espaco e escalabilidade real.

Impacto:

- risco de quebra com texto maior;
- UX menos natural para usuarios com configuracoes de acessibilidade;
- menor aderencia ao acabamento esperado em apps iOS maduros.

### P2. O fluxo de teclado e sheets ainda parece custom demais

O app resolve muita coisa na mao para teclado, scroll e comportamento de sheets. Isso da controle, mas tambem aumenta a chance de pequenas asperezas de UX, especialmente em iPhone, onde insets, keyboard avoidance e transicoes costumam ser muito percebidos.

Impacto:

- possivel jank em formularios e composer;
- manutencao mais cara;
- maior risco de divergencia entre telas.

### P2. Alguns textos de permissao do iOS ainda estao genericos e inconsistentes

Ha descricoes em portugues e outras ainda em ingles generico para camera, microfone e localizacao permanente. Isso nao bloqueia operacao, mas atrapalha confianca e acabamento.

Impacto:

- UX menos polida no momento de permissao;
- sensacao de app menos finalizado.

## Melhorias recomendadas

## 1. Performance com ferramentas Apple

### Adotar rotina fixa de observabilidade Apple

- acompanhar `App Analytics` e crash metrics no App Store Connect por versao, dispositivo e sistema;
- revisar `Xcode Organizer` a cada release para crashes, hangs e metricas por build;
- usar `Instruments` em build nativa para CPU, memoria, energia, rede e animacao;
- adicionar MetricKit no iOS para receber payloads de metricas e diagnosticos diretamente do sistema.

### Foco de profiling no GG

- mapa com muitos markers e overlays simultaneos;
- drawer + bottom sheet + mapa na mesma tela;
- abertura fria do app ate a primeira tela util;
- carregamento e scroll do chat em historicos maiores;
- criacao/edicao de meetup com teclado aberto;
- trocas entre mapa, chat, amigos e conta.

### Ferramentas Apple mais uteis para o GG

- Time Profiler ou CPU Profiler: CPU e hotspots do JS/native que afetam interacao.
- Core Animation / Animation Hitches: identificar stutter em mapa, sheets e transicoes.
- Memory Graph e Leaks: observar listas, imagens e chat.
- Energy Log: validar custo do mapa, location, realtime e notificacoes.
- Xcode Organizer: acompanhar regressao por build real publicado.
- MetricKit: capturar hangs, terminations e sinais de performance em producao.

## 2. Polish visual orientado por iOS

### Trocar a base de iconografia para SF Symbols

- migrar a maior parte de `MaterialIcons` para `expo-symbols`;
- manter Material apenas onde nao houver equivalente claro;
- comecar por topo do mapa, drawer, chat, listas e filtros.

### Alinhar aparencia do app ao sistema

- remover a contradicao entre app escuro e `UIUserInterfaceStyle = Light`;
- decidir se o GG sera dark-first com suporte coerente a system appearance, ou se passara a responder a `useColorScheme`;
- alinhar status bar, teclado, modais e superficies com essa decisao.

### Refinar materiais e profundidade

- usar mais translucidez e material nos controles flutuantes do mapa;
- testar `expo-glass-effect` em botoes circulares, headers flutuantes e drawers;
- reduzir sombras pesadas e substituir por profundidade mais limpa.

### Revisar tipografia como sistema

- reduzir o uso excessivo de caixa alta em labels secundarias;
- usar pesos e hierarquia mais proximos do iOS para titulos, subtitulos e meta;
- testar as principais telas com texto maior e contraste aumentado.

### Adicionar feedback tatil

- incluir haptics ao abrir e fechar drawer e filtros;
- incluir haptics ao confirmar criacao ou entrada em partida;
- incluir haptics ao marcar presenca;
- incluir haptics ao enviar mensagem;
- incluir haptics ao bloquear, denunciar e concluir acoes importantes.

## 3. Ajustes de UX que melhoram a sensacao de app nativo

- revisar sheets para garantir drag handle, padding, corner radius e comportamento de teclado mais consistentes;
- revisar formularios para usar melhor os insets automaticos do iOS quando possivel;
- revisar estados vazios e feedbacks de carregamento para ficarem menos "cartao escuro generico" e mais semanticamente claros;
- revisar os textos de permissao do iOS em portugues claro e especifico ao GG;
- reavaliar o menu lateral para aproximar a hierarquia visual de um painel iOS mais refinado.

## Sequencia sugerida

### Onda 1. Ganho rapido de polish

- corrigir `Info.plist` e estrategia de aparencia;
- revisar textos de permissao;
- migrar os icones principais para SF Symbols;
- adicionar haptics nas acoes mais importantes.

### Onda 2. Diagnostico real de performance

- instituir rotina de Organizer + App Store Connect;
- rodar Instruments em build nativa focando mapa, chat e launch;
- registrar baseline por versao do app.

### Onda 3. Refinamento visual mais profundo

- aplicar materiais/translucidez nas superficies flutuantes;
- ajustar tipografia e escalabilidade;
- revisar sheets, headers e empty states.

### Onda 4. Observabilidade Apple em producao

- integrar MetricKit no iOS;
- ligar ingestao desses eventos para o fluxo operacional do time.

## Status de implementacao

- Onda 1: implementada em 2026-04-14 com SF Symbols, haptics e alinhamento base de aparencia no iOS.
- Onda 2: iniciada em 2026-04-14 com runbook operacional em `docs/apple-performance-runbook.md`.
- Onda 3: iniciada em 2026-04-14 com superficies de vidro compartilhadas no topo do mapa, sheet principal, drawer e filtros, alem de refinamentos de iconografia, haptics e acabamento nas telas de chats, amigos e auth.
- Onda 4: iniciada em 2026-04-14 com `MetricKit` habilitado no iOS pelo pipeline atual de Sentry em `apps/mobile/src/lib/monitoring.ts`.

## Fontes oficiais da Apple

- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- App performance na App Store: https://developer.apple.com/app-store/measuring-app-performance/
- App Analytics: https://developer.apple.com/app-store-connect/analytics/
- MetricKit: https://developer.apple.com/documentation/metrickit
- Instruments / CPU optimization (WWDC25): https://developer.apple.com/videos/play/wwdc2025/308
- SF Symbols: https://developer.apple.com/sf-symbols/

## Conclusao

O GG nao precisa abandonar sua identidade para ficar mais Apple-like. O melhor caminho e preservar a energia propria do produto, mas trocar os elementos mais "custom duros" por escolhas que aproveitem melhor o sistema da Apple. Isso deve elevar a percepcao de qualidade sem descaracterizar o app.
