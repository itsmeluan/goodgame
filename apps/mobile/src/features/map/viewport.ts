import type { Region } from "react-native-maps";

export type ViewportFeedBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function buildBufferedBoundsFromRegion(
  region: Region,
  bufferMultiplier = 0.35
): ViewportFeedBounds {
  const latitudeBuffer = region.latitudeDelta * bufferMultiplier;
  const longitudeBuffer = region.longitudeDelta * bufferMultiplier;

  return {
    minLat: region.latitude - region.latitudeDelta / 2 - latitudeBuffer,
    maxLat: region.latitude + region.latitudeDelta / 2 + latitudeBuffer,
    minLng: region.longitude - region.longitudeDelta / 2 - longitudeBuffer,
    maxLng: region.longitude + region.longitudeDelta / 2 + longitudeBuffer,
  };
}

export function shouldRefreshViewportBounds(
  previousBounds: ViewportFeedBounds | null,
  nextBounds: ViewportFeedBounds,
  options?: {
    centerThresholdRatio?: number;
    zoomThresholdRatio?: number;
  }
) {
  if (!previousBounds) {
    return true;
  }

  const centerThresholdRatio = options?.centerThresholdRatio ?? 0.18;
  const zoomThresholdRatio = options?.zoomThresholdRatio ?? 0.22;

  const previousLatSpan = Math.max(previousBounds.maxLat - previousBounds.minLat, 0.0008);
  const previousLngSpan = Math.max(previousBounds.maxLng - previousBounds.minLng, 0.0008);
  const nextLatSpan = nextBounds.maxLat - nextBounds.minLat;
  const nextLngSpan = nextBounds.maxLng - nextBounds.minLng;

  const previousLatCenter = (previousBounds.minLat + previousBounds.maxLat) / 2;
  const previousLngCenter = (previousBounds.minLng + previousBounds.maxLng) / 2;
  const nextLatCenter = (nextBounds.minLat + nextBounds.maxLat) / 2;
  const nextLngCenter = (nextBounds.minLng + nextBounds.maxLng) / 2;

  const latitudeShift = Math.abs(nextLatCenter - previousLatCenter);
  const longitudeShift = Math.abs(nextLngCenter - previousLngCenter);
  const latitudeSpanDelta = Math.abs(nextLatSpan - previousLatSpan);
  const longitudeSpanDelta = Math.abs(nextLngSpan - previousLngSpan);

  return (
    latitudeShift > previousLatSpan * centerThresholdRatio ||
    longitudeShift > previousLngSpan * centerThresholdRatio ||
    latitudeSpanDelta > previousLatSpan * zoomThresholdRatio ||
    longitudeSpanDelta > previousLngSpan * zoomThresholdRatio
  );
}

export function mergeById<T extends { id: string }>(priorityItems: T[], fallbackItems: T[]) {
  const merged = new Map<string, T>();

  fallbackItems.forEach((item) => {
    merged.set(item.id, item);
  });

  priorityItems.forEach((item) => {
    merged.set(item.id, item);
  });

  return Array.from(merged.values());
}
