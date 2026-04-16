import { useEffect } from "react";

import { searchAddressSuggestions, type AddressSuggestion } from "@/lib/placeSearch";
import { env } from "@/lib/env";

type CoordinateHint = {
  latitude: number;
  longitude: number;
} | null;

type UseAddressSuggestionSearchArgs = {
  enabled: boolean;
  query: string;
  selectedAddress: AddressSuggestion | null;
  near: CoordinateHint;
  setSuggestions: (suggestions: AddressSuggestion[]) => void;
  setLoading: (loading: boolean) => void;
  onError: (error: unknown) => void;
  debounceMs?: number;
};

export function useAddressSuggestionSearch({
  enabled,
  query,
  selectedAddress,
  near,
  setSuggestions,
  setLoading,
  onError,
  debounceMs = 360,
}: UseAddressSuggestionSearchArgs) {
  const nearLatitude = near?.latitude ?? null;
  const nearLongitude = near?.longitude ?? null;

  useEffect(() => {
    if (!enabled || !env.addressAutocompleteEnabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const nextQuery = query.trim();

    if (nextQuery.length < 3 || selectedAddress?.fullLabel === query) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let active = true;
    const timeoutId = setTimeout(() => {
      setLoading(true);
      const nearHint =
        nearLatitude != null && nearLongitude != null
          ? { latitude: nearLatitude, longitude: nearLongitude }
          : null;

      void searchAddressSuggestions(nextQuery, { near: nearHint })
        .then((results) => {
          if (!active) {
            return;
          }

          setSuggestions(results);
        })
        .catch((searchError) => {
          if (!active) {
            return;
          }

          onError(searchError);
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    debounceMs,
    enabled,
    nearLatitude,
    nearLongitude,
    onError,
    query,
    selectedAddress,
    setLoading,
    setSuggestions,
  ]);
}
