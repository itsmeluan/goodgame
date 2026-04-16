import * as Location from "expo-location";

import type { MapCoordinate } from "@/types/domain";

export async function ensureForegroundLocationPermission() {
  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status !== "granted") {
    throw new Error("Permita o acesso à localização para usar essa função.");
  }

  return permission;
}

export async function getDeviceCoordinate() {
  await ensureForegroundLocationPermission();

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 60 * 1000,
    requiredAccuracy: 1000,
  });

  const resolvedLocation =
    lastKnown ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }));

  return {
    latitude: resolvedLocation.coords.latitude,
    longitude: resolvedLocation.coords.longitude,
  } satisfies MapCoordinate;
}

export async function reverseGeocodeNeighborhood(coordinate: MapCoordinate) {
  const [address] = await Location.reverseGeocodeAsync({
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  });

  return address?.district ?? address?.city ?? null;
}

export async function reverseGeocodeAddress(coordinate: MapCoordinate) {
  const [address] = await Location.reverseGeocodeAsync({
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  });

  if (!address) {
    return {
      label: null,
      neighborhood: null,
    };
  }

  const street =
    address.street ??
    address.name ??
    address.city ??
    address.subregion ??
    address.region ??
    null;
  const streetNumber = address.streetNumber ?? null;
  const neighborhood = address.district ?? address.city ?? null;

  return {
    label: [street, streetNumber, neighborhood].filter(Boolean).join(", ") || null,
    neighborhood,
  };
}

export function resolveHeading(input: {
  trueHeading?: number | null;
  magHeading?: number | null;
  coordsHeading?: number | null;
}) {
  if (typeof input.trueHeading === "number" && input.trueHeading >= 0) {
    return normalizeHeading(input.trueHeading);
  }

  if (typeof input.magHeading === "number" && input.magHeading >= 0) {
    return normalizeHeading(input.magHeading);
  }

  if (typeof input.coordsHeading === "number" && input.coordsHeading >= 0) {
    return normalizeHeading(input.coordsHeading);
  }

  return null;
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}
