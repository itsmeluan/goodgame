import { useMemo, type MutableRefObject } from "react";
import { Animated, Easing, Keyboard, PanResponder } from "react-native";

import { clamp } from "@/features/map/mapHelpers";

type GamesSheetSection = "meetups" | "venues";

type GamesSheetPanResponderParams = {
  defaultCollapsedGamesSheetOffset: number;
  expandedGamesSheetOffset: number;
  venueComposerOpen: boolean;
  gamesSheetTranslateY: Animated.Value;
  currentGamesSheetValueRef: MutableRefObject<number>;
  sheetPanStartRef: MutableRefObject<number>;
  snapGamesSheetToNearestRef: MutableRefObject<
    (targetValue: number, velocity?: number) => void
  >;
  cancelVenueComposerRef: MutableRefObject<() => void>;
};

export function useGamesSheetPanResponder({
  defaultCollapsedGamesSheetOffset,
  expandedGamesSheetOffset,
  venueComposerOpen,
  gamesSheetTranslateY,
  currentGamesSheetValueRef,
  sheetPanStartRef,
  snapGamesSheetToNearestRef,
  cancelVenueComposerRef,
}: GamesSheetPanResponderParams) {
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          gamesSheetTranslateY.stopAnimation();
          sheetPanStartRef.current = currentGamesSheetValueRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextValue = clamp(
            sheetPanStartRef.current + gestureState.dy,
            expandedGamesSheetOffset,
            defaultCollapsedGamesSheetOffset
          );
          gamesSheetTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 10 && venueComposerOpen) {
            cancelVenueComposerRef.current();
          }

          if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.vy) < 0.2) {
            snapGamesSheetToNearestRef.current(
              currentGamesSheetValueRef.current,
              gestureState.vy
            );
            return;
          }

          const projectedValue = clamp(
            currentGamesSheetValueRef.current + gestureState.vy * 180,
            expandedGamesSheetOffset,
            defaultCollapsedGamesSheetOffset
          );

          snapGamesSheetToNearestRef.current(projectedValue, gestureState.vy);
        },
        onPanResponderTerminate: () => {
          if (venueComposerOpen) {
            cancelVenueComposerRef.current();
          }
          snapGamesSheetToNearestRef.current(currentGamesSheetValueRef.current);
        },
      }),
    [
      cancelVenueComposerRef,
      currentGamesSheetValueRef,
      defaultCollapsedGamesSheetOffset,
      expandedGamesSheetOffset,
      gamesSheetTranslateY,
      sheetPanStartRef,
      snapGamesSheetToNearestRef,
      venueComposerOpen,
    ]
  );
}

type GamesSheetSectionPanResponderParams = {
  gamesSheetSection: GamesSheetSection;
  gamesSectionTranslateX: Animated.Value;
  gamesSectionOpacity: Animated.Value;
  switchGamesSheetSectionRef: MutableRefObject<
    (
      nextSection: GamesSheetSection,
      options?: {
        animate?: boolean;
        direction?: "left" | "right";
      }
    ) => void
  >;
};

export function useGamesSheetSectionPanResponder({
  gamesSheetSection,
  gamesSectionTranslateX,
  gamesSectionOpacity,
  switchGamesSheetSectionRef,
}: GamesSheetSectionPanResponderParams) {
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 6,
        /**
         * No `onMoveShouldSetPanResponderCapture`: capture would run before children and
         * steal horizontal drags from nested horizontal ScrollViews (e.g. trilho de jogos
         * no editor de local), switching tabs when the user only meant to scroll chips.
         */
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          gamesSectionTranslateX.stopAnimation();
          gamesSectionOpacity.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          const draggingTowardVenue = gamesSheetSection === "meetups" && gestureState.dx < 0;
          const draggingTowardMeetup = gamesSheetSection === "venues" && gestureState.dx > 0;
          const factor = draggingTowardVenue || draggingTowardMeetup ? 0.42 : 0.16;
          gamesSectionTranslateX.setValue(gestureState.dx * factor);
          gamesSectionOpacity.setValue(1 - Math.min(Math.abs(gestureState.dx) / 240, 0.12));
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldGoToVenues =
            gamesSheetSection === "meetups" &&
            (gestureState.dx < -42 || gestureState.vx < -0.48);
          const shouldGoToMeetups =
            gamesSheetSection === "venues" &&
            (gestureState.dx > 42 || gestureState.vx > 0.48);

          if (shouldGoToVenues) {
            switchGamesSheetSectionRef.current("venues", {
              animate: true,
              direction: "left",
            });
            return;
          }

          if (shouldGoToMeetups) {
            switchGamesSheetSectionRef.current("meetups", {
              animate: true,
              direction: "right",
            });
            return;
          }

          Animated.parallel([
            Animated.spring(gamesSectionTranslateX, {
              toValue: 0,
              damping: 25,
              stiffness: 260,
              mass: 0.92,
              overshootClamping: true,
              useNativeDriver: true,
            }),
            Animated.timing(gamesSectionOpacity, {
              toValue: 1,
              duration: 160,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(gamesSectionTranslateX, {
              toValue: 0,
              damping: 25,
              stiffness: 260,
              mass: 0.92,
              overshootClamping: true,
              useNativeDriver: true,
            }),
            Animated.timing(gamesSectionOpacity, {
              toValue: 1,
              duration: 160,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [gamesSectionOpacity, gamesSectionTranslateX, gamesSheetSection, switchGamesSheetSectionRef]
  );
}

type PageDismissPanResponderParams = {
  activeScreen: string;
  height: number;
  pageTranslateY: Animated.Value;
  currentPageTranslateYRef: MutableRefObject<number>;
  pagePanStartRef: MutableRefObject<number>;
  animatePageInRef: MutableRefObject<() => void>;
  closeCurrentPageToMapRef: MutableRefObject<() => void>;
  closePlayerProfileRef: MutableRefObject<() => void>;
};

type DrawerPanRespondersParams = {
  edgeSwipeEnabled: boolean;
  drawerOpen: boolean;
  drawerWidth: number;
  drawerTranslateX: Animated.Value;
  drawerBackdropOpacity: Animated.Value;
  currentDrawerTranslateXRef: MutableRefObject<number>;
  drawerPanStartRef: MutableRefObject<number>;
  animateDrawerVisibility: (open: boolean, onComplete?: () => void) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
};

type ChatRoomBackPanResponderParams = {
  enabled: boolean;
  screenWidth: number;
  chatRoomTranslateX: Animated.Value;
  currentChatRoomTranslateXRef: MutableRefObject<number>;
  chatRoomPanStartRef: MutableRefObject<number>;
  onBack: () => void;
};

export function useDrawerPanResponders({
  edgeSwipeEnabled,
  drawerOpen,
  drawerWidth,
  drawerTranslateX,
  drawerBackdropOpacity,
  currentDrawerTranslateXRef,
  drawerPanStartRef,
  animateDrawerVisibility,
  onOpenDrawer,
  onCloseDrawer,
}: DrawerPanRespondersParams) {
  const edgePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          edgeSwipeEnabled &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          drawerPanStartRef.current = currentDrawerTranslateXRef.current;
          drawerTranslateX.stopAnimation((value) => {
            currentDrawerTranslateXRef.current = value;
            drawerPanStartRef.current = value;
          });
          drawerBackdropOpacity.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextValue = clamp(-drawerWidth + gestureState.dx, -drawerWidth, 0);
          const progress = 1 - Math.abs(nextValue) / drawerWidth;
          currentDrawerTranslateXRef.current = nextValue;
          drawerTranslateX.setValue(nextValue);
          drawerBackdropOpacity.setValue(progress);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const projectedValue = clamp(
            currentDrawerTranslateXRef.current + gestureState.vx * 180,
            -drawerWidth,
            0
          );
          const shouldOpen =
            projectedValue > -drawerWidth * 0.52 || gestureState.dx > drawerWidth * 0.22;

          if (shouldOpen) {
            onOpenDrawer();
            return;
          }

          animateDrawerVisibility(false);
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const projectedValue = clamp(
            currentDrawerTranslateXRef.current + gestureState.vx * 180,
            -drawerWidth,
            0
          );
          const shouldOpen =
            projectedValue > -drawerWidth * 0.52 || currentDrawerTranslateXRef.current > -drawerWidth * 0.44;

          if (shouldOpen) {
            onOpenDrawer();
            return;
          }

          animateDrawerVisibility(false);
        },
      }),
    [
      animateDrawerVisibility,
      currentDrawerTranslateXRef,
      drawerBackdropOpacity,
      drawerPanStartRef,
      drawerTranslateX,
      drawerWidth,
      edgeSwipeEnabled,
      onOpenDrawer,
    ]
  );

  const drawerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          drawerOpen &&
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          drawerPanStartRef.current = currentDrawerTranslateXRef.current;
          drawerTranslateX.stopAnimation((value) => {
            currentDrawerTranslateXRef.current = value;
            drawerPanStartRef.current = value;
          });
          drawerBackdropOpacity.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextValue = clamp(drawerPanStartRef.current + gestureState.dx, -drawerWidth, 0);
          const progress = 1 - Math.abs(nextValue) / drawerWidth;
          currentDrawerTranslateXRef.current = nextValue;
          drawerTranslateX.setValue(nextValue);
          drawerBackdropOpacity.setValue(progress);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const projectedValue = clamp(
            currentDrawerTranslateXRef.current + gestureState.vx * 180,
            -drawerWidth,
            0
          );
          const shouldClose =
            projectedValue < -drawerWidth * 0.48 || gestureState.dx < -drawerWidth * 0.18;

          if (shouldClose) {
            onCloseDrawer();
            return;
          }

          animateDrawerVisibility(true);
        },
        onPanResponderTerminate: (_event, gestureState) => {
          const projectedValue = clamp(
            currentDrawerTranslateXRef.current + gestureState.vx * 180,
            -drawerWidth,
            0
          );
          const shouldClose =
            projectedValue < -drawerWidth * 0.48 ||
            currentDrawerTranslateXRef.current < -drawerWidth * 0.44;

          if (shouldClose) {
            onCloseDrawer();
            return;
          }

          animateDrawerVisibility(true);
        },
      }),
    [
      animateDrawerVisibility,
      currentDrawerTranslateXRef,
      drawerBackdropOpacity,
      drawerOpen,
      drawerPanStartRef,
      drawerTranslateX,
      drawerWidth,
      onCloseDrawer,
    ]
  );

  return {
    edgePanResponder,
    drawerPanResponder,
  };
}

export function useChatRoomBackPanResponder({
  enabled,
  screenWidth,
  chatRoomTranslateX,
  currentChatRoomTranslateXRef,
  chatRoomPanStartRef,
  onBack,
}: ChatRoomBackPanResponderParams) {
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          enabled &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          chatRoomTranslateX.stopAnimation((value) => {
            currentChatRoomTranslateXRef.current = value;
            chatRoomPanStartRef.current = value;
          });
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextValue = clamp(chatRoomPanStartRef.current + gestureState.dx, 0, screenWidth);
          currentChatRoomTranslateXRef.current = nextValue;
          chatRoomTranslateX.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const projectedValue = clamp(
            currentChatRoomTranslateXRef.current + gestureState.vx * 180,
            0,
            screenWidth
          );
          const shouldGoBack =
            projectedValue > screenWidth * 0.42 ||
            gestureState.dx > screenWidth * 0.22 ||
            gestureState.vx > 0.58;

          if (shouldGoBack) {
            onBack();
            return;
          }

          Animated.spring(chatRoomTranslateX, {
            toValue: 0,
            damping: 25,
            stiffness: 260,
            mass: 0.92,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(chatRoomTranslateX, {
            toValue: 0,
            damping: 25,
            stiffness: 260,
            mass: 0.92,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        },
      }),
    [
      chatRoomPanStartRef,
      chatRoomTranslateX,
      currentChatRoomTranslateXRef,
      enabled,
      onBack,
      screenWidth,
    ]
  );
}

export function usePageDismissPanResponder({
  activeScreen,
  height,
  pageTranslateY,
  currentPageTranslateYRef,
  pagePanStartRef,
  animatePageInRef,
  closeCurrentPageToMapRef,
  closePlayerProfileRef,
}: PageDismissPanResponderParams) {
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          pageTranslateY.stopAnimation();
          pagePanStartRef.current = currentPageTranslateYRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          const rawValue = pagePanStartRef.current + gestureState.dy;
          const nextValue = clamp(rawValue < 0 ? rawValue * 0.28 : rawValue, 0, height);
          pageTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const projectedValue = clamp(
            currentPageTranslateYRef.current + gestureState.vy * 160,
            0,
            height
          );
          const shouldClose =
            projectedValue > 118 || gestureState.dy > 82 || gestureState.vy > 0.72;

          if (shouldClose) {
            if (activeScreen === "player") {
              closePlayerProfileRef.current();
            } else {
              closeCurrentPageToMapRef.current();
            }
            return;
          }

          animatePageInRef.current();
        },
        onPanResponderTerminate: () => {
          animatePageInRef.current();
        },
      }),
    [
      activeScreen,
      animatePageInRef,
      closeCurrentPageToMapRef,
      closePlayerProfileRef,
      currentPageTranslateYRef,
      height,
      pagePanStartRef,
      pageTranslateY,
    ]
  );
}
