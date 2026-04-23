import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { GoodGameLogo } from "@/components/GoodGameLogo";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
  profileIsPro: boolean;
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
  profileIsPro,
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
            style={({ pressed }) => [
              styles.avatarButton,
              profileIsPro ? styles.avatarButtonPro : null,
              pressed ? styles.circleButtonPressed : null,
            ]}
          >
            {!profileIsPro ? (
              <AppleGlassSurface
                pointerEvents="none"
                variant="light"
                style={styles.avatarButtonSurface}
              />
            ) : null}
            <View style={styles.avatarButtonInner} pointerEvents="box-none">
              <Avatar name={profileName} uri={profileAvatarUrl} size={56} isPro={profileIsPro} />
            </View>
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
        <GoodGameLogo
          size="sm"
          scale={Platform.OS === "android" ? 0.8 : 1}
          monochrome
          variant="map"
        />
      </View>

      {error || refreshing ? (
        <View style={styles.topBanner} onTouchStart={onDismissPinCallout}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.topBannerSurface}
          />
          {error ? (
            <AppIcon
              iosName="exclamationmark.triangle.fill"
              fallbackName="error-outline"
              size={16}
              color="#F7B0B0"
            />
          ) : (
            <LoadingSpinner size={16} color={palette.parchment} />
          )}
          <Text style={styles.topBannerText}>
            {error ?? "Atualizando jogos e locais do mapa..."}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
