import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import type { LocationPickerMapProps } from "@/features/location/LocationPickerMap.types";
import { palette, radius, spacing } from "@/theme/tokens";
import type { MapCoordinate } from "@/types/domain";

export function LocationPickerMap({
  coordinate,
  radiusKm,
  onChangeCoordinate,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const region = useMemo(() => buildRegion(coordinate), [coordinate]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(region, 350);
  }, [region]);

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={(event: { nativeEvent: { coordinate: MapCoordinate } }) => {
          onChangeCoordinate(event.nativeEvent.coordinate);
        }}
      >
        <Circle
          center={coordinate}
          radius={Math.max(radiusKm, 1) * 1000}
          fillColor="rgba(241, 143, 92, 0.12)"
          strokeColor="rgba(241, 143, 92, 0.55)"
        />
        <Marker
          coordinate={coordinate}
          draggable
          pinColor={palette.ember}
          onDragEnd={(event: { nativeEvent: { coordinate: MapCoordinate } }) => {
            onChangeCoordinate(event.nativeEvent.coordinate);
          }}
        />
      </MapView>
      <View style={styles.footer}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.footerSurface}
        />
        <Text style={styles.title}>Ponto aproximado do seu perfil</Text>
        <Text style={styles.body}>
          Toque no mapa ou arraste o pin para ajustar sua área aproximada.
        </Text>
      </View>
    </View>
  );
}

function buildRegion(coordinate: MapCoordinate): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
  },
  map: {
    width: "100%",
    height: 240,
  },
  footer: {
    gap: spacing.xs,
    padding: spacing.md,
    overflow: "hidden",
  },
  footerSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
});
