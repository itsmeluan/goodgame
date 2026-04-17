import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import type { MeetupStatus } from "@/types/domain";

import { meetupMarkerVisualFromMeetup } from "@/features/map/gameLabels";
import { isMeetupOverdue } from "@/features/map/meetupTiming";

import {
  ICON_GAME_TYPE_DICE_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_DICE_SVG_XML,
  ICON_GAME_TYPE_MAGIC_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_MAGIC_SVG_XML,
  ICON_GAME_TYPE_POKEMON_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_POKEMON_SVG_XML,
  ICON_GAME_TYPE_YUGIOH_OVERDUE_SVG_XML,
  ICON_GAME_TYPE_YUGIOH_SVG_XML,
  ICON_VENUE_SVG_XML,
} from "@/components/icons/listRowIconsSvgXml";

export type ListRowGameListIconVariant =
  | "venue"
  | "magic"
  | "magic-overdue"
  | "dice"
  | "dice-overdue"
  | "yugioh"
  | "yugioh-overdue"
  | "pokemon"
  | "pokemon-overdue";

const XML_BY_VARIANT: Record<ListRowGameListIconVariant, string> = {
  venue: ICON_VENUE_SVG_XML,
  magic: ICON_GAME_TYPE_MAGIC_SVG_XML,
  "magic-overdue": ICON_GAME_TYPE_MAGIC_OVERDUE_SVG_XML,
  dice: ICON_GAME_TYPE_DICE_SVG_XML,
  "dice-overdue": ICON_GAME_TYPE_DICE_OVERDUE_SVG_XML,
  yugioh: ICON_GAME_TYPE_YUGIOH_SVG_XML,
  "yugioh-overdue": ICON_GAME_TYPE_YUGIOH_OVERDUE_SVG_XML,
  pokemon: ICON_GAME_TYPE_POKEMON_SVG_XML,
  "pokemon-overdue": ICON_GAME_TYPE_POKEMON_OVERDUE_SVG_XML,
};

type MeetupIconFields = {
  startsAt: string;
  status: MeetupStatus;
  formatName: string;
  gameSlug: string;
};

function resolveVariantForVisual(
  visual: ReturnType<typeof meetupMarkerVisualFromMeetup>,
  overdue: boolean
): Exclude<ListRowGameListIconVariant, "venue"> {
  if (visual === "magic") {
    return overdue ? "magic-overdue" : "magic";
  }

  if (visual === "board") {
    return overdue ? "dice-overdue" : "dice";
  }

  if (visual === "yugioh") {
    return overdue ? "yugioh-overdue" : "yugioh";
  }

  return overdue ? "pokemon-overdue" : "pokemon";
}

export function resolveGameGroupListIconVariant(
  group: { meetups: MeetupIconFields[] },
  nowTimestamp: number
): Exclude<ListRowGameListIconVariant, "venue"> {
  const primary = group.meetups[0];
  const visual = primary
    ? meetupMarkerVisualFromMeetup(primary)
    : meetupMarkerVisualFromMeetup({ gameSlug: "", formatName: "" });
  const allOverdue =
    group.meetups.length > 0 && group.meetups.every((m) => isMeetupOverdue(m, nowTimestamp));

  return resolveVariantForVisual(visual, allOverdue);
}

export function resolveMeetupGameListIconVariant(
  meetup: MeetupIconFields,
  nowTimestamp: number
): Exclude<ListRowGameListIconVariant, "venue"> {
  const visual = meetupMarkerVisualFromMeetup(meetup);
  const overdue = isMeetupOverdue(meetup, nowTimestamp);

  return resolveVariantForVisual(visual, overdue);
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
