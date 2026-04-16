import { StyleSheet, Text, View } from "react-native";

import { AppleListRow } from "@/components/AppleListNavigation";
import {
  formatCompactAddress,
  formatDistanceKm,
  formatShortAddress,
  formatVenueKind,
} from "@/lib/formatting";
import { palette, radius } from "@/theme/tokens";
import type { VenueCard } from "@/types/domain";

type VenueSheetListRowContainerProps = {
  venue: VenueCard;
  profileLat: number | null;
  profileLng: number | null;
  selectedVenueId: string | null;
  profileUserId: string | null;
  separator: boolean;
  onPress: () => void;
};

export function VenueSheetListRowContainer({
  venue,
  profileLat,
  profileLng,
  selectedVenueId,
  profileUserId,
  separator,
  onPress,
}: VenueSheetListRowContainerProps) {
  const distanceLabel = formatDistanceKm(profileLat, profileLng, venue.lat, venue.lng);
  const subtitle = [
    `${formatVenueKind(venue.kind)} · ${venue.neighborhood}`,
    formatShortAddress(venue.address) || formatCompactAddress(venue.address) || venue.neighborhood,
    `${venue.ownerDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
  const creatorBadge = venue.creatorUserId === profileUserId;

  return (
    <AppleListRow
      icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
      label={venue.name}
      subtitle={subtitle}
      trailingAccessory={
        creatorBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Você</Text>
          </View>
        ) : undefined
      }
      onPress={onPress}
      separator={separator}
      size="compact"
      tone={venue.id === selectedVenueId || creatorBadge ? "accent" : "default"}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 20,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,143,92,0.1)",
  },
  badgeLabel: {
    color: palette.ember,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
});
