import { getCurrentLocale, type SupportedLocale } from "@/i18n";
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

const ptBRLegalContent: Record<LegalDocumentKind, LegalContentDocument> = {
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

const enUSLegalContent: Record<LegalDocumentKind, LegalContentDocument> = {
  privacy_policy: {
    kind: "privacy_policy",
    title: "Privacy Policy",
    version: legalContentVersion,
    effectiveDateLabel: "April 2, 2026",
    intro:
      "This Privacy Policy explains how Good Game collects, uses, shares, and protects personal data to connect players, organize in-person games, and keep the community safe.",
    sections: [
      {
        title: "1. Data we collect",
        paragraphs: [
          "We collect account and profile data, such as email, display name, handle, photo, bio, played formats, availability, and hosting preferences.",
          "We collect approximate location, suggested places, group messages, friendships, reports, blocks, game attendance, and interactions needed to operate the map and social features.",
          "We may also collect technical data from the device, app version, notification status, and operational identifiers for security, authentication, and message delivery.",
        ],
      },
      {
        title: "2. How we use data",
        paragraphs: [
          "We use your data to authenticate your account, show your profile, display nearby games and places, enable group conversations, send notifications, and improve how the app works.",
          "Location is handled approximately for discovery on the map. The exact position of a game may remain restricted until you join the group, according to the product's privacy rules.",
          "We also use data for fraud prevention, abuse investigation, account blocking, responding to reports, and complying with legal obligations.",
        ],
      },
      {
        title: "3. Legal basis and consent",
        paragraphs: [
          "We process data to perform the app's terms of use, support legitimate interests in operating and securing the platform, and, when needed, based on specific consent such as location, photos, and notification permissions.",
          "You can revoke permissions in your device operating system, but some features may stop working correctly.",
        ],
      },
      {
        title: "4. Sharing",
        paragraphs: [
          "Your profile, games, and social activity may be visible to other authenticated users depending on the product context.",
          "We may share data with infrastructure, authentication, storage, notification, and analytics providers strictly to operate the service.",
          "We may also share information with authorities or third parties when necessary to comply with legal obligations, protect rights, or investigate serious incidents.",
        ],
      },
      {
        title: "5. Retention and deletion",
        paragraphs: [
          "We keep data while your account is active or while it is needed for legitimate purposes, security, abuse prevention, and legal requirements.",
          "You can request account deletion in the app. After deletion, account data is removed or anonymized according to the technical architecture and applicable legal requirements.",
        ],
      },
      {
        title: "6. Your rights",
        paragraphs: [
          "Under the LGPD, you may request confirmation of processing, access, correction, anonymization, blocking, deletion, portability, and information about sharing, as well as revoke consent when applicable.",
          "You may also request review of relevant automated decisions and file a complaint with the competent authority.",
        ],
      },
      {
        title: "7. Security",
        paragraphs: [
          "We use reasonable technical and organizational measures to protect personal data, but no system is absolutely invulnerable.",
          "We recommend not publishing sensitive information in your profile, chats, or game descriptions.",
        ],
      },
      {
        title: "8. Contact",
        paragraphs: [
          "Requests related to privacy, security, and data subject rights may be handled through the official channels provided at product launch and in the team's operational documentation.",
        ],
      },
    ],
  },
  terms_of_service: {
    kind: "terms_of_service",
    title: "Terms of Use",
    version: legalContentVersion,
    effectiveDateLabel: "April 2, 2026",
    intro:
      "These Terms of Use govern access to and use of Good Game, an app for discovering players, organizing games, chats, and places for in-person tabletop play.",
    sections: [
      {
        title: "1. Eligibility and account",
        paragraphs: [
          "You represent that you have legal capacity to accept these terms. If you are underage, you must use the app with authorization and supervision from a legal guardian when required by applicable law.",
          "You are responsible for the security of your account, the accuracy of the information you provide, and the use of your access credentials.",
        ],
      },
      {
        title: "2. Conduct rules",
        paragraphs: [
          "You may not use the app for fraud, scams, harassment, discrimination, threats, spam, disclosure of third-party sensitive data, stalking, or any illegal practice.",
          "You also may not manipulate reputation, simulate attendance, create fake places, or publish games intended to harm other users.",
        ],
      },
      {
        title: "3. In-person meetups",
        paragraphs: [
          "Good Game acts as a platform that connects players. We do not organize, supervise, or guarantee the safety, quality, legality, or punctuality of in-person meetups arranged between users.",
          "Each user is responsible for assessing risks, choosing suitable places, respecting local law, and taking personal safety measures.",
        ],
      },
      {
        title: "4. Content, chats, and profile",
        paragraphs: [
          "You remain responsible for the content you publish in your profile, games, messages, and place suggestions.",
          "By using the app, you grant us a non-exclusive license to host, display, and process that content only to operate and improve the service.",
        ],
      },
      {
        title: "5. Friends, blocks, and reports",
        paragraphs: [
          "The app provides friendship, blocking, and reporting features to protect the community.",
          "We may investigate suspicious behavior, limit features, hide content, suspend, or terminate accounts when there are signs of abuse, safety risk, or violation of these terms.",
        ],
      },
      {
        title: "6. Reputation and attendance",
        paragraphs: [
          "Attendance confirmation, arrival, ratings, and reputation features exist to improve community reliability.",
          "These signals may influence the in-app experience, but they do not represent an absolute guarantee of any user's conduct.",
        ],
      },
      {
        title: "7. Account termination",
        paragraphs: [
          "You may close your account at any time in the app, subject to the technical and legal limitations described in the Privacy Policy.",
          "We may also suspend or terminate accounts in cases of fraud, safety risk, violation of these terms, or legal determination.",
        ],
      },
      {
        title: "8. Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by law, Good Game is not responsible for third-party conduct, damage occurring at in-person meetups, indirect losses, lost profits, or unavailability caused by factors outside our reasonable control.",
        ],
      },
      {
        title: "9. Changes",
        paragraphs: [
          "We may update these terms and the privacy policy. When the current version changes, we may require a new acceptance to continue using the app.",
        ],
      },
    ],
  },
};

export const legalContentByLocale: Record<
  SupportedLocale,
  Record<LegalDocumentKind, LegalContentDocument>
> = {
  "pt-BR": ptBRLegalContent,
  "en-US": enUSLegalContent,
};

export const legalContent = ptBRLegalContent;

export function getLegalContent(
  kind: LegalDocumentKind,
  locale: SupportedLocale = getCurrentLocale()
) {
  return legalContentByLocale[locale]?.[kind] ?? ptBRLegalContent[kind];
}
