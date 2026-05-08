import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View, type ViewProps } from "react-native";

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

type OnboardingTargetsContextValue = {
  rects: RectMap;
  setRect: (key: OnboardingTargetKey, rect: OnboardingRect | null) => void;
  registerMeasurer: (key: OnboardingTargetKey, measurer: () => void) => () => void;
  remeasureAll: () => void;
};

const OnboardingTargetsContext =
  createContext<OnboardingTargetsContextValue | null>(null);

export function OnboardingTargetsProvider({ children }: { children: ReactNode }) {
  const [rects, setRects] = useState<RectMap>({});
  const measurersRef = useRef(
    new Map<OnboardingTargetKey, Set<() => void>>()
  );

  const setRect = useCallback(
    (key: OnboardingTargetKey, rect: OnboardingRect | null) => {
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
    },
    []
  );

  const registerMeasurer = useCallback(
    (key: OnboardingTargetKey, measurer: () => void) => {
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
          setRect(key, null);
        }
      };
    },
    [setRect]
  );

  const remeasureAll = useCallback(() => {
    measurersRef.current.forEach((bucket) => {
      bucket.forEach((measurer) => measurer());
    });
  }, []);

  const value = useMemo(
    () => ({ rects, setRect, registerMeasurer, remeasureAll }),
    [rects, setRect, registerMeasurer, remeasureAll]
  );

  return (
    <OnboardingTargetsContext.Provider value={value}>
      {children}
    </OnboardingTargetsContext.Provider>
  );
}

export function useOnboardingTargetRects(): RectMap {
  return useContext(OnboardingTargetsContext)?.rects ?? {};
}

export function useOnboardingRemeasure(): () => void {
  const ctx = useContext(OnboardingTargetsContext);
  return ctx?.remeasureAll ?? noop;
}

function noop() {}

export function useOnboardingTarget(key: OnboardingTargetKey | null) {
  const ctx = useContext(OnboardingTargetsContext);
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    if (!ctx || !key) return;
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
        ctx.setRect(key, null);
        return;
      }
      ctx.setRect(key, { x, y, width, height });
    });
  }, [ctx, key]);

  useEffect(() => {
    if (!ctx || !key) return undefined;
    return ctx.registerMeasurer(key, measure);
  }, [ctx, key, measure]);

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
