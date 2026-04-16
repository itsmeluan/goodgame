import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { triggerHaptic, type AppHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

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
          ? "accent"
          : "dark";
  const surfaceIntensity = tone === "primary" ? "regular" : "clear";

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
            ? styles.dangerShadow
            : styles.ghostShadow,
        pressed ? styles.pressed : null,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant={surfaceVariant}
        intensity={surfaceIntensity}
        style={styles.surface}
      />
      {loading ? (
        <ActivityIndicator
          color={tone === "primary" || tone === "danger" ? palette.ink : palette.sand}
        />
      ) : (
        <Text
          style={[
            styles.label,
            size === "compact" ? styles.labelCompact : null,
            tone === "primary" || tone === "danger"
              ? styles.primaryLabel
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
    backgroundColor: "#E77A84",
    borderColor: "rgba(255,255,255,0.12)",
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.012)",
    borderColor: "rgba(233,226,215,0.1)",
  },
  dangerGhost: {
    backgroundColor: "rgba(231,122,132,0.06)",
    borderColor: "rgba(231,122,132,0.2)",
  },
  primaryShadow: {
    shadowColor: "#F18F5C",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dangerShadow: {
    shadowColor: "#E77A84",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
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
  ghostLabel: {
    color: palette.sand,
  },
  dangerGhostLabel: {
    color: "#F4A1A8",
  },
});
