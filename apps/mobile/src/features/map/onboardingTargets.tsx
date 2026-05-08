import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform, StatusBar, View, type ViewProps } from "react-native";

// On Android with edge-to-edge enabled, the application window covers the
// full screen but `measureInWindow` returns y coordinates excluding the
// status bar inset. Our onboarding overlay sits at the top of the window
// (y = 0), so we must add the status bar height back in to align the
// spotlight with the actual element on screen. iOS reports y in the same
// coordinate space as the overlay, so no adjustment is needed there.
const ANDROID_MEASURE_Y_OFFSET =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

export type OnboardingTargetKey =
  | "menu_button"
  | "profile_button"
  | "friends_button"
  | "new_game_button"
  | "filters_button"
  | "sheet_handle"
  | "sheet_tabs"
  | "sheet_new_venue_button"
  | "venue_sheet_close"
  | "meetup_sheet_close"
  | "drawer_map"
  | "drawer_games"
  | "drawer_places"
  | "drawer_nearby"
  | "drawer_chats"
  | "drawer_alerts"
  | "drawer_news"
  | "drawer_history"
  | "drawer_feedback";

export type OnboardingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RectMap = Partial<Record<OnboardingTargetKey, OnboardingRect>>;

// API context is intentionally separated from the rects context so that
// the API methods (`setRect`, `registerMeasurer`, `remeasureAll`) keep a
// stable identity across renders. If they were bundled together with the
// `rects` map, every measurement update would produce a new context value,
// invalidating every `useOnboardingTarget` effect's deps and causing
// cascading register/unregister churn — which previously made the
// spotlight intermittently show the previous step's target while the
// current step's rect was momentarily nulled.
type OnboardingTargetsApi = {
  setRect: (key: OnboardingTargetKey, rect: OnboardingRect | null) => void;
  registerMeasurer: (key: OnboardingTargetKey, measurer: () => void) => () => void;
  remeasureAll: () => void;
};

const OnboardingTargetsApiContext = createContext<OnboardingTargetsApi | null>(null);
const OnboardingTargetsRectsContext = createContext<RectMap>({});

export function OnboardingTargetsProvider({ children }: { children: ReactNode }) {
  const [rects, setRects] = useState<RectMap>({});
  const measurersRef = useRef(
    new Map<OnboardingTargetKey, Set<() => void>>()
  );

  // The API value is constructed once and never changes identity.
  const apiRef = useRef<OnboardingTargetsApi | null>(null);
  if (!apiRef.current) {
    const setRect: OnboardingTargetsApi["setRect"] = (key, rect) => {
      setRects((prev) => {
        const existing = prev[key];
        if (!rect) {
          if (!existing) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        if (
          existing &&
          Math.abs(existing.x - rect.x) < 0.5 &&
          Math.abs(existing.y - rect.y) < 0.5 &&
          Math.abs(existing.width - rect.width) < 0.5 &&
          Math.abs(existing.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [key]: rect };
      });
    };

    const registerMeasurer: OnboardingTargetsApi["registerMeasurer"] = (key, measurer) => {
      const map = measurersRef.current;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = new Set();
        map.set(key, bucket);
      }
      bucket.add(measurer);
      return () => {
        const current = map.get(key);
        if (!current) return;
        current.delete(measurer);
        if (current.size === 0) {
          map.delete(key);
          // Intentionally do NOT null the rect here. The next time a
          // component for the same key mounts, its onLayout/measure will
          // overwrite the rect. Nulling on unmount caused flicker because
          // a transient re-mount or list-key churn would leave the
          // spotlight without a rect for a paint or two.
        }
      };
    };

    const remeasureAll: OnboardingTargetsApi["remeasureAll"] = () => {
      measurersRef.current.forEach((bucket) => {
        bucket.forEach((measurer) => measurer());
      });
    };

    apiRef.current = { setRect, registerMeasurer, remeasureAll };
  }

  return (
    <OnboardingTargetsApiContext.Provider value={apiRef.current}>
      <OnboardingTargetsRectsContext.Provider value={rects}>
        {children}
      </OnboardingTargetsRectsContext.Provider>
    </OnboardingTargetsApiContext.Provider>
  );
}

export function useOnboardingTargetRects(): RectMap {
  return useContext(OnboardingTargetsRectsContext);
}

export function useOnboardingRemeasure(): () => void {
  const api = useContext(OnboardingTargetsApiContext);
  return api?.remeasureAll ?? noop;
}

function noop() {}

export function useOnboardingTarget(key: OnboardingTargetKey | null) {
  const api = useContext(OnboardingTargetsApiContext);
  const ref = useRef<View>(null);

  // `api` identity is stable for the lifetime of the provider, so the
  // measure callback only changes when `key` changes (which never happens
  // for a given OnboardingTargetView in practice).
  const measure = useCallback(() => {
    if (!api || !key) return;
    const node = ref.current;
    if (!node || typeof node.measureInWindow !== "function") return;
    node.measureInWindow((x, y, width, height) => {
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number"
      ) {
        return;
      }
      if (width <= 0 || height <= 0) {
        return;
      }
      api.setRect(key, {
        x,
        y: y + ANDROID_MEASURE_Y_OFFSET,
        width,
        height,
      });
    });
  }, [api, key]);

  useEffect(() => {
    if (!api || !key) return undefined;
    return api.registerMeasurer(key, measure);
  }, [api, key, measure]);

  return { ref, onLayout: measure, measure };
}

type OnboardingTargetViewProps = ViewProps & {
  targetKey: OnboardingTargetKey | null;
  children: ReactNode;
};

export function OnboardingTargetView({
  targetKey,
  children,
  onLayout,
  ...rest
}: OnboardingTargetViewProps) {
  const target = useOnboardingTarget(targetKey);
  return (
    <View
      {...rest}
      ref={target.ref}
      collapsable={false}
      onLayout={(event) => {
        target.onLayout();
        onLayout?.(event);
      }}
    >
      {children}
    </View>
  );
}
