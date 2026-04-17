import { StyleSheet, Text, View } from "react-native";

import { AppleListRow, APPLE_LIST_COMPACT_ICON_SIZE } from "@/components/AppleListNavigation";
import {
  ListRowGameListIcon,
  resolveMeetupGameListIconVariant,
} from "@/components/icons/ListRowGameListIcon";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import {
  formatCompactAddress,
  formatDateTime,
  formatDistanceKm,
  formatMeetupStatus,
  formatShortAddress,
} from "@/lib/formatting";
import { palette, radius } from "@/theme/tokens";
import type { MeetupPost } from "@/types/domain";

type MeetupSheetListRowContainerProps = {
  meetup: MeetupPost;
  profileLat: number | null;
  profileLng: number | null;
  nowTimestamp: number;
  selectedMeetupId: string | null;
  separator: boolean;
  onPress: () => void;
};

export function MeetupSheetListRowContainer({
  meetup,
  profileLat,
  profileLng,
  nowTimestamp,
  selectedMeetupId,
  separator,
  onPress,
}: MeetupSheetListRowContainerProps) {
  const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
  const overdue = isMeetupOverdue(meetup, nowTimestamp);
  const distanceLabel = formatDistanceKm(profileLat, profileLng, meetup.lat, meetup.lng);
  const locationLabel =
    formatShortAddress(meetup.addressLabel || meetup.locationHint) ||
    formatCompactAddress(meetup.addressLabel || meetup.locationHint) ||
    meetup.locationHint;
  const creatorLabel = `${meetup.creatorDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`;
  const badgeLabel = overdue
    ? "Passou"
    : meetup.isCreator
      ? "Você"
      : meetup.isMember
        ? "Chat"
        : formatMeetupStatus(effectiveStatus);
  const badgeTone = overdue
    ? styles.badgeOverdue
    : meetup.isCreator || meetup.isMember
      ? styles.badgeAccent
      : styles.badgeDefault;
  const badgeTextTone = overdue
    ? styles.badgeLabelOverdue
    : meetup.isCreator || meetup.isMember
      ? styles.badgeLabelAccent
      : styles.badgeLabelDefault;

  const listIconVariant = resolveMeetupGameListIconVariant(meetup, nowTimestamp);

  return (
    <AppleListRow
      leading={
        <ListRowGameListIcon
          variant={listIconVariant}
          size={APPLE_LIST_COMPACT_ICON_SIZE}
          accessibilityLabel={
            overdue ? `${meetup.title}, horário passou` : `${meetup.title}, tipo de jogo`
          }
        />
      }
      label={meetup.title}
      subtitle={[formatDateTime(meetup.startsAt), locationLabel, creatorLabel].filter(Boolean).join("\n")}
      trailingAccessory={
        <View style={[styles.badge, badgeTone]}>
          <Text style={[styles.badgeLabel, badgeTextTone]}>{badgeLabel}</Text>
        </View>
      }
      onPress={onPress}
      separator={separator}
      size="compact"
      tone={
        overdue
          ? "danger"
          : meetup.id === selectedMeetupId || meetup.isCreator || meetup.isMember
            ? "accent"
            : "default"
      }
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
  },
  badgeDefault: {
    backgroundColor: "rgba(147, 184, 159, 0.1)",
  },
  badgeAccent: {
    backgroundColor: "rgba(241,143,92,0.1)",
  },
  badgeOverdue: {
    backgroundColor: "rgba(216,108,114,0.1)",
  },
  badgeLabel: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  badgeLabelDefault: {
    color: "#B7D0C1",
  },
  badgeLabelAccent: {
    color: palette.ember,
  },
  badgeLabelOverdue: {
    color: "#F0A7AE",
  },
});
