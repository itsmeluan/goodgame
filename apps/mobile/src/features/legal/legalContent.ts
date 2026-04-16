import type { LegalDocumentKind } from "@/types/domain";

export const legalContentVersion = "2026-04-02";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalContentDocument = {
  kind: LegalDocumentKind;
  title: string;
  version: string;
  effectiveDateLabel: string;
  intro: string;
  sections: LegalSection[];
};

export const legalContent: Record<LegalDocumentKind, LegalContentDocument> = {
  privacy_policy: {
    kind: "privacy_policy",
    title: "Política de Privacidade",
    version: legalContentVersion,
    effectiveDateLabel: "2 de abril de 2026",
    intro:
      "Esta Política de Privacidade explica como o Good Game coleta, usa, compartilha e protege dados pessoais para conectar jogadores, organizar partidas presenciais e manter a comunidade segura.",
    sections: [
      {
        title: "1. Dados que coletamos",
        paragraphs: [
          "Coletamos dados de cadastro e perfil, como e-mail, nome de exibição, handle, foto, biografia, formatos jogados, disponibilidade e preferências de hospedagem.",
          "Coletamos localização aproximada, locais sugeridos, mensagens em grupo, amizades, denúncias, bloqueios, presença em jogos e interações necessárias para operar o mapa e os recursos sociais.",
          "Também podemos coletar dados técnicos do dispositivo, versão do app, status de notificações e identificadores operacionais para segurança, autenticação e entrega de mensagens.",
        ],
      },
      {
        title: "2. Como usamos os dados",
        paragraphs: [
          "Usamos seus dados para autenticar sua conta, exibir seu perfil, mostrar jogos e locais próximos, permitir conversas em grupo, enviar notificações e melhorar o funcionamento do app.",
          "A localização é tratada de modo aproximado para descoberta no mapa. A posição exata de uma partida pode permanecer restrita até a entrada no grupo, conforme as regras de privacidade do produto.",
          "Também usamos dados para prevenção de fraude, investigação de abuso, bloqueio de contas, resposta a denúncias e cumprimento de obrigações legais.",
        ],
      },
      {
        title: "3. Base legal e consentimentos",
        paragraphs: [
          "Tratamos dados para executar o contrato de uso do app, atender interesses legítimos de operação e segurança da plataforma e, quando necessário, com base em consentimentos específicos, como permissões de localização, fotos e notificações.",
          "Você pode revogar permissões no sistema operacional do seu aparelho, mas alguns recursos podem deixar de funcionar corretamente.",
        ],
      },
      {
        title: "4. Compartilhamento",
        paragraphs: [
          "Seu perfil, jogos e atividade social podem ser visíveis a outros usuários autenticados conforme o contexto do produto.",
          "Podemos compartilhar dados com provedores de infraestrutura, autenticação, armazenamento, notificações e analytics estritamente para operar o serviço.",
          "Também poderemos compartilhar informações com autoridades ou terceiros quando isso for necessário para cumprir obrigação legal, proteger direitos ou investigar incidentes graves.",
        ],
      },
      {
        title: "5. Retenção e exclusão",
        paragraphs: [
          "Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários para cumprir finalidades legítimas, segurança, prevenção de abuso e exigências legais.",
          "Você pode solicitar a exclusão da conta pelo próprio app. Após a exclusão, os dados da conta são removidos ou anonimizados conforme a arquitetura técnica e as exigências legais aplicáveis.",
        ],
      },
      {
        title: "6. Seus direitos",
        paragraphs: [
          "Nos termos da LGPD, você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamento, além de revogar consentimentos quando aplicável.",
          "Também pode pedir revisão de decisões automatizadas relevantes e apresentar reclamação à autoridade competente.",
        ],
      },
      {
        title: "7. Segurança",
        paragraphs: [
          "Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais, mas nenhum sistema é absolutamente invulnerável.",
          "Recomendamos não publicar informações sensíveis no perfil, no chat ou em descrições de jogos.",
        ],
      },
      {
        title: "8. Contato",
        paragraphs: [
          "Pedidos relacionados à privacidade, segurança e direitos de titulares podem ser tratados pelos canais oficiais informados no lançamento do produto e na documentação operacional da equipe.",
        ],
      },
    ],
  },
  terms_of_service: {
    kind: "terms_of_service",
    title: "Termos de Uso",
    version: legalContentVersion,
    effectiveDateLabel: "2 de abril de 2026",
    intro:
      "Estes Termos de Uso regulam o acesso e o uso do Good Game, aplicativo para descoberta de jogadores, organização de partidas, chats e locais para jogos presenciais.",
    sections: [
      {
        title: "1. Elegibilidade e conta",
        paragraphs: [
          "Você declara que tem capacidade legal para aceitar estes termos. Se for menor de idade, deve usar o app com autorização e supervisão de responsável legal, quando exigido pela legislação aplicável.",
          "Você é responsável pela segurança da sua conta, pela veracidade das informações fornecidas e pelo uso das credenciais de acesso.",
        ],
      },
      {
        title: "2. Regras de conduta",
        paragraphs: [
          "É proibido usar o app para fraude, golpes, assédio, discriminação, ameaça, spam, divulgação de dados sensíveis de terceiros, stalking ou qualquer prática ilegal.",
          "Também é proibido manipular reputação, simular presença, criar locais falsos ou publicar jogos com o objetivo de prejudicar outros usuários.",
        ],
      },
      {
        title: "3. Encontros presenciais",
        paragraphs: [
          "O Good Game atua como plataforma de conexão entre jogadores. Não organizamos, supervisionamos nem garantimos a segurança, qualidade, legalidade ou pontualidade dos encontros presenciais combinados entre usuários.",
          "Cada usuário é responsável por avaliar riscos, escolher locais adequados, respeitar a legislação local e adotar medidas de segurança pessoal.",
        ],
      },
      {
        title: "4. Conteúdo, chats e perfil",
        paragraphs: [
          "Você mantém responsabilidade pelo conteúdo que publica em perfil, jogos, mensagens e sugestões de locais.",
          "Ao usar o app, você nos concede licença não exclusiva para hospedar, exibir e processar esse conteúdo apenas para operar e melhorar o serviço.",
        ],
      },
      {
        title: "5. Amigos, bloqueios e denúncias",
        paragraphs: [
          "O app oferece recursos de amizade, bloqueio e denúncia para proteção da comunidade.",
          "Podemos investigar comportamentos suspeitos, limitar recursos, ocultar conteúdo, suspender ou encerrar contas quando houver indícios de abuso, risco à segurança ou violação destes termos.",
        ],
      },
      {
        title: "6. Reputação e presença",
        paragraphs: [
          "Recursos de confirmação de presença, chegada, avaliações e reputação existem para melhorar a confiabilidade da comunidade.",
          "Esses sinais podem influenciar a experiência dentro do app, mas não representam garantia absoluta de conduta de qualquer usuário.",
        ],
      },
      {
        title: "7. Encerramento de conta",
        paragraphs: [
          "Você pode encerrar a conta a qualquer momento pelo app, sujeito às limitações técnicas e legais informadas na Política de Privacidade.",
          "Também podemos suspender ou encerrar contas em casos de fraude, risco à segurança, violação destes termos ou determinação legal.",
        ],
      },
      {
        title: "8. Limitação de responsabilidade",
        paragraphs: [
          "Na máxima extensão permitida pela lei, o Good Game não se responsabiliza por condutas de terceiros, danos ocorridos em encontros presenciais, perdas indiretas, lucros cessantes ou indisponibilidades causadas por fatores fora do nosso controle razoável.",
        ],
      },
      {
        title: "9. Alterações",
        paragraphs: [
          "Podemos atualizar estes termos e a política de privacidade. Quando a versão vigente mudar, poderemos exigir novo aceite para continuidade do uso.",
        ],
      },
    ],
  },
};
