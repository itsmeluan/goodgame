import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { OnboardingTargetView } from "@/features/map/onboardingTargets";
import { useTranslation } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";
import type { FriendProfile } from "@/types/domain";

type DrawerRootPanelProps = {
  mapActive: boolean;
  gamesActive: boolean;
  novidadesActive: boolean;
  alertsActive: boolean;
  chatsActive: boolean;
  placesActive: boolean;
  historyActive: boolean;
  nearbyPlayersActive: boolean;
  feedbackActive: boolean;
  unreadChatCount: number;
  unreadAlertCount: number;
  unreadNovidadesCount: number;
  onlineFriends: FriendProfile[];
  appVersion: string;
  onOpenMap: () => void;
  onOpenGames: () => void;
  onOpenNovidades: () => void;
  onOpenChats: () => void;
  onOpenAlerts: () => void;
  onOpenPlaces: () => void;
  onOpenHistory: () => void;
  onOpenNearbyPlayers: () => void;
  onOpenFeedback: () => void;
  onOpenPlayerProfile: (userId: string) => void;
};

export function DrawerRootPanel({
  mapActive,
  gamesActive,
  novidadesActive,
  alertsActive,
  chatsActive,
  placesActive,
  historyActive,
  nearbyPlayersActive,
  feedbackActive,
  unreadChatCount,
  unreadAlertCount,
  unreadNovidadesCount,
  onlineFriends,
  appVersion,
  onOpenMap,
  onOpenGames,
  onOpenNovidades,
  onOpenChats,
  onOpenAlerts,
  onOpenPlaces,
  onOpenHistory,
  onOpenNearbyPlayers,
  onOpenFeedback,
  onOpenPlayerProfile,
}: DrawerRootPanelProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      contentContainerStyle={styles.content}
    >
      <AppleListSection size="compact">
        <AppleListGroup>
          <OnboardingTargetView targetKey="drawer_map">
            <AppleListRow
              icon={{ iosName: "map.fill", fallbackName: "map" }}
              label={t("nav.map")}
              onPress={onOpenMap}
              tone={mapActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_games">
            <AppleListRow
              separator
              icon={{ iosName: "dice.fill", fallbackName: "casino" }}
              label={t("common.games")}
              onPress={onOpenGames}
              tone={gamesActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_places">
            <AppleListRow
              separator
              icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
              label={t("nav.places")}
              onPress={onOpenPlaces}
              tone={placesActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_nearby">
            <AppleListRow
              separator
              icon={{ iosName: "location.magnifyingglass", fallbackName: "travel-explore" }}
              label={t("nav.nearbyPlayers")}
              onPress={onOpenNearbyPlayers}
              tone={nearbyPlayersActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_chats">
            <AppleListRow
              separator
              icon={{
                iosName: "bubble.left.and.bubble.right.fill",
                fallbackName: "forum",
              }}
              label={t("nav.chats")}
              onPress={onOpenChats}
              trailingValue={unreadChatCount ? String(unreadChatCount) : null}
              tone={unreadChatCount || chatsActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_alerts">
            <AppleListRow
              separator
              icon={{ iosName: "bell.fill", fallbackName: "notifications" }}
              label={t("nav.alerts")}
              onPress={onOpenAlerts}
              trailingValue={unreadAlertCount ? String(unreadAlertCount) : null}
              tone={unreadAlertCount || alertsActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_news">
            <AppleListRow
              separator
              icon={{ iosName: "sparkles", fallbackName: "auto-awesome" }}
              label={t("nav.news")}
              showUnreadDot={unreadNovidadesCount > 0}
              onPress={onOpenNovidades}
              tone={novidadesActive || unreadNovidadesCount > 0 ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_history">
            <AppleListRow
              separator
              icon={{ iosName: "clock.arrow.circlepath", fallbackName: "history" }}
              label={t("nav.history")}
              onPress={onOpenHistory}
              tone={historyActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
          <OnboardingTargetView targetKey="drawer_feedback">
            <AppleListRow
              separator
              icon={{ iosName: "envelope.open.fill", fallbackName: "mail-outline" }}
              label={t("nav.feedback")}
              onPress={onOpenFeedback}
              tone={feedbackActive ? "accent" : "default"}
              size="compact"
            />
          </OnboardingTargetView>
        </AppleListGroup>
      </AppleListSection>

      <AppleListSection title={t("drawer.onlineFriends")} size="compact">
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
                <Avatar
                  name={friend.displayName}
                  uri={friend.avatarUrl}
                  size={42}
                  isPro={Boolean(friend.isPro)}
                />
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
          <Text style={styles.drawerFriendsEmpty}>{t("drawer.noOnlineFriends")}</Text>
        )}
      </AppleListSection>

      <Text style={styles.drawerVersionLabel}>{t("drawer.version", { version: appVersion })}</Text>
    </ScrollView>
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
