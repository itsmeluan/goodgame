import type { VenueCard } from "@/types/domain";

export function inferGameNameFromLabels(labels: string[]) {
  const normalized = labels.join(" ").toLowerCase();

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

  return labels[0] || "Comunidade";
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
