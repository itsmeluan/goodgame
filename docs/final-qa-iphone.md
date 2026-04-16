# Final QA iPhone

Use este checklist em uma build `Release` instalada no iPhone.

## 1. Entrada e conta

- abrir o app do zero e confirmar que a home carrega sem erro;
- entrar com e-mail e senha;
- criar conta nova;
- validar aceite legal;
- desconectar e entrar novamente;
- validar exclusão de conta em ambiente de teste.

## 2. Perfil

- abrir `Minha conta`;
- editar nome, handle, bio e bairro;
- trocar a foto do perfil;
- editar interesses e formatos;
- salvar;
- fechar e abrir novamente para confirmar persistência.

## 3. Mapa

- permitir localização;
- validar centralização inicial;
- tocar no botão de voltar para minha localização;
- arrastar, zoom e rotação do mapa;
- tocar em pin de jogo;
- tocar em pin de local;
- tocar em cluster;
- validar que o balão aparece e fecha corretamente;
- validar que os pins não piscam nem somem.

## 4. Jogos

- criar uma partida com endereço pesquisado;
- criar uma partida usando local existente;
- editar data, hora e local;
- entrar em uma partida;
- mudar status para `Tenho interesse`, `Confirmado` e `Não vou`;
- sair da partida;
- como criador, encerrar;
- como criador, cancelar;
- como criador, excluir uma partida de teste.

## 5. Locais

- abrir `Locais`;
- validar ordenação por proximidade;
- sugerir novo local;
- criar local público ou loja especializada;
- editar local;
- excluir local de teste;
- validar pin e card no mapa.

## 6. Chats

- abrir a lista de chats;
- entrar em um chat;
- enviar mensagem;
- responder mensagem;
- trocar imagem do chat;
- validar leitura automática;
- validar `Marcar todos como lido`;
- validar seção `Encerrados`.

## 7. Amigos

- abrir `Amigos`;
- enviar solicitação;
- aceitar solicitação;
- recusar solicitação;
- remover amigo;
- abrir perfil público a partir de amigos;
- fechar e retornar para a tela correta.

## 8. Avisos e histórico

- abrir `Avisos`;
- marcar todos como lidos;
- tocar em aviso de chat;
- tocar em aviso de partida;
- abrir `Histórico`;
- validar partidas encerradas/canceladas.

## 9. Performance e estabilidade

- deixar o app em background e voltar;
- abrir e fechar o app várias vezes;
- navegar com muitos pins visíveis;
- usar filtros, ordenação e troca entre `Jogos` e `Locais`;
- validar que não há overlays transparentes, toques vazando ou teclado cobrindo campos.

## 10. Push e realtime

- com duas contas reais, validar:
- criação de partida refletindo na outra conta;
- nova mensagem refletindo no chat da outra conta;
- atualização de avisos;
- entrada/saída em partida;
- leitura de chat e de avisos.

## Critério de aprovação

O build só deve seguir para publicação quando:

- não houver crash;
- não houver erro bloqueante de fluxo;
- não houver regressão visual crítica;
- login, mapa, jogos, locais, chats, amigos e avisos funcionarem ponta a ponta.
