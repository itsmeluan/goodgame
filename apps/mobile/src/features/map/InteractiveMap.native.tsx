import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, {
  Circle,
  Marker,
  type MapStyleElement,
  Polygon,
  Region,
} from "react-native-maps";

import type {
  InteractiveMapProps,
} from "@/features/map/InteractiveMap.types";
import {
  formatCompactAddress,
  formatDateTime,
  formatDistanceKm,
  formatShortAddress,
  formatVenueKind,
} from "@/lib/formatting";
import { getDeviceCoordinate } from "@/lib/location";
import { useLiveLocation } from "@/features/app/LiveLocationContext";
import { inferGameNameFromLabels, localizeGameLabel, meetupMarkerVisualFromMeetup } from "@/features/map/gameLabels";
import { useTranslation } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";
import type { MapCoordinate } from "@/types/domain";

type MeetupMarkerStyle = "magic" | "board" | "yugioh" | "pokemon";

type RawOverlayPin = {
  id: string;
  kind: "meetup" | "venue" | "draft";
  coordinate: MapCoordinate;
  badgeCount: null;
  displayName?: string;
  /** Fanned out from a coincident coordinate — kept for rendering, not for any clustering. */
  spreadFromCoincident?: boolean;
  overdue?: boolean;
  /** Sprite set for meetup pins (Magic vs other games / future dice art). */
  meetupMarkerStyle?: MeetupMarkerStyle;
  calloutContent?: ReactNode;
  onPress?: () => void;
};

type ProjectedOverlayPin = RawOverlayPin & {
  point: { x: number; y: number };
};

/** All rendered pins are individual (no cluster aggregation). */
type VisibleOverlayPin = ProjectedOverlayPin;

type PixelOffset = {
  x: number;
  y: number;
};

type OverlayMarkersProps = {
  pins: VisibleOverlayPin[];
  selectedPinId?: string | null;
  onPressPin: (item: VisibleOverlayPin, event: { stopPropagation?: () => void }) => void;
};

type OverlayPinSnapshot = {
  id: string;
  coordinate: MapCoordinate;
  calloutContent?: ReactNode;
};

const OVERDUE_MEETUP_AFTER_MS = 60 * 60 * 1000;
const MARKER_IMAGE_SOURCES = {
  meetupMagic: require("../../../assets/map/marker-meetup-magic.png"),
  meetupMagic2: require("../../../assets/map/marker-meetup-magic-2.png"),
  meetupMagic3: require("../../../assets/map/marker-meetup-magic-3.png"),
  meetupMagic4: require("../../../assets/map/marker-meetup-magic-4.png"),
  meetupMagic5: require("../../../assets/map/marker-meetup-magic-5.png"),
  meetupMagic6: require("../../../assets/map/marker-meetup-magic-6.png"),
  meetupMagic7: require("../../../assets/map/marker-meetup-magic-7.png"),
  meetupMagic8: require("../../../assets/map/marker-meetup-magic-8.png"),
  meetupMagic9: require("../../../assets/map/marker-meetup-magic-9.png"),
  meetupMagic9plus: require("../../../assets/map/marker-meetup-magic-9plus.png"),
  meetupMagicOverdue: require("../../../assets/map/marker-meetup-magic-overdue.png"),
  meetupMagicOverdue2: require("../../../assets/map/marker-meetup-magic-overdue-2.png"),
  meetupMagicOverdue3: require("../../../assets/map/marker-meetup-magic-overdue-3.png"),
  meetupMagicOverdue4: require("../../../assets/map/marker-meetup-magic-overdue-4.png"),
  meetupMagicOverdue5: require("../../../assets/map/marker-meetup-magic-overdue-5.png"),
  meetupMagicOverdue6: require("../../../assets/map/marker-meetup-magic-overdue-6.png"),
  meetupMagicOverdue7: require("../../../assets/map/marker-meetup-magic-overdue-7.png"),
  meetupMagicOverdue8: require("../../../assets/map/marker-meetup-magic-overdue-8.png"),
  meetupMagicOverdue9: require("../../../assets/map/marker-meetup-magic-overdue-9.png"),
  meetupMagicOverdue9plus: require("../../../assets/map/marker-meetup-magic-overdue-9plus.png"),
  meetupDice: require("../../../assets/map/marker-meetup-dice.png"),
  meetupDice2: require("../../../assets/map/marker-meetup-dice-2.png"),
  meetupDice3: require("../../../assets/map/marker-meetup-dice-3.png"),
  meetupDice4: require("../../../assets/map/marker-meetup-dice-4.png"),
  meetupDice5: require("../../../assets/map/marker-meetup-dice-5.png"),
  meetupDice6: require("../../../assets/map/marker-meetup-dice-6.png"),
  meetupDice7: require("../../../assets/map/marker-meetup-dice-7.png"),
  meetupDice8: require("../../../assets/map/marker-meetup-dice-8.png"),
  meetupDice9: require("../../../assets/map/marker-meetup-dice-9.png"),
  meetupDice9plus: require("../../../assets/map/marker-meetup-dice-9plus.png"),
  meetupDiceOverdue: require("../../../assets/map/marker-meetup-dice-overdue.png"),
  meetupDiceOverdue2: require("../../../assets/map/marker-meetup-dice-overdue-2.png"),
  meetupDiceOverdue3: require("../../../assets/map/marker-meetup-dice-overdue-3.png"),
  meetupDiceOverdue4: require("../../../assets/map/marker-meetup-dice-overdue-4.png"),
  meetupDiceOverdue5: require("../../../assets/map/marker-meetup-dice-overdue-5.png"),
  meetupDiceOverdue6: require("../../../assets/map/marker-meetup-dice-overdue-6.png"),
  meetupDiceOverdue7: require("../../../assets/map/marker-meetup-dice-overdue-7.png"),
  meetupDiceOverdue8: require("../../../assets/map/marker-meetup-dice-overdue-8.png"),
  meetupDiceOverdue9: require("../../../assets/map/marker-meetup-dice-overdue-9.png"),
  meetupDiceOverdue9plus: require("../../../assets/map/marker-meetup-dice-overdue-9plus.png"),
  meetupYugioh: require("../../../assets/map/marker-meetup-yugioh.png"),
  meetupYugioh2: require("../../../assets/map/marker-meetup-yugioh-2.png"),
  meetupYugioh3: require("../../../assets/map/marker-meetup-yugioh-3.png"),
  meetupYugioh4: require("../../../assets/map/marker-meetup-yugioh-4.png"),
  meetupYugioh5: require("../../../assets/map/marker-meetup-yugioh-5.png"),
  meetupYugioh6: require("../../../assets/map/marker-meetup-yugioh-6.png"),
  meetupYugioh7: require("../../../assets/map/marker-meetup-yugioh-7.png"),
  meetupYugioh8: require("../../../assets/map/marker-meetup-yugioh-8.png"),
  meetupYugioh9: require("../../../assets/map/marker-meetup-yugioh-9.png"),
  meetupYugioh9plus: require("../../../assets/map/marker-meetup-yugioh-9plus.png"),
  meetupYugiohOverdue: require("../../../assets/map/marker-meetup-yugioh-overdue.png"),
  meetupYugiohOverdue2: require("../../../assets/map/marker-meetup-yugioh-overdue-2.png"),
  meetupYugiohOverdue3: require("../../../assets/map/marker-meetup-yugioh-overdue-3.png"),
  meetupYugiohOverdue4: require("../../../assets/map/marker-meetup-yugioh-overdue-4.png"),
  meetupYugiohOverdue5: require("../../../assets/map/marker-meetup-yugioh-overdue-5.png"),
  meetupYugiohOverdue6: require("../../../assets/map/marker-meetup-yugioh-overdue-6.png"),
  meetupYugiohOverdue7: require("../../../assets/map/marker-meetup-yugioh-overdue-7.png"),
  meetupYugiohOverdue8: require("../../../assets/map/marker-meetup-yugioh-overdue-8.png"),
  meetupYugiohOverdue9: require("../../../assets/map/marker-meetup-yugioh-overdue-9.png"),
  meetupYugiohOverdue9plus: require("../../../assets/map/marker-meetup-yugioh-overdue-9plus.png"),
  meetupPokemon: require("../../../assets/map/marker-meetup-pokemon.png"),
  meetupPokemon2: require("../../../assets/map/marker-meetup-pokemon-2.png"),
  meetupPokemon3: require("../../../assets/map/marker-meetup-pokemon-3.png"),
  meetupPokemon4: require("../../../assets/map/marker-meetup-pokemon-4.png"),
  meetupPokemon5: require("../../../assets/map/marker-meetup-pokemon-5.png"),
  meetupPokemon6: require("../../../assets/map/marker-meetup-pokemon-6.png"),
  meetupPokemon7: require("../../../assets/map/marker-meetup-pokemon-7.png"),
  meetupPokemon8: require("../../../assets/map/marker-meetup-pokemon-8.png"),
  meetupPokemon9: require("../../../assets/map/marker-meetup-pokemon-9.png"),
  meetupPokemon9plus: require("../../../assets/map/marker-meetup-pokemon-9plus.png"),
  meetupPokemonOverdue: require("../../../assets/map/marker-meetup-pokemon-overdue.png"),
  meetupPokemonOverdue2: require("../../../assets/map/marker-meetup-pokemon-overdue-2.png"),
  meetupPokemonOverdue3: require("../../../assets/map/marker-meetup-pokemon-overdue-3.png"),
  meetupPokemonOverdue4: require("../../../assets/map/marker-meetup-pokemon-overdue-4.png"),
  meetupPokemonOverdue5: require("../../../assets/map/marker-meetup-pokemon-overdue-5.png"),
  meetupPokemonOverdue6: require("../../../assets/map/marker-meetup-pokemon-overdue-6.png"),
  meetupPokemonOverdue7: require("../../../assets/map/marker-meetup-pokemon-overdue-7.png"),
  meetupPokemonOverdue8: require("../../../assets/map/marker-meetup-pokemon-overdue-8.png"),
  meetupPokemonOverdue9: require("../../../assets/map/marker-meetup-pokemon-overdue-9.png"),
  meetupPokemonOverdue9plus: require("../../../assets/map/marker-meetup-pokemon-overdue-9plus.png"),
  venue: require("../../../assets/map/marker-venue.png"),
  venue2: require("../../../assets/map/marker-venue-2.png"),
  venue3: require("../../../assets/map/marker-venue-3.png"),
  venue4: require("../../../assets/map/marker-venue-4.png"),
  venue5: require("../../../assets/map/marker-venue-5.png"),
  venue6: require("../../../assets/map/marker-venue-6.png"),
  venue7: require("../../../assets/map/marker-venue-7.png"),
  venue8: require("../../../assets/map/marker-venue-8.png"),
  venue9: require("../../../assets/map/marker-venue-9.png"),
  venue9plus: require("../../../assets/map/marker-venue-9plus.png"),
  draft: require("../../../assets/map/marker-draft.png"),
} as const;

const GOOD_GAME_MAP_STYLE: MapStyleElement[] = [
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

export function InteractiveMap({
  profile,
  visibleRadiusKm = null,
  meetups,
  venues,
  selectedMeetupId,
  selectedVenueId,
  selectedMapGroupKey = null,
  draftCoordinate,
  immersive = false,
  allowDraftSelection = false,
  bottomOverlayHeight = 0,
  onVisibleRegionChange,
  onSelectMeetup,
  onSelectVenue,
  onSelectMapGroup,
  onClearSelection,
  onSelectDraftCoordinate,
  pinCalloutDismissNonce = 0,
}: InteractiveMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const hasAutoCenteredOnUserRef = useRef(false);
  const lastFocusedSignatureRef = useRef<string | null>(null);
  const latestRegionRef = useRef<Region>(buildRegion([]));
  const selectedDisplayedOverlayPinRef = useRef<{ id: string; coordinate: MapCoordinate } | null>(null);
  const markerPressLockUntilRef = useRef(0);
  const {
    coordinate: liveUserCoordinate,
    accuracy: liveUserAccuracy,
    heading: liveUserHeading,
    permissionStatus: liveUserPermissionStatus,
  } = useLiveLocation();
  const [mapReady, setMapReady] = useState(false);
  const [selectedPinScreenPoint, setSelectedPinScreenPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pressedOverlayPinId, setPressedOverlayPinId] = useState<string | null>(null);
  const [pressedOverlayPinSnapshot, setPressedOverlayPinSnapshot] = useState<OverlayPinSnapshot | null>(
    null
  );
  const [recentering, setRecentering] = useState(false);
  const insets = useSafeAreaInsets();
  const bubbleProgress = useRef(new Animated.Value(0)).current;

  const coordinates = useMemo(
    () => [
      ...(liveUserCoordinate ? [liveUserCoordinate] : []),
      ...(profile.lat !== null && profile.lng !== null
        ? [{ latitude: profile.lat, longitude: profile.lng }]
        : []),
      ...venues.map((venue) => ({ latitude: venue.lat, longitude: venue.lng })),
      ...meetups.map((meetup) => ({ latitude: meetup.lat, longitude: meetup.lng })),
      ...(draftCoordinate ? [draftCoordinate] : []),
    ],
    [draftCoordinate, liveUserCoordinate, meetups, profile.lat, profile.lng, venues]
  );

  const initialRegion = useMemo(() => buildRegion(coordinates), [coordinates]);
  const [visibleRegion, setVisibleRegion] = useState<Region>(initialRegion);
  const [viewRegion, setViewRegion] = useState<Region>(initialRegion);
  const [mapSize, setMapSize] = useState<{ width: number; height: number }>({
    width: 1,
    height: MAP_VIEW_HEIGHT,
  });

  const liveUserHeadingCone = useMemo(() => {
    if (!liveUserCoordinate || liveUserHeading === null) {
      return null;
    }

    return buildHeadingCone({
      origin: liveUserCoordinate,
      headingDegrees: liveUserHeading,
      region: visibleRegion,
      mapSize,
      innerRadiusPixels: LIVE_USER_DOT_OUTER_SIZE * 1.05,
      outerRadiusPixels: LIVE_USER_DOT_OUTER_SIZE * 4.05,
      spreadDegrees: 54,
      arcSteps: 14,
    });
  }, [liveUserCoordinate, liveUserHeading, mapSize, visibleRegion]);

  const focusTarget = useMemo(() => {
    const selectedMeetup = meetups.find((item) => item.id === selectedMeetupId);

    if (selectedMeetup) {
      return {
        kind: "meetup" as const,
        id: selectedMeetup.id,
        latitude: selectedMeetup.lat,
        longitude: selectedMeetup.lng,
      };
    }

    const selectedVenue = venues.find((item) => item.id === selectedVenueId);

    if (selectedVenue) {
      return {
        kind: "venue" as const,
        id: selectedVenue.id,
        latitude: selectedVenue.lat,
        longitude: selectedVenue.lng,
      };
    }

    if (allowDraftSelection) {
      return draftCoordinate
        ? {
            kind: "draft" as const,
            id: "draft",
            latitude: draftCoordinate.latitude,
            longitude: draftCoordinate.longitude,
          }
        : null;
    }

    return null;
  }, [allowDraftSelection, draftCoordinate, meetups, selectedMeetupId, selectedVenueId, venues]);

  const rawOverlayPins = useMemo(() => {
    const items: RawOverlayPin[] = [];

    if (allowDraftSelection && draftCoordinate) {
      items.push({
        id: "draft",
        kind: "draft",
        coordinate: draftCoordinate,
        badgeCount: null,
        calloutContent: (
          <PinCallout
            kindLabel={t("common.game")}
            title={t("map.nextGamePoint")}
            distanceLabel={null}
            helperText={t("map.adjustLocationHint")}
          />
        ),
      });
    }

    venues.forEach((venue) => {
      items.push({
        id: `venue:${venue.id}`,
        kind: "venue",
        coordinate: { latitude: venue.lat, longitude: venue.lng },
        badgeCount: null,
        displayName: venue.name,
        calloutContent: (
          <PinCallout
            kindLabel="Local"
            title={venue.name}
            distanceLabel={formatDistanceKm(profile.lat, profile.lng, venue.lat, venue.lng)}
            helperText={buildVenueHelperText(venue, t)}
          />
        ),
        onPress: () => onSelectVenue(venue.id),
      });
    });

    meetups.forEach((meetup) => {
      const overdue = isMeetupOverdueForMap(meetup);
      items.push({
        id: `meetup:${meetup.id}`,
        kind: "meetup",
        coordinate: { latitude: meetup.lat, longitude: meetup.lng },
        badgeCount: null,
        overdue,
        displayName: meetup.title,
        meetupMarkerStyle: resolveMeetupMarkerStyle(meetup),
        calloutContent: (
          <PinCallout
            kindLabel="Jogo"
            title={meetup.title}
            distanceLabel={formatDistanceKm(profile.lat, profile.lng, meetup.lat, meetup.lng)}
            timeLabel={formatMeetupSchedule(meetup.startsAt)}
            helperText={
              meetup.isLocationExact
                ? formatCompactAddress(meetup.addressLabel || meetup.locationHint)
                : "Entre no grupo para ver o ponto exato."
            }
          />
        ),
        onPress: () => onSelectMeetup(meetup.id),
      });
    });

    // Fan out items that share the exact same coordinate so they don't render on top of each other.
    const byCoord = new Map<string, RawOverlayPin[]>();
    items.forEach((item) => {
      const key = `${item.coordinate.latitude.toFixed(6)},${item.coordinate.longitude.toFixed(6)}`;
      const bucket = byCoord.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        byCoord.set(key, [item]);
      }
    });

    const result: RawOverlayPin[] = [];
    byCoord.forEach((bucket) => {
      if (bucket.length === 1) {
        result.push(bucket[0]);
        return;
      }
      const spreadRadius = 16;
      bucket.forEach((item, index) => {
        const angle = -Math.PI / 2 + (index / bucket.length) * 2 * Math.PI;
        result.push({
          ...item,
          spreadFromCoincident: true,
          coordinate: offsetCoordinateByPixelOffset(
            item.coordinate,
            { x: Math.cos(angle) * spreadRadius, y: Math.sin(angle) * spreadRadius },
            viewRegion,
            mapSize
          ),
        });
      });
    });

    return result;
  }, [
    allowDraftSelection,
    draftCoordinate,
    meetups,
    venues,
    profile.lat,
    profile.lng,
    onSelectMeetup,
    onSelectVenue,
    viewRegion,
    mapSize,
  ]);

  const selectedPinOverlayKey = useMemo(() => {
    if (selectedMeetupId) {
      return rawOverlayPins.find((item) => item.id === `meetup:${selectedMeetupId}`)?.id ?? null;
    }
    if (selectedVenueId) {
      return rawOverlayPins.find((item) => item.id === `venue:${selectedVenueId}`)?.id ?? null;
    }
    return null;
  }, [rawOverlayPins, selectedMeetupId, selectedVenueId]);

  const selectedVenueFallbackPin = useMemo<RawOverlayPin | null>(() => {
    if (!selectedVenueId) {
      return null;
    }

    const selectedVenue = venues.find((item) => item.id === selectedVenueId);

    if (!selectedVenue) {
      return null;
    }

    return {
      id: `venue-fallback:${selectedVenue.id}`,
      kind: "venue",
      coordinate: { latitude: selectedVenue.lat, longitude: selectedVenue.lng },
      badgeCount: null,
      calloutContent: (
        <PinCallout
          kindLabel="Local"
          title={selectedVenue.name}
          distanceLabel={formatDistanceKm(profile.lat, profile.lng, selectedVenue.lat, selectedVenue.lng)}
          helperText={buildVenueHelperText(selectedVenue, t)}
        />
      ),
    };
  }, [profile.lat, profile.lng, selectedVenueId, venues]);

  const selectedRawOverlayPin = useMemo(() => {
    if (selectedPinOverlayKey) {
      return rawOverlayPins.find((item) => item.id === selectedPinOverlayKey) ?? null;
    }

    if (selectedVenueFallbackPin) {
      return selectedVenueFallbackPin;
    }

    if (pressedOverlayPinId) {
      return rawOverlayPins.find((item) => item.id === pressedOverlayPinId) ?? null;
    }

    return null;
  }, [pressedOverlayPinId, rawOverlayPins, selectedPinOverlayKey, selectedVenueFallbackPin]);
  const selectedDisplayedOverlayPin = selectedRawOverlayPin ?? pressedOverlayPinSnapshot;

  selectedDisplayedOverlayPinRef.current = selectedDisplayedOverlayPin
    ? { id: selectedDisplayedOverlayPin.id, coordinate: selectedDisplayedOverlayPin.coordinate }
    : null;

  useEffect(() => {
    if (!pressedOverlayPinId && !pressedOverlayPinSnapshot) {
      return;
    }

    const hasPressedPin = pressedOverlayPinId
      ? rawOverlayPins.some((item) => item.id === pressedOverlayPinId)
      : false;

    if (hasPressedPin || selectedPinOverlayKey) {
      return;
    }

    setPressedOverlayPinId(null);
    setPressedOverlayPinSnapshot(null);
  }, [pressedOverlayPinId, pressedOverlayPinSnapshot, rawOverlayPins, selectedPinOverlayKey]);

  const selectionSignatureRef = useRef<{
    meetup: string | null;
    venue: string | null;
    group: string | null;
  }>({ meetup: null, venue: null, group: null });

  useEffect(() => {
    const prev = selectionSignatureRef.current;
    const hadSelection = Boolean(prev.meetup || prev.venue || prev.group);
    const next = {
      meetup: selectedMeetupId,
      venue: selectedVenueId,
      group: selectedMapGroupKey,
    };
    const hasSelection = Boolean(next.meetup || next.venue || next.group);
    selectionSignatureRef.current = next;

    if (!hadSelection || hasSelection) {
      return;
    }

    setPressedOverlayPinId(null);
    setPressedOverlayPinSnapshot(null);
  }, [selectedMapGroupKey, selectedMeetupId, selectedVenueId]);

  const pinCalloutDismissNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (pinCalloutDismissNonceRef.current === null) {
      pinCalloutDismissNonceRef.current = pinCalloutDismissNonce;
      return;
    }

    if (pinCalloutDismissNonceRef.current === pinCalloutDismissNonce) {
      return;
    }

    pinCalloutDismissNonceRef.current = pinCalloutDismissNonce;
    setPressedOverlayPinId(null);
    setPressedOverlayPinSnapshot(null);
  }, [pinCalloutDismissNonce]);

  // Disambiguation popup: shown when multiple pins overlap at the tapped location.
  const [disambiguationCandidates, setDisambiguationCandidates] = useState<VisibleOverlayPin[] | null>(null);
  // Timer used to defer disambiguation close so that a Marker.onPress can cancel it before it fires.
  const disambiguationCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelDisambiguationCloseTimer() {
    if (disambiguationCloseTimerRef.current !== null) {
      clearTimeout(disambiguationCloseTimerRef.current);
      disambiguationCloseTimerRef.current = null;
    }
  }

  function closeDisambiguation() {
    cancelDisambiguationCloseTimer();
    setDisambiguationCandidates(null);
  }

  const renderedOverlayPins = useMemo((): VisibleOverlayPin[] => {
    if (!mapReady || !mapSize.width || !mapSize.height) {
      return [];
    }

    return rawOverlayPins
      .map((item) => ({
        ...item,
        point: projectCoordinateToPoint({
          coordinate: item.coordinate,
          region: viewRegion,
          mapSize,
        }),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [viewRegion, mapReady, mapSize, rawOverlayPins]);

  useEffect(() => {
    onVisibleRegionChange?.(visibleRegion);
  }, [onVisibleRegionChange, visibleRegion]);

  useLayoutEffect(() => {
    if (!mapReady || !mapSize.width || !mapSize.height) {
      return;
    }

    if (!selectedDisplayedOverlayPin) {
      setSelectedPinScreenPoint(null);
      return;
    }

    setSelectedPinScreenPoint(
      projectCoordinateToPoint({
        coordinate: selectedDisplayedOverlayPin.coordinate,
        region: latestRegionRef.current,
        mapSize,
      })
    );
    // Pin object identity changes when overlay data recomputes; id + lat/lng are stable anchors.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapReady,
    mapSize.height,
    mapSize.width,
    selectedDisplayedOverlayPin?.coordinate.latitude,
    selectedDisplayedOverlayPin?.coordinate.longitude,
    selectedDisplayedOverlayPin?.id,
  ]);

  useEffect(() => {
    if (!focusTarget || !mapRef.current) {
      lastFocusedSignatureRef.current = null;
      return;
    }

    const focusSignature = `${focusTarget.kind}:${focusTarget.id}`;

    if (lastFocusedSignatureRef.current === focusSignature) {
      return;
    }

    lastFocusedSignatureRef.current = focusSignature;

    // Zoom in to at least street level when focusing a pin; if already closer, keep current zoom.
    const targetDelta = Math.min(visibleRegion.latitudeDelta || 0.028, 0.012);

    const centeredLatitude = getShiftedLatitude({
      latitude: focusTarget.latitude,
      latitudeDelta: targetDelta,
      bottomOverlayHeight,
      mapHeight: mapSize.height,
    });

    mapRef.current.animateToRegion(
      {
        latitude: centeredLatitude,
        longitude: focusTarget.longitude,
        latitudeDelta: targetDelta,
        longitudeDelta: targetDelta,
      },
      400
    );
  }, [bottomOverlayHeight, focusTarget, mapSize.height, visibleRegion.latitudeDelta, visibleRegion.longitudeDelta]);

  useEffect(() => {
    if (
      !immersive ||
      !liveUserCoordinate ||
      !mapRef.current ||
      hasAutoCenteredOnUserRef.current ||
      selectedMeetupId ||
      selectedVenueId ||
      allowDraftSelection
    ) {
      return;
    }

    hasAutoCenteredOnUserRef.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: liveUserCoordinate.latitude,
        longitude: liveUserCoordinate.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      },
      500
    );
  }, [
    allowDraftSelection,
    immersive,
    liveUserCoordinate,
    selectedMeetupId,
    selectedVenueId,
  ]);

  const selectedBubblePinIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = selectedDisplayedOverlayPin?.id ?? null;
    if (!nextId) {
      selectedBubblePinIdRef.current = null;
      bubbleProgress.setValue(0);
      return;
    }

    if (selectedBubblePinIdRef.current === nextId) {
      return;
    }

    selectedBubblePinIdRef.current = nextId;
    bubbleProgress.setValue(0);
    Animated.timing(bubbleProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [bubbleProgress, selectedDisplayedOverlayPin?.id]);

  const activateOverlayPin = useCallback(
    (item: VisibleOverlayPin) => {
      selectedDisplayedOverlayPinRef.current = {
        id: item.id,
        coordinate: item.coordinate,
      };
      if (mapReady && mapSize.width && mapSize.height) {
        setSelectedPinScreenPoint(
          projectCoordinateToPoint({
            coordinate: item.coordinate,
            region: latestRegionRef.current,
            mapSize,
          })
        );
      }
      setPressedOverlayPinId(item.id);
      setPressedOverlayPinSnapshot({
        id: item.id,
        coordinate: item.coordinate,
        calloutContent: item.calloutContent,
      });

      item.onPress?.();
    },
    [mapReady, mapSize]
  );

  const handleOverlayMarkerPress = useCallback(
    (item: VisibleOverlayPin, event: { stopPropagation?: () => void }) => {
      // Cancel any pending disambiguation close that was queued by MapView.onPress.
      // On Android, MapView.onPress fires BEFORE Marker.onPress for the same touch.
      cancelDisambiguationCloseTimer();
      markerPressLockUntilRef.current = Date.now() + 600;
      event.stopPropagation?.();

      // Find all rendered pins that visually overlap with the pressed pin.
      const nearby = renderedOverlayPins.filter((pin) => {
        if (pin.id === item.id) return true;
        const dx = pin.point.x - item.point.x;
        const dy = pin.point.y - item.point.y;
        return Math.sqrt(dx * dx + dy * dy) < PIN_DISAMBIGUATION_RADIUS;
      });

      if (nearby.length > 1) {
        // Clear the balloon: both pressed state and any parent-driven selection.
        setPressedOverlayPinId(null);
        setPressedOverlayPinSnapshot(null);
        onClearSelection();
        setDisambiguationCandidates(nearby);
        return;
      }

      // Single pin — activate directly.
      closeDisambiguation();
      activateOverlayPin(item);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activateOverlayPin, renderedOverlayPins]
  );

  return (
    <View style={[styles.wrapper, immersive ? styles.wrapperImmersive : null]}>
      <View style={[styles.mapViewport, immersive ? styles.mapViewportImmersive : null]}>
        <MapView
          ref={mapRef}
          initialRegion={initialRegion}
          style={styles.map}
          mapType="standard"
          customMapStyle={GOOD_GAME_MAP_STYLE}
          showsCompass
          pitchEnabled={false}
          rotateEnabled={false}
          showsBuildings={false}
          showsUserLocation={Platform.OS === "android" && liveUserPermissionStatus === "granted"}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onPoiClick={() => {}}
          onLayout={handleMapLayout}
          onMapReady={() => {
            setMapReady(true);
          }}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={() => {
            // Only fires on genuine user drags; close the disambiguation menu.
            closeDisambiguation();
          }}
          onPress={(event: { nativeEvent: { coordinate: MapCoordinate } }) => {
            if (Date.now() < markerPressLockUntilRef.current) {
              return;
            }

            // On Android, MapView.onPress fires BEFORE Marker.onPress for the same touch.
            // Defer the close so that a marker press that follows can cancel the timer and keep
            // (or update) the disambiguation menu instead of briefly flashing closed.
            if (disambiguationCandidates) {
              disambiguationCloseTimerRef.current = setTimeout(() => {
                disambiguationCloseTimerRef.current = null;
                closeDisambiguation();
              }, 160);
              return;
            }

            setPressedOverlayPinId(null);
            setPressedOverlayPinSnapshot(null);

            if (allowDraftSelection) {
              onClearSelection();
              onSelectDraftCoordinate(event.nativeEvent.coordinate);
              return;
            }

            onClearSelection();
          }}
        >
          {profile.lat !== null && profile.lng !== null ? (
            visibleRadiusKm !== null ? (
              <Circle
                center={{ latitude: profile.lat, longitude: profile.lng }}
                radius={visibleRadiusKm * 1000}
                fillColor="rgba(241, 143, 92, 0.12)"
                strokeColor="rgba(241, 143, 92, 0.55)"
              />
            ) : null
          ) : null}

          <OverlayMarkers
            pins={renderedOverlayPins}
            selectedPinId={selectedDisplayedOverlayPin?.id ?? null}
            onPressPin={handleOverlayMarkerPress}
          />

          {liveUserCoordinate && Platform.OS === "ios" ? (
            <>
              <Circle
                center={liveUserCoordinate}
                radius={normalizeAccuracyRadius(liveUserAccuracy)}
                fillColor="rgba(69, 126, 245, 0.16)"
                strokeColor="rgba(69, 126, 245, 0.22)"
                strokeWidth={1}
                zIndex={1000}
              />
              {liveUserHeadingCone ? (
                <Polygon
                  coordinates={liveUserHeadingCone}
                  fillColor="rgba(74, 134, 247, 0.18)"
                  strokeColor="rgba(74, 134, 247, 0)"
                  strokeWidth={0}
                  zIndex={1000}
                />
              ) : null}
              <Marker
                coordinate={liveUserCoordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                zIndex={1000}
              >
                <View style={styles.liveUserMarker}>
                  <View style={styles.liveUserDotOuter}>
                    <View style={styles.liveUserDotInner} />
                  </View>
                </View>
              </Marker>
            </>
          ) : null}

        </MapView>

        {!disambiguationCandidates &&
        selectedPinScreenPoint &&
        selectedDisplayedOverlayPin?.calloutContent ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectedBubbleOverlay,
              {
                left: selectedPinScreenPoint.x,
                top: selectedPinScreenPoint.y,
                opacity: bubbleProgress,
                transform: [
                  { translateX: -130 },
                  {
                    translateY: bubbleProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-152, -164],
                    }),
                  },
                  {
                    scale: bubbleProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.selectedBubbleShell}>{selectedDisplayedOverlayPin.calloutContent}</View>
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("map.centerMyLocation")}
          hitSlop={10}
          onPress={() => {
            void handleRecenterOnUser();
          }}
          style={({ pressed }) => [
            styles.recenterButton,
            { right: insets.right + spacing.lg },
            immersive ? styles.recenterButtonImmersive : null,
            pressed ? styles.recenterButtonPressed : null,
            recentering ? styles.recenterButtonBusy : null,
          ]}
        >
          <MaterialIcons
            name="my-location"
            size={22}
            color={recentering ? palette.mist : palette.ink}
          />
        </Pressable>

        {disambiguationCandidates ? (
          <PinDisambiguationMenu
            candidates={disambiguationCandidates}
            bottomOverlayHeight={bottomOverlayHeight}
            onSelect={(item) => {
              // Lock MapView.onPress for 600ms so it can't call onClearSelection()
              // after this selection — same protection as regular Marker.onPress.
              cancelDisambiguationCloseTimer();
              markerPressLockUntilRef.current = Date.now() + 600;
              closeDisambiguation();
              activateOverlayPin(item);
            }}
            onDismiss={closeDisambiguation}
          />
        ) : null}
      </View>

      {immersive ? null : (
        <View style={styles.footer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.beacon }]} />
              <Text style={styles.legendText}>Jogo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.parchment }]} />
              <Text style={styles.legendText}>Local</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.forest }]} />
              <Text style={styles.legendText}>Sua área</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#2E7CFF" }]} />
              <Text style={styles.legendText}>Você agora</Text>
            </View>
          </View>
          <Text style={styles.tip}>
            Toque no mapa para definir a localização aproximada do próximo jogo.
          </Text>
        </View>
      )}
    </View>
  );

function handleMapLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;

    if (!width || !height) {
      return;
    }

    setMapSize({ width, height });
  }

  function handleRegionChange(nextRegion: Region) {
    latestRegionRef.current = nextRegion;
    setVisibleRegion((current) =>
      areRegionsClose(current, nextRegion) ? current : nextRegion
    );

    const pin = selectedDisplayedOverlayPinRef.current;
    if (!pin || !mapReady || !mapSize.width || !mapSize.height) {
      return;
    }

    setSelectedPinScreenPoint(
      projectCoordinateToPoint({
        coordinate: pin.coordinate,
        region: nextRegion,
        mapSize,
      })
    );
  }

  function handleRegionChangeComplete(nextRegion: Region) {
    handleRegionChange(nextRegion);
    setViewRegion((current) =>
      areRegionsClose(current, nextRegion) ? current : nextRegion
    );
  }

  async function handleRecenterOnUser() {
    if (!mapRef.current || recentering) {
      return;
    }

    setRecentering(true);

    try {
      const coordinate = liveUserCoordinate ?? (await getDeviceCoordinate());

      mapRef.current.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: visibleRegion.latitudeDelta,
          longitudeDelta: visibleRegion.longitudeDelta,
        },
        350
      );
    } finally {
      setRecentering(false);
    }
  }

}

function buildRegion(coordinates: MapCoordinate[]): Region {
  if (!coordinates.length) {
    return {
      latitude: -23.5679,
      longitude: -46.6527,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  const latitudes = coordinates.map((item) => item.latitude);
  const longitudes = coordinates.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latDelta = Math.max((maxLat - minLat) * 1.45, 0.04);
  const lngDelta = Math.max((maxLng - minLng) * 1.45, 0.04);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function normalizeAccuracyRadius(accuracyMeters: number | null) {
  if (accuracyMeters === null) {
    return 55;
  }

  return Math.max(30, Math.min(accuracyMeters, 120));
}

function buildHeadingCone({
  origin,
  headingDegrees,
  region,
  mapSize,
  innerRadiusPixels,
  outerRadiusPixels,
  spreadDegrees,
  arcSteps,
}: {
  origin: MapCoordinate;
  headingDegrees: number;
  region: Region;
  mapSize: { width: number; height: number };
  innerRadiusPixels: number;
  outerRadiusPixels: number;
  spreadDegrees: number;
  arcSteps: number;
}) {
  const halfSpread = spreadDegrees / 2;
  const outerArc = buildArcCoordinates({
    origin,
    region,
    mapSize,
    radiusPixels: outerRadiusPixels,
    headingDegrees,
    startDegrees: headingDegrees - halfSpread,
    endDegrees: headingDegrees + halfSpread,
    steps: arcSteps,
  });

  const innerArc = buildArcCoordinates({
    origin,
    region,
    mapSize,
    radiusPixels: innerRadiusPixels,
    headingDegrees,
    startDegrees: headingDegrees + halfSpread,
    endDegrees: headingDegrees - halfSpread,
    steps: arcSteps,
  });

  return [...outerArc, ...innerArc];
}

function buildArcCoordinates({
  origin,
  region,
  mapSize,
  radiusPixels,
  startDegrees,
  endDegrees,
  steps,
}: {
  origin: MapCoordinate;
  region: Region;
  mapSize: { width: number; height: number };
  radiusPixels: number;
  headingDegrees: number;
  startDegrees: number;
  endDegrees: number;
  steps: number;
}) {
  const points: MapCoordinate[] = [];
  const latitudePerPixel = region.latitudeDelta / Math.max(mapSize.height, 1);
  const longitudePerPixel = region.longitudeDelta / Math.max(mapSize.width, 1);

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const bearingDegrees = startDegrees + (endDegrees - startDegrees) * progress;
    const bearingRadians = (bearingDegrees * Math.PI) / 180;
    const offsetXPixels = Math.sin(bearingRadians) * radiusPixels;
    const offsetYPixels = -Math.cos(bearingRadians) * radiusPixels;

    points.push({
      latitude: origin.latitude - offsetYPixels * latitudePerPixel,
      longitude: origin.longitude + offsetXPixels * longitudePerPixel,
    });
  }

  return points;
}

function getShiftedLatitude({
  latitude,
  latitudeDelta,
  bottomOverlayHeight,
  mapHeight,
}: {
  latitude: number;
  latitudeDelta: number;
  bottomOverlayHeight: number;
  mapHeight: number;
}) {
  if (!bottomOverlayHeight || !mapHeight) {
    return latitude;
  }

  const overlayRatio = Math.min(bottomOverlayHeight / Math.max(mapHeight, 1), 0.58);
  return latitude - latitudeDelta * overlayRatio * 0.34;
}


function meetupSpriteBase(style: MeetupMarkerStyle | undefined) {
  if (style === "magic") {
    return "meetupMagic" as const;
  }

  if (style === "yugioh") {
    return "meetupYugioh" as const;
  }

  if (style === "pokemon") {
    return "meetupPokemon" as const;
  }

  return "meetupDice" as const;
}

function resolveMeetupMarkerStyle(
  meetup: InteractiveMapProps["meetups"][number]
): MeetupMarkerStyle {
  return meetupMarkerVisualFromMeetup(meetup);
}

function resolveMarkerImageAssetKey(item: VisibleOverlayPin): keyof typeof MARKER_IMAGE_SOURCES {
  if (item.kind === "venue") {
    return "venue";
  }

  if (item.kind === "draft") {
    return "draft";
  }

  const base = meetupSpriteBase(item.meetupMarkerStyle);
  return item.overdue
    ? (`${base}Overdue` as keyof typeof MARKER_IMAGE_SOURCES)
    : base;
}

function resolveMarkerImageSource(item: VisibleOverlayPin): number {
  return MARKER_IMAGE_SOURCES[resolveMarkerImageAssetKey(item)];
}

function isMeetupOverdueForMap(meetup: InteractiveMapProps["meetups"][number]) {
  if (meetup.status === "closed" || meetup.status === "cancelled") {
    return false;
  }

  const startsAtTimestamp = new Date(meetup.startsAt).getTime();

  if (Number.isNaN(startsAtTimestamp)) {
    return false;
  }

  return startsAtTimestamp <= Date.now() - OVERDUE_MEETUP_AFTER_MS;
}

function distanceBetweenCoordinatesMeters(left: MapCoordinate, right: MapCoordinate) {
  const earthRadiusMeters = 6371000;
  const dLat = ((right.latitude - left.latitude) * Math.PI) / 180;
  const dLng = ((right.longitude - left.longitude) * Math.PI) / 180;
  const leftLat = (left.latitude * Math.PI) / 180;
  const rightLat = (right.latitude * Math.PI) / 180;

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function offsetCoordinateByMeters(
  coordinate: MapCoordinate,
  {
    eastMeters,
    northMeters,
  }: {
    eastMeters: number;
    northMeters: number;
  }
): MapCoordinate {
  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude =
    Math.max(Math.cos((coordinate.latitude * Math.PI) / 180), 0.00001) * metersPerDegreeLatitude;

  return {
    latitude: coordinate.latitude + northMeters / metersPerDegreeLatitude,
    longitude: coordinate.longitude + eastMeters / metersPerDegreeLongitude,
  };
}

function offsetCoordinateByPixelOffset(
  coordinate: MapCoordinate,
  offset: PixelOffset,
  region: Region,
  mapSize: { width: number; height: number }
) {
  const metersPerPixelNorth = (region.latitudeDelta / Math.max(mapSize.height, 1)) * 111320;
  const metersPerDegreeLongitude =
    Math.max(Math.cos((coordinate.latitude * Math.PI) / 180), 0.00001) * 111320;
  const metersPerPixelEast =
    (region.longitudeDelta / Math.max(mapSize.width, 1)) * metersPerDegreeLongitude;

  return offsetCoordinateByMeters(coordinate, {
    eastMeters: offset.x * metersPerPixelEast,
    northMeters: -offset.y * metersPerPixelNorth,
  });
}

function distanceBetweenPoints(left: { x: number; y: number }, right: { x: number; y: number }) {
  const deltaX = left.x - right.x;
  const deltaY = left.y - right.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}


function projectCoordinateToPoint({
  coordinate,
  region,
  mapSize,
}: {
  coordinate: MapCoordinate;
  region: Region;
  mapSize: { width: number; height: number };
}) {
  const topLatitude = clampLatitude(region.latitude + region.latitudeDelta / 2);
  const bottomLatitude = clampLatitude(region.latitude - region.latitudeDelta / 2);
  const leftLongitude = region.longitude - region.longitudeDelta / 2;
  const rightLongitude = region.longitude + region.longitudeDelta / 2;
  const mercatorYTop = latitudeToMercatorY(topLatitude);
  const mercatorYBottom = latitudeToMercatorY(bottomLatitude);
  const mercatorYCoordinate = latitudeToMercatorY(clampLatitude(coordinate.latitude));
  const mercatorXLeft = longitudeToMercatorX(leftLongitude);
  const mercatorXRight = longitudeToMercatorX(rightLongitude);
  const mercatorXCoordinate = longitudeToMercatorX(coordinate.longitude);
  const xRatio = normalizeRatio(mercatorXCoordinate, mercatorXLeft, mercatorXRight);
  const yRatio = normalizeRatio(mercatorYCoordinate, mercatorYTop, mercatorYBottom);
  return {
    x: xRatio * mapSize.width,
    y: yRatio * mapSize.height,
  };
}

function latitudeToMercatorY(latitude: number) {
  const radians = (latitude * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function longitudeToMercatorX(longitude: number) {
  return (longitude * Math.PI) / 180;
}

function clampLatitude(value: number) {
  return clampNumber(value, -85, 85);
}

function normalizeRatio(
  value: number,
  min: number,
  max: number
 ) {
  const delta = max - min;

  if (Math.abs(delta) < 0.0000001) {
    return 0.5;
  }

  return (value - min) / delta;
}

function areRegionsClose(left: Region, right: Region) {
  return (
    Math.abs(left.latitude - right.latitude) < 0.00001 &&
    Math.abs(left.longitude - right.longitude) < 0.00001 &&
    Math.abs(left.latitudeDelta - right.latitudeDelta) < 0.00001 &&
    Math.abs(left.longitudeDelta - right.longitudeDelta) < 0.00001
  );
}

function inferGameNamesFromLabels(
  labels: string[],
  t: (key: "map.gameLabelBoard" | "map.gameLabelCommunity") => string
) {
  return Array.from(
    new Set(labels.map((label) => localizeGameLabel(inferGameNameFromLabels([label.trim()]), t)))
  ).filter(Boolean);
}

function buildVenueHelperText(
  venue: InteractiveMapProps["venues"][number],
  t: (key: "map.gameLabelBoard" | "map.gameLabelCommunity") => string
) {
  const gameNames = inferGameNamesFromLabels(venue.formats, t);
  const segments = [
    formatVenueKind(venue.kind),
    ...gameNames,
    formatShortAddress(venue.address),
  ].filter(Boolean);
  return segments.join(" · ");
}


function PinCallout({
  kindLabel,
  title,
  distanceLabel,
  timeLabel,
  peopleLabel,
  helperText,
}: {
  kindLabel: string;
  title: string;
  distanceLabel: string | null;
  timeLabel?: string | null;
  peopleLabel?: string | null;
  helperText?: string | null;
}) {
  return (
    <View style={styles.calloutCard}>
      <Text style={styles.calloutKind}>{kindLabel}</Text>
      <Text style={styles.calloutTitle}>{title}</Text>
      {distanceLabel ? <Text style={styles.calloutDistance}>{distanceLabel}</Text> : null}
      {timeLabel || peopleLabel ? (
        <View style={styles.calloutMetaRow}>
          {timeLabel ? (
            <View style={styles.calloutMetaItem}>
              <MaterialIcons name="schedule" size={13} color="#4F5E58" />
              <Text style={styles.calloutMetaText}>{timeLabel}</Text>
            </View>
          ) : null}
          {peopleLabel ? (
            <View style={styles.calloutMetaItem}>
              <MaterialIcons name="people" size={14} color="#4F5E58" />
              <Text style={styles.calloutMetaText}>{peopleLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {helperText ? <Text style={styles.calloutHelper}>{helperText}</Text> : null}
    </View>
  );
}

function formatMeetupSchedule(value: string) {
  const date = new Date(value);
  const sameDay = new Date().toDateString() === date.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return formatDateTime(value);
}

// Pixel radius within which two pins are considered overlapping and trigger the disambiguation menu.
const PIN_DISAMBIGUATION_RADIUS = 30;

type PinDisambiguationMenuProps = {
  candidates: VisibleOverlayPin[];
  bottomOverlayHeight: number;
  onSelect: (item: VisibleOverlayPin) => void;
  onDismiss: () => void;
};

const MENU_WIDTH = 260;
const MENU_MAX_HEIGHT = 320;
const MENU_MIN_HEIGHT = 156;
const MENU_ITEM_HEIGHT = 56;
const MENU_TOP_OFFSET = 96;
const MENU_SCREEN_BOTTOM_GAP = 24;

function PinDisambiguationMenu({ candidates, bottomOverlayHeight, onSelect, onDismiss }: PinDisambiguationMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reservedBottom = Math.max(
    bottomOverlayHeight + insets.bottom + MENU_SCREEN_BOTTOM_GAP,
    insets.bottom + MENU_SCREEN_BOTTOM_GAP
  );
  const top = insets.top + MENU_TOP_OFFSET;
  const maxHeight = Math.min(
    MENU_MAX_HEIGHT,
    Math.max(windowHeight - top - reservedBottom, MENU_MIN_HEIGHT)
  );

  const content = (
    <View style={disambiguationStyles.modalRoot} pointerEvents="box-none">
      {/* Invisible full-screen backdrop to catch taps outside the menu */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t("map.closeMenu")}
      />
      <View
        style={[
          disambiguationStyles.menuPositioner,
          {
            paddingTop: top,
            paddingBottom: reservedBottom,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={[disambiguationStyles.menu, { maxHeight }]}>
          <Text style={disambiguationStyles.title}>{t("map.selectPin")}</Text>
          <ScrollView
            style={disambiguationStyles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {candidates.map((item, index) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  disambiguationStyles.item,
                  index < candidates.length - 1 && disambiguationStyles.itemBorder,
                  pressed && disambiguationStyles.itemPressed,
                ]}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
              >
                <Image
                  source={resolveMarkerImageSource(item)}
                  style={disambiguationStyles.pinIcon}
                  resizeMode="contain"
                />
                <View style={disambiguationStyles.itemText}>
                  <Text style={disambiguationStyles.itemKind} numberOfLines={1}>
                    {resolvePinKindLabel(item)}
                  </Text>
                  <Text style={disambiguationStyles.itemName} numberOfLines={1}>
                    {resolvePinDisplayName(item)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <Modal
        transparent
        animationType="fade"
        visible
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        {content}
      </Modal>
    );
  }

  return content;
}

function resolvePinKindLabel(item: VisibleOverlayPin): string {
  if (item.kind === "venue") return "Local";
  return "Jogo";
}

function resolvePinDisplayName(item: VisibleOverlayPin): string {
  return item.displayName ?? "Pin";
}

const disambiguationStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  menuPositioner: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  menu: {
    width: MENU_WIDTH,
    backgroundColor: "rgba(14, 18, 24, 0.97)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  title: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    minHeight: MENU_ITEM_HEIGHT,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  itemPressed: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  pinIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
  },
  itemKind: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

const OverlayMarkers = memo(function OverlayMarkers({
  pins,
  selectedPinId = null,
  onPressPin,
}: OverlayMarkersProps) {
  return (
    <>
      {pins.map((item) => (
        <Marker
          key={`${item.kind}:${item.id}`}
          identifier={item.id}
          anchor={{ x: 0.5, y: 0.5 }}
          coordinate={item.coordinate}
          image={resolveMarkerImageSource(item)}
          style={{ transform: [{ scale: MAP_BALLOON_SCALE }] }}
          tracksViewChanges={false}
          zIndex={resolveOverlayPinZIndex(item, selectedPinId)}
          onPress={(event) => {
            onPressPin(item, event);
          }}
        />
      ))}
    </>
  );
}, areOverlayMarkersEqual);

function areOverlayMarkersEqual(left: OverlayMarkersProps, right: OverlayMarkersProps) {
  if (left.onPressPin !== right.onPressPin) {
    return false;
  }

  if (left.selectedPinId !== right.selectedPinId) {
    return false;
  }

  if (left.pins.length !== right.pins.length) {
    return false;
  }

  for (let index = 0; index < left.pins.length; index += 1) {
    const leftPin = left.pins[index];
    const rightPin = right.pins[index];

    if (
      leftPin.id !== rightPin.id ||
      leftPin.kind !== rightPin.kind ||
      Boolean(leftPin.overdue) !== Boolean(rightPin.overdue) ||
      (leftPin.kind === "meetup" &&
        rightPin.kind === "meetup" &&
        leftPin.meetupMarkerStyle !== rightPin.meetupMarkerStyle) ||
      Math.abs(leftPin.coordinate.latitude - rightPin.coordinate.latitude) > 0.0000001 ||
      Math.abs(leftPin.coordinate.longitude - rightPin.coordinate.longitude) > 0.0000001
    ) {
      return false;
    }
  }

  return true;
}

function resolveOverlayPinZIndex(item: VisibleOverlayPin, selectedPinId: string | null) {
  if (item.id === selectedPinId) {
    return 20;
  }

  return item.kind === "venue" ? 7 : 5;
}

const LIVE_USER_DOT_OUTER_SIZE = 14;
const MAP_VIEW_HEIGHT = 340;
const MAP_BALLOON_SCALE = Platform.select({ android: 0.54, default: 0.75 });

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: palette.mapSurface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  wrapperImmersive: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  mapViewport: {
    position: "relative",
    width: "100%",
    height: MAP_VIEW_HEIGHT,
  },
  mapViewportImmersive: {
    flex: 1,
    height: "100%",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.card,
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  legendText: {
    color: palette.parchment,
    fontSize: 12,
  },
  tip: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  liveUserMarker: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBubbleOverlay: {
    position: "absolute",
    width: 260,
    alignItems: "center",
    zIndex: 20,
    elevation: 20,
  },
  selectedBubbleShell: {
    minWidth: 220,
    maxWidth: 260,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(250,248,244,0.98)",
    borderWidth: 1,
    borderColor: "rgba(17,26,23,0.06)",
    shadowColor: "#09110D",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  liveUserDotOuter: {
    width: LIVE_USER_DOT_OUTER_SIZE,
    height: LIVE_USER_DOT_OUTER_SIZE,
    borderRadius: LIVE_USER_DOT_OUTER_SIZE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#1A3D86",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  liveUserDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A86F7",
  },
  recenterButton: {
    position: "absolute",
    bottom: spacing.md,
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(17,26,23,0.08)",
    shadowColor: "#0B1713",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  recenterButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  recenterButtonBusy: {
    opacity: 0.9,
  },
  recenterButtonImmersive: {
    bottom: spacing.xxl + 92,
  },
  calloutCard: {
    gap: 5,
  },
  calloutKind: {
    color: palette.ember,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  calloutTitle: {
    color: "#101915",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
  },
  calloutDistance: {
    color: "#5B6A63",
    fontSize: 12,
    lineHeight: 16,
  },
  calloutMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  calloutMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calloutMetaText: {
    color: "#4F5E58",
    fontSize: 12,
    lineHeight: 16,
  },
  calloutHelper: {
    color: "#33423C",
    fontSize: 12,
    lineHeight: 17,
  },
});
