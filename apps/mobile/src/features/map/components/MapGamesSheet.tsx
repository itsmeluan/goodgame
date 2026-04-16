import { useState, type ReactElement } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GamesSheetHeader } from "@/features/map/components/GamesSheetHeader";
import type { MeetupSortOption } from "@/features/map/components/MeetupSortMenuModal";
import {
  GamesSheetMeetupsTab,
  type GamesSheetMeetupGroup,
} from "@/features/map/components/GamesSheetMeetupsTab";
import { GamesSheetVenuesTab } from "@/features/map/components/GamesSheetVenuesTab";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import type { MeetupSortMode } from "@/features/map/mapHelpers";
import { styles } from "@/features/map/MapHomeScreen.styles";
import { screenEdgeGlassBleed } from "@/theme/tokens";

type ScreenSection = "meetups" | "venues";

export type MapGamesSheetProps<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
> = {
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
  venuesComposer: ReactElement | null;
  onToggleSortMenu: () => void;
  onSelectSort: (value: MeetupSortMode) => void;
  onSelectMeetups: () => void;
  onSelectVenues: () => void;
  onToggleHidePast: () => void;
  onToggleGroup: (groupId: string) => void;
  onOpenManageMeetup: (item: MeetupItem) => void;
  onCloseManageMeetup: (item: MeetupItem) => void;
  renderMeetupListItem: (
    item: MeetupItem,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderMeetupDetail: (item: MeetupItem, openManage: () => void) => ReactElement;
  renderMeetupManage: (item: MeetupItem) => ReactElement;
  renderVenueListItem: (
    item: VenueItem,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderVenueDetail: (item: VenueItem) => ReactElement;
};

export function MapGamesSheet<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null }
>({
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
  meetupGroups,
  expandedGroupIds,
  hidePastLabel,
  venues,
  venuesComposer,
  onToggleSortMenu,
  onSelectSort,
  onSelectMeetups,
  onSelectVenues,
  onToggleHidePast,
  onToggleGroup,
  onOpenManageMeetup,
  onCloseManageMeetup,
  renderMeetupListItem,
  renderMeetupDetail,
  renderMeetupManage,
  renderVenueListItem,
  renderVenueDetail,
}: MapGamesSheetProps<MeetupItem, VenueItem>) {
  const [sheetWidth, setSheetWidth] = useState(0);

  return (
    <Animated.View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== sheetWidth) {
          setSheetWidth(nextWidth);
        }
      }}
      style={[
        styles.gamesSheet,
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
              sceneWidth={sheetWidth || undefined}
              titleNote={titleNote}
              bottomPadding={contentBottomPadding}
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
              emptyState={
                <MapEmptyCard
                  title="Nenhum jogo encontrado"
                  body="Ajuste os filtros para ampliar a busca."
                />
              }
            />
          ) : (
            <GamesSheetVenuesTab
              sceneWidth={sheetWidth || undefined}
              titleNote={titleNote}
              bottomPadding={contentBottomPadding}
              venues={venues}
              composer={venuesComposer}
              renderVenueListItem={renderVenueListItem}
              renderVenueDetail={renderVenueDetail}
              emptyState={
                <MapEmptyCard
                  title="Nenhum local encontrado"
                  body="Tente abrir os filtros e ampliar o raio da busca."
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
  sheetSurface: {
    position: "absolute",
    left: -screenEdgeGlassBleed,
    right: -screenEdgeGlassBleed,
    top: 0,
    bottom: 0,
    borderWidth: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
