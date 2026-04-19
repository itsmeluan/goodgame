import { formatCompactAddress } from "@/lib/formatting";
import type { VenueCard, VenueKind } from "@/types/domain";

/** Prefix for structured venue share messages in chat bodies (meetup + private). */
export const VENUE_SHARE_BODY_PREFIX = "__GG_VENUE_SHARE__";

export type VenueSharePayload = {
  v: 1;
  venueId: string;
  name: string;
  kind: VenueKind;
  neighborhood: string;
  addressLine: string;
};

export function buildVenueSharePayload(venue: VenueCard): VenueSharePayload {
  return {
    v: 1,
    venueId: venue.id,
    name: venue.name,
    kind: venue.kind,
    neighborhood: venue.neighborhood ?? "",
    addressLine: formatCompactAddress(venue.address) || venue.neighborhood || "",
  };
}

export function buildVenueShareMessageBody(venue: VenueCard): string {
  return `${VENUE_SHARE_BODY_PREFIX}${JSON.stringify(buildVenueSharePayload(venue))}`;
}

export function parseVenueSharePayload(body: string): VenueSharePayload | null {
  if (!body.startsWith(VENUE_SHARE_BODY_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(body.slice(VENUE_SHARE_BODY_PREFIX.length)) as VenueSharePayload;
    if (parsed?.v !== 1 || typeof parsed.venueId !== "string" || !parsed.venueId) {
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
export function buildVenueShareWebUrl(venueId: string): string {
  return `${getShareWebBase()}/v/${venueId}`;
}

/** Custom scheme fallback for in-app testing. */
export function buildVenueShareNativeUrl(venueId: string): string {
  return `goodgame://venue/${venueId}`;
}

export function buildExternalVenueShareContent(venueId: string): { message: string; url: string } {
  const url = buildVenueShareWebUrl(venueId);
  const message = `Confira este local no Good Game\n\n${url}`;
  return { message, url };
}

/**
 * Extract venue UUID from `goodgame://venue/{id}` or `https://…/v/{id}`.
 */
export function parseVenueIdFromIncomingUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const schemeMatch = url.match(/goodgame:\/\/venue\/([^/?#]+)/i);
    if (schemeMatch?.[1]) {
      return schemeMatch[1];
    }

    const webPathMatch = url.match(/\/v\/([a-f0-9-]{36})/i);
    if (webPathMatch?.[1]) {
      return webPathMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}
