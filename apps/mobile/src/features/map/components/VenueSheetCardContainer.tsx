import { inferGameLabelsFromVenue } from "@/features/map/gameLabels";
import { formatCompactAddress, formatDistanceKm } from "@/lib/formatting";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { VenueCard, VenueKind } from "@/types/domain";

import { VenueSheetCard } from "./VenueSheetCard";

type VenueGameOption = {
  id: string;
  label: string;
};

type VenueSheetCardContainerProps = {
  venue: VenueCard;
  profileLat: number | null;
  profileLng: number | null;
  profileUserId: string | null;
  selectedVenueId: string | null;
  expandedVenueInfoId: string | null;
  expandedVenueManageId: string | null;
  updatingVenueId: string | null;
  deletingEntityId: string | null;
  manageVenueName: string;
  manageVenueNeighborhood: string;
  manageVenueAddressQuery: string;
  manageVenueAddressFocused: boolean;
  manageVenueAddressSuggestions: AddressSuggestion[];
  manageVenueAddressLoading: boolean;
  manageVenueDetails: string;
  manageVenueKind: VenueKind;
  manageVenueGameIds: string[];
  venueKindOptions: readonly (readonly [VenueKind, string])[];
  venueGameOptions: VenueGameOption[];
  onFocusVenueOnMap: () => void;
  onCreateMeetupAtVenue: () => void;
  onToggleManage: () => void;
  onToggleInfo: () => void;
  onManageVenueNameChange: (value: string) => void;
  onManageVenueNeighborhoodChange: (value: string) => void;
  onManageVenueAddressFocusChange: (focused: boolean) => void;
  onManageVenueAddressChange: (value: string) => void;
  onManageVenueAddressUseCurrentLocation: () => void;
  onManageVenueAddressUseTyped: () => void;
  onManageVenueAddressSelect: (suggestion: AddressSuggestion) => void;
  onManageVenueDetailsChange: (value: string) => void;
  onSelectManageVenueKind: (kind: VenueKind) => void;
  onToggleManageVenueGame: (gameId: string) => void;
  onSaveVenueEdits: () => void;
  onPromptDeleteVenue: () => void;
};

export function VenueSheetCardContainer({
  venue,
  profileLat,
  profileLng,
  profileUserId,
  selectedVenueId,
  expandedVenueInfoId,
  expandedVenueManageId,
  updatingVenueId,
  deletingEntityId,
  manageVenueName,
  manageVenueNeighborhood,
  manageVenueAddressQuery,
  manageVenueAddressFocused,
  manageVenueAddressSuggestions,
  manageVenueAddressLoading,
  manageVenueDetails,
  manageVenueKind,
  manageVenueGameIds,
  venueKindOptions,
  venueGameOptions,
  onFocusVenueOnMap,
  onCreateMeetupAtVenue,
  onToggleManage,
  onToggleInfo,
  onManageVenueNameChange,
  onManageVenueNeighborhoodChange,
  onManageVenueAddressFocusChange,
  onManageVenueAddressChange,
  onManageVenueAddressUseCurrentLocation,
  onManageVenueAddressUseTyped,
  onManageVenueAddressSelect,
  onManageVenueDetailsChange,
  onSelectManageVenueKind,
  onToggleManageVenueGame,
  onSaveVenueEdits,
  onPromptDeleteVenue,
}: VenueSheetCardContainerProps) {
  const venueGameLabels = inferGameLabelsFromVenue(venue);
  const distanceLabel = formatDistanceKm(profileLat, profileLng, venue.lat, venue.lng);

  return (
    <VenueSheetCard
      venue={venue}
      canManage={venue.creatorUserId === profileUserId}
      selected={venue.id === selectedVenueId}
      distanceLabel={distanceLabel}
      venueGameLabels={venueGameLabels}
      locationLabel={
        formatCompactAddress(venue.address) || venue.neighborhood || "Sem endereço informado"
      }
      infoOpen={expandedVenueInfoId === venue.id}
      manageOpen={expandedVenueManageId === venue.id}
      updatingVenue={updatingVenueId === venue.id}
      deletingVenue={deletingEntityId === venue.id}
      manageVenueName={manageVenueName}
      manageVenueNeighborhood={manageVenueNeighborhood}
      manageVenueAddressQuery={manageVenueAddressQuery}
      manageVenueAddressFocused={manageVenueAddressFocused}
      manageVenueAddressSuggestions={manageVenueAddressSuggestions}
      manageVenueAddressLoading={manageVenueAddressLoading}
      manageVenueDetails={manageVenueDetails}
      manageVenueKind={manageVenueKind}
      manageVenueGameIds={manageVenueGameIds}
      venueKindOptions={venueKindOptions}
      venueGameOptions={venueGameOptions}
      onFocusVenueOnMap={onFocusVenueOnMap}
      onCreateMeetupAtVenue={onCreateMeetupAtVenue}
      onToggleManage={onToggleManage}
      onToggleInfo={onToggleInfo}
      onManageVenueNameChange={onManageVenueNameChange}
      onManageVenueNeighborhoodChange={onManageVenueNeighborhoodChange}
      onManageVenueAddressFocusChange={onManageVenueAddressFocusChange}
      onManageVenueAddressChange={onManageVenueAddressChange}
      onManageVenueAddressUseCurrentLocation={onManageVenueAddressUseCurrentLocation}
      onManageVenueAddressUseTyped={onManageVenueAddressUseTyped}
      onManageVenueAddressSelect={onManageVenueAddressSelect}
      onManageVenueDetailsChange={onManageVenueDetailsChange}
      onSelectManageVenueKind={onSelectManageVenueKind}
      onToggleManageVenueGame={onToggleManageVenueGame}
      onSaveVenueEdits={onSaveVenueEdits}
      onPromptDeleteVenue={onPromptDeleteVenue}
    />
  );
}
