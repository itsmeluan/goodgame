import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import type { MapOnboardingStepId } from "@/features/map/mapOnboarding";
import {
  useOnboardingRemeasure,
  useOnboardingTargetRects,
  type OnboardingRect,
  type OnboardingTargetKey,
} from "@/features/map/onboardingTargets";
import { useTranslation, type TranslationKey } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type OnboardingScreen =
  | "map"
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

type MapOnboardingOverlayProps = {
  stepId: MapOnboardingStepId;
  bottomOffset: number;
  awaitingInteraction: boolean;
  canContinue: boolean;
  canGoBack: boolean;
  onContinue: () => void;
  onBack: () => void;
  onDismiss: () => void;
  drawerWidth: number;
  gamesSheetTop: number;
  activeScreen: OnboardingScreen;
};

type SpotlightTarget =
  | "none"
  | "map_full"
  | "menu_button"
  | "profile_button"
  | "friends_button"
  | "new_game_button"
  | "sheet_handle"
  | "sheet_tabs"
  | "sheet_new_venue_button"
  | "venue_sheet_close"
  | "meetup_sheet_close"
  | "drawer_nearby"
  | "drawer_chats"
  | "drawer_alerts"
  | "drawer_news"
  | "drawer_history"
  | "drawer_feedback"
  | "page_content";

type StepCopy = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  hintKey: TranslationKey;
  continueKey: TranslationKey;
  waitingKey: TranslationKey;
  target: SpotlightTarget;
  iosName: Parameters<typeof AppIcon>[0]["iosName"];
  fallbackName: Parameters<typeof AppIcon>[0]["fallbackName"];
};

const stepCopyById: Record<MapOnboardingStepId, StepCopy> = {
  welcome: {
    titleKey: "mapOnboarding.welcomeTitle",
    bodyKey: "mapOnboarding.welcomeBody",
    hintKey: "mapOnboarding.welcomeHint",
    continueKey: "mapOnboarding.startTour",
    waitingKey: "mapOnboarding.waitingNone",
    target: "none",
    iosName: "sparkles",
    fallbackName: "auto-awesome",
  },
  map_overview: {
    titleKey: "mapOnboarding.mapOverviewTitle",
    bodyKey: "mapOnboarding.mapOverviewBody",
    hintKey: "mapOnboarding.mapOverviewHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "map_full",
    iosName: "map.fill",
    fallbackName: "map",
  },
  open_games_sheet: {
    titleKey: "mapOnboarding.openGamesSheetTitle",
    bodyKey: "mapOnboarding.openGamesSheetBody",
    hintKey: "mapOnboarding.openGamesSheetHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingOpenDrawer",
    target: "sheet_handle",
    iosName: "chevron.up",
    fallbackName: "expand-less",
  },
  games_sheet_info: {
    titleKey: "mapOnboarding.gamesSheetInfoTitle",
    bodyKey: "mapOnboarding.gamesSheetInfoBody",
    hintKey: "mapOnboarding.gamesSheetInfoHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "sheet_tabs",
    iosName: "list.bullet.rectangle.portrait.fill",
    fallbackName: "view-list",
  },
  venues_tab: {
    titleKey: "mapOnboarding.venuesTabTitle",
    bodyKey: "mapOnboarding.venuesTabBody",
    hintKey: "mapOnboarding.venuesTabHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "sheet_tabs",
    iosName: "storefront.fill",
    fallbackName: "storefront",
  },
  venues_tab_info: {
    titleKey: "mapOnboarding.venuesTabInfoTitle",
    bodyKey: "mapOnboarding.venuesTabInfoBody",
    hintKey: "mapOnboarding.venuesTabInfoHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "sheet_tabs",
    iosName: "mappin.circle.fill",
    fallbackName: "location-on",
  },
  suggest_venue_open: {
    titleKey: "mapOnboarding.suggestVenueOpenTitle",
    bodyKey: "mapOnboarding.suggestVenueOpenBody",
    hintKey: "mapOnboarding.suggestVenueOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "sheet_new_venue_button",
    iosName: "plus.circle.fill",
    fallbackName: "add-circle",
  },
  suggest_venue_sheet: {
    titleKey: "mapOnboarding.suggestVenueSheetTitle",
    bodyKey: "mapOnboarding.suggestVenueSheetBody",
    hintKey: "mapOnboarding.suggestVenueSheetHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "venue_sheet_close",
    iosName: "square.and.pencil",
    fallbackName: "edit-location-alt",
  },
  suggest_venue_back_map: {
    titleKey: "mapOnboarding.suggestVenueBackTitle",
    bodyKey: "mapOnboarding.suggestVenueBackBody",
    hintKey: "mapOnboarding.suggestVenueBackHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "venue_sheet_close",
    iosName: "xmark.circle.fill",
    fallbackName: "close",
  },
  create_meetup_open: {
    titleKey: "mapOnboarding.createMeetupOpenTitle",
    bodyKey: "mapOnboarding.createMeetupOpenBody",
    hintKey: "mapOnboarding.createMeetupOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "new_game_button",
    iosName: "plus.circle.fill",
    fallbackName: "add-circle",
  },
  create_meetup_sheet: {
    titleKey: "mapOnboarding.createMeetupSheetTitle",
    bodyKey: "mapOnboarding.createMeetupSheetBody",
    hintKey: "mapOnboarding.createMeetupSheetHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "meetup_sheet_close",
    iosName: "calendar.badge.plus",
    fallbackName: "event-available",
  },
  create_meetup_back_map: {
    titleKey: "mapOnboarding.createMeetupBackTitle",
    bodyKey: "mapOnboarding.createMeetupBackBody",
    hintKey: "mapOnboarding.createMeetupBackHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "meetup_sheet_close",
    iosName: "xmark.circle.fill",
    fallbackName: "close",
  },
  friends_open: {
    titleKey: "mapOnboarding.friendsOpenTitle",
    bodyKey: "mapOnboarding.friendsOpenBody",
    hintKey: "mapOnboarding.friendsOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "friends_button",
    iosName: "person.3.fill",
    fallbackName: "groups-2",
  },
  friends_page: {
    titleKey: "mapOnboarding.friendsPageTitle",
    bodyKey: "mapOnboarding.friendsPageBody",
    hintKey: "mapOnboarding.friendsPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "person.2.fill",
    fallbackName: "group",
  },
  profile_open: {
    titleKey: "mapOnboarding.profileOpenTitle",
    bodyKey: "mapOnboarding.profileOpenBody",
    hintKey: "mapOnboarding.profileOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "profile_button",
    iosName: "person.crop.circle.fill",
    fallbackName: "account-circle",
  },
  profile_page: {
    titleKey: "mapOnboarding.profilePageTitle",
    bodyKey: "mapOnboarding.profilePageBody",
    hintKey: "mapOnboarding.profilePageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "person.text.rectangle.fill",
    fallbackName: "badge",
  },
  menu_open: {
    titleKey: "mapOnboarding.menuOpenTitle",
    bodyKey: "mapOnboarding.menuOpenBody",
    hintKey: "mapOnboarding.menuOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_nearby_open: {
    titleKey: "mapOnboarding.menuNearbyOpenTitle",
    bodyKey: "mapOnboarding.menuNearbyOpenBody",
    hintKey: "mapOnboarding.menuNearbyOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_nearby",
    iosName: "location.magnifyingglass",
    fallbackName: "travel-explore",
  },
  nearby_page: {
    titleKey: "mapOnboarding.nearbyPageTitle",
    bodyKey: "mapOnboarding.nearbyPageBody",
    hintKey: "mapOnboarding.nearbyPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "location.fill",
    fallbackName: "my-location",
  },
  menu_reopen_after_nearby: {
    titleKey: "mapOnboarding.menuReopenTitle",
    bodyKey: "mapOnboarding.menuReopenBody",
    hintKey: "mapOnboarding.menuReopenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_chats_open: {
    titleKey: "mapOnboarding.menuChatsOpenTitle",
    bodyKey: "mapOnboarding.menuChatsOpenBody",
    hintKey: "mapOnboarding.menuChatsOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_chats",
    iosName: "bubble.left.and.bubble.right.fill",
    fallbackName: "forum",
  },
  chats_page: {
    titleKey: "mapOnboarding.chatsPageTitle",
    bodyKey: "mapOnboarding.chatsPageBody",
    hintKey: "mapOnboarding.chatsPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "message.fill",
    fallbackName: "chat",
  },
  menu_reopen_after_chats: {
    titleKey: "mapOnboarding.menuReopenTitle",
    bodyKey: "mapOnboarding.menuReopenBody",
    hintKey: "mapOnboarding.menuReopenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_alerts_open: {
    titleKey: "mapOnboarding.menuAlertsOpenTitle",
    bodyKey: "mapOnboarding.menuAlertsOpenBody",
    hintKey: "mapOnboarding.menuAlertsOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_alerts",
    iosName: "bell.fill",
    fallbackName: "notifications",
  },
  alerts_page: {
    titleKey: "mapOnboarding.alertsPageTitle",
    bodyKey: "mapOnboarding.alertsPageBody",
    hintKey: "mapOnboarding.alertsPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "bell.badge.fill",
    fallbackName: "notifications-active",
  },
  menu_reopen_after_alerts: {
    titleKey: "mapOnboarding.menuReopenTitle",
    bodyKey: "mapOnboarding.menuReopenBody",
    hintKey: "mapOnboarding.menuReopenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_news_open: {
    titleKey: "mapOnboarding.menuNewsOpenTitle",
    bodyKey: "mapOnboarding.menuNewsOpenBody",
    hintKey: "mapOnboarding.menuNewsOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_news",
    iosName: "sparkles",
    fallbackName: "auto-awesome",
  },
  news_page: {
    titleKey: "mapOnboarding.newsPageTitle",
    bodyKey: "mapOnboarding.newsPageBody",
    hintKey: "mapOnboarding.newsPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "newspaper.fill",
    fallbackName: "feed",
  },
  menu_reopen_after_news: {
    titleKey: "mapOnboarding.menuReopenTitle",
    bodyKey: "mapOnboarding.menuReopenBody",
    hintKey: "mapOnboarding.menuReopenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_history_open: {
    titleKey: "mapOnboarding.menuHistoryOpenTitle",
    bodyKey: "mapOnboarding.menuHistoryOpenBody",
    hintKey: "mapOnboarding.menuHistoryOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_history",
    iosName: "clock.arrow.circlepath",
    fallbackName: "history",
  },
  history_page: {
    titleKey: "mapOnboarding.historyPageTitle",
    bodyKey: "mapOnboarding.historyPageBody",
    hintKey: "mapOnboarding.historyPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "clock.fill",
    fallbackName: "schedule",
  },
  menu_reopen_after_history: {
    titleKey: "mapOnboarding.menuReopenTitle",
    bodyKey: "mapOnboarding.menuReopenBody",
    hintKey: "mapOnboarding.menuReopenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    target: "menu_button",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_feedback_open: {
    titleKey: "mapOnboarding.menuFeedbackOpenTitle",
    bodyKey: "mapOnboarding.menuFeedbackOpenBody",
    hintKey: "mapOnboarding.menuFeedbackOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    target: "drawer_feedback",
    iosName: "envelope.open.fill",
    fallbackName: "mail-outline",
  },
  feedback_page: {
    titleKey: "mapOnboarding.feedbackPageTitle",
    bodyKey: "mapOnboarding.feedbackPageBody",
    hintKey: "mapOnboarding.feedbackPageHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "text.bubble.fill",
    fallbackName: "rate-review",
  },
  feedback_finish: {
    titleKey: "mapOnboarding.feedbackFinishTitle",
    bodyKey: "mapOnboarding.feedbackFinishBody",
    hintKey: "mapOnboarding.feedbackFinishHint",
    continueKey: "mapOnboarding.finish",
    waitingKey: "mapOnboarding.waitingNone",
    target: "page_content",
    iosName: "heart.fill",
    fallbackName: "favorite",
  },
};

type SpotlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
};

export function MapOnboardingOverlay({
  stepId,
  bottomOffset,
  awaitingInteraction,
  canContinue,
  canGoBack,
  onContinue,
  onBack,
  onDismiss,
  drawerWidth,
  gamesSheetTop,
  activeScreen,
}: MapOnboardingOverlayProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const stepCopy = stepCopyById[stepId];
  const measuredRects = useOnboardingTargetRects();
  const remeasureAll = useOnboardingRemeasure();

  useEffect(() => {
    // Re-measure shortly after the step changes so any sheet/drawer
    // animation that just settled is captured before we paint.
    // No standing interval — onLayout (and the few timeouts below) is
    // sufficient now that the targets context is stable, and an interval
    // forces unnecessary state churn that previously caused flicker.
    const t1 = setTimeout(remeasureAll, 80);
    const t2 = setTimeout(remeasureAll, 320);
    const t3 = setTimeout(remeasureAll, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [remeasureAll, stepId]);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);

    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ).start();

    return () => pulse.stopAnimation();
  }, [pulse, stepId]);

  const targetRect = useMemo(
    () =>
      resolveTargetRect({
        target: stepCopy.target,
        width,
        height,
        insetsTop: insets.top,
        insetsBottom: insets.bottom,
        drawerWidth,
        gamesSheetTop,
        activeScreen,
        measuredRects,
      }),
    [
      activeScreen,
      drawerWidth,
      gamesSheetTop,
      height,
      insets.bottom,
      insets.top,
      measuredRects,
      stepCopy.target,
      width,
    ]
  );

  const cardPlacement = useMemo(
    () => resolveCardPlacement({ targetRect, height, insetsTop: insets.top, bottomOffset }),
    [bottomOffset, height, insets.top, targetRect]
  );

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.06] });

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View pointerEvents="none" style={styles.scrim} />

      {targetRect ? (
        <View
          pointerEvents="none"
          style={[
            styles.spotlight,
            {
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
              height: targetRect.height,
              borderRadius: targetRect.radius,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.pulse,
              {
                borderRadius: targetRect.radius + 6,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        </View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.cardHost, cardPlacement]}>
        <View style={styles.card}>
          <AppleGlassSurface pointerEvents="none" variant="dark" intensity="clear" style={styles.cardSurface} />

          <View style={styles.header}>
            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              allowFontScaling={false}
            >
              {t(stepCopy.titleKey)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mapOnboarding.dismiss")}
              hitSlop={8}
              onPress={() => {
                triggerHaptic("selection");
                onDismiss();
              }}
              style={({ pressed }) => [styles.dismissButton, pressed ? styles.dismissButtonPressed : null]}
            >
              <AppIcon iosName="xmark" fallbackName="close" size={16} color={palette.pine} />
            </Pressable>
          </View>

          <View style={styles.bodyRow}>
            <View style={styles.iconWrap}>
              <AppIcon iosName={stepCopy.iosName} fallbackName={stepCopy.fallbackName} size={18} color={palette.ink} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.bodyText}>{t(stepCopy.bodyKey)}</Text>
              <Text style={styles.hintText}>{t(stepCopy.hintKey)}</Text>
            </View>
          </View>

          {!awaitingInteraction ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("mapOnboarding.back")}
                disabled={!canGoBack}
                onPress={() => {
                  triggerHaptic("selection");
                  onBack();
                }}
                style={({ pressed }) => [
                  styles.backAction,
                  !canGoBack ? styles.backActionDisabled : null,
                  pressed && canGoBack ? styles.backActionPressed : null,
                ]}
              >
                <Text style={[styles.backActionLabel, !canGoBack ? styles.backActionLabelDisabled : null]}>
                  {t("mapOnboarding.back")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(stepCopy.continueKey)}
                disabled={!canContinue}
                onPress={() => {
                  triggerHaptic("soft");
                  onContinue();
                }}
                style={({ pressed }) => [
                  styles.primaryAction,
                  !canContinue ? styles.primaryActionDisabled : null,
                  pressed && canContinue ? styles.primaryActionPressed : null,
                ]}
              >
                <Text style={styles.primaryActionLabel}>{t(stepCopy.continueKey)}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function resolveTargetRect({
  target,
  width,
  height,
  insetsTop,
  insetsBottom,
  drawerWidth,
  gamesSheetTop,
  activeScreen,
  measuredRects,
}: {
  target: SpotlightTarget;
  width: number;
  height: number;
  insetsTop: number;
  insetsBottom: number;
  drawerWidth: number;
  gamesSheetTop: number;
  activeScreen: OnboardingScreen;
  measuredRects: Partial<Record<OnboardingTargetKey, OnboardingRect>>;
}): SpotlightRect | null {
  if (target === "none") {
    return null;
  }

  if (target === "map_full") {
    return {
      left: 6,
      top: insetsTop + 6,
      width: width - 12,
      height: height - insetsBottom - 12,
      radius: 24,
    };
  }

  if (target === "page_content") {
    return {
      left: 12,
      top: insetsTop + 84,
      width: width - 24,
      height: height - insetsTop - insetsBottom - 140,
      radius: 20,
    };
  }

  const measuredKey = SPOTLIGHT_TARGET_TO_MEASURED_KEY[target];
  if (measuredKey) {
    const measured = measuredRects[measuredKey];
    if (measured) {
      return inflateRect(measured, target);
    }
  }

  // Fallback estimates (used until onLayout fires for the live target).
  return resolveFallbackRect({
    target,
    width,
    height,
    insetsTop,
    insetsBottom,
    drawerWidth,
    gamesSheetTop,
    activeScreen,
  });
}

const SPOTLIGHT_TARGET_TO_MEASURED_KEY: Partial<
  Record<SpotlightTarget, OnboardingTargetKey>
> = {
  menu_button: "menu_button",
  profile_button: "profile_button",
  friends_button: "friends_button",
  new_game_button: "new_game_button",
  sheet_handle: "sheet_handle",
  sheet_tabs: "sheet_tabs",
  sheet_new_venue_button: "sheet_new_venue_button",
  venue_sheet_close: "venue_sheet_close",
  meetup_sheet_close: "meetup_sheet_close",
  drawer_nearby: "drawer_nearby",
  drawer_chats: "drawer_chats",
  drawer_alerts: "drawer_alerts",
  drawer_news: "drawer_news",
  drawer_history: "drawer_history",
  drawer_feedback: "drawer_feedback",
};

function inflateRect(rect: OnboardingRect, target: SpotlightTarget): SpotlightRect {
  // Add a small visual padding around the actual element. Drawer rows get
  // slightly more horizontal padding so the chevron and trailing value are
  // included in the highlight.
  const isDrawerRow = target.startsWith("drawer_");
  const isCircle = target.endsWith("_button") || target === "venue_sheet_close" || target === "meetup_sheet_close";
  const padX = isDrawerRow ? 6 : 4;
  const padY = isDrawerRow ? 2 : 4;
  // The Jogos/Locais tabs rail sits inside a translated parent; the measured
  // rect lands a couple of pixels lower than expected, so nudge the highlight up.
  const offsetY = target === "sheet_tabs" ? -6 : 0;
  const left = rect.x - padX;
  const top = rect.y - padY + offsetY;
  const width = rect.width + padX * 2;
  const height = rect.height + padY * 2;
  const baseRadius = isCircle ? Math.min(width, height) / 2 : Math.min(width, height) / 2;
  return {
    left,
    top,
    width,
    height,
    radius: isCircle ? baseRadius : Math.min(baseRadius, 28),
  };
}

function resolveFallbackRect({
  target,
  width,
  height,
  insetsTop,
  insetsBottom,
  drawerWidth,
  gamesSheetTop,
  activeScreen,
}: {
  target: SpotlightTarget;
  width: number;
  height: number;
  insetsTop: number;
  insetsBottom: number;
  drawerWidth: number;
  gamesSheetTop: number;
  activeScreen: OnboardingScreen;
}): SpotlightRect | null {
  void height;
  void insetsBottom;
  const topBase = insetsTop + 10;
  const rightX = width - 76;
  const drawerLeft = 8;
  const drawerInnerWidth = Math.max(Math.min(drawerWidth - 16, width - 16), 260);
  const drawerListTop = insetsTop + 70;
  const drawerRowHeight = 56;

  if (target === "menu_button") {
    return { left: 16, top: topBase - 4, width: 64, height: 64, radius: 28 };
  }

  if (target === "profile_button") {
    const pageRight = width - 76;
    return {
      left: (activeScreen === "map" ? rightX : pageRight) - 4,
      top: topBase - 4,
      width: 64,
      height: 64,
      radius: 28,
    };
  }

  if (target === "friends_button") {
    return { left: rightX - 4, top: topBase + 62, width: 64, height: 64, radius: 28 };
  }

  if (target === "new_game_button") {
    return { left: rightX - 4, top: topBase + 128, width: 64, height: 64, radius: 28 };
  }

  if (target === "sheet_handle") {
    return {
      left: width * 0.5 - 36,
      top: gamesSheetTop + 6,
      width: 72,
      height: 18,
      radius: 9,
    };
  }

  if (target === "sheet_tabs") {
    return {
      left: 16,
      top: gamesSheetTop + 48,
      width: width - 32,
      height: 56,
      radius: 22,
    };
  }

  if (target === "sheet_new_venue_button") {
    return {
      left: width - 168,
      top: gamesSheetTop + 130,
      width: 152,
      height: 48,
      radius: 24,
    };
  }

  if (target === "venue_sheet_close" || target === "meetup_sheet_close") {
    return {
      left: width - 64,
      top: insetsTop + 60,
      width: 50,
      height: 50,
      radius: 25,
    };
  }

  const drawerIndex = DRAWER_TARGETS.indexOf(target as DrawerTarget);
  if (drawerIndex >= 0) {
    return {
      left: drawerLeft,
      top: drawerListTop + drawerIndex * drawerRowHeight,
      width: drawerInnerWidth,
      height: drawerRowHeight - 2,
      radius: 14,
    };
  }

  return null;
}

const DRAWER_TARGETS = [
  "drawer_map",
  "drawer_games",
  "drawer_places",
  "drawer_nearby",
  "drawer_chats",
  "drawer_alerts",
  "drawer_news",
  "drawer_history",
  "drawer_feedback",
] as const;
type DrawerTarget = (typeof DRAWER_TARGETS)[number];

function resolveCardPlacement({
  targetRect,
  height,
  insetsTop,
  bottomOffset,
}: {
  targetRect: SpotlightRect | null;
  height: number;
  insetsTop: number;
  bottomOffset: number;
}) {
  const cardApproxHeight = 310;
  const topY = insetsTop + 74;
  const bottomY = bottomOffset + spacing.sm;

  if (!targetRect) {
    return { bottom: bottomY };
  }

  const targetCenterY = targetRect.top + targetRect.height / 2;
  const preferTop = targetCenterY > height * 0.48;

  if (preferTop) {
    if (targetRect.top < topY + cardApproxHeight + 20) {
      return { bottom: bottomY };
    }
    return { top: topY };
  }

  const cardTopWhenBottom = height - bottomY - cardApproxHeight;
  if (targetRect.top + targetRect.height > cardTopWhenBottom - 20) {
    return { top: topY };
  }

  return { bottom: bottomY };
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 80,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,10,8,0.34)",
  },
  spotlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(241,143,92,0.95)",
    backgroundColor: "rgba(241,143,92,0.09)",
  },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(241,143,92,0.62)",
  },
  cardHost: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: 336,
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  cardSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: palette.sand,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
  },
  copyCol: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  bodyText: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  hintText: {
    color: palette.parchment,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
  },
  waitingText: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  backActionPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  backActionDisabled: {
    opacity: 0.42,
  },
  backActionLabel: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "800",
  },
  backActionLabelDisabled: {
    color: "rgba(164,155,148,0.62)",
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
    paddingHorizontal: spacing.md,
  },
  primaryActionPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  primaryActionDisabled: {
    opacity: 0.5,
  },
  primaryActionLabel: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "900",
  },
});
