import { Pressable, StyleSheet, Text } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

export function MapClosePageButton({
  onPress,
  variant = "default",
}: {
  onPress: () => void;
  /** `footer`: sem margem superior, largura total (barra fixa no rodapé). */
  variant?: "default" | "footer";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fechar e voltar ao mapa"
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        variant === "footer" ? styles.buttonFooter : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <AppIcon iosName="xmark" fallbackName="close" size={18} color={palette.parchment} />
      <Text style={styles.buttonLabel}>Voltar ao mapa</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  buttonFooter: {
    marginTop: 0,
    alignSelf: "stretch",
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  buttonLabel: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "800",
  },
});
