import { StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { formatDateTime } from "@/lib/formatting";
import { palette, radius, spacing } from "@/theme/tokens";
import type { ChatMessage, MeetupPost } from "@/types/domain";

type MeetupChatPreviewProps = {
  meetup: MeetupPost;
  messages: ChatMessage[];
};

export function MeetupChatPreview({ meetup, messages }: MeetupChatPreviewProps) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Grupo do jogo</Text>
        <Text style={styles.meta}>{formatDateTime(meetup.startsAt)}</Text>
      </View>

      {messages.length ? null : (
        <Text style={styles.empty}>Ainda não há mensagens neste grupo.</Text>
      )}

      {messages.map((message) => (
        <View key={message.id} style={styles.message}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.messageSurface}
          />
          <View style={styles.messageHeader}>
            <Text style={styles.author}>{message.authorName}</Text>
            <Text style={styles.sentAt}>{formatDateTime(message.sentAt)}</Text>
          </View>
          <Text style={styles.body}>{message.body}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.07)",
    padding: spacing.lg,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: palette.pine,
    fontSize: 12,
  },
  empty: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  message: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
    overflow: "hidden",
  },
  messageSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    color: palette.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  sentAt: {
    color: palette.pine,
    fontSize: 12,
  },
  body: {
    color: palette.sand,
    fontSize: 14,
    lineHeight: 20,
  },
});
