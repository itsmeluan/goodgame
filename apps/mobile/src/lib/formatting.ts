import type {
  AttendanceStatus,
  AvailabilitySlot,
  HostMode,
  MeetupStatus,
  NotificationKind,
  VenueKind,
  VenueSuggestionStatus,
} from "@/types/domain";

const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const periodDefinitions = [
  { id: "morning", label: "Manhã", start: "09:00", end: "12:00" },
  { id: "afternoon", label: "Tarde", start: "14:00", end: "18:00" },
  { id: "night", label: "Noite", start: "19:00", end: "23:00" },
] as const;

export function formatHostMode(mode: HostMode) {
  if (mode === "can_host") {
    return "Posso receber";
  }

  if (mode === "looking_for_host") {
    return "Preciso de anfitrião";
  }

  return "Local público";
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMeetupStatus(status: MeetupStatus) {
  if (status === "closed") {
    return "Encerrado";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  return "Aberto";
}

export function formatVenueKind(kind: VenueKind) {
  if (kind === "specialty_store") {
    return "Loja especializada";
  }

  return "Local público";
}

export function formatAttendanceStatus(status: AttendanceStatus) {
  if (status === "interested") {
    return "Tenho interesse";
  }

  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "not_going") {
    return "Não vou";
  }

  if (status === "on_the_way") {
    return "Confirmado";
  }

  if (status === "arrived") {
    return "Confirmado";
  }

  if (status === "left") {
    return "Confirmado";
  }

  if (status === "cant_make_it") {
    return "Não vou";
  }

  return "Tenho interesse";
}

export function formatVenueSuggestionStatus(status: VenueSuggestionStatus) {
  if (status === "approved") {
    return "Aprovado";
  }

  if (status === "rejected") {
    return "Recusado";
  }

  return "Em análise";
}

export function formatLocationPrivacy(isLocationExact: boolean, locationHint: string) {
  if (isLocationExact) {
    return locationHint;
  }

  return `${locationHint} · ponto exato liberado ao entrar`;
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
    return "Grupo";
  }

  if (kind === "message_received") {
    return "Chat";
  }

  if (kind === "meetup_reminder") {
    return "Lembrete";
  }

  if (kind === "nearby_meetup_created" || kind === "nearby_venue_created") {
    return "Perto de você";
  }

  return "Status";
}

export function formatAvailabilitySlot(slot: AvailabilitySlot) {
  return `${weekdayNames[slot.weekday] ?? "Dia"} ${slot.start_time}-${slot.end_time}`;
}

export function formatAvailabilityPeriod(slot: AvailabilitySlot) {
  const period =
    periodDefinitions.find(
      (item) => item.start === slot.start_time && item.end === slot.end_time
    )?.label ?? "Período";

  return `${weekdayNames[slot.weekday] ?? "Dia"} · ${period}`;
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
    return "Aguardando sincronização";
  }

  return `Sincronizado às ${new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)}`;
}

export function formatRelativeTimestamp(value: string) {
  const target = new Date(value).getTime();
  const deltaMinutes = Math.round((target - Date.now()) / 60000);

  if (Math.abs(deltaMinutes) < 1) {
    return "Agora";
  }

  const formatter =
    typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function"
      ? new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })
      : null;

  if (Math.abs(deltaMinutes) < 60) {
    return formatter
      ? formatter.format(deltaMinutes, "minute")
      : formatRelativeFallback(deltaMinutes, "minuto", "minutos");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return formatter
      ? formatter.format(deltaHours, "hour")
      : formatRelativeFallback(deltaHours, "hora", "horas");
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter
    ? formatter.format(deltaDays, "day")
    : formatRelativeFallback(deltaDays, "dia", "dias");
}

export function formatParticipantSummary(joinedPlayers: number, _maxPlayers = 0) {
  const count = Math.max(joinedPlayers, 0);

  if (count === 1) {
    return "1 participante";
  }

  return `${count} participantes`;
}

export function formatAverageRating(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Ainda sem nota";
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

function formatRelativeFallback(
  amount: number,
  singularLabel: string,
  pluralLabel: string
) {
  const absoluteAmount = Math.abs(amount);
  const label = absoluteAmount === 1 ? singularLabel : pluralLabel;

  if (amount < 0) {
    return `há ${absoluteAmount} ${label}`;
  }

  return `em ${absoluteAmount} ${label}`;
}
