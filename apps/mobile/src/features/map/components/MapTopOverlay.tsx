import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { Avatar } from "@/components/Avatar";
import { GoodGameLogo } from "@/components/GoodGameLogo";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { useOnboardingTarget } from "@/features/map/onboardingTargets";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const menuTarget = useOnboardingTarget("menu_button");
  const filtersTarget = useOnboardingTarget("filters_button");
  const profileTarget = useOnboardingTarget("profile_button");
  const friendsTarget = useOnboardingTarget("friends_button");
  const newGameTarget = useOnboardingTarget("new_game_button");

  return (
    <SafeAreaView
      style={styles.mapOverlaySafeArea}
      edges={["top", "left", "right"]}
      pointerEvents="box-none"
      onTouchStart={onDismissPinCallout}
    >
      <View style={styles.mapTopBar} pointerEvents="box-none">
        <View style={styles.mapTopStack}>
          <View ref={menuTarget.ref} onLayout={menuTarget.onLayout} collapsable={false}>
            <MapCircleActionButton
              icon="menu"
              accessibilityLabel={t("map.openMenu")}
              onPress={() => {
                onDismissPinCallout?.();
                onOpenDrawer();
              }}
              showDot={showUnreadMenuIndicator}
            />
          </View>
          <View ref={filtersTarget.ref} onLayout={filtersTarget.onLayout} collapsable={false}>
            <MapCircleActionButton
              icon="filter-list"
              accessibilityLabel={t("map.openFilters")}
              onPress={() => {
                onDismissPinCallout?.();
                onToggleFilters();
              }}
              active={filtersActive || filtersOpen}
              badge={activeFilterCount ? String(activeFilterCount) : null}
            />
          </View>
        </View>

        <View style={styles.mapTopStack}>
          <Pressable
            ref={profileTarget.ref}
            onLayout={profileTarget.onLayout}
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel={t("map.openAccount")}
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
          <View ref={friendsTarget.ref} onLayout={friendsTarget.onLayout} collapsable={false}>
            <MapCircleActionButton
              icon="groups-2"
              accessibilityLabel={t("map.openFriends")}
              onPress={() => {
                onDismissPinCallout?.();
                onOpenFriends();
              }}
              badge={incomingFriendRequestsCount ? String(incomingFriendRequestsCount) : null}
            />
          </View>
          <View ref={newGameTarget.ref} onLayout={newGameTarget.onLayout} collapsable={false}>
            <MapCircleActionButton
              icon="add"
              accessibilityLabel={t("map.newGame")}
              onPress={() => {
                onDismissPinCallout?.();
                onOpenComposer();
              }}
              accent
            />
          </View>
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
            {error ?? t("map.refreshing")}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
