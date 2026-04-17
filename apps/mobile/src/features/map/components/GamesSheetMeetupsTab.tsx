import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import {
  AppleListGroup,
  AppleListRow,
  APPLE_LIST_COMPACT_ICON_SIZE,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import {
  ListRowGameListIcon,
  resolveGameGroupListIconVariant,
} from "@/components/icons/ListRowGameListIcon";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { VirtualizedListBoundary } from "@/components/VirtualizedListBoundary";
import {
  MeetupSortMenuPanel,
  type MeetupSortOption,
} from "@/features/map/components/MeetupSortMenuModal";
import type { MeetupSortMode } from "@/features/map/mapHelpers";
import type { MeetupPost, MeetupStatus } from "@/types/domain";
import { palette, radius, sheetContentGutter, spacing } from "@/theme/tokens";

/** Fields required to pick Magic vs dice list icons and overdue state. */
export type GamesSheetMeetupListItem = {
  id: string;
  startsAt: string;
  status: MeetupStatus;
  formatName: string;
};

export type GamesSheetMeetupGroup<Item extends GamesSheetMeetupListItem = MeetupPost> = {
  id: string;
  label: string;
  meetups: Item[];
};

type GamesSheetMeetupsTabProps<Item extends GamesSheetMeetupListItem> = {
  onDismissPinCallout?: () => void;
  sceneWidth?: number;
  titleNote: string;
  bottomPadding: number;
  nowTimestamp: number;
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
  renderMeetupDetail: (
    item: Item,
    openManage: () => void,
    openParticipants: () => void
  ) => ReactElement;
  renderMeetupManage: (item: Item, openManageParticipants: () => void) => ReactElement;
  renderMeetupParticipants: (item: Item) => ReactElement;
  emptyState: ReactElement | null;
  /** Open manage route from outside the sheet (e.g. chat “Editar”). */
  externalManageRequest?: { groupId: string; meetupId: string } | null;
  onConsumedExternalManageRequest?: () => void;
  /** Resolve meetup when it may not appear in the current group list (filters). */
  resolveMeetupById?: (meetupId: string) => Item | null;
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
    }
  | {
      key: string;
      type: "participants";
      groupId: string;
      meetupId: string;
    };

export function GamesSheetMeetupsTab<Item extends GamesSheetMeetupListItem>({
  onDismissPinCallout,
  sceneWidth,
  titleNote,
  bottomPadding,
  nowTimestamp,
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
  renderMeetupParticipants,
  emptyState,
  externalManageRequest = null,
  onConsumedExternalManageRequest = () => {},
  resolveMeetupById,
}: GamesSheetMeetupsTabProps<Item>) {
  const [routeStack, setRouteStack] = useState<MeetupRoute[]>([]);
  const onOpenManageMeetupRef = useRef(onOpenManageMeetup);
  onOpenManageMeetupRef.current = onOpenManageMeetup;
  const currentSortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ?? "Mais perto";

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.meetups.length > 0),
    [groups]
  );

  const resolveMeetupForRoute = useCallback(
    (groupId: string, meetupId: string) => {
      const group = visibleGroups.find((item) => item.id === groupId);
      const fromGroup = group?.meetups.find((item) => item.id === meetupId) ?? null;
      return fromGroup ?? resolveMeetupById?.(meetupId) ?? null;
    },
    [visibleGroups, resolveMeetupById]
  );

  useEffect(() => {
    if (!externalManageRequest) {
      return;
    }

    const meetup = resolveMeetupForRoute(
      externalManageRequest.groupId,
      externalManageRequest.meetupId
    );

    if (!meetup) {
      onConsumedExternalManageRequest?.();
      return;
    }

    onOpenManageMeetupRef.current(meetup);
    setRouteStack([
      {
        key: `manage:${externalManageRequest.groupId}:${externalManageRequest.meetupId}`,
        type: "manage",
        groupId: externalManageRequest.groupId,
        meetupId: externalManageRequest.meetupId,
      },
    ]);
    onConsumedExternalManageRequest?.();
  }, [externalManageRequest, onConsumedExternalManageRequest, resolveMeetupForRoute]);

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
    const meetup = resolveMeetupForRoute(groupId, meetupId);

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

  const pushParticipantsRoute = (groupId: string, meetupId: string) => {
    const meetup = resolveMeetupForRoute(groupId, meetupId);

    if (!meetup) {
      return;
    }

    setRouteStack((current) => {
      const nextRoute = {
        key: `participants:${groupId}:${meetupId}`,
        type: "participants" as const,
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
        const meetup = resolveMeetupForRoute(activeRoute.groupId, activeRoute.meetupId);

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

  useEffect(() => {
    if (managedMeetupId) {
      return;
    }

    setRouteStack((current) => current.filter((route) => route.type !== "manage"));
  }, [managedMeetupId]);

  const routes = [
    {
      key: "root",
      content: (
        <ScrollView
          onTouchStart={onDismissPinCallout}
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
                    pressed ? styles.inlinePressed : null,
                  ]}
                >
                  <AppleGlassSurface
                    pointerEvents="none"
                    variant="dark"
                    intensity="clear"
                    style={styles.sortButtonSurface}
                  />
                  <View style={styles.sortIconBubble}>
                    <AppIcon
                      iosName="arrow.up.arrow.down"
                      fallbackName="swap-vert"
                      size={12}
                      color={palette.ink}
                    />
                  </View>
                  <Text
                    style={[
                      styles.sortButtonLabel,
                      sortMenuOpen ? styles.sortButtonLabelActive : null,
                    ]}
                  >
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
              {visibleGroups.map((group, index) => {
                const iconVariant = resolveGameGroupListIconVariant(group, nowTimestamp);

                return (
                  <AppleListRow
                    key={group.id}
                    leading={
                      <ListRowGameListIcon
                        variant={iconVariant}
                        size={APPLE_LIST_COMPACT_ICON_SIZE}
                        accessibilityLabel={
                          iconVariant === "magic-overdue" || iconVariant === "dice-overdue"
                            ? `${group.label}, jogos em atraso`
                            : group.label
                        }
                      />
                    }
                    label={group.label}
                    subtitle={`${group.meetups.length} visíve${group.meetups.length === 1 ? "l" : "is"}`}
                    trailingValue={String(group.meetups.length)}
                    onPress={() => pushGroupRoute(group.id)}
                    separator={index > 0}
                    tone="accent"
                    size="compact"
                  />
                );
              })}
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
              onTouchStart={onDismissPinCallout}
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

      const meetup = resolveMeetupForRoute(route.groupId, route.meetupId);

      if (route.type === "manage") {
        return {
          key: route.key,
          content: (
            <ScrollView
              onTouchStart={onDismissPinCallout}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
            >
              {meetup ? (
                renderMeetupManage(meetup, () =>
                  pushParticipantsRoute(route.groupId, route.meetupId)
                )
              ) : (
                emptyState
              )}
            </ScrollView>
          ),
        };
      }

      if (route.type === "participants") {
        return {
          key: route.key,
          content: (
            <ScrollView
              onTouchStart={onDismissPinCallout}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
            >
              {meetup ? renderMeetupParticipants(meetup) : emptyState}
            </ScrollView>
          ),
        };
      }

      return {
        key: route.key,
        content: (
          <ScrollView
            onTouchStart={onDismissPinCallout}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sceneContent, { paddingBottom: bottomPadding }]}
          >
            {meetup ? (
              renderMeetupDetail(
                meetup,
                () => pushManageRoute(route.groupId, route.meetupId),
                () => pushParticipantsRoute(route.groupId, route.meetupId)
              )
            ) : (
              emptyState
            )}
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
  sortButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  sortIconBubble: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
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
