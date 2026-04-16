# Apple Performance Runbook

Data: 2026-04-14

## Objetivo

Este documento define como o GG deve usar as ferramentas da Apple no pos-release para identificar regressoes de performance e acabamento no iPhone.

A meta nao e medir tudo sempre. A meta e manter uma rotina simples, repetivel e comparavel entre versoes.

## Estado atual

- o GG ja envia erros e telemetria via Sentry;
- no iOS, o app agora sobe o SDK nativo com `MetricKit` habilitado via `apps/mobile/src/lib/monitoring.ts`;
- o mapa continua sendo o fluxo principal e, por isso, e a referencia numero 1 de performance percebida.

## Ferramentas oficiais que entram no ritual

- `App Store Connect > Analytics`: tendencias por versao, dispositivo e sistema.
- `Xcode Organizer`: metricas por build publicado, incluindo launch, hangs, memoria e energia.
- `MetricKit`: payloads de diagnostico e performance coletados pelo proprio iOS.
- `Instruments`: investigacao guiada quando alguma release piora ou quando uma tela critica parece pesada.

## Cadencia recomendada

- a cada build enviada para review: rodar baseline local com Instruments.
- no dia da liberacao: revisar Organizer e confirmar que nao houve regressao obvia em launch, hangs e memoria.
- 24 a 72 horas apos a liberacao: revisar App Store Connect e Sentry para sinais de degradacao em producao.
- sempre que um usuario relatar lentidao no mapa, chat ou onboarding: comparar a versao afetada com a anterior no Organizer antes de mexer no codigo.

## Fluxos do GG que viram baseline

- cold launch ate a primeira tela util.
- sessao valida -> aceite legal -> perfil completo -> mapa.
- abrir drawer, filtros e retornar ao mapa.
- pan/zoom do mapa com varios markers visiveis.
- abrir uma partida, entrar nela e abrir o chat.
- enviar mensagem de texto e imagem no chat.
- abrir perfil publico de jogador.
- denunciar e bloquear um usuario.

## Checklist por release

1. Validar localmente o app no iOS Simulator com build nativa, nunca so no Expo Go.
2. Medir cold launch e warm launch no Organizer ou Instruments.
3. Repetir os fluxos baseline no mapa, chat e drawer.
4. Verificar se houve aumento de hangs, uso de memoria ou consumo de energia.
5. Revisar os eventos do Sentry no iOS procurando `MXHangDiagnostic`, `MXCPUException` e `MXDiskWriteException`.
6. Registrar um resumo curto no changelog interno ou na issue da release.

## Padrao local de validacao

- para QA visual e smoke tests locais, o padrao atual do GG e o iOS Simulator;
- o objetivo e ter um ritual rapido e repetivel para validar polish de drawer, sheets, filtros, auth e chat;
- performance real de producao continua sendo acompanhada por Organizer, App Store Connect, Sentry e MetricKit, porque Simulator nao substitui telemetria de device real.

## Como usar cada ferramenta

### Xcode Organizer

Usar para:

- comparar a release atual com a anterior por build;
- observar tempo de launch, memoria, hangs, energia e responsividade;
- identificar se a degradacao e generalizada ou concentrada em um device/OS especifico.

Quando agir:

- piora perceptivel na comparacao com a versao anterior;
- aumento de hangs ou launch regressivo apos mudancas em mapa, chat, imagens ou shell principal.

### App Store Connect Analytics

Usar para:

- acompanhar adoção por versao e sistema;
- ver se uma release com problema esta concentrada em um iPhone ou versao do iOS;
- priorizar investigacao a partir da base real instalada.

### MetricKit

Usar para:

- receber sinais do proprio iOS sobre hangs, CPU, disk write e outros diagnosticos;
- complementar o que chega no Sentry com contexto de performance de producao;
- validar se problemas percebidos no review manual tambem aparecem em uso real.

No GG:

- `MetricKit` fica habilitado no iOS em producao pelo pipeline de monitoramento existente;
- os eventos chegam pelo SDK nativo do Sentry, sem exigir uma segunda infraestrutura agora.

### Instruments

Usar para:

- investigar regressao confirmada ou suspeita forte;
- isolar gargalos do mapa, listas, imagens, realtime e animacoes.

Perfis mais uteis para o GG:

- `Time Profiler`: hotspots de CPU em launch, mapa e chat.
- `Animation Hitches` ou equivalente de rendering: stutter em drawer, overlays e transicoes sobre o mapa.
- `Allocations` / `Leaks`: retenção em imagens, listas e navegação entre telas densas.
- `Energy Log`: custo do mapa, localizacao, polling e realtime.

## Sinais vermelhos no GG

- launch ficando perceptivelmente mais lento antes do mapa.
- drawer ou filtros degradando a navegacao principal.
- chat piorando com historicos maiores ou imagens.
- spikes de memoria ao alternar entre mapa, perfil e chat.
- hangs ou encerramentos apos picos de markers, overlays ou atualizacoes em tempo real.

## Regras de interpretacao

- comparar sempre contra a ultima versao estavel, nao contra sensacao isolada.
- investigar primeiro o fluxo do mapa, porque ele concentra mais trabalho visual e de dados.
- toda mudanca grande em `MapHomeScreen.tsx` precisa passar por baseline de mapa e chat.
- achar um problema no Organizer antes de refatorar poupa retrabalho e reduz regressao.

## Fontes oficiais

- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- App performance na App Store: https://developer.apple.com/app-store/measuring-app-performance/
- App Analytics: https://developer.apple.com/app-store-connect/analytics/
- MetricKit: https://developer.apple.com/documentation/metrickit
- Instruments / CPU optimization (WWDC25): https://developer.apple.com/videos/play/wwdc2025/308
