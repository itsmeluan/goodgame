const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const enableDemoMode = process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE === "true";
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? null;
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? null;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const addressSearchProvider =
  process.env.EXPO_PUBLIC_ADDRESS_SEARCH_PROVIDER === "mapbox" ? "mapbox" : "legacy";
const addressAutocompleteEnabled =
  process.env.EXPO_PUBLIC_ADDRESS_AUTOCOMPLETE_ENABLED !== "false";
const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;
const mapboxPermanentGeocoding =
  process.env.EXPO_PUBLIC_MAPBOX_PERMANENT_GEOCODING === "true";
const socialAuthEnabled = process.env.EXPO_PUBLIC_SOCIAL_AUTH_ENABLED === "true";
const proPlayerPaywallEnabled = process.env.EXPO_PUBLIC_PRO_PLAYER_PAYWALL_ENABLED === "true";
const meetupShareWebBase =
  process.env.EXPO_PUBLIC_MEETUP_SHARE_WEB_BASE?.trim() ||
  "https://itsmeluan.github.io/good-game-pages";

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL não foi definido.");
}

if (!supabaseAnonKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY não foi definido.");
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  enableDemoMode,
  sentryDsn,
  posthogApiKey,
  posthogHost,
  addressSearchProvider,
  addressAutocompleteEnabled,
  mapboxAccessToken,
  mapboxPermanentGeocoding,
  socialAuthEnabled,
  proPlayerPaywallEnabled,
  meetupShareWebBase,
} as const;
