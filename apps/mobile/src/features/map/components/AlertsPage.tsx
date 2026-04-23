import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { useTranslation } from "@/i18n";
import { formatNotificationKind, formatRelativeTimestamp } from "@/lib/formatting";
import { palette, spacing } from "@/theme/tokens";
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
  const { t } = useTranslation();
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
        <View style={styles.rootWithFooter}>
          <ScrollView
            style={styles.rootScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, styles.rootScrollContent]}
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
                  label={t("alerts.unread")}
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
                  label={t("alerts.all")}
                  trailingValue={String(notifications.length)}
                  onPress={() => pushRoute("all")}
                  size="compact"
                />
              </AppleListGroup>
            </AppleListSection>

            {notificationError ? <MapInlineNotice tone="error" message={notificationError} /> : null}
          </ScrollView>
          <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
        </View>
      ),
    },
    ...routeKeys.map((routeKey) => {
      const routeNotifications =
        routeKey === "unread" ? unreadNotifications : notifications;

      return {
        key: routeKey,
        content: (
          <NotificationScene
            subtitle={t("alerts.itemCount", { count: routeNotifications.length })}
            notifications={routeNotifications}
            emptyTitle={
              routeKey === "unread" ? t("alerts.emptyUnreadTitle") : t("alerts.emptyAllTitle")
            }
            emptyBody={
              routeKey === "unread"
                ? t("alerts.emptyUnreadBody")
                : t("alerts.emptyAllBody")
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
      scenePaddingHorizontal={spacing.lg}
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
  const { t } = useTranslation();

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
              label={t("alerts.markAllRead")}
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
