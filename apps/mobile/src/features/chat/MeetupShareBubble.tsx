import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { meetupMarkerVisualFromMeetup } from "@/features/map/gameLabels";
import { formatDateTime } from "@/lib/formatting";
import type { MeetupSharePayload } from "@/lib/meetupShare";
import { palette, radius, spacing } from "@/theme/tokens";

type MeetupMarkerVisualKind = "magic" | "board" | "yugioh" | "pokemon";

function meetupMarkerImageForVisual(visual: MeetupMarkerVisualKind) {
  switch (visual) {
    case "magic":
      return require("../../../assets/map/marker-meetup-magic.png");
    case "yugioh":
      return require("../../../assets/map/marker-meetup-yugioh.png");
    case "pokemon":
      return require("../../../assets/map/marker-meetup-pokemon.png");
    case "board":
    default:
      return require("../../../assets/map/marker-meetup-dice.png");
  }
}

type MeetupShareBubbleProps = {
  payload: MeetupSharePayload;
  isMine: boolean;
  onOpenMeetup: (meetupId: string) => void;
};

export function MeetupShareBubble({ payload, isMine, onOpenMeetup }: MeetupShareBubbleProps) {
  const visual = meetupMarkerVisualFromMeetup({
    gameSlug: payload.gameSlug,
    formatName: payload.formatName,
  });
  const markerImage = meetupMarkerImageForVisual(visual);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir partida ${payload.title} no mapa`}
      onPress={() => onOpenMeetup(payload.meetupId)}
      style={({ pressed }) => [
        styles.card,
        isMine ? styles.cardMine : styles.cardOther,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <Image source={markerImage} style={styles.markerImage} contentFit="contain" />
      <View style={styles.cardCopy}>
        <Text style={[styles.title, isMine ? styles.titleMine : null]} numberOfLines={2}>
          {payload.title}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : null]}>
          {formatDateTime(payload.startsAt)}
        </Text>
        <Text style={[styles.hint, isMine ? styles.hintMine : null]}>Abrir no mapa</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardMine: {
    backgroundColor: "rgba(17,17,17,0.12)",
    borderColor: "rgba(17,17,17,0.12)",
  },
  cardOther: {
    backgroundColor: palette.mapSurface,
    borderColor: palette.line,
  },
  cardPressed: {
    opacity: 0.9,
  },
  markerImage: {
    width: 44,
    height: 44,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  titleMine: {
    color: palette.ink,
  },
  time: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
  },
  timeMine: {
    color: "rgba(17,17,17,0.62)",
  },
  hint: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  hintMine: {
    color: palette.ink,
    opacity: 0.85,
  },
});
