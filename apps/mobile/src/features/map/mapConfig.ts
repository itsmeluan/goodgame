import type { DistanceFilter, MapEntityFilter, PeriodFilter } from "@/features/map/mapFilters";
import type { MeetupSortMode } from "@/features/map/mapHelpers";

export const hostModeOptions = [
  ["public_place", "Local público"],
  ["specialty_store", "Loja especializada"],
  ["can_host", "Meu local"],
  ["looking_for_host", "A definir"],
] as const;

export type ComposerMeetupMode = (typeof hostModeOptions)[number][0];
export type HostModeOption = (typeof hostModeOptions)[number];

export const distanceOptions = [
  ["all", "Qualquer"],
  [2, "Ate 2 km"],
  [5, "Ate 5 km"],
  [10, "Ate 10 km"],
  [25, "Ate 25 km"],
] as const satisfies readonly (readonly [DistanceFilter, string])[];

export const periodOptions = [
  ["morning", "Manhã"],
  ["afternoon", "Tarde"],
  ["night", "Noite"],
] as const satisfies readonly (readonly [PeriodFilter, string])[];

export const entityFilterOptions = [
  ["meetups", "Jogos"],
  ["venues", "Locais"],
] as const satisfies readonly (readonly [MapEntityFilter, string])[];

export const TIME_HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0")
);
export const TIME_MINUTES = ["00", "15", "30", "45"];

export const MEETUP_SORT_OPTIONS: { value: MeetupSortMode; label: string }[] = [
  { value: "distance_asc", label: "Mais perto" },
  { value: "distance_desc", label: "Mais longe" },
  { value: "date_asc", label: "Data próxima" },
  { value: "date_desc", label: "Data distante" },
];
