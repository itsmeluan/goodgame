import { Pressable, StyleSheet, Text } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant={selected ? "accent" : "dark"}
        intensity="clear"
        style={styles.surface}
      />
      <Text style={[styles.label, selected ? styles.selectedLabel : styles.unselectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  selected: {
    backgroundColor: "rgba(241,143,92,0.16)",
    borderColor: "rgba(241,143,92,0.28)",
  },
  unselected: {
    backgroundColor: "rgba(255,255,255,0.015)",
    borderColor: "rgba(231,216,188,0.08)",
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  selectedLabel: {
    color: palette.sand,
  },
  unselectedLabel: {
    color: palette.sand,
  },
});
