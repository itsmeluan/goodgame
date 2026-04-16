import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { radius } from "@/theme/tokens";

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "light" | "dark" | "accent";
  intensity?: "clear" | "regular";
};

export function GlassCard({
  children,
  style,
  variant = "dark",
  intensity = "clear",
}: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>
      <AppleGlassSurface
        pointerEvents="none"
        variant={variant}
        intensity={intensity}
        style={styles.surface}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
});
