import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { useTranslation, type TranslationKey } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";

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

type MapPageHeaderProps = {
  pageScreen: PageScreen;
  profileName: string;
  profileAvatarUrl: string | null;
  profileIsPro: boolean;
  showUnreadMenuIndicator: boolean;
  onOpenMenu: () => void;
  onOpenAccount: () => void;
  onCloseCurrentPage: () => void;
  onClosePlayerProfile: () => void;
  panHandlers?: object;
};

function getPageTitleKey(pageScreen: PageScreen): TranslationKey {
  switch (pageScreen) {
    case "chats":
      return "nav.chats";
    case "alerts":
      return "nav.alerts";
    case "novidades":
      return "nav.news";
    case "places":
      return "nav.places";
    case "history":
      return "nav.history";
    case "nearby_players":
      return "nav.nearbyPlayers";
    case "feedback":
      return "nav.feedback";
    case "friends":
      return "nav.friends";
    case "player":
      return "nav.profile";
    default:
      return "nav.myAccount";
  }
}

export function MapPageHeader({
  pageScreen,
  profileName,
  profileAvatarUrl,
  profileIsPro,
  showUnreadMenuIndicator,
  onOpenMenu,
  onOpenAccount,
  onCloseCurrentPage,
  onClosePlayerProfile,
  panHandlers,
}: MapPageHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const showingCloseButton = pageScreen === "player";
  /** Same horizontal inset as `SlidingSheetStack` scene content (e.g. Amigos uses `spacing.lg`). */
  const mapAlignedGutter =
    pageScreen === "friends" ||
    pageScreen === "account" ||
    pageScreen === "player" ||
    pageScreen === "chats" ||
    pageScreen === "alerts" ||
    pageScreen === "novidades" ||
    pageScreen === "history" ||
    pageScreen === "nearby_players" ||
    pageScreen === "feedback"
      ? spacing.lg
      : 0;
  const showPageHeaderHandle =
    pageScreen !== "friends" &&
    pageScreen !== "account" &&
    pageScreen !== "player" &&
    pageScreen !== "chats" &&
    pageScreen !== "alerts" &&
    pageScreen !== "novidades" &&
    pageScreen !== "history" &&
    pageScreen !== "nearby_players" &&
    pageScreen !== "feedback";

  return (
    <View
      style={[
        styles.pageHeader,
        {
          paddingLeft: insets.left + mapAlignedGutter,
          paddingRight: insets.right + mapAlignedGutter,
        },
      ]}
      {...panHandlers}
    >
      <View style={styles.pageHeaderMenuStack}>
        <MapCircleActionButton
          icon="menu"
          accessibilityLabel={t("map.openMenu")}
          onPress={onOpenMenu}
          showDot={showUnreadMenuIndicator}
        />
      </View>
      <View style={styles.pageHeaderCenter}>
        {showPageHeaderHandle ? <View style={styles.pageHeaderHandle} /> : null}
        <Text style={styles.pageTitle}>{t(getPageTitleKey(pageScreen))}</Text>
      </View>
      {pageScreen === "account" ? (
        <View style={styles.pageHeaderTrailingSpacer} />
      ) : showingCloseButton ? (
        <MapCircleActionButton
          icon="close"
          accessibilityLabel={t("map.closeBackToMap")}
          onPress={onClosePlayerProfile}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("map.openAccount")}
          onPress={onOpenAccount}
          style={({ pressed }) => [
            styles.pageAvatarButton,
            pressed ? styles.pageAvatarButtonPressed : null,
          ]}
        >
          <Avatar name={profileName} uri={profileAvatarUrl} size={50} isPro={profileIsPro} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
  },
  pageHeaderMenuStack: {
    width: 56,
  },
  pageHeaderTrailingSpacer: {
    width: 56,
  },
  pageHeaderCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pageHeaderHandle: {
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(231,216,188,0.2)",
  },
  pageTitle: {
    color: palette.sand,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  pageAvatarButton: {
    borderRadius: radius.pill,
    width: 56,
    alignItems: "flex-end",
  },
  pageAvatarButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
