import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppleListGroup,
  AppleListRow,
} from "@/components/AppleListNavigation";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { ChatMeetupListLeading } from "@/features/map/components/ChatMeetupListLeading";
import { MapEmptyCard } from "@/features/map/components/MapFeedbackPrimitives";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import { useTranslation } from "@/i18n";
import { formatDateTime, formatMeetupStatus } from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, sheetContentGutter, spacing } from "@/theme/tokens";
import type { MeetupPost } from "@/types/domain";

export type DrawerChatGameGroup = {
  id: string;
  label: string;
  chats: MeetupPost[];
};

type DrawerChatStackGroup = DrawerChatGameGroup & {
  archived?: boolean;
};

type DrawerChatsPanelProps = {
  groups: DrawerChatGameGroup[];
  archivedChats: MeetupPost[];
  expandedGroupIds: Record<string, boolean>;
  unreadChatMeetupIds: Set<string>;
  nowTimestamp: number;
  onBack: () => void;
  onToggleGroup: (groupId: string) => void;
  onOpenChat: (meetupId: string) => void;
};

export function DrawerChatsPanel({
  groups,
  archivedChats,
  expandedGroupIds: _expandedGroupIds,
  unreadChatMeetupIds,
  nowTimestamp,
  onBack,
  onToggleGroup: _onToggleGroup,
  onOpenChat,
}: DrawerChatsPanelProps) {
  const { t } = useTranslation();
  const [routeKeys, setRouteKeys] = useState<string[]>([]);

  const rootGroups = useMemo<DrawerChatStackGroup[]>(
    () => [
      ...groups.filter((group) => group.chats.length > 0),
      ...(archivedChats.length
        ? [
            ({
              id: "archived",
              label: t("chat.archived"),
              chats: archivedChats,
              archived: true,
            } satisfies DrawerChatStackGroup),
          ]
        : []),
    ],
    [archivedChats, groups, t]
  );

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
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}
        >
          {rootGroups.length ? (
            <AppleListGroup>
              {rootGroups.map((game, index) => (
                <AppleListRow
                  key={game.id}
                  icon={{
                    iosName: game.archived ? "archivebox.fill" : "bubble.left.and.bubble.right.fill",
                    fallbackName: game.archived ? "inventory-2" : "forum",
                  }}
                  label={game.label}
                  subtitle={t("chat.groupCount", { count: game.chats.length })}
                  trailingValue={String(game.chats.length)}
                  onPress={() => pushRoute(game.id)}
                  separator={index > 0}
                  tone="default"
                  size="compact"
                />
              ))}
            </AppleListGroup>
          ) : (
            <MapEmptyCard
              title={t("chat.emptyDrawerTitle")}
              body={t("chat.emptyDrawerBody")}
            />
          )}
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const group = rootGroups.find((item) => item.id === routeKey);

      return {
        key: routeKey,
        title: group?.label ?? t("nav.chats"),
        subtitle: group ? t("chat.groupCount", { count: group.chats.length }) : undefined,
        content: (
          <DrawerChatListScene
            meetups={group?.chats ?? []}
            archived={Boolean(group?.archived)}
            unreadChatMeetupIds={unreadChatMeetupIds}
            nowTimestamp={nowTimestamp}
            onOpenChat={onOpenChat}
          />
        ),
      };
    }),
  ];

  return (
    <>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("chat.backToMenu")}
          onPress={() => {
            triggerHaptic("selection");
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.backButtonSurface}
          />
          <AppIcon
            iosName="chevron.left"
            fallbackName="arrow-back"
            size={18}
            color={palette.sand}
          />
          <Text style={styles.backButtonLabel}>{t("common.menu")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("nav.chats")}</Text>
      </View>

      <SlidingSheetStack
        routes={routes}
        onPop={popRoute}
        headerVariant="compact"
        scenePaddingHorizontal={sheetContentGutter}
        padSceneWithSafeArea={false}
      />
    </>
  );
}

function DrawerChatListScene({
  meetups,
  archived,
  unreadChatMeetupIds,
  nowTimestamp,
  onOpenChat,
}: {
  meetups: MeetupPost[];
  archived: boolean;
  unreadChatMeetupIds: Set<string>;
  nowTimestamp: number;
  onOpenChat: (meetupId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
      {meetups.length ? (
        <AppleListGroup>
          {meetups.map((meetup, index) => {
            const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
            const overdue = !archived && isMeetupOverdue(meetup, nowTimestamp);

            const statusLine =
              effectiveStatus === "closed" || effectiveStatus === "cancelled"
                ? formatMeetupStatus(effectiveStatus)
                : null;
            const overdueLine = overdue ? t("chat.overdue") : null;

            return (
              <AppleListRow
                key={meetup.id}
                leading={<ChatMeetupListLeading meetup={meetup} />}
                label={meetup.title}
                subtitle={[formatDateTime(meetup.startsAt), statusLine, overdueLine]
                  .filter(Boolean)
                  .join("\n")}
                trailingValue={unreadChatMeetupIds.has(meetup.id) ? t("chat.new") : null}
                onPress={() => onOpenChat(meetup.id)}
                separator={index > 0}
                tone={
                  unreadChatMeetupIds.has(meetup.id)
                    ? "accent"
                    : overdue
                      ? "danger"
                      : "default"
                }
                size="compact"
              />
            );
          })}
        </AppleListGroup>
      ) : (
        <MapEmptyCard title={t("chat.sectionEmptyTitle")} body={t("chat.sectionEmptyBody")} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  backButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  backButtonLabel: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: palette.sand,
    fontSize: 24,
    fontWeight: "800",
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    paddingRight: spacing.sm,
    gap: 12,
  },
  sceneContent: {
    paddingTop: 8,
    paddingBottom: spacing.xxl,
    paddingRight: spacing.sm,
    gap: 12,
  },
  pressed: {
    opacity: 0.82,
  },
});
