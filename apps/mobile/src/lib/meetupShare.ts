import type { MeetupPost } from "@/types/domain";

/** Prefix for structured meetup share messages in chat bodies (meetup + private). */
export const MEETUP_SHARE_BODY_PREFIX = "__GG_MEETUP_SHARE__";

export type MeetupSharePayload = {
  v: 1;
  meetupId: string;
  title: string;
  startsAt: string;
  gameSlug: string;
  formatName: string;
};

export function buildMeetupSharePayload(meetup: MeetupPost): MeetupSharePayload {
  return {
    v: 1,
    meetupId: meetup.id,
    title: meetup.title,
    startsAt: meetup.startsAt,
    gameSlug: meetup.gameSlug?.trim() ?? "",
    formatName: meetup.formatName,
  };
}

export function buildMeetupShareMessageBody(meetup: MeetupPost): string {
  return `${MEETUP_SHARE_BODY_PREFIX}${JSON.stringify(buildMeetupSharePayload(meetup))}`;
}

export function parseMeetupSharePayload(body: string): MeetupSharePayload | null {
  if (!body.startsWith(MEETUP_SHARE_BODY_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(body.slice(MEETUP_SHARE_BODY_PREFIX.length)) as MeetupSharePayload;
    if (parsed?.v !== 1 || typeof parsed.meetupId !== "string" || !parsed.meetupId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getShareWebBase(): string {
  return process.env.EXPO_PUBLIC_MEETUP_SHARE_WEB_BASE?.trim() || "https://goodgame.app";
}

/** Public HTTPS link (Universal Links / landing → App Store or app). */
export function buildMeetupShareWebUrl(meetupId: string): string {
  return `${getShareWebBase()}/m/${meetupId}`;
}

/** Custom scheme fallback for in-app testing. */
export function buildMeetupShareNativeUrl(meetupId: string): string {
  return `goodgame://meetup/${meetupId}`;
}

export function buildExternalShareContent(meetupId: string): { message: string; url: string } {
  const url = buildMeetupShareWebUrl(meetupId);
  const message = `Vamos jogar? Confira essa partida no Good Game\n\n${url}`;
  return { message, url };
}

/**
 * Extract meetup UUID from `goodgame://meetup/{id}` or `https://…/m/{id}`.
 */
export function parseMeetupIdFromIncomingUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const schemeMatch = url.match(/goodgame:\/\/meetup\/([^/?#]+)/i);
    if (schemeMatch?.[1]) {
      return schemeMatch[1];
    }

    const webPathMatch = url.match(/\/m\/([a-f0-9-]{36})/i);
    if (webPathMatch?.[1]) {
      return webPathMatch[1];
    }

    const legacyPath = url.match(/\/meetup\/([a-f0-9-]{36})/i);
    return legacyPath?.[1] ?? null;
  } catch {
    return null;
  }
}
