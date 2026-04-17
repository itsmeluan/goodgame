export type HostMode = "public_place" | "can_host" | "looking_for_host";
export type MeetupStatus = "open" | "filled" | "confirmed" | "closed" | "cancelled";
export type AttendanceStatus =
  | "interested"
  | "confirmed"
  | "not_going"
  | "going"
  | "on_the_way"
  | "arrived"
  | "left"
  | "cant_make_it";
export type LegalDocumentKind = "privacy_policy" | "terms_of_service";
export type VenueSuggestionStatus = "pending" | "approved" | "rejected";
export type VenueKind = "public_place" | "specialty_store";
export type NotificationKind =
  | "member_joined"
  | "message_received"
  | "meetup_status_changed"
  | "meetup_reminder"
  | "nearby_meetup_created"
  | "nearby_venue_created";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface AvailabilitySlot {
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface CatalogGame {
  id: string;
  slug: string;
  name: string;
}

export interface CatalogFormat {
  id: string;
  name: string;
  gameId: string;
  /** Slug do jogo em `public.games` (ex.: magic-the-gathering). */
  gameSlug: string;
}

export interface PlayerProfile {
  userId: string;
  displayName: string;
  handle: string;
  bio: string;
  neighborhood: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  canHost: boolean;
  searchRadiusKm: number;
  lat: number | null;
  lng: number | null;
  gameIds: string[];
  gameNames: string[];
  formatIds: string[];
  formatNames: string[];
  availability: AvailabilitySlot[];
}

export interface PublicPlayerProfile {
  userId: string;
  displayName: string;
  handle: string;
  bio: string;
  neighborhood: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  canHost: boolean;
  gameNames: string[];
  formatNames: string[];
  availability: AvailabilitySlot[];
  relationshipState: "friend" | "incoming" | "outgoing" | "none";
  isOnline: boolean;
  lastSeenAt: string | null;
  averageRating: number;
  ratingsCount: number;
  attendedCount: number;
  noShowCount: number;
  hostedCount: number;
}

export interface VenueCard {
  id: string;
  name: string;
  neighborhood: string;
  address?: string | null;
  details?: string | null;
  kind: VenueKind;
  supportsEvents: boolean;
  ownerDisplayName: string;
  creatorUserId: string | null;
  formats: string[];
  lat: number;
  lng: number;
}

export interface MeetupPost {
  id: string;
  title: string;
  description: string;
  formatName: string;
  /** Slug do jogo (`games.slug`); vazio se o formato não tiver jogo ligado. */
  gameSlug: string;
  startsAt: string;
  hostMode: HostMode;
  status: MeetupStatus;
  maxPlayers: number;
  joinedPlayers: number;
  confirmedPlayers: number;
  lat: number;
  lng: number;
  venueName: string | null;
  addressLabel: string;
  locationHint: string;
  isLocationExact: boolean;
  chatImagePath: string | null;
  chatImageUrl: string | null;
  creatorUserId: string;
  creatorDisplayName: string;
  creatorHandle: string;
  creatorBio: string;
  creatorNeighborhood: string;
  creatorCanHost: boolean;
  isMember: boolean;
  isCreator: boolean;
}

export interface MeetupMemberPresence {
  userId: string;
  displayName: string;
  handle: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  attendanceStatus: AttendanceStatus;
  role: "creator" | "participant";
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarPath: string | null;
  authorAvatarUrl: string | null;
  sentAt: string;
  body: string;
  replyToMessageId: string | null;
  replyPreviewAuthorName: string | null;
  replyPreviewBody: string | null;
}

export interface InAppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meetupId: string | null;
  venueId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardData {
  games: CatalogGame[];
  formats: CatalogFormat[];
  venues: VenueCard[];
  meetups: MeetupPost[];
}

export type FriendshipState = "friend" | "incoming" | "outgoing";

export interface FriendProfile {
  friendshipId: string;
  state: FriendshipState;
  userId: string;
  displayName: string;
  handle: string;
  neighborhood: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface BlockedUserProfile {
  userId: string;
  displayName: string;
  handle: string;
  neighborhood: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  blockedAt: string;
  reason: string;
}

export interface PlayerSearchResult {
  userId: string;
  displayName: string;
  handle: string;
  neighborhood: string;
  bio: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  relationshipState: "friend" | "incoming" | "outgoing" | "none";
  isOnline: boolean;
}

export interface LegalDocument {
  id: string;
  kind: LegalDocumentKind;
  version: string;
  title: string;
  summary: string;
  effectiveAt: string;
  acceptedAt: string | null;
}

export interface ReputationSummary {
  averageRating: number;
  ratingsCount: number;
  attendedCount: number;
  noShowCount: number;
  hostedCount: number;
}

export interface VenueSuggestion {
  id: string;
  name: string;
  neighborhood: string;
  kind: VenueKind;
  status: VenueSuggestionStatus;
  createdAt: string;
}
