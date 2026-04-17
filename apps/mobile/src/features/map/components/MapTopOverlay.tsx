import { Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { GoodGameLogo } from "@/components/GoodGameLogo";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { styles } from "@/features/map/MapHomeScreen.styles";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";

export type MapTopOverlayProps = {
  onDismissPinCallout?: () => void;
  profileName: string;
  profileAvatarUrl: string | null;
  showUnreadMenuIndicator: boolean;
  incomingFriendRequestsCount: number;
  filtersActive: boolean;
  filtersOpen: boolean;
  activeFilterCount: number;
  error: string | null;
  refreshing: boolean;
  onOpenDrawer: () => void;
  onToggleFilters: () => void;
  onOpenAccount: () => void;
  onOpenFriends: () => void;
  onOpenComposer: () => void;
};

export function MapTopOverlay({
  onDismissPinCallout,
  profileName,
  profileAvatarUrl,
  showUnreadMenuIndicator,
  incomingFriendRequestsCount,
  filtersActive,
  filtersOpen,
  activeFilterCount,
  error,
  refreshing,
  onOpenDrawer,
  onToggleFilters,
  onOpenAccount,
  onOpenFriends,
  onOpenComposer,
}: MapTopOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={styles.mapOverlaySafeArea}
      edges={["top", "left", "right"]}
      pointerEvents="box-none"
      onTouchStart={onDismissPinCallout}
    >
      <View style={styles.mapTopBar} pointerEvents="box-none">
        <View style={styles.mapTopStack}>
          <MapCircleActionButton
            icon="menu"
            accessibilityLabel="Abrir menu"
            onPress={() => {
              onDismissPinCallout?.();
              onOpenDrawer();
            }}
            showDot={showUnreadMenuIndicator}
          />
          <MapCircleActionButton
            icon="filter-list"
            accessibilityLabel="Abrir filtros"
            onPress={() => {
              onDismissPinCallout?.();
              onToggleFilters();
            }}
            active={filtersActive || filtersOpen}
            badge={activeFilterCount ? String(activeFilterCount) : null}
          />
        </View>

        <View style={styles.mapTopStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir conta"
            onPress={() => {
              onDismissPinCallout?.();
              triggerHaptic("selection");
              onOpenAccount();
            }}
            style={({ pressed }) => [styles.avatarButton, pressed ? styles.circleButtonPressed : null]}
          >
            <AppleGlassSurface
              pointerEvents="none"
              variant="light"
              style={styles.avatarButtonSurface}
            />
            <Avatar name={profileName} uri={profileAvatarUrl} size={48} />
          </Pressable>
          <MapCircleActionButton
            icon="groups-2"
            accessibilityLabel="Abrir amigos"
            onPress={() => {
              onDismissPinCallout?.();
              onOpenFriends();
            }}
            badge={incomingFriendRequestsCount ? String(incomingFriendRequestsCount) : null}
          />
          <MapCircleActionButton
            icon="add"
            accessibilityLabel="Novo jogo"
            onPress={() => {
              onDismissPinCallout?.();
              onOpenComposer();
            }}
            accent
          />
        </View>
      </View>

      <View
        style={[styles.mapBrandWrap, { left: insets.left + spacing.lg }]}
        pointerEvents="none"
      >
        <GoodGameLogo size="sm" monochrome variant="map" />
      </View>

      {error || refreshing ? (
        <View style={styles.topBanner} onTouchStart={onDismissPinCallout}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.topBannerSurface}
          />
          <AppIcon
            iosName={error ? "exclamationmark.triangle.fill" : "arrow.triangle.2.circlepath"}
            fallbackName={error ? "error-outline" : "autorenew"}
            size={16}
            color={error ? "#F7B0B0" : palette.parchment}
          />
          <Text style={styles.topBannerText}>
            {error ?? "Atualizando jogos e locais do mapa..."}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
