export const palette = {
  /** Full-screen loading (app boot, map prep, profile fetch, etc.). */
  loadingScreen: "#0D162B",
  /** Opaque navy for map pages + chat (matches former pageSafeArea + blue wash, no transparency). */
  pageChrome: "#0D161F",
  /** Full-opacity chrome matching the Novo jogo sheet base (rgb 12,14,20); use under page glass so the tone matches that sheet. */
  sheetBaseChrome: "#0C0E14",
  /** Slightly darker band for chat header/footer (message list stays `pageChrome`). */
  chatChromeBand: "#0A1219",
  ink: "#111111",
  forest: "#363636",
  moss: "#505050",
  ember: "#F18F5C",
  sand: "#F6F2EA",
  parchment: "#E9E2D7",
  pine: "#A49B94",
  mist: "#D2CBC3",
  line: "rgba(231,216,188,0.14)",
  card: "rgba(18,22,28,0.78)",
  chatBubble: "rgba(20,24,31,0.82)",
  mapSurface: "rgba(14,18,24,0.8)",
  venue: "#E9E2D7",
  beacon: "#F18F5C",
  /** Watermelon red — destructive / danger (matches MeetupSheetCard, AppleList danger). */
  watermelon: "#E14D5C",
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

/** Horizontal inset for sheet/list content (grid), on top of safe-area insets. */
export const sheetContentGutter = spacing.sm;

/** Horizontal padding inside the meetup composer sheet (Novo jogo) — reuse for nested overlays. */
export const meetupSheetEdgePadding = spacing.sm;

/** Bleed full-bleed glass layers past layout edges so the rim clears the display curve; content grids unchanged. */
export const screenEdgeGlassBleed = 16;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;
