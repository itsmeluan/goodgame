import {
  createContext,
  useCallback,
  useContext,
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
};

const OnboardingTargetsContext =
  createContext<OnboardingTargetsContextValue | null>(null);

export function OnboardingTargetsProvider({ children }: { children: ReactNode }) {
  const [rects, setRects] = useState<RectMap>({});

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

  const value = useMemo(() => ({ rects, setRect }), [rects, setRect]);

  return (
    <OnboardingTargetsContext.Provider value={value}>
      {children}
    </OnboardingTargetsContext.Provider>
  );
}

export function useOnboardingTargetRects(): RectMap {
  return useContext(OnboardingTargetsContext)?.rects ?? {};
}

/**
 * Returns props (`ref`, `onLayout`) to attach to a `<View>` so that its
 * window-relative rectangle is registered for the given onboarding target
 * key. Pass `null` to disable registration.
 */
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

  return { ref, onLayout: measure, measure };
}

type OnboardingTargetViewProps = ViewProps & {
  targetKey: OnboardingTargetKey | null;
  children: ReactNode;
};

/**
 * Convenience wrapper that registers its layout for the given onboarding
 * target key. Acts as a transparent `<View>`.
 */
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
