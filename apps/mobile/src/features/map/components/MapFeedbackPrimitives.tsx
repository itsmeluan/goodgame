import { StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { palette, radius, spacing } from "@/theme/tokens";

export function MapEmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyCardIconWrap}>
        <AppIcon iosName="sparkles" fallbackName="auto-awesome" size={18} color={palette.ember} />
      </View>
      <Text style={styles.emptyCardTitle}>{title}</Text>
      <Text style={styles.emptyCardBody}>{body}</Text>
    </View>
  );
}

export function MapInlineNotice({
  tone,
  message,
}: {
  tone: "error" | "success" | "neutral";
  message: string;
}) {
  return (
    <View
      style={[
        styles.inlineNotice,
        tone === "error"
          ? styles.inlineNoticeError
          : tone === "success"
            ? styles.inlineNoticeSuccess
            : styles.inlineNoticeNeutral,
      ]}
    >
      <AppIcon
        iosName={
          tone === "error"
            ? "exclamationmark.triangle.fill"
            : tone === "success"
              ? "checkmark.circle.fill"
              : "info.circle.fill"
        }
        fallbackName={
          tone === "error"
            ? "error-outline"
            : tone === "success"
              ? "check-circle"
              : "info-outline"
        }
        size={16}
        color={tone === "error" ? "#F7B0B0" : tone === "success" ? palette.ink : palette.sand}
      />
      <Text style={styles.inlineNoticeText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
  },
  emptyCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,143,92,0.14)",
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.22)",
  },
  emptyCardTitle: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyCardBody: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 19,
  },
  inlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  inlineNoticeError: {
    backgroundColor: "rgba(124, 42, 42, 0.16)",
    borderColor: "rgba(247,176,176,0.34)",
  },
  inlineNoticeSuccess: {
    backgroundColor: "rgba(55, 112, 86, 0.18)",
    borderColor: "rgba(147,184,159,0.3)",
  },
  inlineNoticeNeutral: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(231,216,188,0.1)",
  },
  inlineNoticeText: {
    color: palette.sand,
    fontSize: 12,
    lineHeight: 17,
  },
});
