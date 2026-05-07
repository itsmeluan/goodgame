import { useMemo, useRef, useEffect } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { MAP_ONBOARDING_STEPS, type MapOnboardingStepId } from "@/features/map/mapOnboarding";
import { useTranslation, type TranslationKey } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type MapOnboardingOverlayProps = {
  stepId: MapOnboardingStepId;
  completedCount: number;
  bottomOffset: number;
  awaitingInteraction: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onDismiss: () => void;
};

type SpotlightTarget =
  | "none"
  | "map"
  | "menu"
  | "filters"
  | "profile"
  | "friends"
  | "new_game"
  | "sheet_handle"
  | "sheet_tabs"
  | "sheet_new_venue"
  | "drawer_items"
  | "page_content";

type StepCopy = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  hintKey: TranslationKey;
  continueKey: TranslationKey;
  waitingKey: TranslationKey;
  waiting: boolean;
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
    waiting: false,
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
    waiting: false,
    target: "map",
    iosName: "map.fill",
    fallbackName: "map",
  },
  open_games_sheet: {
    titleKey: "mapOnboarding.openGamesSheetTitle",
    bodyKey: "mapOnboarding.openGamesSheetBody",
    hintKey: "mapOnboarding.openGamesSheetHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingOpenDrawer",
    waiting: true,
    target: "sheet_handle",
    iosName: "chevron.up",
    fallbackName: "expand-less",
  },
  venues_tab: {
    titleKey: "mapOnboarding.venuesTabTitle",
    bodyKey: "mapOnboarding.venuesTabBody",
    hintKey: "mapOnboarding.venuesTabHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "sheet_tabs",
    iosName: "storefront.fill",
    fallbackName: "storefront",
  },
  suggest_venue: {
    titleKey: "mapOnboarding.suggestVenueTitle",
    bodyKey: "mapOnboarding.suggestVenueBody",
    hintKey: "mapOnboarding.suggestVenueHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "sheet_new_venue",
    iosName: "mappin.circle.fill",
    fallbackName: "add-location-alt",
  },
  create_meetup: {
    titleKey: "mapOnboarding.createMeetupTitle",
    bodyKey: "mapOnboarding.createMeetupBody",
    hintKey: "mapOnboarding.createMeetupHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "new_game",
    iosName: "plus.circle.fill",
    fallbackName: "add-circle",
  },
  friends: {
    titleKey: "mapOnboarding.friendsTitle",
    bodyKey: "mapOnboarding.friendsBody",
    hintKey: "mapOnboarding.friendsHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "friends",
    iosName: "person.3.fill",
    fallbackName: "groups-2",
  },
  profile: {
    titleKey: "mapOnboarding.profileTitle",
    bodyKey: "mapOnboarding.profileBody",
    hintKey: "mapOnboarding.profileHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "profile",
    iosName: "person.crop.circle.fill",
    fallbackName: "account-circle",
  },
  menu_open: {
    titleKey: "mapOnboarding.menuOpenTitle",
    bodyKey: "mapOnboarding.menuOpenBody",
    hintKey: "mapOnboarding.menuOpenHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingTapHighlighted",
    waiting: true,
    target: "menu",
    iosName: "line.3.horizontal",
    fallbackName: "menu",
  },
  menu_nearby_players: {
    titleKey: "mapOnboarding.menuNearbyTitle",
    bodyKey: "mapOnboarding.menuNearbyBody",
    hintKey: "mapOnboarding.menuNearbyHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "location.magnifyingglass",
    fallbackName: "travel-explore",
  },
  menu_chats: {
    titleKey: "mapOnboarding.menuChatsTitle",
    bodyKey: "mapOnboarding.menuChatsBody",
    hintKey: "mapOnboarding.menuChatsHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "bubble.left.and.bubble.right.fill",
    fallbackName: "forum",
  },
  menu_alerts: {
    titleKey: "mapOnboarding.menuAlertsTitle",
    bodyKey: "mapOnboarding.menuAlertsBody",
    hintKey: "mapOnboarding.menuAlertsHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "bell.fill",
    fallbackName: "notifications",
  },
  menu_news: {
    titleKey: "mapOnboarding.menuNewsTitle",
    bodyKey: "mapOnboarding.menuNewsBody",
    hintKey: "mapOnboarding.menuNewsHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "sparkles",
    fallbackName: "auto-awesome",
  },
  menu_history: {
    titleKey: "mapOnboarding.menuHistoryTitle",
    bodyKey: "mapOnboarding.menuHistoryBody",
    hintKey: "mapOnboarding.menuHistoryHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "clock.arrow.circlepath",
    fallbackName: "history",
  },
  menu_feedback: {
    titleKey: "mapOnboarding.menuFeedbackTitle",
    bodyKey: "mapOnboarding.menuFeedbackBody",
    hintKey: "mapOnboarding.menuFeedbackHint",
    continueKey: "mapOnboarding.next",
    waitingKey: "mapOnboarding.waitingMenuSelection",
    waiting: true,
    target: "drawer_items",
    iosName: "envelope.open.fill",
    fallbackName: "mail-outline",
  },
  feedback_finish: {
    titleKey: "mapOnboarding.feedbackFinishTitle",
    bodyKey: "mapOnboarding.feedbackFinishBody",
    hintKey: "mapOnboarding.feedbackFinishHint",
    continueKey: "mapOnboarding.finish",
    waitingKey: "mapOnboarding.waitingNone",
    waiting: false,
    target: "page_content",
    iosName: "heart.fill",
    fallbackName: "favorite",
  },
};

export function MapOnboardingOverlay({
  stepId,
  completedCount,
  bottomOffset,
  awaitingInteraction,
  canContinue,
  onContinue,
  onDismiss,
}: MapOnboardingOverlayProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const activeStepCopy = stepCopyById[stepId];

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

    return () => {
      pulse.stopAnimation();
    };
  }, [pulse, stepId]);

  const targetRect = useMemo(
    () =>
      resolveTargetRect({
        target: activeStepCopy.target,
        width,
        height,
        insetsTop: insets.top,
        insetsBottom: insets.bottom,
        bottomOffset,
      }),
    [activeStepCopy.target, bottomOffset, height, insets.bottom, insets.top, width]
  );

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0.05],
  });

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

      <View pointerEvents="box-none" style={[styles.cardHost, { bottom: bottomOffset + spacing.sm }]}> 
      <View style={styles.card}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.cardSurface}
        />
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>
              {t("mapOnboarding.progress", {
                completed: completedCount,
                total: MAP_ONBOARDING_STEPS.length,
              })}
            </Text>
            <Text style={styles.title}>{t(activeStepCopy.titleKey)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mapOnboarding.dismiss")}
            hitSlop={8}
            onPress={() => {
              triggerHaptic("selection");
              onDismiss();
            }}
            style={({ pressed }) => [
              styles.dismissButton,
              pressed ? styles.dismissButtonPressed : null,
            ]}
          >
            <AppIcon iosName="xmark" fallbackName="close" size={16} color={palette.pine} />
          </Pressable>
        </View>

        <View style={styles.currentStepRow}>
          <View style={styles.currentIcon}>
            <AppIcon
              iosName={activeStepCopy.iosName}
              fallbackName={activeStepCopy.fallbackName}
              size={18}
              color={palette.ink}
            />
          </View>
          <View style={styles.currentCopy}>
            <Text style={styles.currentTitle}>{t(activeStepCopy.titleKey)}</Text>
            <Text style={styles.currentBody}>{t(activeStepCopy.bodyKey)}</Text>
            <Text style={styles.currentHint}>{t(activeStepCopy.hintKey)}</Text>
          </View>
        </View>

        <Text style={styles.waitingLabel}>
          {awaitingInteraction ? t(activeStepCopy.waitingKey) : t("mapOnboarding.readyToContinue")}
        </Text>

        <View style={styles.actions}>
          {!awaitingInteraction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(activeStepCopy.continueKey)}
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
              <Text style={styles.primaryActionLabel}>{t(activeStepCopy.continueKey)}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("mapOnboarding.dismiss")}
            hitSlop={6}
            onPress={() => {
              triggerHaptic("selection");
              onDismiss();
            }}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed ? styles.secondaryActionPressed : null,
            ]}
          >
            <Text style={styles.secondaryActionLabel}>{t("mapOnboarding.dismiss")}</Text>
          </Pressable>
        </View>
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
  bottomOffset,
}: {
  target: SpotlightTarget;
  width: number;
  height: number;
  insetsTop: number;
  insetsBottom: number;
  bottomOffset: number;
}) {
  const topBase = insetsTop + 12;
  const rightBase = width - 68;
  const sheetTop = Math.max(height - bottomOffset - 120, topBase + 220);

  if (target === "none") {
    return null;
  }

  if (target === "map") {
    return {
      left: 18,
      top: topBase + 92,
      width: width - 36,
      height: Math.max(sheetTop - (topBase + 92), 160),
      radius: 22,
    };
  }

  if (target === "menu") {
    return { left: 14, top: topBase, width: 56, height: 56, radius: 28 };
  }

  if (target === "filters") {
    return { left: 76, top: topBase, width: 56, height: 56, radius: 28 };
  }

  if (target === "profile") {
    return { left: rightBase, top: topBase, width: 56, height: 56, radius: 28 };
  }

  if (target === "friends") {
    return { left: rightBase, top: topBase + 64, width: 56, height: 56, radius: 28 };
  }

  if (target === "new_game") {
    return { left: rightBase, top: topBase + 128, width: 56, height: 56, radius: 28 };
  }

  if (target === "sheet_handle") {
    return {
      left: width * 0.5 - 48,
      top: Math.max(sheetTop, topBase + 220),
      width: 96,
      height: 30,
      radius: 16,
    };
  }

  if (target === "sheet_tabs") {
    return {
      left: 20,
      top: Math.max(sheetTop + 46, topBase + 240),
      width: width - 40,
      height: 62,
      radius: 20,
    };
  }

  if (target === "sheet_new_venue") {
    return {
      left: width - 148,
      top: Math.max(sheetTop + 112, topBase + 280),
      width: 128,
      height: 42,
      radius: 21,
    };
  }

  if (target === "drawer_items") {
    return {
      left: 8,
      top: topBase + 86,
      width: Math.min(width * 0.78, 320),
      height: Math.max(height - (topBase + 86) - insetsBottom - 136, 180),
      radius: 20,
    };
  }

  return {
    left: 14,
    top: topBase + 86,
    width: width - 28,
    height: Math.max(height - (topBase + 86) - insetsBottom - 136, 180),
    radius: 20,
  };
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
    backgroundColor: "rgba(4,10,8,0.35)",
  },
  spotlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(241,143,92,0.95)",
    backgroundColor: "rgba(241,143,92,0.1)",
  },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(241,143,92,0.65)",
  },
  cardHost: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
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
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: palette.ember,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  title: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  currentStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  currentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
  },
  currentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  currentTitle: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "800",
  },
  currentBody: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
  currentHint: {
    color: palette.parchment,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  waitingLabel: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
    paddingHorizontal: spacing.md,
  },
  primaryActionPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  primaryActionDisabled: {
    opacity: 0.45,
  },
  primaryActionLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryAction: {
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryActionPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  secondaryActionLabel: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "800",
  },
});
