import { GAME_SLUG } from "@/features/map/gameLabels";
import type { CatalogFormat, CatalogGame, MeetupPost } from "@/types/domain";

/** Armazenado em meetup_posts.format_detail_tags e player_formats.detail_tags (jsonb). */
export type FormatDetailTagsByFormatId = Record<string, FormatDetailTags>;

export type FormatDetailTags = {
  magic_brackets?: string[];
  magic_match_types?: string[];
  yugioh_power_levels?: string[];
  pokemon_deck_tiers?: string[];
};

export const MAGIC_COMMANDER_BRACKETS = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5 (cEDH)",
] as const;

export const MAGIC_MATCH_TYPES = ["Casual", "Competitivo"] as const;

export const YUGIOH_POWER_LEVELS = [
  "1 - Casual",
  "2 - Rogue/Casual forte",
  "3 - Meta viável (T2/T3)",
  "4 - Meta (T1)",
  "5 - Degenerate",
] as const;

export const POKEMON_DECK_TIERS = ["Fun/Casual", "Rogue/Off-Meta", "Tier 1"] as const;

export type FormatDetailKind =
  | "magic_commander"
  | "magic_match"
  | "yugioh"
  | "pokemon"
  | null;

export function getFormatDetailKind(
  gameSlug: string | null | undefined,
  formatSlug: string | null | undefined,
  formatName?: string | null
): FormatDetailKind {
  const g = gameSlug?.trim() ?? "";
  const f = formatSlug?.trim().toLowerCase() ?? "";
  /** Fallback quando `slug` não veio do PostgREST (ex.: select sem coluna). */
  const nameNorm = formatName?.trim().toLowerCase() ?? "";

  if (g === GAME_SLUG.magic) {
    const isCommander = f === "commander" || nameNorm === "commander";
    if (isCommander) {
      return "magic_commander";
    }
    return "magic_match";
  }

  if (g === GAME_SLUG.yugioh) {
    return "yugioh";
  }

  if (g === GAME_SLUG.pokemon) {
    return "pokemon";
  }

  return null;
}

/** Mantém só as chaves relevantes para o par jogo/formato. */
export function pruneFormatDetailTagsForFormat(
  gameSlug: string | null | undefined,
  formatSlug: string | null | undefined,
  raw: FormatDetailTags,
  formatName?: string | null
): FormatDetailTags {
  const kind = getFormatDetailKind(gameSlug, formatSlug, formatName);
  const next: FormatDetailTags = {};

  if (kind === "magic_commander") {
    if (raw.magic_brackets?.length) {
      next.magic_brackets = [...raw.magic_brackets];
    }
    return next;
  }

  if (kind === "magic_match") {
    if (raw.magic_match_types?.length) {
      next.magic_match_types = [...raw.magic_match_types];
    }
    return next;
  }

  if (kind === "yugioh") {
    if (raw.yugioh_power_levels?.length) {
      next.yugioh_power_levels = [...raw.yugioh_power_levels];
    }
    return next;
  }

  if (kind === "pokemon") {
    if (raw.pokemon_deck_tiers?.length) {
      next.pokemon_deck_tiers = [...raw.pokemon_deck_tiers];
    }
    return next;
  }

  return {};
}

export function detailTagsSatisfiedForFormat(
  gameSlug: string | null | undefined,
  formatSlug: string | null | undefined,
  tags: FormatDetailTags,
  formatName?: string | null
): boolean {
  const kind = getFormatDetailKind(gameSlug, formatSlug, formatName);
  if (!kind) {
    return true;
  }

  if (kind === "magic_commander") {
    return (tags.magic_brackets?.length ?? 0) > 0;
  }

  if (kind === "magic_match") {
    return (tags.magic_match_types?.length ?? 0) > 0;
  }

  if (kind === "yugioh") {
    return (tags.yugioh_power_levels?.length ?? 0) > 0;
  }

  if (kind === "pokemon") {
    return (tags.pokemon_deck_tiers?.length ?? 0) > 0;
  }

  return true;
}

/** Filtro do mapa: cada chave com array não vazio exige interseção com o meetup. */
export function meetupPassesDetailTagFilter(
  meetupTags: FormatDetailTags | null | undefined,
  filter: FormatDetailTags | null | undefined
): boolean {
  if (!filter) {
    return true;
  }

  const m = meetupTags ?? {};

  const keys: (keyof FormatDetailTags)[] = [
    "magic_brackets",
    "magic_match_types",
    "yugioh_power_levels",
    "pokemon_deck_tiers",
  ];

  for (const key of keys) {
    const want = filter[key];
    if (!want?.length) {
      continue;
    }

    const have = m[key] ?? [];
    const hit = want.some((tag) => have.includes(tag));
    if (!hit) {
      return false;
    }
  }

  return true;
}

export function isNonEmptyDetailTagFilter(filter: FormatDetailTags | null | undefined): boolean {
  if (!filter) {
    return false;
  }

  return Boolean(
    filter.magic_brackets?.length ||
      filter.magic_match_types?.length ||
      filter.yugioh_power_levels?.length ||
      filter.pokemon_deck_tiers?.length
  );
}

export function formatDetailTagsToJsonb(filter: FormatDetailTags): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (filter.magic_brackets?.length) {
    out.magic_brackets = filter.magic_brackets;
  }
  if (filter.magic_match_types?.length) {
    out.magic_match_types = filter.magic_match_types;
  }
  if (filter.yugioh_power_levels?.length) {
    out.yugioh_power_levels = filter.yugioh_power_levels;
  }
  if (filter.pokemon_deck_tiers?.length) {
    out.pokemon_deck_tiers = filter.pokemon_deck_tiers;
  }
  return out;
}

/** Resolve `formats.slug` a partir do par jogo/formato exibidos no meetup. */
export function resolveFormatSlugForMeetup(
  meetup: Pick<MeetupPost, "gameSlug" | "formatName">,
  formats: CatalogFormat[]
): string | undefined {
  return formats.find((f) => f.gameSlug === meetup.gameSlug && f.name === meetup.formatName)?.slug;
}

/**
 * Restringe o filtro global às chaves que fazem sentido para o formato do meetup.
 * Assim, filtros de outro jogo não excluem partidas (a partida só precisa bater nas chaves aplicáveis).
 */
export function pruneDetailFilterForMeetupKind(
  filter: FormatDetailTags | null | undefined,
  gameSlug: string | null | undefined,
  formatSlug: string | null | undefined,
  formatName?: string | null
): FormatDetailTags | null {
  if (!filter || !isNonEmptyDetailTagFilter(filter)) {
    return null;
  }

  const kind = getFormatDetailKind(gameSlug, formatSlug, formatName);
  if (!kind) {
    return null;
  }

  const out: FormatDetailTags = {};
  if (kind === "magic_commander" && filter.magic_brackets?.length) {
    out.magic_brackets = filter.magic_brackets;
  }
  if (kind === "magic_match" && filter.magic_match_types?.length) {
    out.magic_match_types = filter.magic_match_types;
  }
  if (kind === "yugioh" && filter.yugioh_power_levels?.length) {
    out.yugioh_power_levels = filter.yugioh_power_levels;
  }
  if (kind === "pokemon" && filter.pokemon_deck_tiers?.length) {
    out.pokemon_deck_tiers = filter.pokemon_deck_tiers;
  }

  return isNonEmptyDetailTagFilter(out) ? out : null;
}

/**
 * Filtro seguro para `list_meetup_cards_in_bounds`: a RPC usa AND entre chaves.
 * Retorna `null` quando a seleção de jogos/formatos é ambígua ou incompatível com o filtro.
 */
export function buildDetailTagFilterForBoundsRpc(
  filter: FormatDetailTags,
  games: CatalogGame[],
  formats: CatalogFormat[],
  selectedGameFilterIds: string[],
  selectedFormatFilterIds: string[]
): FormatDetailTags | null {
  if (!isNonEmptyDetailTagFilter(filter)) {
    return null;
  }

  if (selectedGameFilterIds.length !== 1) {
    return null;
  }

  const game = games.find((g) => g.id === selectedGameFilterIds[0]);
  if (!game) {
    return null;
  }

  const selectedFormats = formats.filter(
    (f) => f.gameId === game.id && selectedFormatFilterIds.includes(f.id)
  );

  if (!selectedFormats.length) {
    return null;
  }

  if (game.slug === GAME_SLUG.magic) {
    const formatIsCommander = (f: CatalogFormat) =>
      f.slug?.trim().toLowerCase() === "commander" ||
      f.name.trim().toLowerCase() === "commander";
    const hasCmd = selectedFormats.some(formatIsCommander);
    const hasOther = selectedFormats.some((f) => !formatIsCommander(f));
    if (hasCmd && hasOther) {
      return null;
    }

    const out: FormatDetailTags = {};
    if (hasCmd && filter.magic_brackets?.length) {
      out.magic_brackets = filter.magic_brackets;
    } else if (!hasCmd && filter.magic_match_types?.length) {
      out.magic_match_types = filter.magic_match_types;
    }

    return isNonEmptyDetailTagFilter(out) ? out : null;
  }

  if (game.slug === GAME_SLUG.yugioh) {
    const out: FormatDetailTags = {};
    if (filter.yugioh_power_levels?.length) {
      out.yugioh_power_levels = filter.yugioh_power_levels;
    }
    return isNonEmptyDetailTagFilter(out) ? out : null;
  }

  if (game.slug === GAME_SLUG.pokemon) {
    const out: FormatDetailTags = {};
    if (filter.pokemon_deck_tiers?.length) {
      out.pokemon_deck_tiers = filter.pokemon_deck_tiers;
    }
    return isNonEmptyDetailTagFilter(out) ? out : null;
  }

  return null;
}

/** Tipos de detalhe presentes na seleção atual de formatos (para o modal de filtros). */
export function deriveFilterDetailKindsFromFormats(
  selectedFormatIds: string[],
  formats: CatalogFormat[],
  games: CatalogGame[]
): FormatDetailKind[] {
  const ordered: FormatDetailKind[] = [];
  const seen = new Set<string>();

  for (const formatId of selectedFormatIds) {
    const format = formats.find((f) => f.id === formatId);
    if (!format) {
      continue;
    }
    const game = games.find((g) => g.id === format.gameId);
    const kind = getFormatDetailKind(game?.slug, format.slug, format.name);
    if (!kind || seen.has(kind)) {
      continue;
    }
    seen.add(kind);
    ordered.push(kind);
  }

  const rank = (k: FormatDetailKind): number => {
    if (k === "magic_commander") {
      return 0;
    }
    if (k === "magic_match") {
      return 1;
    }
    if (k === "yugioh") {
      return 2;
    }
    if (k === "pokemon") {
      return 3;
    }
    return 99;
  };

  return ordered.sort((a, b) => rank(a) - rank(b));
}

/** Remove chaves de detalhe que não se aplicam mais aos formatos selecionados. */
export function pruneFilterDetailTagsForSelectedFormats(
  prev: FormatDetailTags,
  selectedFormatIds: string[],
  formats: CatalogFormat[],
  games: CatalogGame[]
): FormatDetailTags {
  const kinds = new Set(
    deriveFilterDetailKindsFromFormats(selectedFormatIds, formats, games).filter(Boolean)
  );

  const next: FormatDetailTags = {};

  if (kinds.has("magic_commander") && prev.magic_brackets?.length) {
    next.magic_brackets = [...prev.magic_brackets];
  }
  if (kinds.has("magic_match") && prev.magic_match_types?.length) {
    next.magic_match_types = [...prev.magic_match_types];
  }
  if (kinds.has("yugioh") && prev.yugioh_power_levels?.length) {
    next.yugioh_power_levels = [...prev.yugioh_power_levels];
  }
  if (kinds.has("pokemon") && prev.pokemon_deck_tiers?.length) {
    next.pokemon_deck_tiers = [...prev.pokemon_deck_tiers];
  }

  return next;
}
