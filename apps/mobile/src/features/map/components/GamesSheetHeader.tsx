import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";

export const GAMES_SHEET_HEADER_COLLAPSED_HEIGHT = 116;

type GamesSheetHeaderProps = {
  expanded: boolean;
  meetupCount: number;
  venueCount: number;
  section: "meetups" | "venues";
  panHandlers?: ViewProps;
  onDismissPinCallout?: () => void;
  onSelectMeetups: () => void;
  onSelectVenues: () => void;
};

export function GamesSheetHeader({
  meetupCount,
  venueCount,
  section,
  panHandlers,
  onDismissPinCallout,
  onSelectMeetups,
  onSelectVenues,
}: GamesSheetHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tabsRailWidth, setTabsRailWidth] = useState(0);
  const tabHighlightProgress = useRef(new Animated.Value(section === "venues" ? 1 : 0)).current;

  useEffect(() => {
    tabHighlightProgress.stopAnimation();
    Animated.timing(tabHighlightProgress, {
      toValue: section === "venues" ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [section, tabHighlightProgress]);

  const railInnerWidth = Math.max(tabsRailWidth - 8, 0);
  const tabWidth = railInnerWidth / 2;
  const tabTranslateX = tabHighlightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <View
      style={[
        styles.handleArea,
        {
          paddingLeft: insets.left + spacing.lg,
          paddingRight: insets.right + spacing.lg,
        },
      ]}
      {...panHandlers}
      onTouchStart={onDismissPinCallout}
    >
      <View style={styles.handle} />
      <Text style={styles.subtitle}>
        {t("map.sheetSummary", { meetups: meetupCount, venues: venueCount })}
      </Text>

      <View style={styles.tabsRow}>
        <View
          style={styles.tabsRail}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (nextWidth > 0 && nextWidth !== tabsRailWidth) {
              setTabsRailWidth(nextWidth);
            }
          }}
        >
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabHighlight,
                {
                  width: tabWidth,
                  transform: [{ translateX: tabTranslateX }],
                },
              ]}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("map.viewGamesList")}
            onPress={onSelectMeetups}
            style={({ pressed }) => [
              styles.tabButton,
              styles.tabButtonInactive,
              pressed ? styles.drawerButtonPressed : null,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                section === "meetups" ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {t("common.games")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("map.viewVenuesList")}
            onPress={onSelectVenues}
            style={({ pressed }) => [
              styles.tabButton,
              styles.tabButtonInactive,
              pressed ? styles.drawerButtonPressed : null,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                section === "venues" ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {t("common.venues")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  handleArea: {
    alignItems: "stretch",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(231,216,188,0.06)",
    gap: 8,
  },
  handle: {
    width: 52,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(231,216,188,0.24)",
    alignSelf: "center",
  },
  subtitle: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  tabsRow: {
    alignItems: "center",
  },
  tabsRail: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    padding: 4,
    overflow: "hidden",
    minHeight: 48,
    backgroundColor: "rgba(255,255,255,0.015)",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: palette.ember,
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
  },
  tabLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: palette.ink,
  },
  tabLabelInactive: {
    color: palette.parchment,
  },
  tabHighlight: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.ember,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#F18F5C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
    overflow: "hidden",
  },
  drawerButtonPressed: {
    opacity: 0.82,
  },
});
