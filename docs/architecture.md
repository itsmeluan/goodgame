# Arquitetura

## Visao geral

O app pode ser construido com uma arquitetura simples, barata para o MVP e pronta para crescer:

- `Expo + React Native`: uma unica base para iOS e Android
- `Expo Router`: navegacao por arquivos
- `Supabase Auth`: autenticacao
- `Supabase Postgres`: dados relacionais
- `Supabase Realtime`: chat e presenca de grupos
- `PostGIS`: consultas geograficas

## Por que essa stack

### Expo

- acelera bootstrap para iOS e Android
- reduz trabalho nativo no MVP
- facilita distribuicao inicial e testes internos

### Supabase

- auth, banco e realtime no mesmo lugar
- bom encaixe para chat simples em grupo
- SQL e RLS deixam a modelagem do produto mais clara

### PostGIS

- consulta por bounding box no mapa
- ordenacao por proximidade
- armazenamento eficiente de pontos geograficos

## Modelo de dados

- `profiles`: dados publicos do jogador
- `games` e `formats`: catalogo do jogo
- `player_formats`: o que o jogador joga
- `availability_slots`: disponibilidade recorrente
- `venues`: lojas e pontos para jogar
- `meetup_posts`: chamados ativos do mapa
- `meetup_members`: participantes do chamado
- `meetup_messages`: chat em grupo do chamado

## Consultas principais

### Itens do mapa por regiao visivel

O app envia `min_lat`, `min_lng`, `max_lat`, `max_lng` e o banco retorna:

- chamados abertos na area visivel
- locais cadastrados na area visivel

### Proximidade

Para listas auxiliares, o banco ordena resultados por distancia usando PostGIS.

## Privacidade

- nunca usar endereco exato como padrao
- guardar apenas ponto aproximado do jogador
- separar localizacao do chamado da localizacao do perfil
- permitir que o usuario apague ou esconda o pin pessoal

## Moderacao minima

- denuncia de usuario
- denuncia de mensagem
- bloqueio de usuario
- aprovacao manual para novos locais publicos

## Roadmap tecnico

### Fase 1

- base mobile
- schema SQL
- auth
- perfil
- mapa com dados reais

### Fase 2

- chat realtime
- filtros
- criacao e participacao em chamados

### Fase 3

- curadoria de locais
- notificacoes push
- analiticos e moderacao

## Decisoes praticas para o MVP

- Comecar so com Magic: The Gathering reduz complexidade de taxonomia.
- Usar dados mockados no app ate fechar auth e banco.
- Comecar com locais cadastrados pela comunidade antes de integrar APIs de places.

