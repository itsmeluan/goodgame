import AsyncStorage from "@react-native-async-storage/async-storage";

export const MAP_ONBOARDING_STEPS = [
  "welcome",
  "map_overview",
  "open_games_sheet",
  "venues_tab",
  "suggest_venue",
  "create_meetup",
  "friends",
  "profile",
  "menu_open",
  "menu_nearby_players",
  "menu_chats",
  "menu_alerts",
  "menu_news",
  "menu_history",
  "menu_feedback",
  "feedback_finish",
] as const;

export type MapOnboardingStepId = (typeof MAP_ONBOARDING_STEPS)[number];

export type MapOnboardingState = {
  version: 2;
  startedAt: string;
  completedStepIds: MapOnboardingStepId[];
  completedAt: string | null;
  dismissedAt: string | null;
};

const MAP_ONBOARDING_STORAGE_PREFIX = "good-game:map-onboarding:v2";

export function createInitialMapOnboardingState(): MapOnboardingState {
  return {
    version: 2,
    startedAt: new Date().toISOString(),
    completedStepIds: [],
    completedAt: null,
    dismissedAt: null,
  };
}

export async function loadMapOnboardingState(userId: string): Promise<MapOnboardingState | null> {
  try {
    const stored = await AsyncStorage.getItem(getMapOnboardingStorageKey(userId));
    if (!stored) {
      return null;
    }

    return normalizeMapOnboardingState(JSON.parse(stored));
  } catch {
    return null;
  }
}

export async function saveMapOnboardingState(userId: string, state: MapOnboardingState) {
  await AsyncStorage.setItem(getMapOnboardingStorageKey(userId), JSON.stringify(state));
}

export function isMapOnboardingComplete(state: MapOnboardingState | null) {
  return Boolean(state?.completedAt);
}

export function isMapOnboardingDismissed(state: MapOnboardingState | null) {
  return Boolean(state?.dismissedAt);
}

export function getNextMapOnboardingStepId(
  completedStepIds: readonly MapOnboardingStepId[]
): MapOnboardingStepId | null {
  return MAP_ONBOARDING_STEPS.find((stepId) => !completedStepIds.includes(stepId)) ?? null;
}

export function getMapOnboardingStepIndex(stepId: MapOnboardingStepId) {
  return MAP_ONBOARDING_STEPS.indexOf(stepId);
}

function getMapOnboardingStorageKey(userId: string) {
  return `${MAP_ONBOARDING_STORAGE_PREFIX}:${userId}`;
}

function normalizeMapOnboardingState(value: unknown): MapOnboardingState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MapOnboardingState>;
  const completedStepIds = Array.isArray(candidate.completedStepIds)
    ? candidate.completedStepIds.filter(isMapOnboardingStepId)
    : [];

  return {
    version: 2,
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : new Date().toISOString(),
    completedStepIds: Array.from(new Set(completedStepIds)),
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : null,
    dismissedAt: typeof candidate.dismissedAt === "string" ? candidate.dismissedAt : null,
  };
}

function isMapOnboardingStepId(value: unknown): value is MapOnboardingStepId {
  return typeof value === "string" && MAP_ONBOARDING_STEPS.includes(value as MapOnboardingStepId);
}
