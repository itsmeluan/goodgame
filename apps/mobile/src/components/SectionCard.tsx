import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { GlassCard } from "@/components/GlassCard";
import { palette, radius, spacing } from "@/theme/tokens";

type SectionCardProps = {
  children: ReactNode;
};

export function SectionCard({ children }: SectionCardProps) {
  return <GlassCard style={styles.card}>{children}</GlassCard>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
