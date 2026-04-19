import { type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";

import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type ProFeatureGateProps = {
  locked: boolean;
  children: ReactNode;
  overlayTitle: string;
  ctaLabel: string;
  onRequestUnlock: () => void;
};

/**
 * Camada premium genérica: blur + overlay + CTA. Quando `locked`, o conteúdo
 * continua visível por baixo para manter contexto visual.
 */
export function ProFeatureGate({
  locked,
  children,
  overlayTitle,
  ctaLabel,
  onRequestUnlock,
}: ProFeatureGateProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.host}>
      <View pointerEvents="none">{children}</View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${overlayTitle}. ${ctaLabel}`}
        onPress={() => {
          triggerHaptic("selection");
          onRequestUnlock();
        }}
        style={styles.overlayPressable}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
        )}
        <View style={styles.overlayInner} pointerEvents="box-none">
          <Text style={styles.overlayTitle}>{overlayTitle}</Text>
          <View style={styles.ctaPill}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    borderRadius: radius.md,
    overflow: "hidden",
    position: "relative",
  },
  overlayPressable: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  androidFallback: {
    backgroundColor: "rgba(12,14,20,0.78)",
  },
  overlayInner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  overlayTitle: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ctaPill: {
    backgroundColor: "rgba(241,122,53,0.95)",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  ctaText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
});
