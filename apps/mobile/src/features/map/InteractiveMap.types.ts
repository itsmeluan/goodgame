import type { Region } from "react-native-maps";
import type { MapCoordinate, MeetupPost, PlayerProfile, VenueCard } from "@/types/domain";

export type MapSelectionGroup = {
  key: string;
  kind: "meetup" | "venue";
  coordinate: MapCoordinate;
  meetupIds: string[];
  venueIds: string[];
  primaryMeetupId: string | null;
  primaryVenueId: string | null;
};

export type InteractiveMapProps = {
  profile: PlayerProfile;
  visibleRadiusKm?: number | null;
  meetups: MeetupPost[];
  venues: VenueCard[];
  selectedMeetupId: string | null;
  selectedVenueId: string | null;
  selectedMapGroupKey?: string | null;
  draftCoordinate: MapCoordinate | null;
  immersive?: boolean;
  allowDraftSelection?: boolean;
  bottomOverlayHeight?: number;
  onVisibleRegionChange?: (region: Region) => void;
  onSelectMeetup: (meetupId: string) => void;
  onSelectVenue: (venueId: string) => void;
  onSelectMapGroup?: (group: MapSelectionGroup) => void;
  onClearSelection: () => void;
  onSelectDraftCoordinate: (coordinate: MapCoordinate) => void;
};
