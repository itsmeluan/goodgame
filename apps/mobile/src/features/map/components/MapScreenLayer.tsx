import type { ComponentProps, ReactElement } from "react";
import { Animated, View } from "react-native";

import { MapGamesSheet } from "@/features/map/components/MapGamesSheet";
import type { MeetupSortOption } from "@/features/map/components/MeetupSortMenuModal";
import { InteractiveMap } from "@/features/map/InteractiveMap";
import { MapTopOverlay } from "@/features/map/components/MapTopOverlay";
import { styles } from "@/features/map/MapHomeScreen.styles";
import { type GamesSheetMeetupGroup } from "@/features/map/components/GamesSheetMeetupsTab";
import type { MeetupSortMode } from "@/features/map/mapHelpers";

type ScreenSection = "meetups" | "venues";

export type MapScreenLayerProps<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
> = {
  active: boolean;
  mapProps: ComponentProps<typeof InteractiveMap>;
  topOverlay: {
    onDismissPinCallout?: () => void;
    profileName: string;
    profileAvatarUrl: string | null;
    showUnreadMenuIndicator: boolean;
    incomingFriendRequestsCount: number;
    filtersActive: boolean;
    filtersOpen: boolean;
    activeFilterCount: number;
    error: string | null;
    refreshing: boolean;
    onOpenDrawer: () => void;
    onToggleFilters: () => void;
    onOpenAccount: () => void;
    onOpenFriends: () => void;
    onOpenComposer: () => void;
  };
  gamesSheet: {
    onDismissPinCallout?: () => void;
    top: number;
    height: number;
    translateY: Animated.Value;
    expanded: boolean;
    meetupCount: number;
    venueCount: number;
    section: ScreenSection;
    managedMeetupId: string | null;
    sortMenuOpen: boolean;
    sortMode: MeetupSortMode;
    sortOptions: MeetupSortOption[];
    headerPanHandlers?: object;
    contentBottomPadding: number;
    sectionOpacity: Animated.Value;
    sectionTranslateX: Animated.Value;
    sectionPanHandlers?: object;
    entityActionSuccess: string | null;
    titleNote: string;
    meetupGroups: GamesSheetMeetupGroup<MeetupItem>[];
    expandedGroupIds: Record<string, boolean>;
    hidePastLabel: string;
    venues: VenueItem[];
    expandedVenueManageId: string | null;
    venuesComposer: ReactElement | null;
    onToggleSortMenu: () => void;
    onSelectSort: (value: MeetupSortMode) => void;
    onSelectMeetups: () => void;
    onSelectVenues: () => void;
    onToggleHidePast: () => void;
    onToggleGroup: (groupId: string) => void;
    onOpenManageMeetup: (item: MeetupItem) => void;
    onCloseManageMeetup: (item: MeetupItem) => void;
    onOpenManageVenue: (item: VenueItem) => void;
    onCloseManageVenue: (item: VenueItem) => void;
    renderMeetupListItem: (
      item: MeetupItem,
      openDetail: () => void,
      separator: boolean
    ) => ReactElement;
    renderMeetupDetail: (
      item: MeetupItem,
      openManage: () => void,
      openParticipants: () => void
    ) => ReactElement;
    renderMeetupManage: (item: MeetupItem, openManageParticipants: () => void) => ReactElement;
    renderMeetupParticipants: (item: MeetupItem) => ReactElement;
    renderVenueListItem: (
      item: VenueItem,
      openDetail: () => void,
      separator: boolean
    ) => ReactElement;
    renderVenueDetail: (item: VenueItem, openManage: () => void) => ReactElement;
    renderVenueManage: (item: VenueItem) => ReactElement;
  };
};

export function MapScreenLayer<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
>({
  active,
  mapProps,
  topOverlay,
  gamesSheet,
}: MapScreenLayerProps<MeetupItem, VenueItem>) {
  return (
    <View style={styles.screen} pointerEvents={active ? "auto" : "none"}>
      <InteractiveMap {...mapProps} />

      <MapTopOverlay {...topOverlay} />

      <MapGamesSheet {...gamesSheet} />
    </View>
  );
}
