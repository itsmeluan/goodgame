import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { markMyNotificationsRead } from "@/lib/api";
import type { InAppNotification } from "@/types/domain";
import { toMessage } from "@/features/map/mapHelpers";

type UseMapNotificationActionsParams = {
  notifications: InAppNotification[];
  effectiveNotifications: InAppNotification[];
  demoFallbackNotifications: InAppNotification[];
  setNotifications: Dispatch<SetStateAction<InAppNotification[]>>;
  setDemoNotifications: Dispatch<SetStateAction<InAppNotification[]>>;
  setLastNotificationSyncAt: Dispatch<SetStateAction<Date | null>>;
  setMarkingNotificationsRead: Dispatch<SetStateAction<boolean>>;
  setNotificationError: Dispatch<SetStateAction<string | null>>;
  openChat: (meetupId: string) => void;
  focusVenueOnMap: (venueId: string, openSheet?: boolean) => void;
  focusMeetupOnMap: (meetupId: string, openSheet?: boolean) => void;
  resetFilters: () => void;
};

export function useMapNotificationActions({
  notifications,
  effectiveNotifications,
  demoFallbackNotifications,
  setNotifications,
  setDemoNotifications,
  setLastNotificationSyncAt,
  setMarkingNotificationsRead,
  setNotificationError,
  openChat,
  focusVenueOnMap,
  focusMeetupOnMap,
  resetFilters,
}: UseMapNotificationActionsParams) {
  const handleMarkNotificationsRead = useCallback(
    async (notificationIds?: string[]) => {
      try {
        setMarkingNotificationsRead(true);
        setNotificationError(null);

        const idsToMark =
          notificationIds?.length
            ? notificationIds
            : effectiveNotifications.filter((item) => item.readAt === null).map((item) => item.id);

        if (!idsToMark.length) {
          return;
        }

        if (notifications.length > 0) {
          await markMyNotificationsRead(idsToMark);
        }

        const readAt = new Date().toISOString();
        const markRead = (items: InAppNotification[]) =>
          items.map((notification) =>
            idsToMark.includes(notification.id)
              ? {
                  ...notification,
                  readAt: notification.readAt ?? readAt,
                }
              : notification
          );

        if (notifications.length === 0) {
          setDemoNotifications((current) =>
            markRead(current.length ? current : demoFallbackNotifications)
          );
        } else {
          setNotifications((current) => markRead(current));
        }

        setLastNotificationSyncAt(new Date());
      } catch (readError) {
        setNotificationError(toMessage(readError));
      } finally {
        setMarkingNotificationsRead(false);
      }
    },
    [
      demoFallbackNotifications,
      effectiveNotifications,
      notifications.length,
      setDemoNotifications,
      setLastNotificationSyncAt,
      setMarkingNotificationsRead,
      setNotificationError,
      setNotifications,
    ]
  );

  const handleOpenNotification = useCallback(
    async (notification: InAppNotification) => {
      if (notification.readAt === null) {
        await handleMarkNotificationsRead([notification.id]);
      }

      if (notification.kind === "message_received" && notification.meetupId) {
        openChat(notification.meetupId);
        return;
      }

      if (notification.kind === "nearby_venue_created" && notification.venueId) {
        resetFilters();
        focusVenueOnMap(notification.venueId, true);
        return;
      }

      if (notification.meetupId) {
        resetFilters();
        focusMeetupOnMap(notification.meetupId, true);
      }
    },
    [focusMeetupOnMap, focusVenueOnMap, handleMarkNotificationsRead, openChat, resetFilters]
  );

  return {
    handleMarkNotificationsRead,
    handleOpenNotification,
  };
}
