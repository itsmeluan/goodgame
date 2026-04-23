import { useState, type ReactElement } from "react";
import { Animated, Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GamesSheetHeader } from "@/features/map/components/GamesSheetHeader";
import type { MeetupSortOption } from "@/features/map/components/MeetupSortMenuModal";
import {
  GamesSheetMeetupsTab,
  type GamesSheetMeetupGroup,
  type GamesSheetMeetupListItem,
} from "@/features/map/components/GamesSheetMeetupsTab";
import { GamesSheetVenuesTab } from "@/features/map/components/GamesSheetVenuesTab";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import type { MeetupSortMode } from "@/features/map/mapHelpers";
import { styles } from "@/features/map/MapHomeScreen.styles";
import { useTranslation } from "@/i18n";
import { screenEdgeGlassBleed } from "@/theme/tokens";

type ScreenSection = "meetups" | "venues";

export type MapGamesSheetProps<
  MeetupItem extends { id: string } & GamesSheetMeetupListItem,
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
> = {
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
  /** For game-group list icons (Magic vs dice, overdue). */
  nowTimestamp: number;
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
  externalMeetupManageRequest?: { groupId: string; meetupId: string } | null;
  onConsumedExternalMeetupManageRequest?: () => void;
  externalMeetupDetailRequest?: { groupId: string; meetupId: string } | null;
  onConsumedExternalMeetupDetailRequest?: () => void;
  resolveMeetupById?: (meetupId: string) => MeetupItem | null;
  renderVenueListItem: (
    item: VenueItem,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderVenueDetail: (item: VenueItem, openManage: () => void) => ReactElement;
  renderVenueManage: (item: VenueItem) => ReactElement;
  externalVenueDetailRequest?: { venueId: string } | null;
  onConsumedExternalVenueDetailRequest?: () => void;
  resolveVenueById?: (venueId: string) => VenueItem | null;
};

export function MapGamesSheet<
  MeetupItem extends { id: string } & GamesSheetMeetupListItem,
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
>({
  onDismissPinCallout,
  top,
  height,
  translateY,
  expanded,
  meetupCount,
  venueCount,
  section,
  managedMeetupId,
  sortMenuOpen,
  sortMode,
  sortOptions,
  headerPanHandlers,
  contentBottomPadding,
  sectionOpacity,
  sectionTranslateX,
  sectionPanHandlers,
  entityActionSuccess,
  titleNote,
  nowTimestamp,
  meetupGroups,
  expandedGroupIds,
  hidePastLabel,
  venues,
  expandedVenueManageId,
  venuesComposer,
  onToggleSortMenu,
  onSelectSort,
  onSelectMeetups,
  onSelectVenues,
  onToggleHidePast,
  onToggleGroup,
  onOpenManageMeetup,
  onCloseManageMeetup,
  onOpenManageVenue,
  onCloseManageVenue,
  renderMeetupListItem,
  renderMeetupDetail,
  renderMeetupManage,
  renderMeetupParticipants,
  externalMeetupManageRequest = null,
  onConsumedExternalMeetupManageRequest = () => {},
  externalMeetupDetailRequest = null,
  onConsumedExternalMeetupDetailRequest = () => {},
  resolveMeetupById,
  renderVenueListItem,
  renderVenueDetail,
  renderVenueManage,
  externalVenueDetailRequest = null,
  onConsumedExternalVenueDetailRequest = () => {},
  resolveVenueById,
}: MapGamesSheetProps<MeetupItem, VenueItem>) {
  const { t } = useTranslation();
  const [sheetWidth, setSheetWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

  return (
    <Animated.View
      onTouchStart={onDismissPinCallout}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== sheetWidth) {
          setSheetWidth(nextWidth);
        }
      }}
      style={[
        styles.gamesSheet,
        Platform.OS === "android"
          ? [stylesLocal.sheetFullWidth, { width: windowWidth }]
          : null,
        {
          top,
          height,
          transform: [{ translateY }],
        },
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="regular"
        style={stylesLocal.sheetSurface}
      />

      <GamesSheetHeader
        expanded={expanded}
        meetupCount={meetupCount}
        venueCount={venueCount}
        section={section}
        panHandlers={headerPanHandlers}
        onDismissPinCallout={onDismissPinCallout}
        onSelectMeetups={onSelectMeetups}
        onSelectVenues={onSelectVenues}
      />

      <View
        style={[
          styles.gamesSheetContent,
          { paddingBottom: contentBottomPadding },
        ]}
      >
        <Animated.View
          {...sectionPanHandlers}
          style={[
            styles.gamesSheetSectionAnimated,
            {
              opacity: sectionOpacity,
              transform: [{ translateX: sectionTranslateX }],
            },
          ]}
        >
          {entityActionSuccess ? (
            <MapInlineNotice tone="success" message={entityActionSuccess} />
          ) : null}
          {section === "meetups" ? (
            <GamesSheetMeetupsTab
              onDismissPinCallout={onDismissPinCallout}
              sceneWidth={sheetWidth || undefined}
              titleNote={titleNote}
              bottomPadding={contentBottomPadding}
              nowTimestamp={nowTimestamp}
              groups={meetupGroups}
              managedMeetupId={managedMeetupId}
              expandedGroupIds={expandedGroupIds}
              sortMenuOpen={sortMenuOpen}
              sortMode={sortMode}
              sortOptions={sortOptions}
              hidePastLabel={hidePastLabel}
              onToggleSortMenu={onToggleSortMenu}
              onSelectSort={onSelectSort}
              onToggleHidePast={onToggleHidePast}
              onToggleGroup={onToggleGroup}
              onOpenManageMeetup={onOpenManageMeetup}
              onCloseManageMeetup={onCloseManageMeetup}
              renderMeetupListItem={renderMeetupListItem}
              renderMeetupDetail={renderMeetupDetail}
              renderMeetupManage={renderMeetupManage}
              renderMeetupParticipants={renderMeetupParticipants}
              externalManageRequest={externalMeetupManageRequest}
              onConsumedExternalManageRequest={onConsumedExternalMeetupManageRequest}
              externalDetailRequest={externalMeetupDetailRequest}
              onConsumedExternalDetailRequest={onConsumedExternalMeetupDetailRequest}
              resolveMeetupById={resolveMeetupById}
              emptyState={
                <MapEmptyCard
                  title={t("map.emptyMeetupsTitle")}
                  body={t("map.emptyMeetupsBody")}
                />
              }
            />
          ) : (
            <GamesSheetVenuesTab
              onDismissPinCallout={onDismissPinCallout}
              sceneWidth={sheetWidth || undefined}
              titleNote={titleNote}
              bottomPadding={contentBottomPadding}
              venues={venues}
              expandedVenueManageId={expandedVenueManageId}
              composer={venuesComposer}
              onOpenManageVenue={onOpenManageVenue}
              onCloseManageVenue={onCloseManageVenue}
              renderVenueListItem={renderVenueListItem}
              renderVenueDetail={renderVenueDetail}
              renderVenueManage={renderVenueManage}
              externalVenueDetailRequest={externalVenueDetailRequest}
              onConsumedExternalVenueDetailRequest={onConsumedExternalVenueDetailRequest}
              resolveVenueById={resolveVenueById}
              emptyState={
                <MapEmptyCard
                  title={t("map.emptyVenuesTitle")}
                  body={t("map.emptyVenuesBody")}
                />
              }
            />
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const stylesLocal = StyleSheet.create({
  sheetFullWidth: {
    left: 0,
    right: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetSurface: {
    position: "absolute",
    // On Android there is no glass blur so no need to bleed beyond the sheet boundaries.
    left: Platform.select({ android: 0, default: -screenEdgeGlassBleed }),
    right: Platform.select({ android: 0, default: -screenEdgeGlassBleed }),
    top: 0,
    bottom: 0,
    borderWidth: 0,
    borderTopLeftRadius: Platform.select({ android: 0, default: 30 }),
    borderTopRightRadius: Platform.select({ android: 0, default: 30 }),
  },
});
