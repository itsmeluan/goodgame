import { View } from "react-native";

import { MapDrawer, type MapDrawerProps } from "@/features/map/components/MapDrawer";
import { MapModalLayer, type MapModalLayerProps } from "@/features/map/components/MapModalLayer";
import { MapPageLayer, type MapPageLayerProps } from "@/features/map/components/MapPageLayer";
import {
  MapScreenLayer,
  type MapScreenLayerProps,
} from "@/features/map/components/MapScreenLayer";
import { styles } from "@/features/map/MapHomeScreen.styles";

type MapHomeSurfaceProps<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null },
> = {
  screenLayerProps: MapScreenLayerProps<MeetupItem, VenueItem>;
  pageLayerProps: MapPageLayerProps;
  drawerProps: MapDrawerProps;
  modalLayerProps: MapModalLayerProps;
};

export function MapHomeSurface<
  MeetupItem extends { id: string },
  VenueItem extends { id: string; name: string; neighborhood?: string | null },
>({
  screenLayerProps,
  pageLayerProps,
  drawerProps,
  modalLayerProps,
}: MapHomeSurfaceProps<MeetupItem, VenueItem>) {
  return (
    <View style={styles.screen}>
      <MapScreenLayer {...screenLayerProps} />
      <MapPageLayer {...pageLayerProps} />
      <MapDrawer {...drawerProps} />
      <MapModalLayer {...modalLayerProps} />
    </View>
  );
}
