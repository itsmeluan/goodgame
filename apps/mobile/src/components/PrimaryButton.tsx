import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { triggerHaptic, type AppHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

/** Flat watermelon / dusty coral — solid fill (no glass overlay). */
const DANGER_SOLID_BG = "#D97075";
const DANGER_LABEL_COLOR = "#1A1A1A";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "ghost" | "danger" | "dangerGhost";
  size?: "default" | "compact";
  haptic?: AppHaptic | "none";
  /** Expands to the full width of the parent (e.g. sheet content column). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  tone = "primary",
  size = "default",
  haptic,
  fullWidth = false,
  style,
}: PrimaryButtonProps) {
  const resolvedHaptic =
    haptic ??
    (tone === "primary"
      ? "soft"
      : tone === "danger" || tone === "dangerGhost"
        ? "warning"
        : "selection");
  const surfaceVariant =
    tone === "primary"
      ? "accent"
      : tone === "danger"
        ? "dark"
        : tone === "dangerGhost"
          ? "dark"
          : "dark";
  const surfaceIntensity = tone === "primary" ? "regular" : "clear";
  const useGlassSurface = tone !== "danger" && tone !== "dangerGhost";

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        if (resolvedHaptic !== "none") {
          triggerHaptic(resolvedHaptic);
        }

        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        size === "compact" ? styles.buttonCompact : null,
        fullWidth ? styles.buttonFullWidth : null,
        tone === "primary"
          ? styles.primary
          : tone === "danger"
            ? styles.danger
            : tone === "dangerGhost"
              ? styles.dangerGhost
              : styles.ghost,
        tone === "primary"
          ? styles.primaryShadow
          : tone === "danger"
            ? styles.dangerFlat
            : styles.ghostShadow,
        pressed ? styles.pressed : null,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {useGlassSurface ? (
        <AppleGlassSurface
          pointerEvents="none"
          variant={surfaceVariant}
          intensity={surfaceIntensity}
          style={styles.surface}
        />
      ) : null}
      {loading ? (
        <LoadingSpinner
          size={20}
          color={
            tone === "danger"
              ? DANGER_LABEL_COLOR
              : tone === "primary" || tone === "dangerGhost"
                ? palette.ink
                : palette.sand
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            size === "compact" ? styles.labelCompact : null,
            tone === "primary"
              ? styles.primaryLabel
              : tone === "danger"
                ? styles.dangerLabel
                : tone === "dangerGhost"
                  ? styles.dangerGhostLabel
                  : styles.ghostLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: spacing.sm + 4,
  },
  buttonFullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
  primary: {
    backgroundColor: palette.ember,
    borderColor: "rgba(255,255,255,0.14)",
  },
  danger: {
    backgroundColor: DANGER_SOLID_BG,
    borderColor: "transparent",
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.012)",
    borderColor: "rgba(233,226,215,0.1)",
  },
  /** Solid watermelon — same family as MeetupSheetCard destructive actions. */
  dangerGhost: {
    backgroundColor: palette.watermelon,
    borderColor: "rgba(17,17,17,0.12)",
  },
  primaryShadow: {
    shadowColor: "#F18F5C",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dangerFlat: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  ghostShadow: {
    shadowColor: "#020303",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
  labelCompact: {
    fontSize: 12,
  },
  primaryLabel: {
    color: palette.ink,
  },
  dangerLabel: {
    color: DANGER_LABEL_COLOR,
  },
  ghostLabel: {
    color: palette.sand,
  },
  dangerGhostLabel: {
    color: palette.ink,
  },
});
