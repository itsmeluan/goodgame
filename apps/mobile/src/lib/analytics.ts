import { Platform } from "react-native";
import PostHog from "posthog-react-native";
import type { JsonType } from "@posthog/core";

import { appInfo } from "@/lib/appInfo";
import { env } from "@/lib/env";

const isAnalyticsEnabled = Boolean(env.posthogApiKey) && !__DEV__;

const analyticsClient = isAnalyticsEnabled
  ? new PostHog(env.posthogApiKey as string, {
      host: env.posthogHost,
      persistence: "file",
      captureAppLifecycleEvents: true,
      preloadFeatureFlags: false,
      flushAt: 10,
      flushInterval: 10000,
      requestTimeout: 10000,
      defaultOptIn: true,
    })
  : null;

let analyticsBootstrapped = false;
let lastTrackedScreen: string | null = null;

type AnalyticsProperties = Record<string, JsonType>;

function runWithAnalytics(task: (client: PostHog) => void) {
  if (!analyticsClient) {
    return;
  }

  try {
    task(analyticsClient);
  } catch {}
}

function normalizeProperties(
  properties?: Record<string, unknown>
): AnalyticsProperties | undefined {
  if (!properties) {
    return undefined;
  }

  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries) as AnalyticsProperties;
}

export function initializeAnalytics() {
  if (analyticsBootstrapped) {
    return;
  }

  analyticsBootstrapped = true;

  runWithAnalytics((client) => {
    void client.register({
      app_name: appInfo.name,
      app_version: appInfo.version,
      platform: Platform.OS,
    });
  });
}

export function analyticsScreen(name: string, properties?: Record<string, unknown>) {
  if (lastTrackedScreen === name) {
    return;
  }

  lastTrackedScreen = name;
  runWithAnalytics((client) => {
    void client.screen(name, normalizeProperties(properties));
  });
}

export function analyticsCapture(event: string, properties?: Record<string, unknown>) {
  runWithAnalytics((client) => {
    void client.capture(event, normalizeProperties(properties));
  });
}

export function analyticsIdentify(input: {
  userId: string;
  handle?: string;
  displayName?: string;
  neighborhood?: string | null;
  canHost?: boolean;
}) {
  runWithAnalytics((client) => {
    client.identify(input.userId, {
      handle: input.handle ?? null,
      display_name: input.displayName ?? null,
      neighborhood: input.neighborhood ?? null,
      can_host: input.canHost ?? null,
      app_version: appInfo.version,
      platform: Platform.OS,
    });
  });
}

export function analyticsReset() {
  lastTrackedScreen = null;
  runWithAnalytics((client) => {
    client.reset();
  });
}

export async function analyticsFlush() {
  if (!analyticsClient) {
    return;
  }

  try {
    await analyticsClient.flush();
  } catch {}
}

export { analyticsClient, isAnalyticsEnabled };
