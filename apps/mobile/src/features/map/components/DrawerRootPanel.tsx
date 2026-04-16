import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";
import type { FriendProfile } from "@/types/domain";

type DrawerRootPanelProps = {
  mapActive: boolean;
  gamesActive: boolean;
  alertsActive: boolean;
  chatsActive: boolean;
  placesActive: boolean;
  historyActive: boolean;
  unreadChatCount: number;
  unreadAlertCount: number;
  onlineFriends: FriendProfile[];
  appVersion: string;
  onOpenMap: () => void;
  onOpenGames: () => void;
  onOpenChats: () => void;
  onOpenAlerts: () => void;
  onOpenPlaces: () => void;
  onOpenHistory: () => void;
  onOpenPlayerProfile: (userId: string) => void;
};

export function DrawerRootPanel({
  mapActive,
  gamesActive,
  alertsActive,
  chatsActive,
  placesActive,
  historyActive,
  unreadChatCount,
  unreadAlertCount,
  onlineFriends,
  appVersion,
  onOpenMap,
  onOpenGames,
  onOpenChats,
  onOpenAlerts,
  onOpenPlaces,
  onOpenHistory,
  onOpenPlayerProfile,
}: DrawerRootPanelProps) {
  return (
    <View style={styles.content}>
      <AppleListSection size="compact">
        <AppleListGroup>
          <AppleListRow
            icon={{ iosName: "map.fill", fallbackName: "map" }}
            label="Mapa"
            onPress={onOpenMap}
            tone={mapActive ? "accent" : "default"}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "dice.fill", fallbackName: "casino" }}
            label="Jogos"
            onPress={onOpenGames}
            tone={gamesActive ? "accent" : "default"}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{
              iosName: "bubble.left.and.bubble.right.fill",
              fallbackName: "forum",
            }}
            label="Chats"
            onPress={onOpenChats}
            trailingValue={unreadChatCount ? String(unreadChatCount) : null}
            tone={unreadChatCount || chatsActive ? "accent" : "default"}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "bell.fill", fallbackName: "notifications" }}
            label="Avisos"
            onPress={onOpenAlerts}
            trailingValue={unreadAlertCount ? String(unreadAlertCount) : null}
            tone={unreadAlertCount || alertsActive ? "accent" : "default"}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
            label="Locais"
            onPress={onOpenPlaces}

            tone={placesActive ? "accent" : "default"}
            size="compact"
          />
          <AppleListRow
            separator
            icon={{ iosName: "clock.arrow.circlepath", fallbackName: "history" }}
            label="Histórico"
            onPress={onOpenHistory}

            tone={historyActive ? "accent" : "default"}
            size="compact"
          />
        </AppleListGroup>
      </AppleListSection>

      <AppleListSection title="Amigos online" size="compact">
        {onlineFriends.length ? (
          <AppleListGroup>
            {onlineFriends.slice(0, 6).map((friend, index) => (
              <Pressable
                key={friend.userId}
                onPress={() => {
                  triggerHaptic("selection");
                  onOpenPlayerProfile(friend.userId);
                }}
                style={({ pressed }) => [
                  styles.onlineFriendRow,
                  index > 0 ? styles.onlineFriendRowSeparator : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Avatar name={friend.displayName} uri={friend.avatarUrl} size={42} />
                <View style={styles.onlineFriendCopy}>
                  <Text style={styles.onlineFriendName}>{friend.displayName}</Text>
                  <Text style={styles.onlineFriendMeta}>@{friend.handle}</Text>
                </View>
                <AppIcon
                  iosName="chevron.right"
                  fallbackName="chevron-right"
                  size={18}
                  color={palette.pine}
                />
              </Pressable>
            ))}
          </AppleListGroup>
        ) : (
          <Text style={styles.drawerFriendsEmpty}>Nenhum amigo online agora.</Text>
        )}
      </AppleListSection>

      <Text style={styles.drawerVersionLabel}>versão {appVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingRight: spacing.sm,
  },
  onlineFriendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 70,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  onlineFriendRowSeparator: {
    borderTopWidth: 1,
    borderTopColor: "rgba(231,216,188,0.08)",
  },
  onlineFriendCopy: {
    flex: 1,
    gap: 2,
  },
  onlineFriendName: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  onlineFriendMeta: {
    color: palette.pine,
    fontSize: 12,
  },
  drawerFriendsEmpty: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  drawerVersionLabel: {
    color: palette.pine,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.82,
  },
});
