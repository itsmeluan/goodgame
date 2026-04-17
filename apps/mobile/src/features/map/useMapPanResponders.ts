import { useMemo, type MutableRefObject } from "react";
import { Animated, Easing, Keyboard, PanResponder } from "react-native";

import { clamp } from "@/features/map/mapHelpers";

type GamesSheetSection = "meetups" | "venues";

type GamesSheetPanResponderParams = {
  defaultCollapsedGamesSheetOffset: number;
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
            0,
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
            0,
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
