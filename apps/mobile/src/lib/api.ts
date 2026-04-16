import { analyticsCapture, analyticsFlush, analyticsReset } from "@/lib/analytics";
import { clearPendingPasswordRecoveryState, getAuthRedirectUri } from "@/lib/authRedirect";
import { supabase } from "@/lib/supabase";
import type {
  AttendanceStatus,
  AvailabilitySlot,
  BlockedUserProfile,
  CatalogGame,
  CatalogFormat,
  ChatMessage,
  DashboardData,
  FriendProfile,
  HostMode,
  InAppNotification,
  LegalDocument,
  MeetupMemberPresence,
  MeetupPost,
  MeetupStatus,
  PlayerSearchResult,
  PlayerProfile,
  PublicPlayerProfile,
  ReputationSummary,
  VenueCard,
  VenueKind,
  VenueSuggestion,
} from "@/types/domain";

type ProfileRow = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  neighborhood: string | null;
  avatar_path: string | null;
  can_host: boolean;
  search_radius_km: number;
  lat: number | null;
  lng: number | null;
  game_ids: string[] | null;
  game_names: string[] | null;
  format_ids: string[] | null;
  format_names: string[] | null;
  availability: AvailabilitySlot[] | null;
};

type CatalogFormatRow = {
  id: string;
  name: string;
  game_id: string;
};

type VenueRow = {
  id: string;
  name: string;
  neighborhood: string | null;
  address?: string | null;
  details?: string | null;
  kind: VenueKind;
  supports_events: boolean;
  owner_display_name: string | null;
  creator_user_id: string | null;
  formats: string[] | null;
  lat: number;
  lng: number;
};

type MeetupRow = {
  id: string;
  title: string;
  description: string | null;
  format_name: string | null;
  starts_at: string;
  host_mode: HostMode;
  status: MeetupStatus;
  max_players: number;
  joined_players: number;
  confirmed_players: number;
  lat: number;
  lng: number;
  venue_name: string | null;
  address_label: string | null;
  location_hint: string;
  is_location_exact: boolean;
  chat_image_path: string | null;
  creator_user_id: string;
  creator_display_name: string;
  creator_handle: string;
  creator_bio: string | null;
  creator_neighborhood: string | null;
  creator_can_host: boolean;
  is_member: boolean;
  is_creator: boolean;
};

type MeetupMemberPresenceRow = {
  user_id: string;
  display_name: string;
  handle: string;
  avatar_path: string | null;
  attendance_status: AttendanceStatus;
  role: "creator" | "participant";
  joined_at: string;
};

type MessageRow = {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_path: string | null;
  sent_at: string;
  body: string;
  reply_to_message_id: string | null;
  reply_preview_author_name: string | null;
  reply_preview_body: string | null;
};

type NotificationRow = {
  id: string;
  kind: InAppNotification["kind"];
  title: string;
  body: string;
  meetup_id: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type FriendRow = {
  friendship_id: string;
  state: FriendProfile["state"];
  user_id: string;
  display_name: string;
  handle: string;
  neighborhood: string | null;
  bio: string | null;
  avatar_path: string | null;
  is_online: boolean;
  last_seen_at: string | null;
};

type BlockedUserRow = {
  blocked_user_id: string;
  display_name: string;
  handle: string;
  neighborhood: string | null;
  bio: string | null;
  avatar_path: string | null;
  blocked_at: string;
  reason: string | null;
};

type PlayerSearchRow = {
  user_id: string;
  display_name: string;
  handle: string;
  neighborhood: string | null;
  bio: string | null;
  avatar_path: string | null;
  relationship_state: PlayerSearchResult["relationshipState"];
  is_online: boolean;
};

type LegalDocumentRow = {
  id: string;
  kind: LegalDocument["kind"];
  version: string;
  title: string;
  summary: string;
  effective_at: string;
  accepted_at: string | null;
};

type ReputationSummaryRow = {
  average_rating: number | string | null;
  ratings_count: number | null;
  attended_count: number | null;
  no_show_count: number | null;
  hosted_count: number | null;
};

type PublicPlayerProfileRow = {
  user_id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  neighborhood: string | null;
  avatar_path: string | null;
  can_host: boolean;
  game_names: string[] | null;
  format_names: string[] | null;
  availability: AvailabilitySlot[] | null;
  relationship_state: PublicPlayerProfile["relationshipState"];
  is_online: boolean;
  last_seen_at: string | null;
  average_rating: number | string | null;
  ratings_count: number | null;
  attended_count: number | null;
  no_show_count: number | null;
  hosted_count: number | null;
};

type VenueSuggestionRow = {
  id: string;
  name: string;
  neighborhood: string | null;
  kind: VenueKind;
  status: VenueSuggestion["status"];
  created_at: string;
};

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUri(),
    },
  });

  if (error) {
    throw error;
  }

  analyticsCapture("auth_sign_up", {
    has_session: Boolean(data.session),
  });

  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("auth_sign_in", {
    has_session: Boolean(data.session),
  });

  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUri(),
  });

  if (error) {
    throw error;
  }

  analyticsCapture("auth_password_reset_requested");
}

export async function signOut() {
  await clearPendingPasswordRecoveryState();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  analyticsCapture("auth_sign_out");
  await analyticsFlush();
  analyticsReset();
}

export async function updateMyPassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("auth_password_updated");

  return data.user;
}

export async function getCurrentLegalDocuments() {
  const { data, error } = await supabase.rpc("list_current_legal_documents");

  if (error) {
    throw error;
  }

  return ((data ?? []) as LegalDocumentRow[]).map((document) => ({
    id: document.id,
    kind: document.kind,
    version: document.version,
    title: document.title,
    summary: document.summary,
    effectiveAt: document.effective_at,
    acceptedAt: document.accepted_at,
  })) as LegalDocument[];
}

export async function hasAcceptedCurrentLegalDocuments() {
  const { data, error } = await supabase.rpc("has_accepted_current_legal_documents");

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function acceptCurrentLegalDocuments(input: {
  platform?: string;
  appVersion?: string;
}) {
  const { error } = await supabase.rpc("accept_current_legal_documents", {
    p_platform: input.platform ?? null,
    p_app_version: input.appVersion ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function getCatalogFormats() {
  const { data, error } = await supabase
    .from("formats")
    .select("id, name, game_id")
    .order("name");

  if (error) {
    throw error;
  }

  return ((data ?? []) as CatalogFormatRow[]).map((format) => ({
    id: format.id,
    name: format.name,
    gameId: format.game_id,
  })) as CatalogFormat[];
}

export async function getCatalogGames() {
  const { data, error } = await supabase.from("games").select("id, slug, name").order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as CatalogGame[];
}

export async function getMyProfile() {
  const { data, error } = await supabase.rpc("my_profile_details");

  if (error) {
    throw error;
  }

  const row = (data?.[0] ?? null) as ProfileRow | null;

  if (!row) {
    return null;
  }

  return mapProfile(row);
}

export async function ensureMyProfileExists() {
  const { error } = await supabase.rpc("ensure_profile_for_current_user");

  if (error) {
    throw error;
  }
}

export async function getPublicPlayerProfile(userId: string) {
  const { data, error } = await supabase.rpc("player_public_profile", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  const row = (data?.[0] ?? null) as PublicPlayerProfileRow | null;

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    bio: row.bio ?? "",
    neighborhood: row.neighborhood ?? "",
    avatarPath: row.avatar_path,
    avatarUrl: resolveAvatarUrl(row.avatar_path),
    canHost: row.can_host,
    gameNames: row.game_names ?? [],
    formatNames: row.format_names ?? [],
    availability: row.availability ?? [],
    relationshipState: row.relationship_state,
    isOnline: row.is_online,
    lastSeenAt: row.last_seen_at,
    averageRating: Number(row.average_rating ?? 0),
    ratingsCount: row.ratings_count ?? 0,
    attendedCount: row.attended_count ?? 0,
    noShowCount: row.no_show_count ?? 0,
    hostedCount: row.hosted_count ?? 0,
  } satisfies PublicPlayerProfile;
}

export async function saveMyProfile(input: {
  handle: string;
  displayName: string;
  bio: string;
  neighborhood: string;
  canHost: boolean;
  searchRadiusKm: number;
  lat: number | null;
  lng: number | null;
  gameIds: string[];
  formatIds: string[];
  availability: AvailabilitySlot[];
}) {
  const { error } = await supabase.rpc("save_my_profile", {
    p_handle: input.handle,
    p_display_name: input.displayName,
    p_bio: input.bio,
    p_neighborhood: input.neighborhood,
    p_can_host: input.canHost,
    p_search_radius_km: input.searchRadiusKm,
    p_lat: input.lat,
    p_lng: input.lng,
    p_game_ids: input.gameIds,
    p_format_ids: input.formatIds,
    p_availability: input.availability,
  });

  if (error) {
    throw error;
  }
}

export async function uploadMyAvatar(input: {
  imageUri: string;
  mimeType?: string | null;
  base64?: string | null;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const fileBytes = input.base64
    ? decodeBase64ToBytes(input.base64)
    : await fetch(input.imageUri).then(async (response) => {
        const blob = await response.blob();
        return new Uint8Array(await blob.arrayBuffer());
      });
  const extension = inferAvatarExtension(input.mimeType ?? null, input.imageUri);
  const avatarPath = `${user.id}/${Date.now()}.${extension}`;
  const contentType = input.mimeType ?? `image/${extension}`;

  const uploadResult = await supabase.storage.from("avatars").upload(avatarPath, fileBytes, {
    contentType,
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("user_id", user.id);

  if (updateError) {
    throw updateError;
  }

  return {
    avatarPath,
    avatarUrl: resolveAvatarUrl(avatarPath),
  };
}

export async function uploadMeetupChatImage(input: {
  meetupId: string;
  imageUri: string;
  mimeType?: string | null;
  base64?: string | null;
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const fileBytes = input.base64
    ? decodeBase64ToBytes(input.base64)
    : await fetch(input.imageUri).then(async (response) => {
        const blob = await response.blob();
        return new Uint8Array(await blob.arrayBuffer());
      });
  const extension = inferImageExtension(input.mimeType ?? null, input.imageUri);
  const imagePath = `${user.id}/${input.meetupId}/${Date.now()}.${extension}`;
  const contentType = input.mimeType ?? `image/${extension}`;

  const uploadResult = await supabase.storage
    .from("meetup-chat-images")
    .upload(imagePath, fileBytes, {
      contentType,
      upsert: true,
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { error } = await supabase.rpc("set_my_meetup_chat_image", {
    p_meetup_id: input.meetupId,
    p_chat_image_path: imagePath,
  });

  if (error) {
    throw error;
  }

  return {
    imagePath,
    imageUrl: resolveStoragePublicUrl("meetup-chat-images", imagePath),
  };
}

export async function registerPushDevice(input: {
  expoPushToken: string;
  platform: string;
  deviceName?: string | null;
  appVersion?: string | null;
  permissionStatus?: string | null;
}) {
  const { data, error } = await supabase.rpc("register_push_device", {
    p_expo_push_token: input.expoPushToken,
    p_platform: input.platform,
    p_device_name: input.deviceName ?? null,
    p_app_version: input.appVersion ?? null,
    p_permission_status: input.permissionStatus ?? "granted",
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function disablePushDevice(expoPushToken: string) {
  const { error } = await supabase.rpc("disable_push_device", {
    p_expo_push_token: expoPushToken,
  });

  if (error) {
    throw error;
  }
}

export async function getDashboardData(options?: {
  closeExpired?: boolean;
}) {
  const shouldCloseExpired = options?.closeExpired ?? true;

  if (shouldCloseExpired) {
    // Falhar silenciosamente aqui mantém a home utilizável mesmo se a RPC de
    // manutenção ainda não estiver disponível em algum ambiente.
    await supabase.rpc("close_expired_meetups");
  }

  const [formatsResult, venuesResult, meetupsResult] = await Promise.all([
    getCatalogFormats(),
    supabase.rpc("list_venue_cards"),
    supabase.rpc("list_meetup_cards"),
  ]);

  if (venuesResult.error) {
    throw venuesResult.error;
  }

  if (meetupsResult.error) {
    throw meetupsResult.error;
  }

  return {
    formats: formatsResult,
    venues: ((venuesResult.data ?? []) as VenueRow[]).map(mapVenue),
    meetups: ((meetupsResult.data ?? []) as MeetupRow[]).map(mapMeetup),
  } satisfies DashboardData;
}

export async function getDashboardFeedInBounds(bounds: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}) {
  const [venuesResult, meetupsResult] = await Promise.all([
    supabase.rpc("list_venue_cards_in_bounds", {
      p_min_lat: bounds.minLat,
      p_max_lat: bounds.maxLat,
      p_min_lng: bounds.minLng,
      p_max_lng: bounds.maxLng,
    }),
    supabase.rpc("list_meetup_cards_in_bounds", {
      p_min_lat: bounds.minLat,
      p_max_lat: bounds.maxLat,
      p_min_lng: bounds.minLng,
      p_max_lng: bounds.maxLng,
    }),
  ]);

  if (venuesResult.error) {
    throw venuesResult.error;
  }

  if (meetupsResult.error) {
    throw meetupsResult.error;
  }

  return {
    venues: ((venuesResult.data ?? []) as VenueRow[]).map(mapVenue),
    meetups: ((meetupsResult.data ?? []) as MeetupRow[]).map(mapMeetup),
  };
}

export async function createMeetup(input: {
  title: string;
  description: string;
  formatId: string;
  hostMode: HostMode;
  startsAt: string;
  maxPlayers: number;
  lat: number | null;
  lng: number | null;
  venueId: string | null;
  addressLabel?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_meetup_post", {
    p_title: input.title,
    p_description: input.description,
    p_format_id: input.formatId,
    p_host_mode: input.hostMode,
    p_starts_at: input.startsAt,
    p_max_players: input.maxPlayers,
    p_lat: input.lat,
    p_lng: input.lng,
    p_venue_id: input.venueId,
    p_address_label: input.addressLabel ?? null,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_created", {
    host_mode: input.hostMode,
    has_venue: Boolean(input.venueId),
    has_exact_location: input.lat !== null && input.lng !== null,
  });

  return data as string;
}

export async function updateMyMeetupLocation(input: {
  meetupId: string;
  lat: number | null;
  lng: number | null;
  addressLabel?: string | null;
  venueId?: string | null;
}) {
  const { error } = await supabase.rpc("update_my_meetup_location", {
    p_meetup_id: input.meetupId,
    p_lat: input.lat,
    p_lng: input.lng,
    p_address_label: input.addressLabel ?? null,
    p_venue_id: input.venueId ?? null,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_location_updated", {
    has_venue: Boolean(input.venueId),
    has_exact_location: input.lat !== null && input.lng !== null,
  });
}

export async function joinMeetup(meetupId: string) {
  const { error } = await supabase.rpc("join_meetup", {
    p_meetup_id: meetupId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_joined");
}

export async function leaveMeetup(meetupId: string) {
  const { error } = await supabase.rpc("leave_meetup", {
    p_meetup_id: meetupId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_left");
}

export async function updateMyMeetup(input: {
  meetupId: string;
  maxPlayers?: number;
  status?: MeetupStatus;
  startsAt?: string | null;
}) {
  const { error } = await supabase.rpc("update_my_meetup", {
    p_meetup_id: input.meetupId,
    p_max_players: input.maxPlayers ?? null,
    p_status: input.status ?? null,
    p_starts_at: input.startsAt ?? null,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_updated", {
    status: input.status ?? null,
    has_schedule_change: input.startsAt !== undefined,
  });
}

export async function blockUser(input: {
  blockedUserId: string;
  reason?: string;
}) {
  const { error } = await supabase.rpc("block_user", {
    p_blocked_user_id: input.blockedUserId,
    p_reason: input.reason ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function reportUser(input: {
  reportedUserId: string;
  meetupId?: string | null;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.rpc("report_user", {
    p_reported_user_id: input.reportedUserId,
    p_meetup_id: input.meetupId ?? null,
    p_reason: input.reason,
    p_details: input.details ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function unblockUser(blockedUserId: string) {
  const { error } = await supabase.rpc("unblock_user", {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw error;
  }
}

export async function getMyBlockedUsers() {
  const { data, error } = await supabase.rpc("list_my_blocked_users");

  if (error) {
    throw error;
  }

  return ((data ?? []) as BlockedUserRow[]).map((row) => ({
    userId: row.blocked_user_id,
    displayName: row.display_name,
    handle: row.handle,
    neighborhood: row.neighborhood ?? "",
    bio: row.bio ?? "",
    avatarPath: row.avatar_path,
    avatarUrl: resolveAvatarUrl(row.avatar_path),
    blockedAt: row.blocked_at,
    reason: row.reason ?? "",
  })) as BlockedUserProfile[];
}

export async function getMeetupMessages(meetupId: string) {
  const { data, error } = await supabase.rpc("list_meetup_messages", {
    p_meetup_id: meetupId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageRow[]).map((message) => ({
    id: message.id,
    authorId: message.author_id,
    authorName: message.author_name,
    authorAvatarPath: message.author_avatar_path,
    authorAvatarUrl: resolveAvatarUrl(message.author_avatar_path),
    sentAt: message.sent_at,
    body: message.body,
    replyToMessageId: message.reply_to_message_id,
    replyPreviewAuthorName: message.reply_preview_author_name,
    replyPreviewBody: message.reply_preview_body,
  })) as ChatMessage[];
}

export async function getMeetupMessagesAfter(meetupId: string, after: string) {
  const { data, error } = await supabase.rpc("list_meetup_messages_after", {
    p_meetup_id: meetupId,
    p_after: after,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageRow[]).map((message) => ({
    id: message.id,
    authorId: message.author_id,
    authorName: message.author_name,
    authorAvatarPath: message.author_avatar_path,
    authorAvatarUrl: resolveAvatarUrl(message.author_avatar_path),
    sentAt: message.sent_at,
    body: message.body,
    replyToMessageId: message.reply_to_message_id,
    replyPreviewAuthorName: message.reply_preview_author_name,
    replyPreviewBody: message.reply_preview_body,
  })) as ChatMessage[];
}

export async function getMeetupMemberPresence(meetupId: string) {
  const { data, error } = await supabase.rpc("list_meetup_member_presence", {
    p_meetup_id: meetupId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MeetupMemberPresenceRow[]).map((member) => ({
    userId: member.user_id,
    displayName: member.display_name,
    handle: member.handle,
    avatarPath: member.avatar_path,
    avatarUrl: resolveAvatarUrl(member.avatar_path),
    attendanceStatus: member.attendance_status,
    role: member.role,
    joinedAt: member.joined_at,
  })) as MeetupMemberPresence[];
}

export async function sendMeetupMessage(
  meetupId: string,
  body: string,
  replyToMessageId?: string | null
) {
  const { error } = await supabase.rpc("send_meetup_message", {
    p_meetup_id: meetupId,
    p_body: body,
    p_reply_to_message_id: replyToMessageId ?? null,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_message_sent", {
    has_reply: Boolean(replyToMessageId),
  });
}

export async function setMyAttendanceStatus(meetupId: string, status: AttendanceStatus) {
  const { error } = await supabase.rpc("set_my_attendance_status", {
    p_meetup_id: meetupId,
    p_status: status,
  });

  if (!error) {
    analyticsCapture("meetup_attendance_status_updated", {
      status,
    });
    return;
  }

  const legacyStatus =
    status === "interested"
      ? "going"
      : status === "confirmed"
        ? "arrived"
        : status === "not_going"
          ? "cant_make_it"
          : null;

  if (!legacyStatus) {
    throw error;
  }

  const { error: legacyError } = await supabase.rpc("set_my_attendance_status", {
    p_meetup_id: meetupId,
    p_status: legacyStatus,
  });

  if (legacyError) {
    throw legacyError;
  }

  analyticsCapture("meetup_attendance_status_updated", {
    status,
    legacy_fallback: true,
  });
}

export async function removeMeetupMember(meetupId: string, memberUserId: string) {
  const { error } = await supabase.rpc("remove_meetup_member", {
    p_meetup_id: meetupId,
    p_member_user_id: memberUserId,
  });

  if (error) {
    if (
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("remove_meetup_member")
    ) {
      throw new Error(
        "A remoção de participantes ainda depende da atualização do banco neste ambiente."
      );
    }

    throw error;
  }

  analyticsCapture("meetup_member_removed");
}

export async function rateMeetupPlayer(input: {
  meetupId: string;
  reviewedUserId: string;
  attended: boolean;
  rating?: number | null;
  note?: string | null;
}) {
  const { data, error } = await supabase.rpc("rate_meetup_player", {
    p_meetup_id: input.meetupId,
    p_reviewed_user_id: input.reviewedUserId,
    p_attended: input.attended,
    p_rating: input.rating ?? null,
    p_note: input.note ?? null,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function getMyReputationSummary() {
  const { data, error } = await supabase.rpc("my_reputation_summary");

  if (error) {
    throw error;
  }

  const row = (data?.[0] ?? null) as ReputationSummaryRow | null;

  return {
    averageRating: Number(row?.average_rating ?? 0),
    ratingsCount: row?.ratings_count ?? 0,
    attendedCount: row?.attended_count ?? 0,
    noShowCount: row?.no_show_count ?? 0,
    hostedCount: row?.hosted_count ?? 0,
  } satisfies ReputationSummary;
}

export async function getMyNotifications(limit = 8) {
  const remindersResult = await supabase.rpc("create_due_meetup_reminders");

  if (remindersResult.error) {
    throw remindersResult.error;
  }

  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as NotificationRow[]).map((notification) => ({
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    meetupId: notification.meetup_id,
    venueId:
      typeof notification.metadata?.venue_id === "string" ? notification.metadata.venue_id : null,
    metadata: notification.metadata ?? {},
    readAt: notification.read_at,
    createdAt: notification.created_at,
  })) as InAppNotification[];
}

export async function markMyNotificationsRead(notificationIds?: string[]) {
  const { error } = await supabase.rpc("mark_my_notifications_read", {
    p_notification_ids: notificationIds?.length ? notificationIds : null,
  });

  if (error) {
    throw error;
  }
}

export async function heartbeatPresence() {
  const { error } = await supabase.rpc("upsert_my_presence");

  if (error) {
    throw error;
  }
}

export async function getFriendOverview() {
  const { data, error } = await supabase.rpc("list_friend_overview");

  if (error) {
    throw error;
  }

  return ((data ?? []) as FriendRow[]).map(mapFriendProfile);
}

export async function searchPlayers(query: string) {
  const { data, error } = await supabase.rpc("search_players", {
    p_query: query,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PlayerSearchRow[]).map(mapPlayerSearchResult);
}

export async function sendFriendRequest(targetUserId: string) {
  const { data, error } = await supabase.rpc("send_friend_request", {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("friend_request_sent");

  return data as string;
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const { error } = await supabase.rpc("respond_friend_request", {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("friend_request_responded", {
    accepted: accept,
  });
}

export async function removeFriend(otherUserId: string) {
  const { error } = await supabase.rpc("remove_friend", {
    p_other_user_id: otherUserId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("friend_removed");
}

export async function createVenueSuggestion(input: {
  name: string;
  neighborhood: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  kind: VenueKind;
  formatIds: string[];
}) {
  const { data, error } = await supabase.rpc("create_venue_suggestion", {
    p_name: input.name,
    p_neighborhood: input.neighborhood,
    p_address: input.address,
    p_details: input.details,
    p_lat: input.lat,
    p_lng: input.lng,
    p_kind: input.kind,
    p_format_ids: input.formatIds,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("venue_suggested", {
    kind: input.kind,
    game_count: input.formatIds.length,
  });

  return data as string;
}

export async function createVenue(input: {
  name: string;
  neighborhood: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  kind: VenueKind;
  formatIds: string[];
}) {
  const { data, error } = await supabase.rpc("create_my_venue", {
    p_name: input.name,
    p_neighborhood: input.neighborhood,
    p_address: input.address,
    p_details: input.details,
    p_lat: input.lat,
    p_lng: input.lng,
    p_kind: input.kind,
    p_format_ids: input.formatIds,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("venue_created", {
    kind: input.kind,
    game_count: input.formatIds.length,
  });

  return data as string;
}

export async function updateMyVenue(input: {
  venueId: string;
  name: string;
  neighborhood: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  kind: VenueKind;
  formatIds: string[];
}) {
  const { error } = await supabase.rpc("update_my_venue", {
    p_venue_id: input.venueId,
    p_name: input.name,
    p_neighborhood: input.neighborhood,
    p_address: input.address,
    p_details: input.details,
    p_lat: input.lat,
    p_lng: input.lng,
    p_kind: input.kind,
    p_format_ids: input.formatIds,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("venue_updated", {
    kind: input.kind,
    game_count: input.formatIds.length,
  });
}

export async function deleteMyVenue(venueId: string) {
  const { error } = await supabase.rpc("delete_my_venue", {
    p_venue_id: venueId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("venue_deleted");
}

export async function deleteMyMeetup(meetupId: string) {
  const { error } = await supabase.rpc("delete_my_meetup", {
    p_meetup_id: meetupId,
  });

  if (error) {
    throw error;
  }

  analyticsCapture("meetup_deleted");
}

export async function getMyVenueSuggestions() {
  const { data, error } = await supabase.rpc("list_my_venue_suggestions");

  if (error) {
    throw error;
  }

  return ((data ?? []) as VenueSuggestionRow[]).map((suggestion) => ({
    id: suggestion.id,
    name: suggestion.name,
    neighborhood: suggestion.neighborhood ?? "",
    kind: suggestion.kind,
    status: suggestion.status,
    createdAt: suggestion.created_at,
  })) as VenueSuggestion[];
}

export async function deleteMyAccount() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const avatarListResult = await supabase.storage.from("avatars").list(user.id, {
    limit: 100,
    offset: 0,
  });

  if (avatarListResult.error) {
    throw avatarListResult.error;
  }

  const avatarPaths = (avatarListResult.data ?? [])
    .map((entry) => entry.name?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => `${user.id}/${entry}`);

  if (avatarPaths.length) {
    const removeResult = await supabase.storage.from("avatars").remove(avatarPaths);

    if (removeResult.error) {
      throw removeResult.error;
    }
  }

  const { error } = await supabase.rpc("delete_my_account");

  if (error) {
    throw error;
  }
}

function mapProfile(row: ProfileRow): PlayerProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? "",
    neighborhood: row.neighborhood ?? "",
    avatarPath: row.avatar_path,
    avatarUrl: resolveAvatarUrl(row.avatar_path),
    canHost: row.can_host,
    searchRadiusKm: row.search_radius_km,
    lat: row.lat,
    lng: row.lng,
    gameIds: row.game_ids ?? [],
    gameNames: row.game_names ?? [],
    formatIds: row.format_ids ?? [],
    formatNames: row.format_names ?? [],
    availability: row.availability ?? [],
  };
}

function mapVenue(row: VenueRow): VenueCard {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood ?? "",
    address: row.address ?? null,
    details: row.details ?? null,
    kind: row.kind,
    supportsEvents: row.supports_events,
    ownerDisplayName: row.owner_display_name ?? "Comunidade",
    creatorUserId: row.creator_user_id,
    formats: row.formats ?? [],
    lat: row.lat,
    lng: row.lng,
  };
}

function mapMeetup(row: MeetupRow): MeetupPost {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    formatName: row.format_name ?? "Casual",
    startsAt: row.starts_at,
    hostMode: row.host_mode,
    status: row.status,
    maxPlayers: row.max_players,
    joinedPlayers: row.joined_players,
    confirmedPlayers: row.confirmed_players,
    lat: row.lat,
    lng: row.lng,
    venueName: row.venue_name,
    addressLabel: row.address_label ?? row.location_hint,
    locationHint: row.location_hint,
    isLocationExact: row.is_location_exact,
    chatImagePath: row.chat_image_path,
    chatImageUrl: resolveStoragePublicUrl("meetup-chat-images", row.chat_image_path),
    creatorUserId: row.creator_user_id,
    creatorDisplayName: row.creator_display_name,
    creatorHandle: row.creator_handle,
    creatorBio: row.creator_bio ?? "",
    creatorNeighborhood: row.creator_neighborhood ?? "",
    creatorCanHost: row.creator_can_host,
    isMember: row.is_member,
    isCreator: row.is_creator,
  };
}

function mapFriendProfile(row: FriendRow): FriendProfile {
  return {
    friendshipId: row.friendship_id,
    state: row.state,
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    neighborhood: row.neighborhood ?? "",
    bio: row.bio ?? "",
    avatarPath: row.avatar_path,
    avatarUrl: resolveAvatarUrl(row.avatar_path),
    isOnline: row.is_online,
    lastSeenAt: row.last_seen_at,
  };
}

function mapPlayerSearchResult(row: PlayerSearchRow): PlayerSearchResult {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    neighborhood: row.neighborhood ?? "",
    bio: row.bio ?? "",
    avatarPath: row.avatar_path,
    avatarUrl: resolveAvatarUrl(row.avatar_path),
    relationshipState: row.relationship_state,
    isOnline: row.is_online,
  };
}

function resolveAvatarUrl(avatarPath: string | null) {
  return resolveStoragePublicUrl("avatars", avatarPath);
}

function resolveStoragePublicUrl(bucket: string, path: string | null) {
  if (!path) {
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const separator = data.publicUrl.includes("?") ? "&" : "?";
  return `${data.publicUrl}${separator}v=${encodeURIComponent(path)}`;
}

function inferImageExtension(mimeType: string | null, imageUri: string) {
  const mimeExtension = mimeType?.split("/")[1]?.toLowerCase();

  if (mimeExtension === "jpeg") {
    return "jpg";
  }

  if (mimeExtension) {
    return mimeExtension;
  }

  const uriExtension = imageUri.split("?")[0]?.split(".").pop()?.toLowerCase();

  if (uriExtension) {
    return uriExtension;
  }

  return "jpg";
}

function inferAvatarExtension(mimeType: string | null, imageUri: string) {
  return inferImageExtension(mimeType, imageUri);
}

function decodeBase64ToBytes(base64: string) {
  const decoded = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}
