import type { FriendProfile, PublicPlayerProfile } from "@/types/domain";

export type FriendActionCandidate = {
  userId: string;
  displayName: string;
  handle: string;
  neighborhood: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  isPro?: boolean;
  proExpiresAt?: string | null;
};

export type RecentPlayerCard = FriendActionCandidate & {
  relationshipState: PublicPlayerProfile["relationshipState"];
  playedAt: string;
};

export function buildFriendProfileFromCandidate(
  candidate: FriendActionCandidate,
  state: FriendProfile["state"]
): FriendProfile {
  return {
    friendshipId: `demo-friendship-${candidate.userId}`,
    state,
    userId: candidate.userId,
    displayName: candidate.displayName,
    handle: candidate.handle,
    neighborhood: candidate.neighborhood,
    bio: candidate.bio,
    avatarPath: candidate.avatarPath,
    avatarUrl: candidate.avatarUrl,
    isOnline: candidate.isOnline,
    lastSeenAt: candidate.lastSeenAt,
    isPro: candidate.isPro ?? false,
    proExpiresAt: candidate.proExpiresAt ?? null,
  };
}
