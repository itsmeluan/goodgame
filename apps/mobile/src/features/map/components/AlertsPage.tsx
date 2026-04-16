import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { formatNotificationKind, formatRelativeTimestamp } from "@/lib/formatting";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { InAppNotification } from "@/types/domain";



type AlertsPageProps = {
  notifications: InAppNotification[];
  markingNotificationsRead: boolean;
  notificationError: string | null;
  bottomInset: number;
  onMarkAll: () => void;
  onOpenNotification: (notification: InAppNotification) => void;
  onClose: () => void;
};

type AlertsRouteKey = "unread" | "all";

export function AlertsPage({
  notifications,
  markingNotificationsRead,
  notificationError,
  bottomInset,
  onMarkAll,
  onOpenNotification,
  onClose,
}: AlertsPageProps) {
  const [routeKeys, setRouteKeys] = useState<AlertsRouteKey[]>([]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => notification.readAt === null),
    [notifications]
  );

  const pushRoute = (key: AlertsRouteKey) => {
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: bottomInset + spacing.xxl,
            },
          ]}
        >
          <AppleListSection
            size="compact"
          >
            <AppleListGroup>
              <AppleListRow
                icon={{
                  iosName: "bell.badge.fill",
                  fallbackName: "notifications-active",
                }}
                label="Não lidos"
                trailingValue={String(unreadNotifications.length)}
                onPress={() => pushRoute("unread")}
                tone={unreadNotifications.length ? "accent" : "default"}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{
                  iosName: "tray.full.fill",
                  fallbackName: "inbox",
                }}
                label="Todos os avisos"
                trailingValue={String(notifications.length)}
                onPress={() => pushRoute("all")}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          {notificationError ? <MapInlineNotice tone="error" message={notificationError} /> : null}

          <MapClosePageButton onPress={onClose} />
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const routeNotifications =
        routeKey === "unread" ? unreadNotifications : notifications;

      return {
        key: routeKey,
        content: (
          <NotificationScene
            subtitle={`${routeNotifications.length} item(ns)`}
            notifications={routeNotifications}
            emptyTitle={
              routeKey === "unread" ? "Nenhum aviso pendente" : "Sem avisos ainda"
            }
            emptyBody={
              routeKey === "unread"
                ? "Quando algo novo acontecer, ele aparece aqui."
                : "Mensagens de grupo, lembretes e eventos do GG aparecem aqui."
            }
            onOpenNotification={onOpenNotification}
            markAll={
              routeKey === "unread"
                ? {
                    onPress: onMarkAll,
                    loading: markingNotificationsRead,
                    disabled: unreadNotifications.length === 0,
                  }
                : undefined
            }
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

function NotificationScene({
  subtitle,
  notifications,
  emptyTitle,
  emptyBody,
  onOpenNotification,
  markAll,
}: {
  subtitle: string;
  notifications: InAppNotification[];
  emptyTitle: string;
  emptyBody: string;
  onOpenNotification: (notification: InAppNotification) => void;
  markAll?: {
    onPress: () => void;
    loading: boolean;
    disabled: boolean;
  };
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.sceneContent, styles.sceneContentCompactLead]}
    >
      <View style={styles.sceneLeadMinimal}>
        <Text style={styles.sceneLeadCount}>{subtitle}</Text>
        {markAll ? (
          <View style={styles.markAllRow}>
            <PrimaryButton
              label="Marcar todos como lidos"
              onPress={markAll.onPress}
              tone="ghost"
              loading={markAll.loading}
              disabled={markAll.disabled}
              size="compact"
              fullWidth
            />
          </View>
        ) : null}
      </View>
      {notifications.length ? (
        <AppleListGroup>
          {notifications.map((notification, index) => (
            <AppleListRow
              key={notification.id}
              icon={{
                iosName:
                  notification.readAt === null ? "bell.badge.fill" : "bell.fill",
                fallbackName:
                  notification.readAt === null ? "notifications-active" : "notifications",
              }}
              label={notification.title}
              subtitle={`${formatNotificationKind(notification.kind)} · ${formatRelativeTimestamp(
                notification.createdAt
              )}\n${notification.body}`}
              onPress={() => onOpenNotification(notification)}
              separator={index > 0}
              tone={notification.readAt === null ? "accent" : "default"}
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
    gap: spacing.sm,
  },
  sceneLeadCount: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    alignSelf: "stretch",
    textAlign: "left",
  },
  markAllRow: {
    alignSelf: "stretch",
    width: "100%",
  },
});
