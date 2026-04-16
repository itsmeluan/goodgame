import type { ComponentProps } from "react";
import { Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { ChatRoomPage } from "@/features/map/components/ChatRoomPage";
import { MapPageContent } from "@/features/map/components/MapPageContent";
import { MapPageHeader } from "@/features/map/components/MapPageHeader";
import { styles } from "@/features/map/MapHomeScreen.styles";

type PageScreen =
  | "chats"
  | "alerts"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "player"
  | "blocked";
type ChatViewMode = "list" | "room";
type AnimatedScalar = Animated.Value | Animated.AnimatedInterpolation<number | string>;

export type MapPageLayerProps = {
  active: boolean;
  opacity: AnimatedScalar;
  translateY: AnimatedScalar;
  scale: AnimatedScalar;
  pageScreen: PageScreen;
  chatViewMode: ChatViewMode;
  profileName: string;
  profileAvatarUrl: string | null;
  showUnreadMenuIndicator: boolean;
  dismissPanHandlers?: object;
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
  pageScreen,
  chatViewMode,
  profileName,
  profileAvatarUrl,
  showUnreadMenuIndicator,
  dismissPanHandlers,
  chatScreenProps,
  pageContentProps,
  onOpenMenu,
  onOpenAccount,
  onCloseCurrentPage,
  onClosePlayerProfile,
}: MapPageLayerProps) {
  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[
        styles.pageLayer,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {pageScreen === "chats" && chatViewMode === "room" ? (
        <ChatRoomPage chatScreenProps={chatScreenProps} />
      ) : (
        <SafeAreaView style={styles.pageSafeArea} edges={["top", "bottom"]}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.pageBackdropSurface}
          />
          <MapPageHeader
            pageScreen={pageScreen}
            profileName={profileName}
            profileAvatarUrl={profileAvatarUrl}
            showUnreadMenuIndicator={showUnreadMenuIndicator}
            onOpenMenu={onOpenMenu}
            onOpenAccount={onOpenAccount}
            onCloseCurrentPage={onCloseCurrentPage}
            onClosePlayerProfile={onClosePlayerProfile}
            panHandlers={dismissPanHandlers}
          />

          <MapPageContent {...pageContentProps} />
        </SafeAreaView>
      )}
    </Animated.View>
  );
}
