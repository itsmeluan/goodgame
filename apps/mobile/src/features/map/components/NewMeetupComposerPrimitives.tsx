import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radius, spacing } from "@/theme/tokens";

export function NewMeetupComposerSectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function NewMeetupComposerInlineNotice({ message }: { message: string }) {
  return (
    <View style={[styles.inlineNotice, styles.inlineNoticeError]}>
      <Text style={styles.inlineNoticeText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.parchment,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  inlineNotice: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inlineNoticeError: {
    backgroundColor: "rgba(147, 47, 47, 0.18)",
    borderColor: "rgba(216, 108, 114, 0.36)",
  },
  inlineNoticeText: {
    color: palette.sand,
    fontSize: 14,
    lineHeight: 20,
  },
});
