import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { DrawerChatsPanel, type DrawerChatGameGroup } from "@/features/map/components/DrawerChatsPanel";
import { DrawerRootPanel } from "@/features/map/components/DrawerRootPanel";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";
import type { FriendProfile, MeetupPost } from "@/types/domain";

const DRAWER_BLEED = 48;

export type MapDrawerProps = {
  open: boolean;
  width: number;
  translateX: Animated.Value;
  backdropOpacity: Animated.Value;
  panelProgress: Animated.Value;
  panel: "root" | "chats";
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
  chatGroups: DrawerChatGameGroup[];
  archivedChats: MeetupPost[];
  expandedChatGroupIds: Record<string, boolean>;
  unreadChatMeetupIds: Set<string>;
  nowTimestamp: number;
  onClose: () => void;
  onOpenMap: () => void;
  onOpenGames: () => void;
  onOpenChats: () => void;
  onOpenAlerts: () => void;
  onOpenPlaces: () => void;
  onOpenHistory: () => void;
  onOpenPlayerProfile: (userId: string) => void;
  onBackToRoot: () => void;
  onToggleChatGroup: (groupId: string) => void;
  onOpenChat: (meetupId: string) => void;
};

export function MapDrawer({
  open,
  width,
  translateX,
  backdropOpacity,
  panelProgress,
  panel,
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
  chatGroups,
  archivedChats,
  expandedChatGroupIds,
  unreadChatMeetupIds,
  nowTimestamp,
  onClose,
  onOpenMap,
  onOpenGames,
  onOpenChats,
  onOpenAlerts,
  onOpenPlaces,
  onOpenHistory,
  onOpenPlayerProfile,
  onBackToRoot,
  onToggleChatGroup,
  onOpenChat,
}: MapDrawerProps) {
  return (
    <>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[styles.drawerBackdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.drawerShell,
          {
            width,
            transform: [{ translateX }],
          },
        ]}
      >
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          style={[
            styles.drawerBleedSurface,
            { right: 0 },
          ]}
        />

        <SafeAreaView style={styles.drawerSafeArea} edges={["top", "bottom", "left", "right"]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerHeaderTitle}>Menu</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar menu"
              hitSlop={12}
              onPress={() => {
                triggerHaptic("selection");
                onClose();
              }}
              style={styles.drawerCloseButton}
            >
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="clear"
                style={styles.drawerCloseButtonSurface}
              />
              <AppIcon iosName="xmark" fallbackName="close" size={17} color={palette.sand} />
            </Pressable>
          </View>

          <View style={styles.drawerPanelsViewport}>
            <Animated.View
              pointerEvents={panel === "root" ? "auto" : "none"}
              style={[
                styles.drawerPanel,
                {
                  opacity: panelProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.08],
                  }),
                  transform: [
                    {
                      translateX: panelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -width * 0.9],
                      }),
                    },
                  ],
                },
              ]}
            >
              <DrawerRootPanel
                mapActive={mapActive}
                gamesActive={gamesActive}
                alertsActive={alertsActive}
                chatsActive={chatsActive}
                placesActive={placesActive}
                historyActive={historyActive}
                unreadChatCount={unreadChatCount}
                unreadAlertCount={unreadAlertCount}
                onlineFriends={onlineFriends}
                appVersion={appVersion}
                onOpenMap={onOpenMap}
                onOpenGames={onOpenGames}
                onOpenChats={onOpenChats}
                onOpenAlerts={onOpenAlerts}
                onOpenPlaces={onOpenPlaces}
                onOpenHistory={onOpenHistory}
                onOpenPlayerProfile={onOpenPlayerProfile}
              />
            </Animated.View>

            <Animated.View
              pointerEvents={panel === "chats" ? "auto" : "none"}
              style={[
                styles.drawerPanel,
                styles.drawerSubpanel,
                {
                  opacity: panelProgress,
                  transform: [
                    {
                      translateX: panelProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [width * 0.22, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <DrawerChatsPanel
                groups={chatGroups}
                archivedChats={archivedChats}
                expandedGroupIds={expandedChatGroupIds}
                unreadChatMeetupIds={unreadChatMeetupIds}
                nowTimestamp={nowTimestamp}
                onBack={onBackToRoot}
                onToggleGroup={onToggleChatGroup}
                onOpenChat={onOpenChat}
              />
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,10,9,0.45)",
    zIndex: 59,
  },
  drawerShell: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "visible",
    shadowColor: "#040806",
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 10, height: 0 },
    elevation: 24,
    zIndex: 60,
  },
  drawerBleedSurface: {
    position: "absolute",
    top: -DRAWER_BLEED,
    bottom: -DRAWER_BLEED,
    left: -DRAWER_BLEED,
    borderWidth: 0,
  },
  drawerSafeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 12,
  },
  drawerHeaderTitle: {
    color: palette.sand,
    fontSize: 24,
    fontWeight: "800",
  },
  drawerCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
  },
  drawerPanelsViewport: {
    flex: 1,
    overflow: "hidden",
  },
  drawerPanel: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerSubpanel: {
    paddingBottom: spacing.md,
  },
});
