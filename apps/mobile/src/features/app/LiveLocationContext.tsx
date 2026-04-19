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
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";

import { updateMyApproximateLocation } from "@/lib/api";
import { ensureForegroundLocationPermission, getDeviceCoordinate, resolveHeading } from "@/lib/location";
import type { MapCoordinate } from "@/types/domain";

const MIN_WRITE_INTERVAL_MS = 45_000;
const MIN_WRITE_DISTANCE_M = 80;
/** Só alinha `profile.lat/lng` no React após persistir no servidor — use RPC leve, não bundle completo. */
const MIN_PROFILE_REFRESH_MS = 600_000;

function distanceMeters(a: MapCoordinate, b: MapCoordinate) {
  const earthRadiusM = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type LiveLocationContextValue = {
  coordinate: MapCoordinate | null;
  accuracy: number | null;
  heading: number | null;
  permissionStatus: Location.PermissionResponse["status"] | null;
  /** Solicita permissão de localização e religa o GPS (mapa + sync). */
  requestAccess: () => Promise<void>;
};

const LiveLocationContext = createContext<LiveLocationContextValue | null>(null);

type LiveLocationProviderProps = {
  enabled: boolean;
  children: ReactNode;
  /** Opcional: após gravar GPS no servidor, só atualizar o perfil (ex.: `getMyProfile`). Evite `loadProfileBundle` aqui. */
  onApproximateLocationPersisted?: () => void | Promise<void>;
};

export function LiveLocationProvider({
  enabled,
  children,
  onApproximateLocationPersisted,
}: LiveLocationProviderProps) {
  const [coordinate, setCoordinate] = useState<MapCoordinate | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionResponse["status"] | null>(
    null
  );
  const [watchGeneration, setWatchGeneration] = useState(0);

  const lastWriteRef = useRef<{ at: number; coord: MapCoordinate } | null>(null);
  const lastProfileSyncRef = useRef(0);
  const latestCoordRef = useRef<MapCoordinate | null>(null);

  const requestAccess = useCallback(async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(result.status);
    setWatchGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    async function syncWrite(coord: MapCoordinate, options: { force?: boolean }) {
      const now = Date.now();
      latestCoordRef.current = coord;

      const last = lastWriteRef.current;
      if (!options.force && last) {
        const tooSoon = now - last.at < MIN_WRITE_INTERVAL_MS;
        const tooClose = distanceMeters(last.coord, coord) < MIN_WRITE_DISTANCE_M;
        if (tooSoon && tooClose) {
          return;
        }
      }

      try {
        await updateMyApproximateLocation(coord.latitude, coord.longitude);
      } catch {
        return;
      }

      lastWriteRef.current = { at: now, coord };

      if (now - lastProfileSyncRef.current >= MIN_PROFILE_REFRESH_MS) {
        lastProfileSyncRef.current = now;
        await onApproximateLocationPersisted?.();
      }
    }

    async function flushLatest() {
      const coord = latestCoordRef.current;
      if (!coord) {
        return;
      }
      await syncWrite(coord, { force: true });
    }

    async function startWatching() {
      let perm = await Location.getForegroundPermissionsAsync();
      if (cancelled) {
        return;
      }
      if (perm.status !== "granted") {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (cancelled) {
        return;
      }
      setPermissionStatus(perm.status);

      if (perm.status !== "granted") {
        setCoordinate(null);
        setAccuracy(null);
        setHeading(null);
        return;
      }

      try {
        await ensureForegroundLocationPermission();

        const currentCoordinate = await getDeviceCoordinate();
        if (cancelled) {
          return;
        }

        setCoordinate(currentCoordinate);
        setAccuracy(null);
        await syncWrite(currentCoordinate, { force: true });

        positionSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3,
            timeInterval: 1500,
          },
          (location) => {
            if (cancelled) {
              return;
            }

            const next: MapCoordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setCoordinate(next);
            setAccuracy(location.coords.accuracy ?? null);

            const nextHeading = resolveHeading({
              coordsHeading: location.coords.heading,
            });

            if (nextHeading !== null) {
              setHeading(nextHeading);
            }

            void syncWrite(next, { force: false });
          }
        );

        headingSubscription = await Location.watchHeadingAsync((h) => {
          if (cancelled) {
            return;
          }

          const nextHeading = resolveHeading({
            trueHeading: h.trueHeading,
            magHeading: h.magHeading,
          });

          if (nextHeading !== null) {
            setHeading(nextHeading);
          }
        });
      } catch {
        if (!cancelled) {
          setCoordinate(null);
          setHeading(null);
          setAccuracy(null);
        }
      }
    }

    void startWatching();

    const handleAppState = (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        void flushLatest();
      }
      if (next === "active") {
        void Location.getForegroundPermissionsAsync().then((r) => {
          if (!cancelled) {
            setPermissionStatus(r.status);
          }
        });
      }
    };

    const appListener = AppState.addEventListener("change", handleAppState);

    return () => {
      cancelled = true;
      appListener.remove();
      positionSubscription?.remove();
      headingSubscription?.remove();
      void flushLatest();
    };
  }, [enabled, onApproximateLocationPersisted, watchGeneration]);

  const value = useMemo<LiveLocationContextValue>(
    () => ({
      coordinate,
      accuracy,
      heading,
      permissionStatus,
      requestAccess,
    }),
    [coordinate, accuracy, heading, permissionStatus, requestAccess]
  );

  return <LiveLocationContext.Provider value={value}>{children}</LiveLocationContext.Provider>;
}

export function useLiveLocation(): LiveLocationContextValue {
  const ctx = useContext(LiveLocationContext);
  if (!ctx) {
    throw new Error("useLiveLocation must be used within LiveLocationProvider");
  }
  return ctx;
}
