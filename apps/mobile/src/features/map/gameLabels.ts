import type { MeetupPost, VenueCard } from "@/types/domain";

/** Slugs da tabela `games` (catálogo Supabase). */
export const GAME_SLUG = {
  magic: "magic-the-gathering",
  board: "board-games",
  yugioh: "yugioh",
  pokemon: "pokemon-tcg",
} as const;

export type CatalogGameSlug = (typeof GAME_SLUG)[keyof typeof GAME_SLUG];

/** Rótulos exibidos em filtros e agrupamentos — devem coincidir com `games.name` no banco. */
export const GAME_SLUG_TO_FILTER_LABEL: Record<string, string> = {
  [GAME_SLUG.magic]: "Magic: The Gathering",
  [GAME_SLUG.board]: "Tabuleiro",
  [GAME_SLUG.yugioh]: "Yu-Gi-Oh!",
  [GAME_SLUG.pokemon]: "Pokémon TCG",
};

export type MeetupMarkerVisualKind = "magic" | "board" | "yugioh" | "pokemon";

function inferCatalogGameSlugFromFormatName(formatName: string): string | null {
  const n = formatName.toLowerCase();
  if (n.includes("pokémon tcg") || n.includes("pokemon tcg")) {
    return GAME_SLUG.pokemon;
  }
  if (n.includes("yu-gi-oh") || n.includes("yugioh")) {
    return GAME_SLUG.yugioh;
  }
  if (n.includes("tabuleiro")) {
    return GAME_SLUG.board;
  }
  if (
    n.includes("magic") ||
    n.includes("commander") ||
    n.includes("draft") ||
    n.includes("pauper") ||
    n.includes("modern") ||
    n.includes("pioneer") ||
    n.includes("standard") ||
    n.includes("legacy") ||
    n.includes("vintage") ||
    n.includes("sealed") ||
    n.includes("brawl")
  ) {
    return GAME_SLUG.magic;
  }
  return null;
}

/** Slug do catálogo para pins e ícones (usa `gameSlug` do backend ou heurística no nome do formato). */
export function resolveCatalogGameSlugForMeetup(meetup: Pick<MeetupPost, "gameSlug" | "formatName">) {
  const trimmed = meetup.gameSlug?.trim();
  if (trimmed) {
    return trimmed;
  }
  return inferCatalogGameSlugFromFormatName(meetup.formatName);
}

export function meetupMarkerVisualFromGameSlug(
  gameSlug: string | null | undefined
): MeetupMarkerVisualKind {
  if (gameSlug === GAME_SLUG.magic) {
    return "magic";
  }

  if (gameSlug === GAME_SLUG.board) {
    return "board";
  }

  if (gameSlug === GAME_SLUG.yugioh) {
    return "yugioh";
  }

  if (gameSlug === GAME_SLUG.pokemon) {
    return "pokemon";
  }

  return "board";
}

export function meetupMarkerVisualFromMeetup(meetup: Pick<MeetupPost, "gameSlug" | "formatName">) {
  return meetupMarkerVisualFromGameSlug(resolveCatalogGameSlugForMeetup(meetup));
}

/**
 * Nome do jogo para filtros / chips, alinhado a `games.name` quando o slug é conhecido.
 */
export function inferGameNameFromMeetup(meetup: Pick<MeetupPost, "gameSlug" | "formatName">) {
  const slug = resolveCatalogGameSlugForMeetup(meetup);
  if (slug && GAME_SLUG_TO_FILTER_LABEL[slug]) {
    return GAME_SLUG_TO_FILTER_LABEL[slug];
  }

  return inferGameNameFromLabels([meetup.formatName]);
}

export function inferGameNameFromLabels(labels: string[]) {
  const normalized = labels.join(" ").toLowerCase();

  if (normalized.includes("pokémon tcg") || normalized.includes("pokemon tcg")) {
    return "Pokémon TCG";
  }

  if (normalized.includes("yu-gi-oh") || normalized.includes("yugioh")) {
    return "Yu-Gi-Oh!";
  }

  if (normalized.includes("tabuleiro")) {
    return "Tabuleiro";
  }

  if (
    normalized.includes("magic") ||
    normalized.includes("commander") ||
    normalized.includes("draft") ||
    normalized.includes("pauper") ||
    normalized.includes("modern") ||
    normalized.includes("pioneer") ||
    normalized.includes("standard") ||
    normalized.includes("legacy") ||
    normalized.includes("vintage") ||
    normalized.includes("sealed") ||
    normalized.includes("brawl")
  ) {
    return "Magic: The Gathering";
  }

  return labels[0]?.trim() || "Comunidade";
}

export function inferGameLabelsFromVenue(venue: Pick<VenueCard, "formats">) {
  return Array.from(new Set(venue.formats.map((label) => inferGameNameFromLabels([label]))));
}

export function slugifyGameLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
