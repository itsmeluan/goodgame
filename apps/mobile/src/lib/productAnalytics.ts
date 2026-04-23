import { Platform } from "react-native";
import * as Device from "expo-device";

import { analyticsCapture } from "@/lib/analytics";
import { appInfo } from "@/lib/appInfo";
import { supabase } from "@/lib/supabase";

type ProductEventCategory =
  | "lifecycle"
  | "navigation"
  | "onboarding"
  | "discovery"
  | "meetup"
  | "feedback"
  | "monetization"
  | "engagement";

type TrackProductEventInput = {
  eventName: string;
  eventCategory: ProductEventCategory;
  oncePerUser?: boolean;
  userIdOverride?: string | null;
  occurredAt?: string | null;
  region?: string | null;
  gameType?: string | null;
  relatedEntityId?: string | null;
  screenName?: string | null;
  acquisitionSource?: string | null;
  context?: Record<string, unknown>;
};

const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function normalizePlatform(): string {
  if (Platform.OS === "ios") {
    return "ios";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return Platform.OS;
}

function cleanContext(context?: Record<string, unknown>) {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined)
  );
}

export async function trackProductEvent(input: TrackProductEventInput): Promise<void> {
  const payloadContext = cleanContext(input.context);

  analyticsCapture(input.eventName, {
    ...payloadContext,
    product_event_category: input.eventCategory,
    session_id: sessionId,
    app_version: appInfo.version,
    app_build_number: appInfo.buildNumber,
    platform: normalizePlatform(),
    screen_name: input.screenName ?? null,
    related_entity_id: input.relatedEntityId ?? null,
    region: input.region ?? null,
    game_type: input.gameType ?? null,
  });

  try {
    const { error } = await supabase.rpc("track_product_event", {
      p_event_name: input.eventName,
      p_event_category: input.eventCategory,
      p_platform: normalizePlatform(),
      p_app_version: appInfo.version,
      p_app_build_number: appInfo.buildNumber,
      p_os_version: String(Device.osVersion ?? Platform.Version ?? ""),
      p_device_model: Device.modelName ?? null,
      p_session_id: sessionId,
      p_occurred_at: input.occurredAt ?? null,
      p_context: payloadContext,
      p_region: input.region ?? null,
      p_game_type: input.gameType ?? null,
      p_related_entity_id: input.relatedEntityId ?? null,
      p_screen_name: input.screenName ?? null,
      p_acquisition_source: input.acquisitionSource ?? null,
      p_once_per_user: input.oncePerUser ?? false,
      p_user_id: input.userIdOverride ?? null,
    });

    if (error && __DEV__) {
      console.warn("[product-analytics]", input.eventName, error.message);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("[product-analytics]", input.eventName, error);
    }
  }
}

export function getProductAnalyticsSessionId() {
  return sessionId;
}
