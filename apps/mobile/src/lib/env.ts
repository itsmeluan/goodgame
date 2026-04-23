const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
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

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig && __DEV__) {
  console.warn(
    "EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY não foram definidos."
  );
}

export const env = {
  supabaseUrl: supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey: supabaseAnonKey || "missing-anon-key",
  hasSupabaseConfig,
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
