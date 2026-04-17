import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, sheetContentGutter, spacing } from "@/theme/tokens";

export type SlidingSheetRoute = {
  key: string;
  content: ReactNode;
  title?: string;
  subtitle?: string;
  /**
   * When `false`, the scene back row is omitted (no layout space) — use when nested UI
   * renders its own Voltar (e.g. edição dentro do cartão de local).
   * Default: shown for every scene after the root.
   */
  showBackHeader?: boolean;
};

type SlidingSheetStackProps = {
  routes: SlidingSheetRoute[];
  onPop: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  sceneWidth?: number;
  scenePaddingHorizontal?: number;
  /** When false, only `scenePaddingHorizontal` is applied (parent already handles safe area). Default true. */
  padSceneWithSafeArea?: boolean;
  fillHeight?: boolean;
  headerVariant?: "default" | "compact";
  /** Less padding above/below the back row (nested sheets with their own title block). Default: default. */
  headerSpacing?: "default" | "tight";
};

const EDGE_SWIPE_WIDTH = 24;

function SlidingSheetSceneHeader({
  headerVariant,
  headerSpacing,
  route,
  onHeaderBackPress,
}: {
  headerVariant: "default" | "compact";
  headerSpacing: "default" | "tight";
  route: SlidingSheetRoute;
  onHeaderBackPress: () => void;
}) {
  return (
    <View
      style={[
        styles.sceneHeader,
        headerVariant === "compact"
          ? headerSpacing === "tight"
            ? [styles.sceneHeaderCompact, styles.sceneHeaderCompactTight]
            : styles.sceneHeaderCompact
          : null,
      ]}
    >
      <View
        style={{
          gap: spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => {
            triggerHaptic("selection");
            onHeaderBackPress();
          }}
          style={({ pressed }) => [
            styles.backButton,
            headerVariant === "compact" ? styles.backButtonCompact : null,
            pressed ? styles.backButtonPressed : null,
          ]}
        >
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.backButtonSurface}
          />
          <AppIcon
            iosName="chevron.left"
            fallbackName="arrow-back"
            size={17}
            color={palette.sand}
          />
          <Text style={styles.backButtonLabel}>Voltar</Text>
        </Pressable>
        {route.title || route.subtitle ? (
          <View style={styles.sceneTitleWrap}>
            {route.title ? (
              <Text
                style={[
                  styles.sceneTitle,
                  headerVariant === "compact" ? styles.sceneTitleCompact : null,
                ]}
              >
                {route.title}
              </Text>
            ) : null}
            {route.subtitle ? (
              <Text
                style={[
                  styles.sceneSubtitle,
                  headerVariant === "compact" ? styles.sceneSubtitleCompact : null,
                ]}
              >
                {route.subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function SlidingSheetStack({
  routes,
  onPop,
  style,
  contentStyle,
  sceneWidth,
  scenePaddingHorizontal = sheetContentGutter,
  padSceneWithSafeArea = true,
  fillHeight = true,
  headerVariant = "default",
  headerSpacing = "default",
}: SlidingSheetStackProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewportWidth, setViewportWidth] = useState(0);
  const width =
    sceneWidth ?? (viewportWidth > 0 ? viewportWidth : windowWidth);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - viewportWidth) > 0.5) {
      setViewportWidth(next);
    }
  }, [viewportWidth]);
  const scenePadLeft = padSceneWithSafeArea ? insets.left + scenePaddingHorizontal : scenePaddingHorizontal;
  const scenePadRight = padSceneWithSafeArea
    ? insets.right + scenePaddingHorizontal
    : scenePaddingHorizontal;
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef(0);
  const isPoppingRef = useRef(false);

  const targetTranslate = -Math.max(routes.length - 1, 0) * width;

  const runPopAnimationThenOnPop = useCallback(() => {
    if (routes.length <= 1) {
      return;
    }

    isPoppingRef.current = true;
    translateX.stopAnimation();

    Animated.timing(translateX, {
      toValue: targetTranslate + width,
      duration: 190,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(() => {
      onPop();
    });
  }, [onPop, routes.length, targetTranslate, translateX, width]);

  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      translateX.setValue(targetTranslate);
      return;
    }

    Animated.spring(translateX, {
      toValue: targetTranslate,
      damping: 30,
      stiffness: 320,
      mass: 0.95,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }, [routes.length, targetTranslate, translateX]);

  const edgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          routes.length > 1 && event.nativeEvent.locationX <= EDGE_SWIPE_WIDTH,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          routes.length > 1 &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 6,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          dragStartRef.current = targetTranslate;
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextValue = Math.min(dragStartRef.current + Math.max(gestureState.dx, 0), 0);
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldPop = gestureState.dx > width * 0.2 || gestureState.vx > 0.85;

          if (shouldPop) {
            isPoppingRef.current = true;
            Animated.timing(translateX, {
              toValue: dragStartRef.current + width,
              duration: 190,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }).start(() => {
              onPop();
            });
            return;
          }

          Animated.spring(translateX, {
            toValue: targetTranslate,
            damping: 28,
            stiffness: 280,
            mass: 0.92,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: targetTranslate,
            damping: 28,
            stiffness: 280,
            mass: 0.92,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onPop, routes.length, targetTranslate, translateX, width]
  );

  return (
    <View
      onLayout={sceneWidth != null ? undefined : onViewportLayout}
      style={[fillHeight ? styles.viewportFill : styles.viewportAuto, style]}
    >
      <Animated.View
        style={[
          fillHeight ? styles.trackFill : styles.trackAuto,
          {
            width: Math.max(routes.length, 1) * width,
            transform: [{ translateX }],
          },
          contentStyle,
        ]}
      >
        {routes.map((route, index) => (
          <View
            key={route.key}
            style={[
              fillHeight ? styles.sceneFill : styles.sceneAuto,
              {
                width,
                paddingLeft: scenePadLeft,
                paddingRight: scenePadRight,
              },
            ]}
          >
            {index > 0 && route.showBackHeader !== false ? (
              <SlidingSheetSceneHeader
                headerVariant={headerVariant}
                headerSpacing={headerSpacing}
                route={route}
                onHeaderBackPress={runPopAnimationThenOnPop}
              />
            ) : null}

            <View
              style={[styles.sceneBody, fillHeight ? null : styles.sceneBodyNatural]}
            >
              {route.content}
            </View>
          </View>
        ))}
      </Animated.View>

      {routes.length > 1 ? (
        <View style={styles.edgeSwipeZone} pointerEvents="box-only" {...edgePanResponder.panHandlers} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewportFill: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  viewportAuto: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  trackFill: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  trackAuto: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "transparent",
  },
  sceneFill: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sceneAuto: {
    backgroundColor: "transparent",
  },
  sceneHeader: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sceneHeaderCompact: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  /** Nested sheets (e.g. edit inside games card): minimal pad so Voltar sits under tabs, not a second “header band”. */
  sceneHeaderCompactTight: {
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: 0,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  backButtonCompact: {
    minHeight: 32,
    paddingHorizontal: 12,
  },
  backButtonPressed: {
    opacity: 0.92,
  },
  backButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  backButtonLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "800",
  },
  sceneTitleWrap: {
    gap: 2,
    paddingLeft: 0,
  },
  sceneTitle: {
    color: palette.sand,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
  },
  sceneTitleCompact: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
  },
  sceneSubtitle: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
  },
  sceneSubtitleCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  sceneBody: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
  },
  /** When `fillHeight` is false, avoid stretching content below the back row (removes dead vertical gap). */
  sceneBodyNatural: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
  },
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_SWIPE_WIDTH,
    zIndex: 3,
  },
});
