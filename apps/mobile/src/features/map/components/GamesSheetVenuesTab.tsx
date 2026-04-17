import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup } from "@/components/AppleListNavigation";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { VirtualizedListBoundary } from "@/components/VirtualizedListBoundary";
import { sheetContentGutter, spacing } from "@/theme/tokens";

type VenueStackRoute =
  | { key: string; venueId: string; surface: "detail" }
  | { key: string; venueId: string; surface: "manage" };

type GamesSheetVenuesTabProps<Item extends { id: string; name: string; neighborhood?: string | null }> = {
  sceneWidth?: number;
  titleNote: string;
  bottomPadding: number;
  venues: Item[];
  expandedVenueManageId: string | null;
  composer: ReactElement | null;
  onOpenManageVenue: (item: Item) => void;
  onCloseManageVenue: (item: Item) => void;
  renderVenueListItem: (
    item: Item,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderVenueDetail: (item: Item, openManage: () => void) => ReactElement;
  renderVenueManage: (item: Item) => ReactElement;
  emptyState: ReactElement | null;
};

export function GamesSheetVenuesTab<Item extends { id: string; name: string; neighborhood?: string | null }>({
  sceneWidth,
  titleNote,
  bottomPadding,
  venues,
  expandedVenueManageId,
  composer,
  onOpenManageVenue,
  onCloseManageVenue,
  renderVenueListItem,
  renderVenueDetail,
  renderVenueManage,
  emptyState,
}: GamesSheetVenuesTabProps<Item>) {
  const [routeStack, setRouteStack] = useState<VenueStackRoute[]>([]);

  const pushDetailRoute = (venueId: string) => {
    setRouteStack((current) => {
      const next: VenueStackRoute = {
        key: `venue-detail:${venueId}`,
        venueId,
        surface: "detail",
      };
      const last = current[current.length - 1];
      if (last?.venueId === venueId && last?.surface === "detail") {
        return current;
      }
      return [...current, next];
    });
  };

  const pushManageRoute = (item: Item) => {
    onOpenManageVenue(item);
    setRouteStack((current) => {
      const next: VenueStackRoute = {
        key: `venue-manage:${item.id}`,
        venueId: item.id,
        surface: "manage",
      };
      const last = current[current.length - 1];
      if (last?.surface === "manage" && last?.venueId === item.id) {
        return current;
      }
      return [...current, next];
    });
  };

  const popRoute = () => {
    setRouteStack((current) => {
      const last = current[current.length - 1];
      if (last?.surface === "manage") {
        const venue = venues.find((v) => v.id === last.venueId);
        if (venue) {
          onCloseManageVenue(venue);
        }
      }
      return current.slice(0, -1);
    });
  };

  useEffect(() => {
    const active = routeStack[routeStack.length - 1];
    if (!active || active.surface !== "manage") {
      return;
    }
    if (expandedVenueManageId === active.venueId) {
      return;
    }
    setRouteStack((current) => {
      const currentTop = current[current.length - 1];
      if (!currentTop || currentTop.surface !== "manage") {
        return current;
      }
      return current.slice(0, -1);
    });
  }, [expandedVenueManageId, routeStack]);

  const routes = [
    {
      key: "root",
      content: (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          {titleNote || composer ? (
            <View style={styles.topMetaRow}>
              {titleNote ? <Text style={styles.contextNote}>{titleNote}</Text> : <View style={styles.contextSpacer} />}
              {composer ? <View style={styles.composerButtonRow}>{composer}</View> : null}
            </View>
          ) : null}
          {venues.length ? (
            <AppleListGroup>
              {venues.map((venue, index) =>
                renderVenueListItem(venue, () => pushDetailRoute(venue.id), index > 0)
              )}
            </AppleListGroup>
          ) : (
            emptyState
          )}
        </ScrollView>
      ),
    },
    ...routeStack.map((entry) => {
      const venue = venues.find((v) => v.id === entry.venueId);
      return {
        key: entry.key,
        content: (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
          >
            {venue
              ? entry.surface === "manage"
                ? renderVenueManage(venue)
                : renderVenueDetail(venue, () => pushManageRoute(venue))
              : emptyState}
          </ScrollView>
        ),
      };
    }),
  ];

  return (
    <VirtualizedListBoundary>
      <SlidingSheetStack
        routes={routes}
        onPop={popRoute}
        headerVariant="compact"
        sceneWidth={sceneWidth}
        scenePaddingHorizontal={sheetContentGutter}
      />
    </VirtualizedListBoundary>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    gap: 10,
  },
  sceneContent: {
    paddingTop: spacing.xs,
    gap: spacing.lg,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    zIndex: 4,
  },
  contextNote: {
    color: "#A49B94",
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  contextSpacer: {
    flex: 1,
  },
  composerButtonRow: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "flex-end",
    flexShrink: 0,
  },
});
