import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import type { ComponentType } from "react";

import { appInfo } from "@/lib/appInfo";
import { env } from "@/lib/env";

const isSentryEnabled = Boolean(env.sentryDsn) && !__DEV__;
const isApplePerformanceMonitoringEnabled = Platform.OS === "ios" && isSentryEnabled;
let monitoringInitialized = false;

type GGNativeMonitoringOptions = Parameters<typeof Sentry.init>[0] & {
  enableMetricKit?: boolean;
  enableMetricKitRawPayload?: boolean;
};

export function initializeMonitoring() {
  if (monitoringInitialized) {
    return;
  }

  monitoringInitialized = true;

  if (!env.sentryDsn) {
    return;
  }

  const options: GGNativeMonitoringOptions = {
    dsn: env.sentryDsn,
    enabled: isSentryEnabled,
    release: `good-game-mobile@${appInfo.version}`,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    profilesSampleRate: 0,
    enableAutoSessionTracking: true,
    enableWatchdogTerminationTracking: true,
    enableAppHangTracking: true,
    attachScreenshot: false,
    attachViewHierarchy: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 60,
    enableMetricKit: isApplePerformanceMonitoringEnabled,
    enableMetricKitRawPayload: false,
    initialScope: {
      tags: {
        platform: Platform.OS,
        apple_performance_monitoring: isApplePerformanceMonitoringEnabled ? "metrickit" : "disabled",
      },
    },
  };

  Sentry.init(options);
}

export function wrapRootComponent<P extends Record<string, unknown>>(
  RootComponent: ComponentType<P>
) {
  if (!env.sentryDsn) {
    return RootComponent;
  }

  return Sentry.wrap(RootComponent);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.captureMessage(message, context ? { extra: context } : undefined);
}

export function setMonitoringUser(input: {
  id: string;
  handle?: string;
  username?: string;
}) {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.setUser({
    id: input.id,
    username: input.username,
    data: {
      handle: input.handle,
    },
  });
}

export function clearMonitoringUser() {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.setUser(null);
}

export function addMonitoringBreadcrumb(input: {
  category: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  if (!env.sentryDsn) {
    return;
  }

  Sentry.addBreadcrumb({
    category: input.category,
    message: input.message,
    data: input.data,
    level: "info",
  });
}

export { Sentry, isSentryEnabled };
