import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatVenueKind } from "@/lib/formatting";
import type { VenueSharePayload } from "@/lib/venueShare";
import { palette, radius, spacing } from "@/theme/tokens";

const venueMarker = require("../../../assets/map/marker-venue.png");

type VenueShareBubbleProps = {
  payload: VenueSharePayload;
  isMine: boolean;
  onOpenVenue: (venueId: string) => void;
};

export function VenueShareBubble({ payload, isMine, onOpenVenue }: VenueShareBubbleProps) {
  const subline =
    payload.addressLine.trim() ||
    (payload.neighborhood.trim() ? payload.neighborhood : formatVenueKind(payload.kind));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir local ${payload.name} no mapa`}
      onPress={() => onOpenVenue(payload.venueId)}
      style={({ pressed }) => [
        styles.card,
        isMine ? styles.cardMine : styles.cardOther,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <Image source={venueMarker} style={styles.markerImage} contentFit="contain" />
      <View style={styles.cardCopy}>
        <Text style={[styles.title, isMine ? styles.titleMine : null]} numberOfLines={2}>
          {payload.name}
        </Text>
        <Text style={[styles.meta, isMine ? styles.metaMine : null]} numberOfLines={2}>
          {subline}
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
  meta: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
  },
  metaMine: {
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
