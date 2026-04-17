import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import type { MeetupStatus } from "@/types/domain";

import { inferGameNameFromLabels } from "@/features/map/gameLabels";
import { isMeetupOverdue } from "@/features/map/meetupTiming";

import {
  ICON_GAME_TYPE_DICE_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_DICE_SVG_XML,
  ICON_GAME_TYPE_MAGIC_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_MAGIC_SVG_XML,
  ICON_VENUE_SVG_XML,
} from "@/components/icons/listRowIconsSvgXml";

export type ListRowGameListIconVariant =
  | "venue"
  | "magic"
  | "magic-overdue"
  | "dice"
  | "dice-overdue";

const XML_BY_VARIANT: Record<ListRowGameListIconVariant, string> = {
  venue: ICON_VENUE_SVG_XML,
  magic: ICON_GAME_TYPE_MAGIC_SVG_XML,
  "magic-overdue": ICON_GAME_TYPE_MAGIC_OVERDUE_SVG_XML,
  dice: ICON_GAME_TYPE_DICE_SVG_XML,
  "dice-overdue": ICON_GAME_TYPE_DICE_OVERDUE_SVG_XML,
};

type MeetupIconFields = {
  startsAt: string;
  status: MeetupStatus;
  formatName: string;
};

export function resolveGameGroupListIconVariant(
  group: { meetups: MeetupIconFields[] },
  nowTimestamp: number
): Exclude<ListRowGameListIconVariant, "venue"> {
  const primary = group.meetups[0];
  const game = inferGameNameFromLabels([primary?.formatName ?? ""]);
  const isMagic = game === "Magic: The Gathering";
  const allOverdue =
    group.meetups.length > 0 && group.meetups.every((m) => isMeetupOverdue(m, nowTimestamp));

  if (isMagic) {
    return allOverdue ? "magic-overdue" : "magic";
  }

  return allOverdue ? "dice-overdue" : "dice";
}

export function resolveMeetupGameListIconVariant(
  meetup: MeetupIconFields,
  nowTimestamp: number
): Exclude<ListRowGameListIconVariant, "venue"> {
  const isMagic = inferGameNameFromLabels([meetup.formatName]) === "Magic: The Gathering";
  const overdue = isMeetupOverdue(meetup, nowTimestamp);

  if (isMagic) {
    return overdue ? "magic-overdue" : "magic";
  }

  return overdue ? "dice-overdue" : "dice";
}

type ListRowGameListIconProps = {
  variant: ListRowGameListIconVariant;
  size?: number;
  accessibilityLabel: string;
};

export function ListRowGameListIcon({ variant, size = 36, accessibilityLabel }: ListRowGameListIconProps) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <SvgXml xml={XML_BY_VARIANT[variant]} width={size} height={size} />
    </View>
  );
}
