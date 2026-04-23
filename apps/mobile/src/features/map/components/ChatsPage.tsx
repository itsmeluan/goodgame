import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { Avatar } from "@/components/Avatar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { ChatMeetupListLeading } from "@/features/map/components/ChatMeetupListLeading";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { MapEmptyCard } from "@/features/map/components/MapFeedbackPrimitives";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import { useTranslation } from "@/i18n";
import { formatCompactAddress, formatDateTime, formatMeetupStatus, formatRelativeTimestamp } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
import type { MeetupPost, PrivateChatSummary } from "@/types/domain";

const PRIVATE_CHATS_ROUTE_KEY = "__private_chats__";



export type ChatListSection = {
  id: string;
  title: string;
  meta: string;
  chats: MeetupPost[];
  expanded: boolean;
  archived?: boolean;
};

type ChatsPageProps = {
  sections: ChatListSection[];
  privateChats: PrivateChatSummary[];
  loadingPrivateChats: boolean;
  unreadChatMeetupIds: Set<string>;
  unreadPrivateChatIds: Set<string>;
  nowTimestamp: number;
  bottomInset: number;
  /** When provided with `onRouteStackChange`, nested stack is controlled (persists under chat room overlay). */
  routeStackKeys?: string[];
  onRouteStackChange?: (keys: string[]) => void;
  onOpenChat: (meetupId: string) => void;
  onOpenPrivateChat: (thread: PrivateChatSummary) => void;
  onClose: () => void;
};

export function ChatsPage({
  sections,
  privateChats,
  loadingPrivateChats,
  unreadChatMeetupIds,
  unreadPrivateChatIds,
  nowTimestamp,
  bottomInset,
  routeStackKeys: controlledRouteKeys,
  onRouteStackChange,
  onOpenChat,
  onOpenPrivateChat,
  onClose,
}: ChatsPageProps) {
  const { t } = useTranslation();
  const [internalRouteKeys, setInternalRouteKeys] = useState<string[]>([]);
  const isControlled = onRouteStackChange != null;
  const routeKeys = isControlled ? (controlledRouteKeys ?? []) : internalRouteKeys;

  const availableSections = useMemo(
    () => sections.filter((section) => section.chats.length > 0),
    [sections]
  );

  const privateGroupingHasUnread = useMemo(
    () => privateChats.some((thread) => unreadPrivateChatIds.has(thread.chatId)),
    [privateChats, unreadPrivateChatIds]
  );

  const pushRoute = (key: string) => {
    if (isControlled) {
      const current = routeKeys;
      const next = current[current.length - 1] === key ? current : [...current, key];
      onRouteStackChange?.(next);
    } else {
      setInternalRouteKeys((current) =>
        current[current.length - 1] === key ? current : [...current, key]
      );
    }
  };

  const popRoute = () => {
    if (isControlled) {
      onRouteStackChange?.(routeKeys.slice(0, -1));
    } else {
      setInternalRouteKeys((current) => current.slice(0, -1));
    }
  };

  const routes = [
    {
      key: "root",
      content: (
        <View style={styles.rootWithFooter}>
          <ScrollView
            style={styles.rootScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.rootScrollContent]}
          >
            <AppleListSection size="compact">
              <AppleListGroup>
                <AppleListRow
                  icon={{
                    iosName: "person.fill",
                    fallbackName: "person",
                  }}
                  label={t("chat.privateChats")}
                  subtitle={t("chat.directSubtitle")}
                  trailingValue={String(privateChats.length)}
                  showUnreadDot={privateGroupingHasUnread}
                  onPress={() => pushRoute(PRIVATE_CHATS_ROUTE_KEY)}
                  separator={false}
                  tone="default"
                  size="compact"
                />
                {availableSections.map((section, index) => (
                  <AppleListRow
                    key={section.id}
                    icon={{
                      iosName: section.archived
                        ? "archivebox.fill"
                        : "bubble.left.and.bubble.right.fill",
                      fallbackName: section.archived ? "inventory-2" : "forum",
                    }}
                    label={section.title}
                    subtitle={section.meta}
                    trailingValue={String(section.chats.length)}
                    showUnreadDot={section.chats.some((meetup) =>
                      unreadChatMeetupIds.has(meetup.id)
                    )}
                    onPress={() => pushRoute(section.id)}
                    separator
                    tone="default"
                    size="compact"
                  />
                ))}
              </AppleListGroup>
            </AppleListSection>
            {!availableSections.length ? (
              <MapEmptyCard
                title={t("chat.emptyMeetupTitle")}
                body={t("chat.emptyMeetupBody")}
              />
            ) : null}
          </ScrollView>
          <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
        </View>
      ),
    },
    ...routeKeys.map((routeKey) => {
      if (routeKey === PRIVATE_CHATS_ROUTE_KEY) {
        return {
          key: routeKey,
          content: (
            <PrivateChatsListScene
              threads={privateChats}
              loading={loadingPrivateChats}
              unreadPrivateChatIds={unreadPrivateChatIds}
              onOpenPrivateChat={onOpenPrivateChat}
            />
          ),
        };
      }

      const section = sections.find((item) => item.id === routeKey);

      return {
        key: routeKey,
        content: (
          <ChatsSectionScene
            title={section?.title ?? t("nav.chats")}
            subtitle={section?.meta}
            meetups={section?.chats ?? []}
            sectionArchived={Boolean(section?.archived)}
            unreadChatMeetupIds={unreadChatMeetupIds}
            nowTimestamp={nowTimestamp}
            onOpenChat={onOpenChat}
          />
        ),
      };
    }),
  ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={popRoute}
      headerVariant="compact"
      scenePaddingHorizontal={spacing.lg}
    />
  );
}

function PrivateChatsListScene({
  threads,
  loading,
  unreadPrivateChatIds,
  onOpenPrivateChat,
}: {
  threads: PrivateChatSummary[];
  loading: boolean;
  unreadPrivateChatIds: Set<string>;
  onOpenPrivateChat: (thread: PrivateChatSummary) => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
    >
      <View style={styles.sceneLeadMinimal}>
        <Text style={styles.sceneLeadTitle}>{t("chat.privateChats")}</Text>
        <Text style={styles.sceneLeadSubtitle}>{t("chat.directSubtitle")}</Text>
      </View>
      {loading ? (
        <View style={styles.privateLoading}>
          <LoadingSpinner size={22} />
        </View>
      ) : threads.length ? (
        <AppleListGroup>
          {threads.map((thread, index) => {
            const hasUnread = unreadPrivateChatIds.has(thread.chatId);
            const preview = thread.lastMessageBody?.trim() || t("chat.noMessagesYet");
            const timeLine = thread.lastMessageAt
              ? formatRelativeTimestamp(thread.lastMessageAt)
              : "—";

            return (
              <AppleListRow
                key={thread.chatId}
                leading={
                  <Avatar
                    name={thread.otherDisplayName}
                    uri={thread.otherAvatarUrl}
                    size={40}
                    isPro={Boolean(thread.otherIsPro)}
                  />
                }
                label={thread.otherDisplayName}
                subtitle={[preview, timeLine].join("\n")}
                trailingValue={hasUnread ? t("chat.new") : null}
                onPress={() => onOpenPrivateChat(thread)}
                separator={index > 0}
                tone={hasUnread ? "accent" : "default"}
                size="compact"
              />
            );
          })}
        </AppleListGroup>
      ) : (
        <MapEmptyCard
          title={t("chat.emptyPrivateTitle")}
          body={t("chat.emptyPrivateBody")}
        />
      )}
    </ScrollView>
  );
}

function ChatsSectionScene({
  title,
  subtitle,
  meetups,
  sectionArchived,
  unreadChatMeetupIds,
  nowTimestamp,
  onOpenChat,
}: {
  title: string;
  subtitle?: string;
  meetups: MeetupPost[];
  sectionArchived: boolean;
  unreadChatMeetupIds: Set<string>;
  nowTimestamp: number;
  onOpenChat: (meetupId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
    >
      <View style={styles.sceneLeadMinimal}>
        <Text style={styles.sceneLeadTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sceneLeadSubtitle}>{subtitle}</Text> : null}
      </View>
      {meetups.length ? (
        <AppleListGroup>
          {meetups.map((meetup, index) => {
            const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
            const overdue = !sectionArchived && isMeetupOverdue(meetup, nowTimestamp);

            const hasUnread = unreadChatMeetupIds.has(meetup.id);
            const statusLine =
              effectiveStatus === "closed" || effectiveStatus === "cancelled"
                ? formatMeetupStatus(effectiveStatus)
                : null;
            const addressLine =
              formatCompactAddress(meetup.addressLabel || meetup.locationHint) ||
              meetup.locationHint;
            const overdueLine = overdue ? t("chat.overdue") : null;

            return (
              <AppleListRow
                key={meetup.id}
                leading={<ChatMeetupListLeading meetup={meetup} />}
                label={meetup.title}
                subtitle={[formatDateTime(meetup.startsAt), addressLine, statusLine, overdueLine]
                  .filter(Boolean)
                  .join("\n")}
                trailingValue={hasUnread ? t("chat.new") : null}
                onPress={() => onOpenChat(meetup.id)}
                separator={index > 0}
                tone={
                  hasUnread ? "accent" : overdue ? "danger" : "default"
                }
                size="compact"
              />
            );
          })}
        </AppleListGroup>
      ) : (
        <MapEmptyCard
          title={t("chat.emptyCategoryTitle")}
          body={t("chat.emptyCategoryBody")}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rootWithFooter: {
    flex: 1,
  },
  rootScroll: {
    flex: 1,
  },
  rootScrollContent: {
    paddingBottom: spacing.lg,
  },
  content: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  sceneContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sceneContentCompactLead: {
    gap: spacing.md,
  },
  sceneLeadMinimal: {
    alignSelf: "stretch",
    width: "100%",
    gap: 4,
  },
  sceneLeadTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    alignSelf: "stretch",
    textAlign: "left",
  },
  sceneLeadSubtitle: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    alignSelf: "stretch",
    textAlign: "left",
  },
  privateLoading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
