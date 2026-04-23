import type { ComponentProps } from "react";
import { Animated, StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { ChatRoomPage } from "@/features/map/components/ChatRoomPage";
import { MapPageContent } from "@/features/map/components/MapPageContent";
import { MapPageHeader } from "@/features/map/components/MapPageHeader";
import { styles } from "@/features/map/MapHomeScreen.styles";

type PageScreen =
  | "chats"
  | "alerts"
  | "novidades"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "nearby_players"
  | "feedback"
  | "player";
type ChatViewMode = "list" | "room";
type AnimatedScalar = Animated.Value | Animated.AnimatedInterpolation<number | string>;

export type MapPageLayerProps = {
  active: boolean;
  opacity: AnimatedScalar | null;
  translateY: AnimatedScalar;
  scale: AnimatedScalar | number;
  /** Slide chat room horizontally when opened from chat list (native driver). */
  chatRoomTranslateX: Animated.Value;
  pageScreen: PageScreen;
  chatViewMode: ChatViewMode;
  profileName: string;
  profileAvatarUrl: string | null;
  profileIsPro: boolean;
  showUnreadMenuIndicator: boolean;
  dismissPanHandlers?: object;
  chatRoomEdgePanHandlers?: ViewProps;
  chatScreenProps: ComponentProps<typeof ChatRoomPage>["chatScreenProps"];
  pageContentProps: ComponentProps<typeof MapPageContent>;
  onOpenMenu: () => void;
  onOpenAccount: () => void;
  onCloseCurrentPage: () => void;
  onClosePlayerProfile: () => void;
};

export function MapPageLayer({
  active,
  opacity,
  translateY,
  scale,
  chatRoomTranslateX,
  pageScreen,
  chatViewMode,
  profileName,
  profileAvatarUrl,
  profileIsPro,
  showUnreadMenuIndicator,
  dismissPanHandlers,
  chatRoomEdgePanHandlers,
  chatScreenProps,
  pageContentProps,
  onOpenMenu,
  onOpenAccount,
  onCloseCurrentPage,
  onClosePlayerProfile,
}: MapPageLayerProps) {
  const pageChrome = (
    <SafeAreaView
      pointerEvents={pageScreen === "chats" && chatViewMode === "room" ? "none" : "auto"}
      style={styles.pageSafeArea}
      edges={["top", "bottom"]}
    >
      <View pointerEvents="none" style={styles.pageBackdropBase} />
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.pageBackdropGlass}
      />
      <MapPageHeader
        pageScreen={pageScreen}
        profileName={profileName}
        profileAvatarUrl={profileAvatarUrl}
        profileIsPro={profileIsPro}
        showUnreadMenuIndicator={showUnreadMenuIndicator}
        onOpenMenu={onOpenMenu}
        onOpenAccount={onOpenAccount}
        onCloseCurrentPage={onCloseCurrentPage}
        onClosePlayerProfile={onClosePlayerProfile}
        panHandlers={dismissPanHandlers}
      />

      <MapPageContent {...pageContentProps} />
    </SafeAreaView>
  );

  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[
        styles.pageLayer,
        opacity === null ? null : { opacity },
        {
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {pageScreen === "chats" ? (
        <View style={layerStyles.chatsStackHost}>
          {pageChrome}
          {chatViewMode === "room" ? (
            <Animated.View
              style={[
                layerStyles.chatRoomOverlay,
                { transform: [{ translateX: chatRoomTranslateX }] },
              ]}
            >
              <View style={layerStyles.chatRoomEdgeSwipeZone} {...chatRoomEdgePanHandlers} />
              <ChatRoomPage chatScreenProps={chatScreenProps} />
            </Animated.View>
          ) : null}
        </View>
      ) : (
        pageChrome
      )}
    </Animated.View>
  );
}

const layerStyles = StyleSheet.create({
  chatsStackHost: {
    flex: 1,
    overflow: "hidden",
  },
  chatRoomOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 8,
  },
  chatRoomEdgeSwipeZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 24,
    zIndex: 3,
    backgroundColor: "transparent",
  },
});
