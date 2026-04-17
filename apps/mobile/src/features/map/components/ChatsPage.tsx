import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { MapEmptyCard } from "@/features/map/components/MapFeedbackPrimitives";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import { formatCompactAddress, formatDateTime, formatMeetupStatus } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
import type { MeetupPost } from "@/types/domain";



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
  unreadChatMeetupIds: Set<string>;
  selectedChatMeetupId: string | null;
  nowTimestamp: number;
  bottomInset: number;
  onOpenChat: (meetupId: string) => void;
  onClose: () => void;
};

export function ChatsPage({
  sections,
  unreadChatMeetupIds,
  selectedChatMeetupId,
  nowTimestamp,
  bottomInset,
  onOpenChat,
  onClose,
}: ChatsPageProps) {
  const [routeKeys, setRouteKeys] = useState<string[]>([]);

  const availableSections = useMemo(
    () => sections.filter((section) => section.chats.length > 0),
    [sections]
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
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: bottomInset + spacing.xxl,
            },
          ]}
        >
          {availableSections.length ? (
            <AppleListSection size="compact">
              <AppleListGroup>
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
                    onPress={() => pushRoute(section.id)}
                    separator={index > 0}
                    tone={section.archived ? "default" : "accent"}
                    size="compact"
                  />
                ))}
              </AppleListGroup>
            </AppleListSection>
          ) : (
            <MapEmptyCard
              title="Nenhum chat ainda"
              body="Entre em uma partida para ela aparecer aqui, organizada por tipo de jogo."
            />
          )}

          <MapClosePageButton onPress={onClose} />
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const section = sections.find((item) => item.id === routeKey);

      return {
        key: routeKey,
        content: (
          <ChatsSectionScene
            title={section?.title ?? "Chats"}
            subtitle={section?.meta}
            meetups={section?.chats ?? []}
            sectionArchived={Boolean(section?.archived)}
            unreadChatMeetupIds={unreadChatMeetupIds}
            selectedChatMeetupId={selectedChatMeetupId}
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

function ChatsSectionScene({
  title,
  subtitle,
  meetups,
  sectionArchived,
  unreadChatMeetupIds,
  selectedChatMeetupId,
  nowTimestamp,
  onOpenChat,
}: {
  title: string;
  subtitle?: string;
  meetups: MeetupPost[];
  sectionArchived: boolean;
  unreadChatMeetupIds: Set<string>;
  selectedChatMeetupId: string | null;
  nowTimestamp: number;
  onOpenChat: (meetupId: string) => void;
}) {
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
            const isLastOpened = selectedChatMeetupId === meetup.id;
            const highlightOpen = !sectionArchived && isLastOpened;

            return (
              <AppleListRow
                key={meetup.id}
                icon={{
                  iosName: overdue ? "clock.badge.exclamationmark.fill" : "message.fill",
                  fallbackName: overdue ? "schedule" : "chat",
                }}
                label={meetup.title}
                subtitle={`${formatDateTime(meetup.startsAt)}\n${
                  formatCompactAddress(meetup.addressLabel || meetup.locationHint) ||
                  meetup.locationHint
                }\n${formatMeetupStatus(effectiveStatus)}`}
                trailingValue={
                  hasUnread ? "Novo" : highlightOpen ? "Aberto" : null
                }
                onPress={() => onOpenChat(meetup.id)}
                separator={index > 0}
                tone={
                  hasUnread || highlightOpen
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
        <MapEmptyCard
          title="Nenhum grupo nessa categoria"
          body="Assim que você entrar em uma partida desse tipo, ela aparece aqui."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
