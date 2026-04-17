import { GAME_SLUG } from "@/features/map/gameLabels";
import type {
  ChatMessage,
  FriendProfile,
  InAppNotification,
  MeetupMemberPresence,
  MeetupPost,
  PlayerProfile,
} from "@/types/domain";

type DemoBundle = {
  chatMeetups: MeetupPost[];
  meetupPresenceById: Record<string, MeetupMemberPresence[]>;
  messagesByMeetupId: Record<string, ChatMessage[]>;
  notifications: InAppNotification[];
  friends: FriendProfile[];
};

export function buildEmptyDemoBundle(): DemoBundle {
  return {
    chatMeetups: [],
    meetupPresenceById: {},
    messagesByMeetupId: {},
    notifications: [],
    friends: [],
  };
}

export function buildDemoBundle(profile: PlayerProfile): DemoBundle {
  const baseLat = profile.lat ?? -23.5679;
  const baseLng = profile.lng ?? -46.6527;

  const chatMeetups: MeetupPost[] = [
    {
      id: "demo-meetup-commander",
      title: "Partida Commander da Lapa",
      description: "Casual alto, valendo testar decks novos e trocar cartas depois.",
      formatName: "Commander",
      gameSlug: GAME_SLUG.magic,
      startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      hostMode: "public_place",
      status: "open",
      maxPlayers: 4,
      joinedPlayers: 4,
      confirmedPlayers: 3,
      lat: baseLat + 0.009,
      lng: baseLng - 0.01,
      venueName: "Mana Forge",
      addressLabel: "Rua Clélia, 2048 · Lapa",
      locationHint: "Lapa",
      isLocationExact: true,
      chatImagePath: null,
      chatImageUrl: null,
      creatorUserId: "demo-user-iris",
      creatorDisplayName: "Iris K.",
      creatorHandle: "iriskarn",
      creatorBio: "Commander casual e precons tunados.",
      creatorNeighborhood: "Lapa",
      creatorCanHost: false,
      isMember: true,
      isCreator: false,
    },
    {
      id: "demo-meetup-draft",
      title: "Draft sexta no after",
      description: "Booster draft rápido depois do trabalho, nível casual.",
      formatName: "Draft",
      gameSlug: GAME_SLUG.magic,
      startsAt: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
      hostMode: "public_place",
      status: "open",
      maxPlayers: 8,
      joinedPlayers: 6,
      confirmedPlayers: 5,
      lat: baseLat - 0.008,
      lng: baseLng + 0.006,
      venueName: "Casa Arcana",
      addressLabel: "Avenida Paulista, 1100 · Bela Vista",
      locationHint: "Bela Vista",
      isLocationExact: true,
      chatImagePath: null,
      chatImageUrl: null,
      creatorUserId: profile.userId,
      creatorDisplayName: profile.displayName,
      creatorHandle: profile.handle,
      creatorBio: profile.bio,
      creatorNeighborhood: profile.neighborhood,
      creatorCanHost: profile.canHost,
      isMember: true,
      isCreator: true,
    },
  ];

  const meetupPresenceById: Record<string, MeetupMemberPresence[]> = {
    "demo-meetup-commander": [
      {
        userId: "demo-user-iris",
        displayName: "Iris K.",
        handle: "iriskarn",
        avatarPath: null,
        avatarUrl: null,
        attendanceStatus: "confirmed",
        role: "creator",
        joinedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: profile.userId,
        displayName: profile.displayName,
        handle: profile.handle,
        avatarPath: profile.avatarPath,
        avatarUrl: profile.avatarUrl,
        attendanceStatus: "confirmed",
        role: "participant",
        joinedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "demo-user-nina",
        displayName: "Nina",
        handle: "ninaedh",
        avatarPath: null,
        avatarUrl: null,
        attendanceStatus: "interested",
        role: "participant",
        joinedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "demo-user-joao",
        displayName: "João B.",
        handle: "joaobrews",
        avatarPath: null,
        avatarUrl: null,
        attendanceStatus: "not_going",
        role: "participant",
        joinedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
    ],
    "demo-meetup-draft": [
      {
        userId: profile.userId,
        displayName: profile.displayName,
        handle: profile.handle,
        avatarPath: profile.avatarPath,
        avatarUrl: profile.avatarUrl,
        attendanceStatus: "confirmed",
        role: "creator",
        joinedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "demo-user-mari",
        displayName: "Mari",
        handle: "mari.draft",
        avatarPath: null,
        avatarUrl: null,
        attendanceStatus: "confirmed",
        role: "participant",
        joinedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      },
      {
        userId: "demo-user-rafa",
        displayName: "Rafa",
        handle: "rafa.spikes",
        avatarPath: null,
        avatarUrl: null,
        attendanceStatus: "interested",
        role: "participant",
        joinedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  const messagesByMeetupId: Record<string, ChatMessage[]> = {
    "demo-meetup-commander": [
      {
        id: "demo-msg-1",
        authorId: "demo-user-iris",
        authorName: "Iris K.",
        authorAvatarPath: null,
        authorAvatarUrl: null,
        sentAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
        body: "Fechei a partida perto da vitrine, assim que chegarem eu mando foto.",
        replyToMessageId: null,
        replyPreviewAuthorName: null,
        replyPreviewBody: null,
      },
      {
        id: "demo-msg-2",
        authorId: "demo-user-nina",
        authorName: "Nina",
        authorAvatarPath: null,
        authorAvatarUrl: null,
        sentAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
        body: "Saindo do metrô agora, chego em uns 8 minutos.",
        replyToMessageId: "demo-msg-1",
        replyPreviewAuthorName: "Iris K.",
        replyPreviewBody: "Fechei a partida perto da vitrine, assim que chegarem eu mando foto.",
      },
      {
        id: "demo-msg-3",
        authorId: profile.userId,
        authorName: profile.displayName,
        authorAvatarPath: profile.avatarPath,
        authorAvatarUrl: profile.avatarUrl,
        sentAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
        body: "Levei token e dado. Se precisar eu também tenho playmat extra.",
        replyToMessageId: "demo-msg-2",
        replyPreviewAuthorName: "Nina",
        replyPreviewBody: "Saindo do metrô agora, chego em uns 8 minutos.",
      },
    ],
    "demo-meetup-draft": [
      {
        id: "demo-msg-4",
        authorId: "demo-user-mari",
        authorName: "Mari",
        authorAvatarPath: null,
        authorAvatarUrl: null,
        sentAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        body: "Posso levar sleeves para quem quiser draftar na hora.",
        replyToMessageId: null,
        replyPreviewAuthorName: null,
        replyPreviewBody: null,
      },
      {
        id: "demo-msg-5",
        authorId: profile.userId,
        authorName: profile.displayName,
        authorAvatarPath: profile.avatarPath,
        authorAvatarUrl: profile.avatarUrl,
        sentAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
        body: "Boa. Eu confirmo a loja amanhã cedo e aviso aqui.",
        replyToMessageId: "demo-msg-4",
        replyPreviewAuthorName: "Mari",
        replyPreviewBody: "Posso levar sleeves para quem quiser draftar na hora.",
      },
    ],
  };

  const notifications: InAppNotification[] = [
    {
      id: "demo-notification-1",
      kind: "message_received",
      title: "Iris mandou uma nova mensagem",
      body: "Fechei a partida perto da vitrine...",
      meetupId: "demo-meetup-commander",
      venueId: null,
      metadata: {},
      readAt: null,
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "demo-notification-2",
      kind: "meetup_reminder",
      title: "Sua partida começa em 1 hora",
      body: "Partida Commander da Lapa · confira o chat do grupo.",
      meetupId: "demo-meetup-commander",
      venueId: null,
      metadata: {},
      readAt: null,
      createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    },
  ];

  const friends: FriendProfile[] = [
    {
      friendshipId: "demo-friendship-1",
      state: "friend",
      userId: "demo-user-luiza",
      displayName: "Luiza",
      handle: "luizacombo",
      neighborhood: "Pinheiros",
      bio: "Commander, Pauper e board games pesados.",
      avatarPath: null,
      avatarUrl: null,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
    },
    {
      friendshipId: "demo-friendship-2",
      state: "incoming",
      userId: "demo-user-victor",
      displayName: "Victor",
      handle: "victormtg",
      neighborhood: "Perdizes",
      bio: "Draft toda semana.",
      avatarPath: null,
      avatarUrl: null,
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      friendshipId: "demo-friendship-3",
      state: "outgoing",
      userId: "demo-user-bia",
      displayName: "Bia",
      handle: "bia.control",
      neighborhood: "Consolação",
      bio: "Modern e Pioneer.",
      avatarPath: null,
      avatarUrl: null,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
    },
  ];

  return {
    chatMeetups,
    meetupPresenceById,
    messagesByMeetupId,
    notifications,
    friends,
  };
}
