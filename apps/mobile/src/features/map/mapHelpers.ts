import { inferGameNameFromLabels, slugifyGameLabel } from "@/features/map/gameLabels";
import { formatShortAddress } from "@/lib/formatting";
import { getDeviceCoordinate, reverseGeocodeAddress } from "@/lib/location";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type {
  ChatMessage,
  HostMode,
  MeetupPost,
  VenueCard,
} from "@/types/domain";

export type MeetupSortMode = "distance_asc" | "distance_desc" | "date_asc" | "date_desc";

export function resolveCurrentLocationSuggestion(): Promise<AddressSuggestion> {
  return getDeviceCoordinate().then(async (coordinate) => {
    const resolvedAddress = await reverseGeocodeAddress(coordinate).catch(() => ({
      label: null,
      neighborhood: null,
    }));

    return {
      id: "current-location",
      title: resolvedAddress.label ?? "Sua localização atual",
      subtitle: resolvedAddress.neighborhood ?? "Posição atual do aparelho",
      fullLabel: resolvedAddress.label ?? "Sua localização atual",
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };
  });
}

export function buildChatGroupsByGame(chatMeetups: MeetupPost[]) {
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      chats: MeetupPost[];
    }
  >();

  chatMeetups.forEach((meetup) => {
    const label = inferGameNameFromLabels([meetup.formatName]);
    const id = slugifyGameLabel(label);
    const existing = groups.get(id);

    if (existing) {
      existing.chats.push(meetup);
      return;
    }

    groups.set(id, {
      id,
      label,
      chats: [meetup],
    });
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      chats: [...group.chats],
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function mapComposerMeetupModeToHostMode(
  value: "public_place" | "specialty_store" | "can_host" | "looking_for_host" | "search_address"
): HostMode {
  if (value === "specialty_store" || value === "search_address") {
    return "public_place";
  }

  return value;
}

export function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? error.message : null;
    const maybeDetails = "details" in error ? error.details : null;
    const maybeHint = "hint" in error ? error.hint : null;

    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      if (typeof maybeDetails === "string" && maybeDetails.trim()) {
        return `${maybeMessage} (${maybeDetails})`;
      }

      if (typeof maybeHint === "string" && maybeHint.trim()) {
        return `${maybeMessage} (${maybeHint})`;
      }

      return maybeMessage;
    }
  }

  return "Não foi possível concluir esta ação.";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function mergeChatMessages(currentMessages: ChatMessage[], incomingMessages: ChatMessage[]) {
  const merged = new Map<string, ChatMessage>();

  currentMessages.forEach((message) => {
    merged.set(message.id, message);
  });

  incomingMessages.forEach((message) => {
    merged.set(message.id, message);
  });

  return Array.from(merged.values()).sort(
    (left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime()
  );
}

export function buildAddressSuggestionFromVenue(venue: VenueCard): AddressSuggestion {
  const shortAddress = formatShortAddress(venue.address) || venue.name;
  const fullLabel =
    venue.address?.trim() ||
    [shortAddress, venue.neighborhood].filter(Boolean).join(", ") ||
    venue.name;

  return {
    id: `venue:${venue.id}`,
    title: shortAddress,
    subtitle: venue.neighborhood,
    fullLabel,
    latitude: venue.lat,
    longitude: venue.lng,
  };
}

export function distanceBetweenCoordinates(
  originLat: number | null,
  originLng: number | null,
  targetLat: number,
  targetLng: number
) {
  if (originLat === null || originLng === null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(targetLat - originLat);
  const dLng = degreesToRadians(targetLng - originLng);
  const originLatRad = degreesToRadians(originLat);
  const targetLatRad = degreesToRadians(targetLat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(originLatRad) * Math.cos(targetLatRad) * Math.sin(dLng / 2) ** 2;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
}

export function compareMeetups(
  left: MeetupPost,
  right: MeetupPost,
  options: {
    mode: MeetupSortMode;
    profileLat: number | null;
    profileLng: number | null;
    nowTimestamp: number;
    prioritizeMeetupId?: string | null;
  }
) {
  if (options.prioritizeMeetupId) {
    if (left.id === options.prioritizeMeetupId) {
      return -1;
    }

    if (right.id === options.prioritizeMeetupId) {
      return 1;
    }
  }

  const leftDistance =
    distanceBetweenCoordinates(options.profileLat, options.profileLng, left.lat, left.lng) ??
    Number.MAX_VALUE;
  const rightDistance =
    distanceBetweenCoordinates(options.profileLat, options.profileLng, right.lat, right.lng) ??
    Number.MAX_VALUE;
  const leftStartsAt = new Date(left.startsAt).getTime();
  const rightStartsAt = new Date(right.startsAt).getTime();
  const leftDateDistance = Number.isNaN(leftStartsAt)
    ? Number.MAX_VALUE
    : Math.abs(leftStartsAt - options.nowTimestamp);
  const rightDateDistance = Number.isNaN(rightStartsAt)
    ? Number.MAX_VALUE
    : Math.abs(rightStartsAt - options.nowTimestamp);

  if (options.mode === "distance_asc" && leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  if (options.mode === "distance_desc" && leftDistance !== rightDistance) {
    return rightDistance - leftDistance;
  }

  if (options.mode === "date_asc" && leftDateDistance !== rightDateDistance) {
    return leftDateDistance - rightDateDistance;
  }

  if (options.mode === "date_desc" && leftDateDistance !== rightDateDistance) {
    return rightDateDistance - leftDateDistance;
  }

  if (!Number.isNaN(leftStartsAt) && !Number.isNaN(rightStartsAt) && leftStartsAt !== rightStartsAt) {
    return leftStartsAt - rightStartsAt;
  }

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  return left.title.localeCompare(right.title);
}

export function compareVenuesByDistance(
  left: VenueCard,
  right: VenueCard,
  options: {
    profileLat: number | null;
    profileLng: number | null;
  }
) {
  const leftDistance =
    distanceBetweenCoordinates(options.profileLat, options.profileLng, left.lat, left.lng) ??
    Number.MAX_VALUE;
  const rightDistance =
    distanceBetweenCoordinates(options.profileLat, options.profileLng, right.lat, right.lng) ??
    Number.MAX_VALUE;

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  return left.name.localeCompare(right.name);
}

export function isDemoId(value: string | null | undefined) {
  return value?.startsWith("demo-") ?? false;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
