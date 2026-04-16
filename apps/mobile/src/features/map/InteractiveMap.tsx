import { StyleSheet, Text, View } from "react-native";

import type { InteractiveMapProps } from "@/features/map/InteractiveMap.types";
import { palette, radius, spacing } from "@/theme/tokens";

export function InteractiveMap({ immersive = false }: InteractiveMapProps) {
  return (
    <View style={[styles.fallback, immersive ? styles.fallbackImmersive : null]}>
      <Text style={styles.title}>Mapa do encontro</Text>
      <Text style={styles.body}>
        No navegador, esta tela mostra uma versão simplificada da experiência. Para o mapa
        completo com localização e navegação em tempo real, use o app no iPhone ou Android.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 220,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.sm,
  },
  fallbackImmersive: {
    flex: 1,
    minHeight: 0,
    borderRadius: 0,
  },
  title: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
});
