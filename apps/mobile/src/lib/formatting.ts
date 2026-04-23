import type {
  AttendanceStatus,
  AvailabilitySlot,
  HostMode,
  MeetupStatus,
  NotificationKind,
  VenueKind,
  VenueSuggestionStatus,
} from "@/types/domain";
import { getCurrentLocale, translate } from "@/i18n";

const periodDefinitions = [
  { id: "morning", labelKey: "format.period.morning", start: "09:00", end: "12:00" },
  { id: "afternoon", labelKey: "format.period.afternoon", start: "14:00", end: "18:00" },
  { id: "night", labelKey: "format.period.night", start: "19:00", end: "23:00" },
] as const;

export function formatHostMode(mode: HostMode) {
  if (mode === "can_host") {
    return translate("format.host.canHost");
  }

  if (mode === "looking_for_host") {
    return translate("format.host.lookingForHost");
  }

  return translate("format.host.publicVenue");
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMeetupStatus(status: MeetupStatus) {
  if (status === "closed") {
    return translate("format.meetup.closed");
  }

  if (status === "cancelled") {
    return translate("format.meetup.cancelled");
  }

  return translate("format.meetup.open");
}

export function formatVenueKind(kind: VenueKind) {
  if (kind === "specialty_store") {
    return translate("format.venue.specialtyStore");
  }

  return translate("format.venue.public");
}

export function formatAttendanceStatus(status: AttendanceStatus) {
  if (status === "interested") {
    return translate("format.attendance.interested");
  }

  if (status === "confirmed") {
    return translate("format.attendance.confirmed");
  }

  if (status === "not_going") {
    return translate("format.attendance.notGoing");
  }

  if (status === "on_the_way") {
    return translate("format.attendance.confirmed");
  }

  if (status === "arrived") {
    return translate("format.attendance.confirmed");
  }

  if (status === "left") {
    return translate("format.attendance.confirmed");
  }

  if (status === "cant_make_it") {
    return translate("format.attendance.notGoing");
  }

  return translate("format.attendance.interested");
}

export function formatVenueSuggestionStatus(status: VenueSuggestionStatus) {
  if (status === "approved") {
    return translate("format.venueSuggestion.approved");
  }

  if (status === "rejected") {
    return translate("format.venueSuggestion.rejected");
  }

  return translate("format.venueSuggestion.pending");
}

export function formatLocationPrivacy(isLocationExact: boolean, locationHint: string) {
  if (isLocationExact) {
    return locationHint;
  }

  return `${locationHint} · ${translate("format.locationExactHidden")}`;
}

export function formatCompactAddress(value: string | null | undefined) {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return "";
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return normalized;
  }

  const compactParts = parts.filter((part) => !isBroadAddressPart(part)).slice(0, 3);
  return (compactParts.length ? compactParts : parts.slice(0, 3)).join(", ");
}

export function formatShortAddress(value: string | null | undefined) {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return "";
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return normalized;
  }

  const narrowed = parts.filter((part) => !isBroadAddressPart(part)).slice(0, 2);
  return (narrowed.length ? narrowed : parts.slice(0, 2)).join(", ");
}

function isBroadAddressPart(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    normalized === "brasil" ||
    normalized === "brazil" ||
    normalized === "sao paulo" ||
    normalized === "rio de janeiro" ||
    normalized === "minas gerais" ||
    normalized === "parana" ||
    normalized === "santa catarina" ||
    normalized === "bahia" ||
    normalized === "distrito federal" ||
    /^[a-z]{2}$/.test(normalized)
  );
}

export function formatNotificationKind(kind: NotificationKind) {
  if (kind === "member_joined") {
    return translate("format.notification.group");
  }

  if (kind === "message_received") {
    return translate("format.notification.chat");
  }

  if (kind === "meetup_reminder") {
    return translate("format.notification.reminder");
  }

  if (kind === "nearby_meetup_created" || kind === "nearby_venue_created") {
    return translate("format.notification.nearby");
  }

  return translate("format.notification.status");
}

export function formatAvailabilitySlot(slot: AvailabilitySlot) {
  return `${formatWeekday(slot.weekday)} ${slot.start_time}-${slot.end_time}`;
}

export function formatAvailabilityPeriod(slot: AvailabilitySlot) {
  const periodDefinition = periodDefinitions.find(
    (item) => item.start === slot.start_time && item.end === slot.end_time
  );
  const period = periodDefinition
    ? translate(periodDefinition.labelKey)
    : translate("format.availabilityPeriod.fallback");

  return `${formatWeekday(slot.weekday)} · ${period}`;
}

export function summarizeAvailabilityPeriods(slots: AvailabilitySlot[]) {
  const unique = new Map<string, string>();

  [...slots]
    .sort((left, right) => {
      if (left.weekday !== right.weekday) {
        return left.weekday - right.weekday;
      }

      return left.start_time.localeCompare(right.start_time);
    })
    .forEach((slot) => {
      const label = formatAvailabilityPeriod(slot);
      unique.set(label, label);
    });

  return Array.from(unique.values());
}

export function formatDistanceKm(
  fromLat: number | null,
  fromLng: number | null,
  toLat: number,
  toLng: number
) {
  const distance = calculateDistanceKm(fromLat, fromLng, toLat, toLng);

  if (distance === null) {
    return null;
  }

  return `${distance.toFixed(1)} km`;
}

export function calculateDistanceKm(
  fromLat: number | null,
  fromLng: number | null,
  toLat: number,
  toLng: number
) {
  if (fromLat === null || fromLng === null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function formatSyncLabel(value: Date | null) {
  if (!value) {
    return translate("format.sync.empty");
  }

  const time = new Intl.DateTimeFormat(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

  return translate("format.sync.ready", { time });
}

export function formatRelativeTimestamp(value: string) {
  const target = new Date(value).getTime();
  const deltaMinutes = Math.round((target - Date.now()) / 60000);

  if (Math.abs(deltaMinutes) < 1) {
    return translate("format.now");
  }

  const formatter =
    typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function"
      ? new Intl.RelativeTimeFormat(getCurrentLocale(), { numeric: "auto" })
      : null;

  if (Math.abs(deltaMinutes) < 60) {
    return formatter
      ? formatter.format(deltaMinutes, "minute")
      : formatRelativeFallback(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return formatter
      ? formatter.format(deltaHours, "hour")
      : formatRelativeFallback(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter
    ? formatter.format(deltaDays, "day")
    : formatRelativeFallback(deltaDays, "day");
}

export function formatParticipantSummary(joinedPlayers: number, _maxPlayers = 0) {
  const count = Math.max(joinedPlayers, 0);

  if (count === 1) {
    return translate("format.participant.one");
  }

  return translate("format.participant.other", { count });
}

export function formatAverageRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return translate("format.averageRatingEmpty");
  }

  return `${value.toFixed(1)} / 5`;
}

export function toLocalDateTimeInput(date: Date) {
  const localCopy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localCopy.toISOString().slice(0, 16).replace("T", " ");
}

export function parseLocalDateTimeInput(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatRelativeFallback(amount: number, unit: "minute" | "hour" | "day") {
  const absoluteAmount = Math.abs(amount);
  const label = translate(
    absoluteAmount === 1
      ? `format.unit.${unit}.one`
      : `format.unit.${unit}.other`
  );

  if (amount < 0) {
    return translate("format.relative.past", { count: absoluteAmount, unit: label });
  }

  return translate("format.relative.future", { count: absoluteAmount, unit: label });
}

function formatWeekday(weekday: number) {
  switch (weekday) {
    case 0:
      return translate("format.weekday.0");
    case 1:
      return translate("format.weekday.1");
    case 2:
      return translate("format.weekday.2");
    case 3:
      return translate("format.weekday.3");
    case 4:
      return translate("format.weekday.4");
    case 5:
      return translate("format.weekday.5");
    case 6:
      return translate("format.weekday.6");
    default:
      return translate("format.day.fallback");
  }
}
