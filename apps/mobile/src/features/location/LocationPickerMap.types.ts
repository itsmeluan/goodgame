import type { MapCoordinate } from "@/types/domain";

export type LocationPickerMapProps = {
  coordinate: MapCoordinate;
  radiusKm: number;
  onChangeCoordinate: (coordinate: MapCoordinate) => void;
};

