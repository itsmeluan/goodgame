import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import {
  AppleListGroup,
  AppleListRow,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { VirtualizedListBoundary } from "@/components/VirtualizedListBoundary";
import {
  MeetupSortMenuPanel,
  type MeetupSortOption,
} from "@/features/map/components/MeetupSortMenuModal";
import type { MeetupSortMode } from "@/features/map/mapHelpers";
import { palette, radius, sheetContentGutter, spacing } from "@/theme/tokens";

export type GamesSheetMeetupGroup<Item extends { id: string }> = {
  id: string;
  label: string;
  meetups: Item[];
};

type GamesSheetMeetupsTabProps<Item extends { id: string }> = {
  sceneWidth?: number;
  titleNote: string;
  bottomPadding: number;
  groups: GamesSheetMeetupGroup<Item>[];
  managedMeetupId: string | null;
  expandedGroupIds: Record<string, boolean>;
  sortMenuOpen: boolean;
  sortMode: MeetupSortMode;
  sortOptions: MeetupSortOption[];
  hidePastLabel: string;
  onToggleSortMenu: () => void;
  onSelectSort: (value: MeetupSortMode) => void;
  onToggleHidePast: () => void;
  onToggleGroup: (groupId: string) => void;
  onOpenManageMeetup: (item: Item) => void;
  onCloseManageMeetup: (item: Item) => void;
  renderMeetupListItem: (
    item: Item,
    openDetail: () => void,
    separator: boolean
  ) => ReactElement;
  renderMeetupDetail: (item: Item, openManage: () => void) => ReactElement;
  renderMeetupManage: (item: Item) => ReactElement;
  emptyState: ReactElement | null;
};

type MeetupRoute =
  | {
      key: string;
      type: "group";
      groupId: string;
    }
  | {
      key: string;
      type: "detail";
      groupId: string;
      meetupId: string;
    }
  | {
      key: string;
      type: "manage";
      groupId: string;
      meetupId: string;
    };

export function GamesSheetMeetupsTab<Item extends { id: string }>({
  sceneWidth,
  titleNote,
  bottomPadding,
  groups,
  managedMeetupId,
  expandedGroupIds: _expandedGroupIds,
  sortMenuOpen,
  sortMode,
  sortOptions,
  hidePastLabel,
  onToggleSortMenu,
  onSelectSort,
  onToggleHidePast,
  onToggleGroup: _onToggleGroup,
  onOpenManageMeetup,
  onCloseManageMeetup,
  renderMeetupListItem,
  renderMeetupDetail,
  renderMeetupManage,
  emptyState,
}: GamesSheetMeetupsTabProps<Item>) {
  const [routeStack, setRouteStack] = useState<MeetupRoute[]>([]);
  const currentSortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ?? "Mais perto";

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.meetups.length > 0),
    [groups]
  );

  const pushGroupRoute = (groupId: string) => {
    setRouteStack((current) => {
      const nextRoute = {
        key: `group:${groupId}`,
        type: "group" as const,
        groupId,
      };

      return current[current.length - 1]?.key === nextRoute.key ? current : [...current, nextRoute];
    });
  };

  const pushMeetupRoute = (groupId: string, meetupId: string) => {
    setRouteStack((current) => {
      const nextRoute = {
        key: `detail:${groupId}:${meetupId}`,
        type: "detail" as const,
        groupId,
        meetupId,
      };

      return current[current.length - 1]?.key === nextRoute.key ? current : [...current, nextRoute];
    });
  };

  const pushManageRoute = (groupId: string, meetupId: string) => {
    const group = visibleGroups.find((item) => item.id === groupId);
    const meetup = group?.meetups.find((item) => item.id === meetupId) ?? null;

    if (!meetup) {
      return;
    }

    onOpenManageMeetup(meetup);
    setRouteStack((current) => {
      const nextRoute = {
        key: `manage:${groupId}:${meetupId}`,
        type: "manage" as const,
        groupId,
        meetupId,
      };

      return current[current.length - 1]?.key === nextRoute.key ? current : [...current, nextRoute];
    });
  };

  const popRoute = () => {
    setRouteStack((current) => {
      const activeRoute = current[current.length - 1];

      if (activeRoute?.type === "manage") {
        const group = visibleGroups.find((item) => item.id === activeRoute.groupId);
        const meetup = group?.meetups.find((item) => item.id === activeRoute.meetupId) ?? null;

        if (meetup) {
          onCloseManageMeetup(meetup);
        }
      }

      return current.slice(0, -1);
    });
  };

  useEffect(() => {
    const activeRoute = routeStack[routeStack.length - 1];

    if (!activeRoute || activeRoute.type !== "manage") {
      return;
    }

    if (managedMeetupId === activeRoute.meetupId) {
      return;
    }

    setRouteStack((current) => {
      const currentTop = current[current.length - 1];

      if (!currentTop || currentTop.type !== "manage") {
        return current;
      }

      return current.slice(0, -1);
    });
  }, [managedMeetupId, routeStack]);

  const routes = [
    {
      key: "root",
      content: (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          <View style={styles.topMetaRow}>
            {titleNote ? <Text style={styles.contextNote}>{titleNote}</Text> : <View />}
            <View style={styles.sortAnchor}>
              <View style={styles.sortRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ordenar jogos"
                  onPress={onToggleSortMenu}
                  style={({ pressed }) => [
                    styles.sortButton,
                    sortMenuOpen ? styles.sortButtonActive : null,
                    pressed ? styles.inlinePressed : null,
                  ]}
                >
                  {!sortMenuOpen ? (
                    <AppleGlassSurface
                      pointerEvents="none"
                      variant="dark"
                      intensity="clear"
                      style={styles.sortButtonSurface}
                    />
                  ) : null}
                  <AppIcon
                    iosName="arrow.up.arrow.down.circle"
                    fallbackName="swap-vert"
                    size={16}
                    color={sortMenuOpen ? palette.ink : palette.ember}
                  />
                  <Text style={[styles.sortButtonLabel, sortMenuOpen ? styles.sortButtonLabelActive : null]}>
                    {currentSortLabel}
                  </Text>
                  <AppIcon
                    iosName={sortMenuOpen ? "chevron.up" : "chevron.down"}
                    fallbackName={sortMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={14}
                    color={sortMenuOpen ? palette.ink : palette.pine}
                  />
                </Pressable>
              </View>
              <MeetupSortMenuPanel
                visible={sortMenuOpen}
                value={sortMode}
                options={sortOptions}
                onSelect={onSelectSort}
              />
            </View>
          </View>
          {visibleGroups.length ? (
            <AppleListGroup>
              {visibleGroups.map((group, index) => (
                <AppleListRow
                  key={group.id}
                  icon={{ iosName: "dice.fill", fallbackName: "casino" }}
                  label={group.label}
                  subtitle={`${group.meetups.length} visíve${group.meetups.length === 1 ? "l" : "is"}`}
                  trailingValue={String(group.meetups.length)}
                  onPress={() => pushGroupRoute(group.id)}
                  separator={index > 0}
                  tone="accent"
                  size="compact"
                />
              ))}
            </AppleListGroup>
          ) : (
            emptyState
          )}

          <View style={styles.toggleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hidePastLabel}
              onPress={onToggleHidePast}
              style={({ pressed }) => [styles.toggleButton, pressed ? styles.inlinePressed : null]}
            >
              <Text style={styles.toggleLabel}>{hidePastLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ),
    },
    ...routeStack.map((route) => {
      const group = visibleGroups.find((item) => item.id === route.groupId);
      const groupCount = group?.meetups.length ?? 0;
      const groupSubtitle = `${groupCount} visíve${groupCount === 1 ? "l" : "is"}`;

      if (route.type === "group") {
        return {
          key: route.key,
          content: (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.sceneContent,
                styles.sceneContentCompactLead,
                { paddingBottom: bottomPadding },
              ]}
            >
              <View style={styles.sceneLeadMinimal}>
                <Text style={styles.sceneLeadCount}>{groupSubtitle}</Text>
              </View>
              {group?.meetups.length ? (
                <AppleListGroup>
                  {group.meetups.map((item, index) =>
                    renderMeetupListItem(
                      item,
                      () => pushMeetupRoute(route.groupId, item.id),
                      index > 0
                    )
                  )}
                </AppleListGroup>
              ) : (
                emptyState
              )}
            </ScrollView>
          ),
        };
      }

      const meetup = group?.meetups.find((item) => item.id === route.meetupId) ?? null;

      if (route.type === "manage") {
        return {
          key: route.key,
          content: (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
            >
              {meetup ? renderMeetupManage(meetup) : emptyState}
            </ScrollView>
          ),
        };
      }

      return {
        key: route.key,
        content: (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
          >
            {meetup ? renderMeetupDetail(meetup, () => pushManageRoute(route.groupId, route.meetupId)) : emptyState}
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
  sceneContentCompactLead: {
    gap: spacing.md,
  },
  sceneLeadMinimal: {
    alignSelf: "stretch",
    width: "100%",
  },
  sceneLeadCount: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    alignSelf: "stretch",
    textAlign: "left",
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    zIndex: 4,
  },
  contextNote: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  sortAnchor: {
    position: "relative",
    alignItems: "flex-end",
    flexShrink: 0,
    zIndex: 5,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 2,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  sortButton: {
    minHeight: 32,
    maxWidth: 196,
    borderRadius: radius.pill,
    paddingLeft: 11,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  sortButtonActive: {
    backgroundColor: palette.ember,
    borderColor: "rgba(241,143,92,0.24)",
  },
  sortButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  sortButtonLabel: {
    flexShrink: 1,
    color: palette.sand,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  sortButtonLabelActive: {
    color: palette.ink,
  },
  toggleButton: {
    alignSelf: "flex-end",
  },
  toggleLabel: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  inlinePressed: {
    opacity: 0.84,
  },
});
