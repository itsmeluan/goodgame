# Produto MVP

**Nota (2026):** O app evoluiu para um **catálogo multi-jogo** (Magic, Tabuleiro, Yu-Gi-Oh!, Pokémon TCG, entre outros formatos no Supabase). Este ficheiro descreve sobretudo a **visão original** centrada em Magic; estado atual do produto e arte de mapa em evolução: ver `README.md` na raiz do repositório.

## Problema

Jogadores de Magic: The Gathering querem encontrar pessoas para jogar perto deles sem depender apenas de grupos fragmentados em WhatsApp, Discord ou redes sociais.

## Publico inicial

- Jogadores casuais e competitivos de Magic
- Pessoas que ja jogam em lojas, faculdades, condominios ou na casa de amigos
- Usuarios que precisam descobrir se existe mesa em um raio curto de distancia

## Proposta de valor

Abrir o app, ver um mapa vivo, encontrar chamados perto de voce e entrar em um chat de grupo para combinar uma partida no mesmo dia ou em uma data futura.

## Escopo do primeiro MVP

### 1. Conta e perfil

- Login por email magic link ou Google/Apple
- Nome de exibicao e handle
- Jogos e formatos jogados
- Disponibilidade por dias e horarios
- Indicacao se pode receber pessoas ou nao
- Localizacao aproximada, nunca endereco exato

### 2. Mapa principal

- Marker de jogadores com chamados ativos
- Marker de locais para jogar
- Filtro inicial por formato de Magic
- Atualizacao por regiao visivel do mapa

### 3. Chamado

- Titulo curto
- Descricao opcional
- Formato
- Data e hora
- Tipo de encontro: local publico, posso receber, preciso de anfitriao
- Limite de vagas

### 4. Chat de grupo

- Cada chamado gera um grupo
- Pessoas entram no grupo ao participar do chamado
- Mensagens simples em tempo real

### 5. Locais para jogar

- Cadastro manual de lojas e pontos de encontro
- Curadoria basica por aprovacao
- Importacao automatica pode vir depois

## Fora do MVP

- Matchmaking por ranking
- Pagamentos
- Torneios completos
- Sistema robusto de reputacao
- Feed social
- Algoritmo complexo de recomendacao

## Fluxo principal

1. Usuario cria conta.
2. Completa perfil com formatos e disponibilidade.
3. Abre o mapa e permite acesso aproximado a localizacao.
4. Visualiza chamados e locais proximos.
5. Cria ou entra em um chamado.
6. Conversa no chat do grupo e confirma o encontro.

## Regras de produto importantes

- Localizacao pessoal deve ser aproximada por privacidade.
- Chamados expiram automaticamente.
- Chat fica vinculado ao chamado.
- Locais da comunidade podem exigir moderacao.
- Usuario precisa conseguir sair de um grupo e denunciar abuso.

## Metricas iniciais

- Chamados criados por semana
- Taxa de participacao em chamados
- Mensagens por grupo
- Numero de encontros em locais cadastrados
- Retencao de 7 dias de quem abriu o mapa

## Backlog depois do MVP

- Filtros por distancia e horario
- Importacao de lojas via APIs externas ou OpenStreetMap
- Convites privados
- Reputacao de anfitriao
- Matchmaking por interesses e power level
