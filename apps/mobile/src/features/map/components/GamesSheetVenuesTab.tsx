import type { ReactElement } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppleListGroup,
} from "@/components/AppleListNavigation";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { VirtualizedListBoundary } from "@/components/VirtualizedListBoundary";
import { sheetContentGutter, spacing } from "@/theme/tokens";

type GamesSheetVenuesTabProps<Item extends { id: string; name: string; neighborhood?: string | null }> = {
  sceneWidth?: number;
  titleNote: string;
  bottomPadding: number;
  venues: Item[];
  composer: ReactElement | null;
  renderVenueListItem: (
    item: Item,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderVenueDetail: (item: Item) => ReactElement;
  emptyState: ReactElement | null;
};

export function GamesSheetVenuesTab<Item extends { id: string; name: string; neighborhood?: string | null }>({
  sceneWidth,
  titleNote,
  bottomPadding,
  venues,
  composer,
  renderVenueListItem,
  renderVenueDetail,
  emptyState,
}: GamesSheetVenuesTabProps<Item>) {
  const [routeKeys, setRouteKeys] = useState<string[]>([]);

  const pushRoute = (key: string) => {
    setRouteKeys((current) => (current[current.length - 1] === key ? current : [...current, key]));
  };

  const popRoute = () => {
    setRouteKeys((current) => current.slice(0, -1));
  };

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
                renderVenueListItem(venue, () => pushRoute(venue.id), index > 0)
              )}
            </AppleListGroup>
          ) : (
            emptyState
          )}
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const venue = venues.find((item) => item.id === routeKey);

      return {
        key: routeKey,
        content: (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
          >
            {venue ? renderVenueDetail(venue) : emptyState}
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
