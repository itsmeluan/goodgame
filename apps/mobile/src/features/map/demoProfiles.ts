import { buildDemoBundle } from "@/features/demo/demoData";
import { inferGameNameFromLabels } from "@/features/map/gameLabels";
import type { PlayerProfile, PublicPlayerProfile } from "@/types/domain";

export function buildDemoPublicProfiles(
  profile: PlayerProfile,
  demoBundle: ReturnType<typeof buildDemoBundle>
) {
  const profilesByUserId: Record<string, PublicPlayerProfile> = {};
  const formatNamesByUserId = new Map<string, Set<string>>();

  demoBundle.chatMeetups.forEach((meetup) => {
    registerFormat(formatNamesByUserId, meetup.creatorUserId, meetup.formatName);

    (demoBundle.meetupPresenceById[meetup.id] ?? []).forEach((member) => {
      registerFormat(formatNamesByUserId, member.userId, meetup.formatName);
    });
  });

  demoBundle.friends.forEach((friend) => {
    profilesByUserId[friend.userId] = createDemoPublicPlayerProfile({
      userId: friend.userId,
      displayName: friend.displayName,
      handle: friend.handle,
      bio: friend.bio,
      neighborhood: friend.neighborhood,
      avatarPath: friend.avatarPath,
      avatarUrl: friend.avatarUrl,
      canHost: false,
      relationshipState: friend.state,
      isOnline: friend.isOnline,
      lastSeenAt: friend.lastSeenAt,
      formatNames: [
        ...extractFormatsFromText(friend.bio),
        ...Array.from(formatNamesByUserId.get(friend.userId) ?? []),
      ],
    });
  });

  demoBundle.chatMeetups.forEach((meetup) => {
    const existing = profilesByUserId[meetup.creatorUserId];

    if (!existing && meetup.creatorUserId !== profile.userId) {
      profilesByUserId[meetup.creatorUserId] = createDemoPublicPlayerProfile({
        userId: meetup.creatorUserId,
        displayName: meetup.creatorDisplayName,
        handle: meetup.creatorHandle,
        bio: meetup.creatorBio,
        neighborhood: meetup.creatorNeighborhood,
        avatarPath: null,
        avatarUrl: null,
        canHost: meetup.creatorCanHost,
        relationshipState: "none",
        isOnline: false,
        lastSeenAt: null,
        formatNames: Array.from(formatNamesByUserId.get(meetup.creatorUserId) ?? []),
      });
    }

    (demoBundle.meetupPresenceById[meetup.id] ?? []).forEach((member) => {
      if (member.userId === profile.userId || profilesByUserId[member.userId]) {
        return;
      }

      profilesByUserId[member.userId] = createDemoPublicPlayerProfile({
        userId: member.userId,
        displayName: member.displayName,
        handle: member.handle,
        bio: describeDemoPlayer(member.handle),
        neighborhood: meetup.locationHint,
        avatarPath: member.avatarPath,
        avatarUrl: member.avatarUrl,
        canHost: false,
        relationshipState: "none",
        isOnline:
          member.attendanceStatus === "confirmed" ||
          member.attendanceStatus === "on_the_way" ||
          member.attendanceStatus === "arrived",
        lastSeenAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        formatNames: Array.from(formatNamesByUserId.get(member.userId) ?? []),
      });
    });
  });

  return profilesByUserId;
}

function createDemoPublicPlayerProfile(input: {
  userId: string;
  displayName: string;
  handle: string;
  bio: string;
  neighborhood: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  canHost: boolean;
  relationshipState: PublicPlayerProfile["relationshipState"];
  isOnline: boolean;
  lastSeenAt: string | null;
  formatNames: string[];
}): PublicPlayerProfile {
  const seed = input.userId.split("").reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  const normalizedFormatNames = input.formatNames.length
    ? Array.from(new Set(input.formatNames))
    : ["Commander"];

  return {
    userId: input.userId,
    displayName: input.displayName,
    handle: input.handle,
    bio: input.bio,
    neighborhood: input.neighborhood,
    avatarPath: input.avatarPath,
    avatarUrl: input.avatarUrl,
    canHost: input.canHost,
    gameNames: Array.from(new Set(normalizedFormatNames.map((label) => inferGameNameFromLabels([label])))),
    formatNames: normalizedFormatNames,
    availability: buildDemoAvailability(seed),
    relationshipState: input.relationshipState,
    isOnline: input.isOnline,
    lastSeenAt: input.lastSeenAt,
    averageRating: Number((4 + (seed % 8) / 10).toFixed(1)),
    ratingsCount: 6 + (seed % 18),
    attendedCount: 10 + (seed % 20),
    noShowCount: seed % 3,
    hostedCount: 1 + (seed % 6),
  };
}

function buildDemoAvailability(seed: number): PublicPlayerProfile["availability"] {
  const presets: PublicPlayerProfile["availability"] = [
    { weekday: 3, start_time: "19:00", end_time: "23:00", timezone: "America/Sao_Paulo" },
    { weekday: 5, start_time: "19:00", end_time: "23:00", timezone: "America/Sao_Paulo" },
    { weekday: 6, start_time: "14:00", end_time: "18:00", timezone: "America/Sao_Paulo" },
    { weekday: 0, start_time: "09:00", end_time: "12:00", timezone: "America/Sao_Paulo" },
    { weekday: 2, start_time: "14:00", end_time: "18:00", timezone: "America/Sao_Paulo" },
  ];

  return [
    presets[seed % presets.length],
    presets[(seed + 1) % presets.length],
    presets[(seed + 3) % presets.length],
  ];
}

function extractFormatsFromText(value: string) {
  const normalizedValue = value.toLowerCase();
  const knownFormats = ["Commander", "Pauper", "Modern", "Pioneer", "Draft", "Standard"];

  return knownFormats.filter((formatName) =>
    normalizedValue.includes(formatName.toLowerCase())
  );
}

export function describeDemoPlayer(handle: string) {
  if (handle.includes("draft")) {
    return "Curte drafts rápidos e partidas leves no fim do dia.";
  }

  if (handle.includes("spikes")) {
    return "Gosta de testar listas afiadas e discutir sideboard entre as rodadas.";
  }

  if (handle.includes("edh") || handle.includes("iris")) {
    return "Commander casual, power level médio e clima amigável.";
  }

  if (handle.includes("brews")) {
    return "Sempre aparece com alguma brew nova e topa partidas experimentais.";
  }

  return "Joga Magic com frequência e costuma marcar partidas pela comunidade.";
}

function registerFormat(
  formatNamesByUserId: Map<string, Set<string>>,
  userId: string,
  formatName: string
) {
  if (!formatName) {
    return;
  }

  const existing = formatNamesByUserId.get(userId) ?? new Set<string>();
  existing.add(formatName);
  formatNamesByUserId.set(userId, existing);
}
