import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { palette, radius } from "@/theme/tokens";

type PageScreen =
  | "chats"
  | "alerts"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "player"
  | "blocked";

type MapPageHeaderProps = {
  pageScreen: PageScreen;
  profileName: string;
  profileAvatarUrl: string | null;
  showUnreadMenuIndicator: boolean;
  onOpenMenu: () => void;
  onOpenAccount: () => void;
  onCloseCurrentPage: () => void;
  onClosePlayerProfile: () => void;
  panHandlers?: object;
};

function getPageTitle(pageScreen: PageScreen) {
  switch (pageScreen) {
    case "chats":
      return "Chats";
    case "alerts":
      return "Avisos";
    case "places":
      return "Locais";
    case "history":
      return "Histórico";
    case "friends":
      return "Amigos";
    case "player":
      return "Perfil";
    case "blocked":
      return "Bloqueados";
    default:
      return "Minha conta";
  }
}

export function MapPageHeader({
  pageScreen,
  profileName,
  profileAvatarUrl,
  showUnreadMenuIndicator,
  onOpenMenu,
  onOpenAccount,
  onCloseCurrentPage,
  onClosePlayerProfile,
  panHandlers,
}: MapPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const showingCloseButton =
    pageScreen === "account" || pageScreen === "player" || pageScreen === "blocked";

  return (
    <View
      style={[
        styles.pageHeader,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
      {...panHandlers}
    >
      <View style={styles.pageHeaderMenuStack}>
        <MapCircleActionButton
          icon="menu"
          accessibilityLabel="Abrir menu"
          onPress={onOpenMenu}
          showDot={showUnreadMenuIndicator}
        />
      </View>
      <View style={styles.pageHeaderCenter}>
        <View style={styles.pageHeaderHandle} />
        <Text style={styles.pageTitle}>{getPageTitle(pageScreen)}</Text>
      </View>
      {showingCloseButton ? (
        <MapCircleActionButton
          icon="close"
          accessibilityLabel={
            pageScreen === "player"
              ? "Fechar perfil e voltar para a tela anterior"
              : pageScreen === "blocked"
                ? "Fechar bloqueados e voltar para minha conta"
              : "Fechar página e voltar ao mapa"
          }
          onPress={pageScreen === "player" ? onClosePlayerProfile : onCloseCurrentPage}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir conta"
          onPress={onOpenAccount}
          style={({ pressed }) => [
            styles.pageAvatarButton,
            pressed ? styles.pageAvatarButtonPressed : null,
          ]}
        >
          <Avatar name={profileName} uri={profileAvatarUrl} size={50} />
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
