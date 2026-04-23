import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import type { SFSymbol, SymbolType } from "expo-symbols";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { translate } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

/** `SheetBackButton` default (non-compact) — align circular header actions to this height. */
export const SHEET_BACK_BUTTON_MIN_HEIGHT = 38;

type SheetBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Default "Voltar" — same as SlidingSheetStack scene headers. */
  label?: string;
  /** Matches SlidingSheetStack compact scene back row (smaller pill). */
  compact?: boolean;
  /** Small circular button, chevron only (e.g. chat header). */
  iconCircle?: boolean;
};

export function SheetBackButton({
  onPress,
  accessibilityLabel,
  label,
  compact = false,
  iconCircle = false,
}: SheetBackButtonProps) {
  const chevronSize = iconCircle ? 13 : compact ? 17 : 18;
  const fallbackLabel = translate("common.back");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? fallbackLabel}
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.backButton,
        iconCircle ? styles.backButtonIconCircle : compact ? styles.backButtonCompact : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={[styles.backButtonSurface, iconCircle ? styles.backButtonSurfaceIconCircle : null]}
      />
      <AppIcon
        iosName="chevron.left"
        fallbackName="arrow-back"
        size={chevronSize}
        color={palette.sand}
      />
      {iconCircle ? null : <Text style={styles.backButtonLabel}>{label ?? fallbackLabel}</Text>}
    </Pressable>
  );
}

type SheetCircleIconButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  iosName: SFSymbol;
  fallbackName: keyof typeof MaterialIcons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  /** Default `monochrome` avoids hierarchical gray layers inside small circle buttons. */
  symbolType?: SymbolType;
  /** Touch target / glass diameter. Default 30 (matches `SheetBackButton` `iconCircle`). */
  diameter?: number;
};

/** Circular glass icon — default 30×30; pass `diameter={SHEET_BACK_BUTTON_MIN_HEIGHT}` to match default Voltar height. */
export function SheetCircleIconButton({
  onPress,
  accessibilityLabel,
  iosName,
  fallbackName,
  iconSize = 13,
  iconColor = palette.sand,
  symbolType = "monochrome",
  diameter = 30,
}: SheetCircleIconButtonProps) {
  const cornerRadius = diameter / 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        {
          width: diameter,
          height: diameter,
          borderRadius: cornerRadius,
          overflow: "hidden" as const,
          justifyContent: "center",
          alignItems: "center",
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={[
          styles.backButtonSurface,
          { borderRadius: cornerRadius },
        ]}
      />
      <AppIcon
        iosName={iosName}
        fallbackName={fallbackName}
        size={iconSize}
        color={iconColor}
        type={symbolType}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    minHeight: SHEET_BACK_BUTTON_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: 0,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  backButtonCompact: {
    minHeight: 32,
    paddingHorizontal: 12,
  },
  backButtonIconCircle: {
    alignSelf: "center",
    width: 30,
    height: 30,
    minHeight: 30,
    paddingHorizontal: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
  },
  pressed: {
    opacity: 0.92,
  },
  backButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  backButtonSurfaceIconCircle: {
    borderRadius: 15,
  },
  backButtonLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "800",
  },
});
