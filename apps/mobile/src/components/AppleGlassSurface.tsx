import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { palette } from "@/theme/tokens";

type AppleGlassSurfaceVariant = "light" | "dark" | "accent";

type AppleGlassSurfaceProps = ViewProps & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: AppleGlassSurfaceVariant;
  intensity?: "clear" | "regular";
  /** Overrides native glass tint (iOS). Use e.g. `mapMenuGlassTint` for map overlays. */
  glassTintColor?: string;
  /**
   * Map backdrop: keep the glass layer visually transparent so blur samples the map;
   * color wash is applied separately (see `MapMenuGlassBackdrop`).
   */
  mapMenuGlassMode?: boolean;
};

const glassEffectAvailable = Platform.OS === "ios" && isGlassEffectAPIAvailable();

export function AppleGlassSurface({
  children,
  style,
  variant = "dark",
  intensity = "regular",
  glassTintColor,
  mapMenuGlassMode = false,
  ...rest
}: AppleGlassSurfaceProps) {
  const variantStyle = resolveVariantStyle(variant);
  const tintColor = glassTintColor ?? resolveTintColor(variant);
  const glassLayer = mapMenuGlassMode
    ? {
        backgroundColor: "transparent" as const,
        borderColor: variantStyle.glass.borderColor,
      }
    : variantStyle.glass;

  if (glassEffectAvailable) {
    return (
      <GlassView
        {...rest}
        glassEffectStyle={intensity}
        tintColor={tintColor}
        colorScheme={variant === "light" ? "light" : "dark"}
        isInteractive={false}
        style={[styles.base, !mapMenuGlassMode && styles.glassBase, glassLayer, style]}
      >
        {children}
      </GlassView>
    );
  }

  const fallbackLayer = mapMenuGlassMode
    ? {
        backgroundColor: "transparent" as const,
        borderColor: variantStyle.fallback.borderColor,
      }
    : variantStyle.fallback;

  return (
    <View {...rest} style={[styles.base, fallbackLayer, style]}>
      {children}
    </View>
  );
}

function resolveTintColor(variant: AppleGlassSurfaceVariant) {
  if (variant === "light") {
    return "#FFFFFF";
  }

  if (variant === "accent") {
    return palette.ember;
  }

  return "#090909";
}

function resolveVariantStyle(variant: AppleGlassSurfaceVariant) {
  if (variant === "light") {
    return {
      glass: styles.glassLight,
      fallback: styles.fallbackLight,
    };
  }

  if (variant === "accent") {
    return {
      glass: styles.glassAccent,
      fallback: styles.fallbackAccent,
    };
  }

  return {
    glass: styles.glassDark,
    fallback: styles.fallbackDark,
  };
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: "hidden",
  },
  borderless: {
    borderWidth: 0,
  },
  glassBase: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  glassLight: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  glassDark: {
    backgroundColor: "rgba(8,9,11,0.26)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  glassAccent: {
    backgroundColor: "rgba(241,143,92,0.18)",
    borderColor: "rgba(241,143,92,0.38)",
  },
  fallbackLight: {
    // Android: solid so buttons/surfaces don't look transparent over the dark map.
    backgroundColor: Platform.select({ android: "#F8F6F1", default: "rgba(255,255,255,0.78)" }),
    borderColor: Platform.select({ android: "rgba(180,175,165,0.4)", default: "rgba(255,255,255,0.3)" }),
  },
  fallbackDark: {
    // Android: solid dark navy so sheets/drawers are fully opaque (no map bleed-through).
    // iOS old devices (glass unavailable): keep the original semi-transparent dark.
    backgroundColor: Platform.select({ android: "#0D1526", default: "rgba(18,18,18,0.9)" }),
    borderColor: Platform.select({ android: "rgba(70,110,180,0.18)", default: "rgba(255,255,255,0.12)" }),
  },
  fallbackAccent: {
    backgroundColor: "rgba(241,143,92,0.96)",
    borderColor: "rgba(241,143,92,0.68)",
  },
});
