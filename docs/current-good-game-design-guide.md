# Good Game Current Design Guide

Guia de referencia visual para criar novos apps com a linguagem do Good Game atual, observado na versao da App Store `1.1.1` e nos componentes atuais do app. Este documento descreve o estilo que deve ser copiado daqui para frente; nao use codigos visuais antigos do repositorio como fonte de verdade quando eles divergirem deste guia.

## Principio Visual

Good Game e um app de mapa social com interface escura, densa e tactil. A tela principal deve parecer um mapa vivo coberto por vidro Apple escuro, sheets flutuantes e controles compactos. O visual nao e um tema medieval, pergaminho ou board-game ornamental. A fantasia vem dos assets de jogos e pins, nao de molduras decorativas.

O app atual combina:

- Base quase preta fria, puxando para azul/carvao.
- Superficies de vidro escuro, com bordas finas e brilho sutil.
- Um unico acento coral/laranja para acao, selecao e destaque.
- Texto em tons quentes claros, mas usado sobre fundo frio.
- Layout mobile-first com bottom sheet, drawer lateral, listas iOS e gestos.
- Movimento curto, responsivo, com springs e easing cubic.

## Fontes De Verdade

Use estes arquivos como referencia tecnica quando estiver implementando em React Native:

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/components/AppleGlassSurface.tsx`
- `apps/mobile/src/components/PrimaryButton.tsx`
- `apps/mobile/src/components/AppleListNavigation.tsx`
- `apps/mobile/src/components/ChoiceChip.tsx`
- `apps/mobile/src/components/TextField.tsx`
- `apps/mobile/src/features/map/MapHomeScreen.styles.ts`
- `apps/mobile/src/features/map/components/MapGamesSheet.tsx`
- `apps/mobile/src/features/map/components/GamesSheetHeader.tsx`
- `apps/mobile/src/features/map/components/MapCircleActionButton.tsx`
- `apps/mobile/src/features/map/components/MapDrawer.tsx`
- `apps/mobile/src/features/map/components/MapPageLayer.tsx`
- `apps/mobile/src/features/map/components/NewMeetupComposerSheet.tsx`
- `apps/mobile/src/features/map/useMapPanResponders.ts`

## Cores

### Tokens Principais

```ts
const colors = {
  surfaceBase: "#0C0E14",
  chatChromeBand: "#0A1219",
  ink: "#111111",
  ember: "#F18F5C",
  sand: "#F6F2EA",
  parchment: "#E9E2D7",
  pine: "#A49B94",
  mist: "#D2CBC3",
  line: "rgba(231,216,188,0.14)",
  card: "rgba(18,22,28,0.78)",
  chatBubble: "rgba(20,24,31,0.82)",
  mapSurface: "rgba(14,18,24,0.8)",
  watermelon: "#E14D5C",
};
```

### Uso

- `#0C0E14` e o fundo canonico para app, sheets, paginas, loading e overlays. Use como plano base, nao como detalhe.
- `#F18F5C` e o acento principal. Use em botoes primarios, tabs ativas, chips selecionados, icones importantes, links e status de destaque.
- `#F6F2EA` e texto principal sobre fundo escuro.
- `#E9E2D7` e texto/linha secundaria mais quente.
- `#A49B94` e metadata, labels, subtitles e chevrons.
- `#D2CBC3` e texto de apoio.
- `#E14D5C` e apenas danger/unread/destructive.
- Evite paletas dominadas por bege, marrom, dourado, roxo ou azul saturado. O bege existe como texto e linha, nao como fundo dominante.

## Superficies E Vidro

O vidro e a assinatura visual atual. Ele deve parecer uma camada fisica sobre o mapa ou sobre a base escura.

### Apple Glass

Variantes:

- `dark`: vidro principal para sheets, drawer, campos, botoes ghost e cards.
- `accent`: vidro/acento coral para CTA e estados ativos.
- `light`: usado pontualmente em botoes sobre mapa, quando o icone precisa ficar escuro e legivel.

Valores visuais:

```ts
darkGlass = {
  backgroundColor: "rgba(8,9,11,0.26)",
  borderColor: "rgba(255,255,255,0.12)",
};

accentGlass = {
  backgroundColor: "rgba(241,143,92,0.18)",
  borderColor: "rgba(241,143,92,0.38)",
};

lightGlass = {
  backgroundColor: "rgba(255,255,255,0.1)",
  borderColor: "rgba(255,255,255,0.24)",
};
```

Fallback Android:

- Vidro escuro vira `#0D1526`, opaco o suficiente para nao deixar o mapa vazar.
- Vidro claro vira `#F8F6F1`.
- Acento vira `rgba(241,143,92,0.96)`.

### Bleed De Vidro

Sheets e paginas podem sangrar o vidro `16px` alem das bordas laterais para limpar a curvatura da tela. O conteudo continua alinhado ao grid interno.

## Espacamento E Radius

```ts
const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};
```

Regras:

- Gutters de sheet/lista: `12px`.
- Gutter de paginas completas: normalmente `20px`.
- Cards e blocos: `26px`.
- Campos: `18px` a `26px`, dependendo do peso.
- Botoes e chips: sempre pill.
- Bottom sheets principais: topo com `30px` nos cantos superiores.
- Icon buttons circulares: `40px`, `42px`, `46px` ou `56px`, sempre com radius metade do tamanho.

## Tipografia

Use a fonte padrao do sistema. O visual depende de peso, tamanho e contraste, nao de fonte customizada.

Escala recorrente:

- Titulo grande de sheet/composer: `28px`, `700`.
- Titulo de pagina: `22px`, `800`.
- Titulo de detalhe: `20px`, `800`.
- Titulo de secao/lista: `16-18px`, `700-800`.
- Row principal: `15-17px`, `700-800`.
- Corpo: `14px`, line-height `20px`.
- Metadata: `12-13px`, line-height `16-19px`.
- Labels uppercase/status: `10-11px`, `700-800`, letter spacing `0.5-0.7`.

Evite letter spacing negativo. A excecao atual e pontual no titulo do composer/schedule; para novos apps prefira `0` salvo necessidade muito controlada.

## Botoes

### Primario

O botao primario e pill, coral, compacto e com texto escuro.

```ts
primaryButton = {
  minHeight: 46,
  borderRadius: 999,
  backgroundColor: "#F18F5C",
  borderColor: "rgba(255,255,255,0.14)",
  labelColor: "#111111",
  labelSize: 14,
  labelWeight: "700",
  shadowColor: "#F18F5C",
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
};
```

Estado pressed: opacity `0.92`, scale `0.985`.

### Ghost

Ghost e vidro escuro com borda quente quase invisivel:

```ts
ghostButton = {
  minHeight: 46,
  backgroundColor: "rgba(255,255,255,0.012)",
  borderColor: "rgba(233,226,215,0.1)",
  labelColor: "#F6F2EA",
};
```

### Danger

Danger solido, sem vidro:

```ts
dangerButton = {
  backgroundColor: "#D97075",
  labelColor: "#1A1A1A",
  shadow: "none",
};
```

Use `#E14D5C` para danger ghost, unread dots e icones destrutivos de lista.

## Chips E Segmented Controls

Chips seguem a mesma logica dos botoes:

- Selecionado: fundo `#F18F5C`, texto `#111111`, borda `rgba(17,17,17,0.12)`.
- Nao selecionado: vidro escuro, fundo `rgba(255,255,255,0.015)`, borda `rgba(231,216,188,0.08)`, texto `#F6F2EA`.
- Padding: horizontal `16px`, vertical `9px`.
- Pressed: opacity `0.9`, scale `0.98`.

Tabs segmentadas, como Jogos/Locais:

- Rail: pill, min-height `48px`, padding `4px`, fundo `rgba(255,255,255,0.015)`, borda `rgba(231,216,188,0.08)`.
- Highlight: pill coral, com sombra coral leve, animado horizontalmente em `300ms`.
- Label ativo: `#111111`, `17px`, `700`.
- Label inativo: `#E9E2D7`.

## Inputs E Formularios

Campos de texto:

```ts
textField = {
  shellMinHeight: 50,
  borderRadius: 26,
  borderColor: "rgba(231,216,188,0.06)",
  backgroundColor: "rgba(255,255,255,0.015)",
  labelColor: "#A49B94",
  textColor: "#F6F2EA",
  placeholderColor: "#A49B94",
  fontSize: 16,
};
```

Multiline tem min-height `118px`, padding superior `12px` e line-height `22px`.

Formulario deve ser dividido em blocos com titulos pequenos (`16px`, `800`) e gaps de `8-16px`. Evite formularios em cards brancos ou telas claras.

## Listas

Listas seguem um padrao Apple escuro:

- Row default: min-height `74px`, gap `16px`.
- Row compacta: min-height `64px`, gap `12px`.
- Separador: `rgba(231,216,188,0.08)`.
- Pressed: `rgba(255,255,255,0.03)`.
- Icone leading: circulo de vidro `42px` ou `36px`.
- Icone default: coral.
- Icone ativo: fundo/acento coral, icone `#111111`.
- Icone danger: fundo solido `#E14D5C`, icone claro.
- Label: `17px/800` ou compacto `15px/700`.
- Subtitle: `14px` ou compacto `13px`, cor `#A49B94`.
- Trailing value: coral, `17px/800`.
- Chevron: `#A49B94`, pequeno.

Use grupos `plain` sem card quando a lista esta dentro de drawer/sheet. Use grupo `contained` somente quando precisar de borda `#line` e radius `26px`.

## Cards E Estados

Cards atuais sao baixos em contraste e quase sempre escuros:

```ts
card = {
  backgroundColor: "rgba(18,22,28,0.78)",
  borderRadius: 26,
  borderWidth: 1,
  borderColor: "rgba(231,216,188,0.14)",
  padding: 20,
};
```

Empty state:

- Card `rgba(14,18,24,0.8)`.
- Icon bubble `34px`, fundo `rgba(241,143,92,0.14)`.
- Titulo `15px/700`.
- Corpo `13px`, line-height `19`.

Notices:

- Error: fundo `rgba(124,42,42,0.16)`, borda `rgba(247,176,176,0.34)`.
- Success: fundo `rgba(55,112,86,0.18)`, borda `rgba(147,184,159,0.3)`.
- Neutral: fundo `rgba(255,255,255,0.05)`, borda `rgba(231,216,188,0.1)`.

## Mapa

A home deve priorizar o mapa como cena principal. O mapa nao deve ficar dentro de um card quando for a experiencia primaria.

Regras atuais:

- Mapa imersivo ocupa a tela inteira.
- O estilo do Google Map esconde icones de POI e transit para reduzir ruido.
- Pins sao assets raster dedicados, nao pins genericos do sistema.
- Ha familias de pins por tipo de jogo: Magic, Pokemon, Yu-Gi-Oh, dados/board games, venue, draft e overdue.
- Pins mostram densidade por variantes numeradas (`2`, `3`, ..., `9plus`) em vez de clusters genericos agregados.
- Raio visivel usa fill coral `rgba(241,143,92,0.12)` e stroke `rgba(241,143,92,0.55)`.
- Localizacao do usuario usa azul sistema (`#4A86F7`) dentro de ponto branco.
- Callout de pin e claro, como balao sobre mapa: fundo `rgba(250,248,244,0.98)`, texto escuro, kind label coral.

Callout:

```ts
mapCallout = {
  width: "220-260",
  padding: "16x14",
  borderRadius: 20,
  backgroundColor: "rgba(250,248,244,0.98)",
  borderColor: "rgba(17,26,23,0.06)",
  titleColor: "#101915",
  metadataColor: "#5B6A63",
  shadowOpacity: 0.16,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
};
```

## Bottom Sheet Principal

O sheet de jogos/locais e uma das formas mais importantes do app.

Estrutura:

- Absoluto sobre o mapa.
- `left/right: 12px` no iOS.
- Android pode virar full-width sem radius superior.
- Radius superior `30px`.
- Sombra para cima: shadow color `#050907`, opacity `0.28`, radius `24`, offset `0/-6`.
- Superficie de vidro escuro regular, sem borda, sangrando `16px` nas laterais.
- Header com handle, subtitle central e segmented control.
- Conteudo abaixo do header troca entre scenes com slide horizontal.

Header:

- Padding top `10px`, bottom `20px`, laterais safe-area + `20px`.
- Handle `52x5`, pill, `rgba(231,216,188,0.24)`.
- Subtitle `12px`, cor `#A49B94`.
- Divisor inferior `rgba(231,216,188,0.06)`.

## Composer / Criacao De Jogo

Composer e um sheet alto, nao um modal central.

Estrutura:

- Absoluto, `left/right: 12px`, `bottom: 0`.
- Radius superior `30px`.
- Fundo base `rgba(12,14,20,0.82)` com vidro escuro.
- Padding horizontal `12px`.
- Titulo `28px`, `700`, cor `#F6F2EA`.
- Botao fechar circular `36px` com vidro escuro.
- Hairline dupla abaixo do header: branco `0.09` e parchment `0.09`.
- Conteudo em scroll keyboard-aware.
- Footer fixo com linha superior `rgba(231,216,188,0.1)`, botoes lado a lado.

Schedule strip:

- Linha unica com data e hora.
- Radius `20px`.
- Borda `rgba(231,216,188,0.12)`.
- Dois blocos flex iguais, divisor hairline.
- Label `11px/600`, cor pine.
- Valor `18px/700`, cor sand.
- Pressed `rgba(255,255,255,0.04)`.
- Active `rgba(255,255,255,0.1)`.

## Drawer

Drawer lateral:

- Entra pela esquerda sobre mapa.
- Backdrop `rgba(6,10,9,0.45)`.
- Superficie escura de vidro com bleed `48px`.
- Sombra lateral: color `#040806`, opacity `0.34`, radius `20`, offset `10/0`.
- Header com titulo `Menu`, botao fechar circular de vidro.
- Conteudo usa listas Apple compactas.
- Subpainel de chats desliza horizontalmente dentro do drawer, mantendo a pilha visual.

## Paginas E Scenes

Paginas como Chats, Avisos, Locais, Amigos, Conta e Perfil sao layers sobre o mapa, nao novas telas visualmente desconectadas.

Padrao:

- `SafeAreaView` full-screen.
- Base opaca `#0C0E14`, bloqueando o mapa.
- Vidro escuro por cima como veneer.
- Header com menu `56px` a esquerda, titulo central `22px/800`, avatar ou close a direita.
- Algumas paginas mostram handle central `42x4`; paginas mais "nativas" como amigos, conta, chats e feedback nao mostram handle.
- A pagina pode animar com translateY e scale sobre o mapa.

Header:

- Padding top `10px`, bottom `14px`.
- Gutter safe-area + `20px` para paginas alinhadas a lista.
- Avatar `50px` dentro de area trailing `56px`.

## Gestos

O app atual e orientado por gestos fisicos:

- Bottom sheet vertical: arrastar para expandir/colapsar.
- Tabs do sheet: swipe horizontal entre Jogos e Locais.
- Drawer: edge swipe da esquerda para abrir; swipe horizontal para fechar.
- Paginas: swipe para baixo para dispensar.
- Chat room: edge swipe da esquerda para voltar.
- Tap fora fecha drawer/callout/popovers.

Thresholds recorrentes:

- Comecar pan vertical: `dy > 6-10` e maior que `dx`.
- Comecar pan horizontal: `dx > 8-12` e maior que `dy + 4-6`.
- Trocar tab: `dx > 42` ou velocidade `vx > 0.48`.
- Fechar pagina: projecao `>118`, `dy > 82` ou `vy > 0.72`.
- Fechar chat por edge swipe: progresso `>42%`, drag `>22%` ou `vx > 0.58`.

## Animacao

Movimento deve ser rapido, macio e pouco teatral.

Padroes:

- Easing principal: `Easing.out(Easing.cubic)`.
- Bezier para stack/intro: `Easing.bezier(0.22, 1, 0.36, 1)`.
- Tabs e troca de scene: `300ms`.
- Callout: `220ms`, opacity + translateY + scale.
- Drawer backdrop: abrir `220ms`, fechar `180ms`.
- Page dismiss timing: `228ms`.
- Composer timing: `220ms`.
- Spinner: rotacao linear `900ms`.

Springs recorrentes:

```ts
snappySpring = {
  damping: 25,
  stiffness: 260,
  mass: 0.92,
  overshootClamping: true,
};

sheetSpring = {
  damping: 34,
  stiffness: 220,
  mass: 1,
  overshootClamping: true,
};

drawerSpring = {
  damping: 28,
  stiffness: 250,
  mass: 1,
  overshootClamping: true,
};
```

Use `useNativeDriver: true` para translate, opacity e scale.

## Haptics

Haptics reforcam a sensacao fisica:

- Primario/acento: `soft`.
- Navegacao, chips, rows e selecoes: `selection`.
- Danger/destructive: `warning`.
- Permita `none` apenas quando o gesto ja tiver feedback suficiente.

## Iconografia

Prioridade:

1. SF Symbols no iOS.
2. Material Icons como fallback.
3. SVG custom apenas quando o icone nao existir ou precisa de forma de marca, como o funil de filtro atual.

Icones sao funcionais, nao decorativos. Use-os em botoes, leading de lista, status e meta. Evite ilustrações internas abstratas.

Tamanhos:

- Circle action: icone `20px`.
- Leading list default: `19px`.
- Leading list compact: `16px`.
- Utility: `18px`.
- Chevron: `13px`.

## Densidade E Layout

Good Game atual e compacto, especialmente por ser app de utilidade social.

Regras:

- Nao criar landing page dentro do app.
- A primeira tela de um app com essa linguagem deve ser a ferramenta real: mapa, lista, chat, calendario ou dashboard.
- Evite cards dentro de cards.
- Prefira paginas full-screen, sheets e listas.
- Cards sao para itens repetidos, empty states, notices ou conteudo realmente agrupado.
- Informacao acionavel fica perto do titulo da entidade.
- Acoes primarias ficam no rodape do sheet ou no fim do bloco principal.
- Sempre respeitar safe areas.

## Do / Don't

Do:

- Use `#0C0E14` como base.
- Use vidro escuro com borda fina para superficie.
- Use coral para uma decisao visual por vez: CTA, ativo ou link.
- Use bottom sheets e drawers como estruturas principais.
- Use gestos com thresholds claros.
- Use texto denso e direto.
- Use assets reais para pins, avatars e marcadores.

Don't:

- Nao use fundo bege/pergaminho como tela principal.
- Nao use marrom/dourado como paleta dominante.
- Nao transforme o app em landing page com hero.
- Nao use cards decorativos grandes quando a tela pede lista ou mapa.
- Nao use gradientes roxos/azuis como assinatura.
- Nao substitua pins raster do mapa por markers genericos sem desenho.
- Nao crie animacoes longas, elasticas demais ou chamativas.
- Nao use bordas grossas; quase tudo e hairline ou `1px` translúcido.

## Checklist Para Novos Apps

Antes de considerar um app alinhado ao Good Game atual:

- A tela inicial e uma experiencia funcional, nao marketing.
- O fundo principal e `#0C0E14`.
- Superficies principais usam vidro escuro ou fallback opaco equivalente.
- O acento coral `#F18F5C` aparece em CTAs e selecoes, sem competir com outras cores.
- Botoes primarios sao pill, compactos e com texto escuro.
- Listas usam leading icon circular, separadores sutis e chevrons pequenos.
- Bottom sheets tem topo `30px`, handle e segmented controls quando cabivel.
- Paginas internas parecem layers do mesmo app, nao telas de outro produto.
- Gestos de abrir/fechar/trocar scene funcionam com movimento curto.
- Empty states e notices sao escuros, contidos e sem ilustração grande.
- Android tem fallback visual opaco o suficiente para nao parecer transparente quebrado.
- Nenhum elemento importante depende de codigo visual antigo ou de paleta anterior.
