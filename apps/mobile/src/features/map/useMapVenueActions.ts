import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";

import { translate } from "@/i18n";
import { createVenue, deleteMyVenue, updateMyVenue } from "@/lib/api";
import { toMessage, resolveCurrentLocationSuggestion } from "@/features/map/mapHelpers";
import { resolveTypedAddress, type AddressSuggestion } from "@/lib/placeSearch";
import type { MapCoordinate, PlayerProfile, VenueCard, VenueKind } from "@/types/domain";

type VenueGameOption = {
  id: string;
  label: string;
};

type UseMapVenueActionsArgs = {
  profile: PlayerProfile;
  venueGameOptions: VenueGameOption[];
  selectedVenueKind: VenueKind;
  selectedVenueGameIds: string[];
  venueSuggestionName: string;
  venueSuggestionNeighborhood: string;
  venueAddressQuery: string;
  venueSelectedAddress: AddressSuggestion | null;
  venueSuggestionDetails: string;
  manageVenueName: string;
  manageVenueNeighborhood: string;
  manageVenueAddressQuery: string;
  manageVenueSelectedAddress: AddressSuggestion | null;
  manageVenueDetails: string;
  manageVenueKind: VenueKind;
  manageVenueGameIds: string[];
  managedVenueFormatIds: string[];
  selectedVenueFormatIds: string[];
  setCreatingMeetup: (value: boolean) => void;
  setVenueSuggestionSuccess: (value: string | null) => void;
  setError: (value: string | null) => void;
  setLocatingDraftPoint: (value: boolean) => void;
  setVenueAddressFocused: (value: boolean) => void;
  setVenueAddressLoading: (value: boolean) => void;
  setVenueSelectedAddress: (value: AddressSuggestion | null) => void;
  setVenueAddressQuery: (value: string) => void;
  setVenueAddressSuggestions: (value: AddressSuggestion[]) => void;
  setVenueSuggestionNeighborhood: Dispatch<SetStateAction<string>>;
  setOptimisticVenues: (updater: (current: VenueCard[]) => VenueCard[]) => void;
  setSelectedVenueId: (value: string | null) => void;
  setSelectedMeetupId: (value: string | null) => void;
  switchGamesSheetSection: (
    nextSection: "meetups" | "venues",
    options?: { animate?: boolean; direction?: "left" | "right" | "none" }
  ) => void;
  setGamesSheetPreviewMode: (value: boolean) => void;
  setActiveScreen: (
    value:
      | "map"
      | "chats"
      | "alerts"
      | "places"
      | "account"
      | "friends"
      | "history"
      | "nearby_players"
      | "player"
  ) => void;
  setVenueSuggestionName: (value: string) => void;
  setVenueSuggestionDetails: (value: string) => void;
  setSelectedVenueKind: (value: VenueKind) => void;
  setDraftCoordinate: (value: MapCoordinate | null) => void;
  setVenueComposerOpen: (value: boolean) => void;
  loadAccountData: () => Promise<void>;
  loadDashboard: (mode?: "initial" | "refresh") => Promise<void>;
  animateGamesSheet: (expanded: boolean) => void;
  setDeletingEntityId: (value: string | null) => void;
  setVenues: (updater: (current: VenueCard[]) => VenueCard[]) => void;
  selectedVenueId: string | null;
  setExpandedVenueInfoId: (updater: (current: string | null) => string | null) => void;
  setExpandedVenueManageId: (updater: (current: string | null) => string | null) => void;
  setEntityActionSuccess: (value: string | null) => void;
  setUpdatingVenueId: (value: string | null) => void;
  focusVenueOnMap: (venueId: string) => void;
  setManageVenueAddressFocused: (value: boolean) => void;
  setManageVenueAddressLoading: (value: boolean) => void;
  setManageVenueSelectedAddress: (value: AddressSuggestion | null) => void;
  setManageVenueAddressQuery: (value: string) => void;
  setManageVenueAddressSuggestions: (value: AddressSuggestion[]) => void;
  setManageVenueNeighborhood: Dispatch<SetStateAction<string>>;
};

export function useMapVenueActions({
  profile,
  venueGameOptions,
  selectedVenueKind,
  selectedVenueGameIds,
  venueSuggestionName,
  venueSuggestionNeighborhood,
  venueAddressQuery,
  venueSelectedAddress,
  venueSuggestionDetails,
  manageVenueName,
  manageVenueNeighborhood,
  manageVenueAddressQuery,
  manageVenueSelectedAddress,
  manageVenueDetails,
  manageVenueKind,
  manageVenueGameIds,
  managedVenueFormatIds,
  selectedVenueFormatIds,
  setCreatingMeetup,
  setVenueSuggestionSuccess,
  setError,
  setLocatingDraftPoint,
  setVenueAddressFocused,
  setVenueAddressLoading,
  setVenueSelectedAddress,
  setVenueAddressQuery,
  setVenueAddressSuggestions,
  setVenueSuggestionNeighborhood,
  setOptimisticVenues,
  setSelectedVenueId,
  setSelectedMeetupId,
  switchGamesSheetSection,
  setGamesSheetPreviewMode,
  setActiveScreen,
  setVenueSuggestionName,
  setVenueSuggestionDetails,
  setSelectedVenueKind,
  setDraftCoordinate,
  setVenueComposerOpen,
  loadAccountData,
  loadDashboard,
  animateGamesSheet,
  setDeletingEntityId,
  setVenues,
  selectedVenueId,
  setExpandedVenueInfoId,
  setExpandedVenueManageId,
  setEntityActionSuccess,
  setUpdatingVenueId,
  focusVenueOnMap,
  setManageVenueAddressFocused,
  setManageVenueAddressLoading,
  setManageVenueSelectedAddress,
  setManageVenueAddressQuery,
  setManageVenueAddressSuggestions,
  setManageVenueNeighborhood,
}: UseMapVenueActionsArgs) {
  const nearHint = useMemo(
    () =>
      profile.lat != null && profile.lng != null
        ? { latitude: profile.lat, longitude: profile.lng }
        : null,
    [profile.lat, profile.lng]
  );

  const handleUseCurrentLocationForVenue = useCallback(async () => {
    try {
      setLocatingDraftPoint(true);
      setError(null);
      setVenueSuggestionSuccess(null);
      setVenueAddressFocused(false);
      setVenueSelectedAddress(null);
      setVenueAddressQuery(translate("venue.locationSearching"));
      const currentLocation = await resolveCurrentLocationSuggestion();
      setVenueSelectedAddress(currentLocation);
      setVenueAddressQuery(currentLocation.fullLabel);
      setVenueAddressSuggestions([]);
      setVenueSuggestionNeighborhood(currentLocation.subtitle || profile.neighborhood || "");
    } catch (locationError) {
      setError(toMessage(locationError));
    } finally {
      setLocatingDraftPoint(false);
    }
  }, [
    profile.neighborhood,
    setError,
    setLocatingDraftPoint,
    setVenueAddressFocused,
    setVenueAddressQuery,
    setVenueAddressSuggestions,
    setVenueSelectedAddress,
    setVenueSuggestionNeighborhood,
    setVenueSuggestionSuccess,
  ]);

  const handleUseCurrentLocationForManageVenue = useCallback(async () => {
    try {
      setLocatingDraftPoint(true);
      setError(null);
      setManageVenueAddressFocused(false);
      const currentLocation = await resolveCurrentLocationSuggestion();
      setManageVenueSelectedAddress(currentLocation);
      setManageVenueAddressQuery(currentLocation.fullLabel);
      setManageVenueAddressSuggestions([]);
      setManageVenueNeighborhood(currentLocation.subtitle || manageVenueNeighborhood);
    } catch (locationError) {
      setError(toMessage(locationError));
    } finally {
      setLocatingDraftPoint(false);
    }
  }, [
    manageVenueNeighborhood,
    setError,
    setLocatingDraftPoint,
    setManageVenueAddressFocused,
    setManageVenueAddressQuery,
    setManageVenueAddressSuggestions,
    setManageVenueNeighborhood,
    setManageVenueSelectedAddress,
  ]);

  const handleResolveTypedVenueAddress = useCallback(async () => {
    const nextQuery = venueAddressQuery.trim();

    if (nextQuery.length < 5) {
      setError(translate("map.typedAddressVenueHint"));
      return;
    }

    try {
      setError(null);
      setVenueSuggestionSuccess(null);
      setVenueAddressLoading(true);
      const resolvedAddress = await resolveTypedAddress(nextQuery, { near: nearHint });

      if (!resolvedAddress) {
        throw new Error(translate("map.addressResolveFailed"));
      }

      setVenueSelectedAddress(resolvedAddress);
      setVenueAddressQuery(resolvedAddress.fullLabel);
      setVenueAddressSuggestions([]);
      setVenueAddressFocused(false);
      setDraftCoordinate({
        latitude: resolvedAddress.latitude,
        longitude: resolvedAddress.longitude,
      });

      if (resolvedAddress.subtitle) {
        setVenueSuggestionNeighborhood(resolvedAddress.subtitle);
      }
    } catch (resolveError) {
      setError(toMessage(resolveError));
    } finally {
      setVenueAddressLoading(false);
    }
  }, [
    nearHint,
    setDraftCoordinate,
    setError,
    setVenueAddressFocused,
    setVenueAddressLoading,
    setVenueAddressQuery,
    setVenueAddressSuggestions,
    setVenueSelectedAddress,
    setVenueSuggestionNeighborhood,
    setVenueSuggestionSuccess,
    venueAddressQuery,
  ]);

  const handleResolveTypedManageVenueAddress = useCallback(async () => {
    const nextQuery = manageVenueAddressQuery.trim();

    if (nextQuery.length < 5) {
      setError(translate("map.typedAddressVenueHint"));
      return;
    }

    try {
      setError(null);
      setManageVenueAddressLoading(true);
      const resolvedAddress = await resolveTypedAddress(nextQuery, { near: nearHint });

      if (!resolvedAddress) {
        throw new Error(translate("map.addressResolveFailed"));
      }

      setManageVenueSelectedAddress(resolvedAddress);
      setManageVenueAddressQuery(resolvedAddress.fullLabel);
      setManageVenueAddressSuggestions([]);
      setManageVenueAddressFocused(false);

      if (resolvedAddress.subtitle) {
        setManageVenueNeighborhood(resolvedAddress.subtitle);
      }
    } catch (resolveError) {
      setError(toMessage(resolveError));
    } finally {
      setManageVenueAddressLoading(false);
    }
  }, [
    manageVenueAddressQuery,
    nearHint,
    setError,
    setManageVenueAddressFocused,
    setManageVenueAddressLoading,
    setManageVenueAddressQuery,
    setManageVenueAddressSuggestions,
    setManageVenueNeighborhood,
    setManageVenueSelectedAddress,
  ]);

  const handleCreateVenueSuggestion = useCallback(async () => {
    try {
      setCreatingMeetup(true);
      setVenueSuggestionSuccess(null);
      setError(null);

      const coordinate = venueSelectedAddress
        ? {
            latitude: venueSelectedAddress.latitude,
            longitude: venueSelectedAddress.longitude,
          }
        : null;

      if (!coordinate) {
        throw new Error(translate("venue.selectAddressBeforeSuggest"));
      }

      if (!selectedVenueFormatIds.length) {
        throw new Error(translate("venue.selectGameType"));
      }

      const createdVenueId = await createVenue({
        name: venueSuggestionName,
        neighborhood: venueSuggestionNeighborhood,
        address: venueSelectedAddress?.fullLabel ?? venueAddressQuery,
        details: venueSuggestionDetails,
        lat: coordinate.latitude,
        lng: coordinate.longitude,
        kind: selectedVenueKind,
        formatIds: selectedVenueFormatIds,
      });

      const selectedGameLabels = venueGameOptions
        .filter((game) => selectedVenueGameIds.includes(game.id))
        .map((game) => game.label);

      setOptimisticVenues((current) => [
        {
          id: createdVenueId,
          name: venueSuggestionName.trim(),
          neighborhood: venueSuggestionNeighborhood.trim(),
          address: (venueSelectedAddress?.fullLabel ?? venueAddressQuery).trim() || null,
          kind: selectedVenueKind,
          supportsEvents: true,
          ownerDisplayName: profile.displayName,
          creatorUserId: profile.userId,
          formats: selectedGameLabels,
          lat: coordinate.latitude,
          lng: coordinate.longitude,
        },
        ...current.filter((item) => item.id !== createdVenueId),
      ]);
      setSelectedVenueId(createdVenueId);
      setSelectedMeetupId(null);
      switchGamesSheetSection("venues", { animate: false });
      setGamesSheetPreviewMode(true);
      setActiveScreen("map");

      setVenueSuggestionName("");
      setVenueSuggestionNeighborhood(profile.neighborhood ?? "");
      setVenueAddressQuery("");
      setVenueAddressSuggestions([]);
      setVenueSelectedAddress(null);
      setVenueSuggestionDetails("");
      setSelectedVenueKind("public_place");
      setDraftCoordinate(null);
      setVenueComposerOpen(false);
      setVenueSuggestionSuccess(translate("venue.addedSuccess"));
      await loadAccountData();
      await loadDashboard("refresh");
      animateGamesSheet(false);
    } catch (venueSuggestionError) {
      setError(toMessage(venueSuggestionError));
    } finally {
      setCreatingMeetup(false);
    }
  }, [
    animateGamesSheet,
    loadAccountData,
    loadDashboard,
    profile.displayName,
    profile.neighborhood,
    profile.userId,
    selectedVenueFormatIds,
    selectedVenueGameIds,
    selectedVenueKind,
    setActiveScreen,
    setCreatingMeetup,
    setDraftCoordinate,
    setError,
    setGamesSheetPreviewMode,
    setOptimisticVenues,
    setSelectedMeetupId,
    setSelectedVenueId,
    setSelectedVenueKind,
    setVenueAddressQuery,
    setVenueAddressSuggestions,
    setVenueComposerOpen,
    setVenueSelectedAddress,
    setVenueSuggestionDetails,
    setVenueSuggestionName,
    setVenueSuggestionNeighborhood,
    setVenueSuggestionSuccess,
    switchGamesSheetSection,
    venueAddressQuery,
    venueGameOptions,
    venueSelectedAddress,
    venueSuggestionDetails,
    venueSuggestionName,
    venueSuggestionNeighborhood,
  ]);

  const handleDeleteVenue = useCallback(async (venue: VenueCard) => {
    try {
      setDeletingEntityId(venue.id);
      setError(null);
      setEntityActionSuccess(null);

      await deleteMyVenue(venue.id);
      setOptimisticVenues((current) => current.filter((item) => item.id !== venue.id));
      setVenues((current) => current.filter((item) => item.id !== venue.id));

      if (selectedVenueId === venue.id) {
        setSelectedVenueId(null);
      }

      setExpandedVenueInfoId((current) => (current === venue.id ? null : current));
      setExpandedVenueManageId((current) => (current === venue.id ? null : current));
      setEntityActionSuccess(translate("map.deleteVenueSuccess"));
      await loadDashboard("refresh");
    } catch (deleteError) {
      const message = toMessage(deleteError);
      setError(message);
      throw new Error(message);
    } finally {
      setDeletingEntityId(null);
    }
  }, [
    loadDashboard,
    selectedVenueId,
    setDeletingEntityId,
    setEntityActionSuccess,
    setError,
    setExpandedVenueInfoId,
    setExpandedVenueManageId,
    setOptimisticVenues,
    setSelectedVenueId,
    setVenues,
  ]);

  const handleSaveVenueEdits = useCallback(async (venue: VenueCard) => {
    if (!manageVenueName.trim()) {
      setError(translate("venue.nameRequired"));
      return;
    }

    if (!manageVenueSelectedAddress) {
      setError(translate("venue.selectAddressBeforeSave"));
      return;
    }

    if (!managedVenueFormatIds.length) {
      setError(translate("venue.selectGameType"));
      return;
    }

    try {
      setUpdatingVenueId(venue.id);
      setError(null);
      setEntityActionSuccess(null);

      await updateMyVenue({
        venueId: venue.id,
        name: manageVenueName.trim(),
        neighborhood: manageVenueNeighborhood.trim(),
        address: manageVenueSelectedAddress.fullLabel,
        details: manageVenueDetails.trim(),
        lat: manageVenueSelectedAddress.latitude,
        lng: manageVenueSelectedAddress.longitude,
        kind: manageVenueKind,
        formatIds: managedVenueFormatIds,
      });

      const selectedGameLabels = venueGameOptions
        .filter((game) => manageVenueGameIds.includes(game.id))
        .map((game) => game.label);

      setOptimisticVenues((current) =>
        current.map((item) =>
          item.id === venue.id
            ? {
                ...item,
                name: manageVenueName.trim(),
                neighborhood: manageVenueNeighborhood.trim(),
                address: manageVenueSelectedAddress.fullLabel,
                details: manageVenueDetails.trim() || null,
                kind: manageVenueKind,
                formats: selectedGameLabels,
                lat: manageVenueSelectedAddress.latitude,
                lng: manageVenueSelectedAddress.longitude,
              }
            : item
        )
      );

      setExpandedVenueManageId(() => null);
      setSelectedVenueId(venue.id);
      setEntityActionSuccess(translate("venue.updated"));
      await loadDashboard("refresh");
      focusVenueOnMap(venue.id);
    } catch (updateError) {
      const message = toMessage(updateError);
      setError(message);
      throw new Error(message);
    } finally {
      setUpdatingVenueId(null);
    }
  }, [
    focusVenueOnMap,
    loadDashboard,
    manageVenueDetails,
    manageVenueGameIds,
    manageVenueKind,
    manageVenueName,
    manageVenueNeighborhood,
    manageVenueSelectedAddress,
    managedVenueFormatIds,
    setEntityActionSuccess,
    setError,
    setExpandedVenueManageId,
    setOptimisticVenues,
    setSelectedVenueId,
    setUpdatingVenueId,
    venueGameOptions,
  ]);

  return {
    handleUseCurrentLocationForVenue,
    handleUseCurrentLocationForManageVenue,
    handleResolveTypedVenueAddress,
    handleResolveTypedManageVenueAddress,
    handleCreateVenueSuggestion,
    handleDeleteVenue,
    handleSaveVenueEdits,
  };
}
