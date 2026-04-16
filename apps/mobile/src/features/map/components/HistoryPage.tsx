import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { MapEmptyCard } from "@/features/map/components/MapFeedbackPrimitives";
import {
  formatCompactAddress,
  formatDateTime,
  formatMeetupStatus,
  formatParticipantSummary,
  formatSyncLabel,
} from "@/lib/formatting";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { MeetupPost } from "@/types/domain";



type HistoryPageProps = {
  meetups: MeetupPost[];
  lastDashboardSyncAt: Date | null;
  bottomInset: number;
  onClose: () => void;
};

type HistoryRouteKey = "completed" | "cancelled" | "other";

type HistoryRouteOption = {
  key: HistoryRouteKey;
  label: string;
  subtitle?: string;
  icon: {
    iosName: "checkmark.seal.fill" | "xmark.seal.fill" | "clock.arrow.circlepath";
    fallbackName: "verified" | "cancel" | "history";
  };
  items: MeetupPost[];
};

export function HistoryPage({
  meetups,
  lastDashboardSyncAt,
  bottomInset,
  onClose,
}: HistoryPageProps) {
  const [routeKeys, setRouteKeys] = useState<HistoryRouteKey[]>([]);

  const groupedHistory = useMemo(
    () => ({
      completed: meetups.filter((meetup) =>
        meetup.status === "confirmed" || meetup.status === "closed"
      ),
      cancelled: meetups.filter((meetup) => meetup.status === "cancelled"),
      other: meetups.filter(
        (meetup) =>
          meetup.status !== "confirmed" &&
          meetup.status !== "closed" &&
          meetup.status !== "cancelled"
      ),
    }),
    [meetups]
  );

  const routeOptions = [
    {
      key: "completed",
      label: "Concluídas",
      icon: { iosName: "checkmark.seal.fill", fallbackName: "verified" },
      items: groupedHistory.completed,
    },
    {
      key: "cancelled",
      label: "Canceladas",
      icon: { iosName: "xmark.seal.fill", fallbackName: "cancel" },
      items: groupedHistory.cancelled,
    },
    {
      key: "other",
      label: "Outros registros",
      icon: { iosName: "clock.arrow.circlepath", fallbackName: "history" },
      items: groupedHistory.other,
    },
  ] satisfies HistoryRouteOption[];

  const visibleRouteOptions = routeOptions.filter((section) => section.items.length > 0);

  const pushRoute = (key: HistoryRouteKey) => {
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
          {visibleRouteOptions.length ? (
            <AppleListSection
              title="Histórico"
              subtitle={`${meetups.length} registro(s) · ${formatSyncLabel(lastDashboardSyncAt)}`}
              size="compact"
            >
              <AppleListGroup>
                {visibleRouteOptions.map((section, index) => (
                  <AppleListRow
                    key={section.key}
                    icon={section.icon}
                    label={section.label}
                    trailingValue={String(section.items.length)}
                    onPress={() => pushRoute(section.key)}
                    separator={index > 0}
                    size="compact"
                  />
                ))}
              </AppleListGroup>
            </AppleListSection>
          ) : (
            <MapEmptyCard
              title="Nenhuma partida no histórico"
              body="Partidas encerradas ou canceladas em que você participou vão aparecer aqui."
            />
          )}

          <MapClosePageButton onPress={onClose} />
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const section = visibleRouteOptions.find((item) => item.key === routeKey);

      return {
        key: routeKey,
        content: (
          <HistoryScene
            subtitle={`${section?.items.length ?? 0} registro(s)`}
            meetups={section?.items ?? []}
            emptyTitle="Sem itens nesta categoria"
            emptyBody="Quando houver partidas desse tipo, elas aparecem aqui."
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
      scenePaddingHorizontal={sheetContentGutter}
    />
  );
}

function HistoryScene({
  subtitle,
  meetups,
  emptyTitle,
  emptyBody,
}: {
  subtitle: string;
  meetups: MeetupPost[];
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
    >
      <View style={styles.sceneLeadMinimal}>
        <Text style={styles.sceneLeadCount}>{subtitle}</Text>
      </View>
      {meetups.length ? (
        <AppleListGroup>
          {meetups.map((meetup, index) => (
            <AppleListRow
              key={meetup.id}
              icon={{
                iosName: meetup.status === "cancelled" ? "xmark.circle.fill" : "calendar",
                fallbackName: meetup.status === "cancelled" ? "cancel" : "calendar-today",
              }}
              label={meetup.title}
              subtitle={`${formatDateTime(meetup.startsAt)}\n${
                formatCompactAddress(meetup.addressLabel || meetup.locationHint) ||
                meetup.locationHint
              }\n${formatParticipantSummary(meetup.joinedPlayers, 0)}`}
              trailingValue={formatMeetupStatus(meetup.status)}
              separator={index > 0}
              showChevron={false}
              tone={meetup.status === "cancelled" ? "danger" : "default"}
              size="compact"
            />
          ))}
        </AppleListGroup>
      ) : (
        <MapEmptyCard title={emptyTitle} body={emptyBody} />
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
  },
  sceneLeadCount: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    alignSelf: "stretch",
    textAlign: "left",
  },
});
