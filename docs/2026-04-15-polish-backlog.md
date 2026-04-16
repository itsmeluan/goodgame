# GG Overnight Polish Backlog — 2026-04-15

## Objetivo

Levar o `GG` a um nível de polish extremamente alto, com padrão visual e de interação consistente em todo o app, seguindo a linguagem Apple e o sistema visual que consolidamos em `Jogos`.

## Norte de design desta rodada

- alinhamento perfeito: qualquer elemento comparável precisa compartilhar o mesmo eixo visual;
- grid único por superfície: header, listas, títulos, botões e campos devem usar a mesma área útil;
- navegação clara: cada tela precisa parecer explicitamente a tela que é;
- glass só na camada funcional: controles e navegação recebem glossy/glass; conteúdo usa materiais mais discretos;
- menos ruído: remover texto explicativo redundante, bordas pesadas e retângulos desnecessários;
- gestures e motion com cara de iPhone: transições suaves, swipe-back previsível e sem jumps;
- consistência total: nenhum menu pode parecer “de outra época” dentro do app.

## Backlog principal

- [x] 1. Alinhar perfeitamente `Voltar`, títulos e listas das sheets internas do drawer de `Jogos` na mesma coluna dos tabs `Jogos/Locais`.
- [x] 2. Fazer uma passada geral no app com foco em melhores práticas Apple e investigar/corrigir a animação do drawer.
- [x] 3. Aplicar o mesmo polish completo no fluxo de `Locais` dentro do drawer.
- [x] 4. Polir o menu lateral e eliminar vazamentos visuais nas bordas superior, inferior e esquerda.
- [x] 5. Aplicar o mesmo sistema visual a `Chats`, `Avisos` e `Histórico`.
- [x] 6. Aplicar o mesmo refinamento a `Amigos` e páginas derivadas.
- [x] 7. Aplicar o mesmo refinamento ao perfil do jogador, público e próprio.
- [ ] 8. Refazer e polir toda a experiência de chat, lista e thread.
- [x] 9. Aplicar glossy iOS consistente a botões redondos e cápsulas, incluindo mapa, drawer e ações internas; refinar também o avatar do topo do mapa.
- [ ] 10. Fazer uma passada final extremamente fina em todo o app garantindo consistência total de spacing, grid, fontes, tamanhos, jornadas, botões, animações e performance.
- [x] 11. Reauditar o grid óptico do menu lateral e de todas as sheets do drawer, comparando a visão real do usuário e não só os números de padding.
- [ ] 12. Refazer `Novo jogo`, `Chats`, `Amigos` e perfil do usuário onde ainda houver resquícios do visual antigo ou falta de material/transparência.
- [ ] 13. Atualizar e corrigir completamente os balões do mapa, incluindo o bug em que locais não exibem balão ao toque.

## Achados adicionais desta madrugada

- [x] Verificar todos os paddings duplicados causados por wrappers internos em `ScrollView`/`SlidingSheetStack`.
- [x] Auditar headers automáticos vs. headers desenhados manualmente para evitar espaço fantasma.
- [ ] Verificar contraste e peso visual dos badges de status (`Passou`, `Seu`, `No chat`, etc.).
- [ ] Auditar todos os CTAs de gestão para garantir que pareçam botões, não itens de lista.
- [ ] Verificar safe areas e bleed visual de superfícies flutuantes no mapa e no drawer lateral.
- [ ] Garantir que ícones e textos do menu lateral fiquem exatamente no mesmo eixo óptico do título `Menu`.
- [ ] Garantir que ícones, `Voltar`, títulos e listas das sheets do drawer usem exatamente a mesma área útil horizontal dos tabs `Jogos/Locais`.
- [ ] Confirmar no Simulator a nova malha óptica entre o eixo do ícone e o eixo do texto nas cenas internas, para evitar microdesalinhamentos “certos no código e errados no olho”.

## Critérios de aceite por rodada

- `npx tsc --noEmit` passa.
- `npm run lint -- --quiet=false` passa.
- Quando a rodada mexer em navegação/layout estrutural, `xcodebuild ... iPhone 17 Pro ... build` passa.
- O backlog é revisitado e atualizado antes de iniciar a próxima rodada.

## Rodadas executadas

### Rodada 1

- backlog vivo criado e alinhado aos 10 tópicos principais;
- jornada de `Jogos` reorganizada em `lista -> grupo -> detalhe -> editar`;
- `Editar partida` deixou de parecer item de lista e virou CTA glossy;
- `Ver detalhes` foi removido da edição;
- `SlidingSheetStack` ajustado para não reservar header fantasma em cenas sem título automático;
- animação do menu lateral corrigida para deixar de “saltar” por causa de `setValue` antes da animação;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 2

- fluxo de `Locais` redesenhado para seguir o mesmo grid e a mesma lógica de jornada do drawer;
- `VenueSheetCard` refeito com raiz, informações e gestão em cenas próprias mais clean;
- badges e CTAs de `Locais` ajustados para a linguagem nova do `GG`;
- `Sugerir local` reorganizado com seções mais claras e menos ruído visual;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 3

- páginas de `Detalhes` e `Editar` em `Jogos` refeitas para ficarem mais finas, modernas e menos “card-like”;
- `Editar partida` deixou de parecer item de lista e virou CTA glossy real dentro da jornada;
- edição deixou de usar campos pesados para `Data` e `Horário`, passando a usar rows nativas no padrão Apple;
- `SlidingSheetStack` ganhou ajuste extra no header compacto para alinhar melhor a navegação interna do drawer;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 4

- `Locais`, menu lateral, `Chats`, `Avisos`, `Histórico`, `Amigos` e `Conta` receberam o mesmo grid-base do drawer de `Jogos`;
- `PlacesPage` deixou de depender de headers automáticos largos e passou a usar leads compactos, mesmo padding lateral e listas compactas;
- menu lateral ganhou bleed visual para esconder as bordas acima, abaixo e à esquerda;
- `DrawerRootPanel` e `DrawerChatsPanel` foram compactados e alinhados ao mesmo eixo do restante do app;
- listas internas de `Chats`, `Avisos`, `Histórico`, `Amigos` e `Conta` começaram a migrar para o mesmo padrão de spacing, títulos compactos e navegação mais silenciosa;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`

### Rodada 5

- superfícies do mapa ganharam um glossy mais controlado e coerente, com avatar do topo recalibrado para o mesmo diâmetro visual dos botões de ação;
- detalhes do chat perderam excesso de inset, ganharam um lead mais claro e ficaram mais próximos do padrão premium que consolidamos no drawer;
- header, composer e bubbles do chat ficaram mais leves e mais materiais, com menos blocos pesados e melhor contraste;
- perfis começaram a receber o mesmo tratamento de glass funcional em áreas sensíveis, como o card de segurança;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 6

- `Novo jogo` passou a usar o mesmo grid-base de `Jogos`, com `SlidingSheetStack` compacto, mesma área útil horizontal do header e leads internos por cena;
- as etapas de composição (`Jogo`, `Detalhes`, `Quando`, `Formato`, `Host`, `Local`, `Revisão`) deixaram de depender de títulos automáticos largos e ficaram mais silenciosas;
- o fechamento do composer recebeu um tratamento glossy mais coerente com os demais controles do mapa e do drawer;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`

### Rodada 7

- `PrimaryButton` foi recalibrado para um glossy mais iPhone-like, com superfícies mais vivas, sombras melhores e pressão mais tátil;
- perfis público, próprio e páginas derivadas ficaram menos “boxy”, com hierarquia mais limpa, menos bordas pesadas e ações mais claras;
- `Conta` e `Bloqueados` começaram a abandonar cards excessivos e migraram para listas/superfícies mais silenciosas;
- o menu lateral ganhou mais bleed à esquerda, em cima e embaixo para esconder melhor suas bordas físicas;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 8

- `Chats`, `Avisos`, `Histórico` e `Drawer > Chats` perderam títulos redundantes nas listas internas, ficando mais silenciosos e mais próximos da linguagem nova do `GG`;
- a thread de chat recebeu um grid mais consistente com o resto do app, com header, detalhes, mensagens, composer e rating strip usando o mesmo eixo e o mesmo padding-base;
- fluxos de sugestão de local ganharam finalização no mesmo padrão do composer de jogo;
- badges de `Jogos` e `Locais` ficaram mais sutis para não “gritarem” dentro das listas;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`

### Rodada 9

- páginas de detalhes e gestão de `Jogos` foram suavizadas de novo, com menos títulos redundantes, menos sensação de “card dentro de card” e ações mais explicitamente tratadas como botões;
- `Voltar ao mapa` recebeu o mesmo tratamento glossy dos demais CTAs principais;
- o chat ganhou mais unificação visual também nas ações de rating e nos cartões auxiliares;
- `Bloqueados` foi reorganizado para seguir o mesmo sistema de listas/spacing do restante da conta;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 10

- o grid-base do drawer foi consolidado no sistema: `AppleListGroup` deixou de “vazar” para fora da área útil, o `SlidingSheetStack` foi recalibrado e `Voltar`, leads e listas ficaram muito mais próximos do mesmo eixo visual;
- `Jogos` ganhou uma passada óptica forte: badges ficaram mais suaves, chevrons e ícones compactos perderam agressividade e a jornada `lista -> grupo -> detalhe -> editar` ficou mais coerente;
- `Detalhes` e `Editar` de `Jogos` foram refinados de novo para parecerem telas finais, com CTAs glossy e menos ruído estrutural;
- `Locais` recebeu o mesmo corte de verbosidade, com `Informações` e `Editar local` mais silenciosos e menos presos a títulos redundantes;
- `Amigos`, `Conta`, `Chats`, `Avisos`, `Histórico`, `Novo jogo` e outras cenas derivadas herdaram o mesmo microalinhamento do drawer;
- o chat foi desencaixotado mais uma vez: detalhes da partida mais leves, gestão menos administrativa e composer de envio com CTA glossy real;
- avatar e badges ficaram mais finos, reduzindo o peso visual herdado da linguagem antiga;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 11

- malha-base recalibrada de novo para atacar o desalinhamento óptico que ainda sobrava: listas compactas, `Voltar`, títulos e cenas internas deixaram de somar inset duplo;
- `Menu` perdeu o texto `Acesso rápido` e os ícones/avatares das listas passaram a usar o mesmo eixo visual do título do drawer;
- `Novo jogo` começou a abandonar a sensação de modal opaco: superfície mais translúcida, fechamento glossy real e menos títulos duplicados entre página e seção;
- o mapa ganhou uma base mais robusta para balões de seleção, com fallback para o pin pressionado e visual do callout mais refinado;
- pendências abertas desta rodada:
  - revisar mais profundamente `Chats`, `Amigos`, perfil e `Novo jogo` até o novo material ficar consistente em todas as cenas;
  - validar visualmente os balões de `Locais` no Simulator após o ajuste do fallback;
  - fechar o pente fino global do item 10 com foco em contraste, grids restantes e motion.
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`

### Rodada 12

- nova passada de grid óptico nas listas compactas: ícones compactos ganharam nudge à esquerda para alinhar melhor com `Menu` e com o eixo das sheets;
- `Jogos`, `Chats`, `Avisos`, `Histórico`, `Locais` e `Conta` passaram a usar melhor o eixo de texto nas cenas internas, reduzindo a sensação de título “solto” fora da malha;
- `Chats`, `Amigos` e `Locais` ganharam sumários em glass para tirar peso do topo e trazer a linguagem nova do `GG` para páginas que ainda pareciam antigas;
- `Buscar jogadores` e `Sugerir novo local` deixaram de usar blocos crus e passaram a usar superfícies mais discretas e materiais mais coerentes;
- `Novo jogo` recebeu sheet mais translúcida, card de resumo glass e footer de ações também em glass;
- o perfil público/segurança recebeu mais consistência material com cards menos pesados;
- o mapa ganhou fallback explícito do pin pressionado com snapshot local, para o callout continuar aparecendo mesmo quando a seleção derivada não resolve a tempo, o que ajuda especialmente os `Locais`;
- pendências abertas desta rodada:
  - confirmar visualmente no Simulator o novo eixo óptico das cenas internas do drawer;
  - validar no Simulator que o balão de `Locais` agora aparece de forma confiável ao toque;
  - continuar a passada de chat “communicator-grade” do item 8, ainda aberta;
- validações da rodada:
  - `npx tsc --noEmit`
  - `npm run lint -- --quiet=false`
  - `xcodebuild -workspace ios/GoodGame.xcworkspace -scheme GoodGame -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.4' build`
