import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { GROUPED_SECTION_POLISH_ENABLED } from "@/features/map/components/groupedSectionVisuals";
import { radius, spacing } from "@/theme/tokens";

type GroupedSectionContentProps = {
  children: ReactNode;
  compact?: boolean;
  style?: ViewStyle;
};

export function GroupedSectionContent({
  children,
  compact = false,
  style,
}: GroupedSectionContentProps) {
  if (!GROUPED_SECTION_POLISH_ENABLED) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null, style]}>
      <View style={[styles.rail, compact ? styles.railCompact : null]} />
      <View style={[styles.card, compact ? styles.cardCompact : null]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  wrapCompact: {
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  rail: {
    width: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(241,143,92,0.28)",
    marginVertical: spacing.xs,
  },
  railCompact: {
    width: 1.5,
    backgroundColor: "rgba(231,216,188,0.18)",
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardCompact: {
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.018)",
  },
});
