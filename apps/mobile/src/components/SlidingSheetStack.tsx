import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
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
};

const EDGE_SWIPE_WIDTH = 24;

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
}: SlidingSheetStackProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = sceneWidth ?? windowWidth;
  const scenePadLeft = padSceneWithSafeArea ? insets.left + scenePaddingHorizontal : scenePaddingHorizontal;
  const scenePadRight = padSceneWithSafeArea
    ? insets.right + scenePaddingHorizontal
    : scenePaddingHorizontal;
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef(0);
  const isPoppingRef = useRef(false);

  const targetTranslate = -Math.max(routes.length - 1, 0) * width;

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
    <View style={[fillHeight ? styles.viewportFill : styles.viewportAuto, style]}>
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
            {index > 0 ? (
              <View
                style={[
                  styles.sceneHeader,
                  headerVariant === "compact" ? styles.sceneHeaderCompact : null,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                  onPress={() => {
                    triggerHaptic("selection");
                    onPop();
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
            ) : null}

            <View style={styles.sceneBody}>{route.content}</View>
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
  edgeSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_SWIPE_WIDTH,
    zIndex: 3,
  },
});
