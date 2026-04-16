import { StyleSheet, Text } from "react-native";

import { GlassCard } from "@/components/GlassCard";
import type { LocationPickerMapProps } from "@/features/location/LocationPickerMap.types";
import { palette, radius, spacing } from "@/theme/tokens";

export function LocationPickerMap(_props: LocationPickerMapProps) {
  return (
    <GlassCard style={styles.wrapper}>
      <Text style={styles.title}>Selecao de ponto no mapa</Text>
      <Text style={styles.body}>
        No web mantive um fallback simples. No iPhone e Android você pode tocar no mapa
        e arrastar o pin para ajustar sua localização aproximada.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 180,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.sm,
  },
  title: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
});
