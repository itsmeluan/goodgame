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
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Callout, Circle, Marker, Polygon, Region } from "react-native-maps";

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
import {
  ensureForegroundLocationPermission,
  getDeviceCoordinate,
  resolveHeading,
} from "@/lib/location";
import { inferGameNameFromLabels, meetupMarkerVisualFromMeetup } from "@/features/map/gameLabels";
import { palette, radius, spacing } from "@/theme/tokens";
import type { MapCoordinate } from "@/types/domain";

type MeetupMarkerStyle = "magic" | "board" | "yugioh" | "pokemon";

type RawOverlayPin = {
  id: string;
  kind: "meetup" | "venue" | "draft";
  coordinate: MapCoordinate;
  badgeCount: number | null;
  /** Pins fanned out from the same coordinate — must not merge in screen-space clustering. */
  spreadFromCoincident?: boolean;
  overdue?: boolean;
  /** Sprite set for meetup pins (Magic vs other games / future dice art). */
  meetupMarkerStyle?: MeetupMarkerStyle;
  representedMeetupIds?: string[];
  representedVenueIds?: string[];
  calloutContent?: ReactNode;
  onPress?: () => void;
};

type ProjectedOverlayPin = RawOverlayPin & {
  point: { x: number; y: number };
};

type ClusteredProjectedPin = {
  id: string;
  kind: "cluster";
  coordinate: MapCoordinate;
  point: { x: number; y: number };
  badgeCount: number;
  overdue?: boolean;
  calloutContent?: ReactNode;
  onPress?: () => void;
};

type VisibleOverlayPin = ProjectedOverlayPin | ClusteredProjectedPin;
type OverlayPinGroup = {
  key: string;
  coordinate: MapCoordinate;
  meetups: InteractiveMapProps["meetups"];
  venues: InteractiveMapProps["venues"];
  meetupIds: string[];
  venueIds: string[];
};

type PixelOffset = {
  x: number;
  y: number;
};

type OverlayMarkersProps = {
  pins: VisibleOverlayPin[];
  onPressPin: (item: VisibleOverlayPin, event: { stopPropagation?: () => void }) => void;
};

type OverlayPinSnapshot = {
  id: string;
  coordinate: MapCoordinate;
  calloutContent?: ReactNode;
};

const OVERDUE_MEETUP_AFTER_MS = 60 * 60 * 1000;
const PROJECTED_CLUSTER_ENABLE_AT_ZOOM = 0.038;
const PROJECTED_CLUSTER_DISABLE_AT_ZOOM = 0.03;
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
  cluster: require("../../../assets/map/marker-cluster.png"),
  cluster2: require("../../../assets/map/marker-cluster-2.png"),
  cluster3: require("../../../assets/map/marker-cluster-3.png"),
  cluster4: require("../../../assets/map/marker-cluster-4.png"),
  cluster5: require("../../../assets/map/marker-cluster-5.png"),
  cluster6: require("../../../assets/map/marker-cluster-6.png"),
  cluster7: require("../../../assets/map/marker-cluster-7.png"),
  cluster8: require("../../../assets/map/marker-cluster-8.png"),
  cluster9: require("../../../assets/map/marker-cluster-9.png"),
  cluster9plus: require("../../../assets/map/marker-cluster-9plus.png"),
  draft: require("../../../assets/map/marker-draft.png"),
} as const;

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
  const mapRef = useRef<MapView | null>(null);
  const hasAutoCenteredOnUserRef = useRef(false);
  const lastFocusedSignatureRef = useRef<string | null>(null);
  const latestRegionRef = useRef<Region>(buildRegion([]));
  const selectedDisplayedOverlayPinRef = useRef<{ id: string; coordinate: MapCoordinate } | null>(null);
  const markerPressLockUntilRef = useRef(0);
  const projectedClusteringEnabledRef = useRef(false);
  const [liveUserCoordinate, setLiveUserCoordinate] = useState<MapCoordinate | null>(null);
  const [liveUserHeading, setLiveUserHeading] = useState<number | null>(null);
  const [liveUserAccuracy, setLiveUserAccuracy] = useState<number | null>(null);
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
  const [clusterRegion, setClusterRegion] = useState<Region>(initialRegion);
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

  const overlayGroups = useMemo(() => buildOverlayPinGroups({ meetups, venues }), [meetups, venues]);
  /** Always fan out coincident groups so pins never sit on identical pixels; zoom-independent. */
  const expandedCoincidentGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    overlayGroups.forEach((group) => {
      if (group.meetupIds.length + group.venueIds.length > 1) {
        keys.add(group.key);
      }
    });
    return keys;
  }, [overlayGroups]);

  const rawOverlayPins = useMemo(() => {
    const items: RawOverlayPin[] = [];

    if (allowDraftSelection && draftCoordinate) {
      items.push({
        id: "draft",
        kind: "draft",
        coordinate: draftCoordinate,
        badgeCount: null,
        representedMeetupIds: [],
        representedVenueIds: [],
        calloutContent: (
          <PinCallout
            kindLabel="Jogo"
            title="Ponto do próximo jogo"
            distanceLabel={null}
            helperText="Toque em outro lugar do mapa para ajustar essa localização."
          />
        ),
      });
    }

    const venueCollisionOffsets = buildVenueCollisionOffsets(overlayGroups);
    const meetupVenueAvoidanceOffsets = buildMeetupVenueAvoidanceOffsets(overlayGroups, clusterRegion);

    overlayGroups.forEach((group) => {
      const venueCollisionOffset = venueCollisionOffsets.get(group.key) ?? { x: 0, y: 0 };
      const meetupVenueAvoidanceOffset = meetupVenueAvoidanceOffsets.get(group.key) ?? { x: 0, y: 0 };
      if (expandedCoincidentGroupKeys.has(group.key)) {
        const spreadItems = buildExpandedGroupItems(
          group,
          Math.max(clusterRegion.latitudeDelta, clusterRegion.longitudeDelta)
        );

        spreadItems.forEach((spreadItem) => {
          if (spreadItem.kind === "venue") {
            const venue = spreadItem.venue;
            const coordinate = offsetCoordinateByPixelOffset(
              group.coordinate,
              {
                x: spreadItem.offset.x + venueCollisionOffset.x,
                y: spreadItem.offset.y + venueCollisionOffset.y,
              },
              clusterRegion,
              mapSize
            );

            items.push({
              id: `venue:${venue.id}`,
              kind: "venue",
              coordinate,
              badgeCount: null,
              spreadFromCoincident: true,
              representedMeetupIds: [],
              representedVenueIds: [venue.id],
              calloutContent: (
                <PinCallout
                  kindLabel="Local"
                  title={venue.name}
                  distanceLabel={formatDistanceKm(profile.lat, profile.lng, venue.lat, venue.lng)}
                  helperText={buildVenueHelperText(venue)}
                />
              ),
              onPress: () => onSelectVenue(venue.id),
            });

            return;
          }

          const meetup = spreadItem.meetup;
          const overdue = isMeetupOverdueForMap(meetup);
          const coordinate = offsetCoordinateByPixelOffset(
            group.coordinate,
            {
              x: spreadItem.offset.x + meetupVenueAvoidanceOffset.x,
              y: spreadItem.offset.y + meetupVenueAvoidanceOffset.y,
            },
            clusterRegion,
            mapSize
          );

          items.push({
            id: `meetup:${meetup.id}`,
            kind: "meetup",
            coordinate,
            badgeCount: null,
            spreadFromCoincident: true,
            overdue,
            meetupMarkerStyle: resolveMeetupMarkerStyle(meetup),
            representedMeetupIds: [meetup.id],
            representedVenueIds: [],
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

        return;
      }

      const hasVenue = group.venueIds.length > 0;
      const hasMeetup = group.meetupIds.length > 0;

      if (hasVenue) {
        const primaryVenue = group.venues[0] ?? null;

        if (primaryVenue) {
          const coordinate = offsetCoordinateByPixelOffset(
            group.coordinate,
            venueCollisionOffset,
            clusterRegion,
            mapSize
          );

          items.push({
            id: `venue:${primaryVenue.id}`,
            kind: "venue",
            coordinate,
            badgeCount: null,
            representedMeetupIds: [],
            representedVenueIds: [primaryVenue.id],
            calloutContent: (
              <PinCallout
                kindLabel="Local"
                title={primaryVenue.name}
                distanceLabel={formatDistanceKm(
                  profile.lat,
                  profile.lng,
                  primaryVenue.lat,
                  primaryVenue.lng
                )}
                helperText={buildVenueHelperText(primaryVenue)}
              />
            ),
            onPress: () => onSelectVenue(primaryVenue.id),
          });
        }
      }

      if (hasMeetup) {
        const meetupPinId = `meetup-group:${group.key}`;
        const isMeetupGroupSelected = selectedMapGroupKey === meetupPinId;
        const selectedMeetup = selectedMeetupId
          ? group.meetups.find((meetup) => meetup.id === selectedMeetupId) ?? null
          : null;
        const primaryMeetup = selectedMeetup ?? group.meetups[0] ?? null;
        const meetupGroupOverdue =
          group.meetups.length > 0 && group.meetups.every((meetup) => isMeetupOverdueForMap(meetup));

        if (primaryMeetup) {
          const coordinate = offsetCoordinateByPixelOffset(
            group.coordinate,
            meetupVenueAvoidanceOffset,
            clusterRegion,
            mapSize
          );

          items.push({
            id: meetupPinId,
            kind: "meetup",
            coordinate,
            badgeCount: group.meetupIds.length > 1 ? group.meetupIds.length : null,
            overdue: meetupGroupOverdue,
            meetupMarkerStyle: resolveMeetupMarkerStyle(primaryMeetup),
            representedMeetupIds: group.meetupIds,
            representedVenueIds: [],
            calloutContent: isMeetupGroupSelected
              ? (
                  <PinCallout
                    kindLabel="Jogos"
                    title={`${group.meetupIds.length} partida${group.meetupIds.length > 1 ? "s" : ""}`}
                    distanceLabel={formatDistanceKm(
                      profile.lat,
                      profile.lng,
                      primaryMeetup.lat,
                      primaryMeetup.lng
                    )}
                    peopleLabel={`${group.meetupIds.length} ativa${group.meetupIds.length > 1 ? "s" : ""}`}
                    helperText={buildMeetupGroupHelperText(group)}
                  />
                )
              : (
                  <PinCallout
                    kindLabel="Jogo"
                    title={primaryMeetup.title}
                    distanceLabel={formatDistanceKm(
                      profile.lat,
                      profile.lng,
                      primaryMeetup.lat,
                      primaryMeetup.lng
                    )}
                    timeLabel={formatMeetupSchedule(primaryMeetup.startsAt)}
                    helperText={
                      primaryMeetup.isLocationExact
                        ? formatCompactAddress(primaryMeetup.addressLabel || primaryMeetup.locationHint)
                        : "Entre no grupo para ver o ponto exato."
                    }
                  />
                ),
            onPress:
              group.meetupIds.length > 1
                ? () =>
                    onSelectMapGroup?.({
                      key: meetupPinId,
                      kind: "meetup",
                      coordinate: group.coordinate,
                      meetupIds: group.meetupIds,
                      venueIds: [],
                      primaryMeetupId: primaryMeetup.id,
                      primaryVenueId: null,
                    })
                : () => onSelectMeetup(primaryMeetup.id),
          });
        }
      }
    });

    return items;
  }, [
    allowDraftSelection,
    draftCoordinate,
    onSelectMapGroup,
    onSelectMeetup,
    onSelectVenue,
    profile.lat,
    profile.lng,
    selectedMapGroupKey,
    selectedMeetupId,
    clusterRegion,
    expandedCoincidentGroupKeys,
    mapSize,
    overlayGroups,
  ]);

  const selectedPinOverlayKey = useMemo(() => {
    if (selectedMapGroupKey) {
      return selectedMapGroupKey;
    }

    if (selectedMeetupId) {
      const exactMeetupPin = rawOverlayPins.find((item) => item.id === `meetup:${selectedMeetupId}`);

      if (exactMeetupPin) {
        return exactMeetupPin.id;
      }

      const groupedMeetupPin = rawOverlayPins.find(
        (item) =>
          item.kind === "meetup" &&
          item.representedMeetupIds?.includes(selectedMeetupId)
      );

      return groupedMeetupPin?.id ?? null;
    }

    if (selectedVenueId) {
      const exactVenuePin = rawOverlayPins.find((item) => item.id === `venue:${selectedVenueId}`);

      if (exactVenuePin) {
        return exactVenuePin.id;
      }

      const groupedVenuePin = rawOverlayPins.find(
        (item) =>
          item.kind === "venue" &&
          item.representedVenueIds?.includes(selectedVenueId)
      );

      return groupedVenuePin?.id ?? null;
    }

    return null;
  }, [rawOverlayPins, selectedMapGroupKey, selectedMeetupId, selectedVenueId]);
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
      representedMeetupIds: [],
      representedVenueIds: [selectedVenue.id],
      calloutContent: (
        <PinCallout
          kindLabel="Local"
          title={selectedVenue.name}
          distanceLabel={formatDistanceKm(profile.lat, profile.lng, selectedVenue.lat, selectedVenue.lng)}
          helperText={buildVenueHelperText(selectedVenue)}
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

  const zoomIntoCluster = useCallback(
    (pins: ProjectedOverlayPin[]) => {
      if (!mapRef.current || !pins.length) {
        return;
      }

      onClearSelection();
      lastFocusedSignatureRef.current = null;
      mapRef.current.animateToRegion(
        buildClusterFocusRegion(pins.map((item) => item.coordinate), latestRegionRef.current),
        280
      );
    },
    [onClearSelection]
  );

  const renderedOverlayPins = useMemo(() => {
    if (!mapReady || !mapSize.width || !mapSize.height) {
      return [];
    }

    const projectedPins = rawOverlayPins
      .map((item) => ({
        ...item,
        point: projectCoordinateToPoint({
          coordinate: item.coordinate,
          region: clusterRegion,
          mapSize,
        }),
      }));

    const projectedClusteringEnabled = resolveProjectedClusteringEnabled({
      pins: projectedPins,
      region: clusterRegion,
      previousEnabled: projectedClusteringEnabledRef.current,
    });

    projectedClusteringEnabledRef.current = projectedClusteringEnabled;

    return projectedClusteringEnabled
      ? buildProjectedPinClusters({
          pins: projectedPins,
          region: clusterRegion,
          onPressCluster: zoomIntoCluster,
        })
      : sortVisibleOverlayPins(projectedPins);
  }, [clusterRegion, mapReady, mapSize, rawOverlayPins, zoomIntoCluster]);

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

    const centeredLatitude = getShiftedLatitude({
      latitude: focusTarget.latitude,
      latitudeDelta: visibleRegion.latitudeDelta || 0.028,
      bottomOverlayHeight,
      mapHeight: mapSize.height,
    });

    mapRef.current.animateToRegion(
      {
        latitude: centeredLatitude,
        longitude: focusTarget.longitude,
        latitudeDelta: visibleRegion.latitudeDelta || 0.028,
        longitudeDelta: visibleRegion.longitudeDelta || 0.028,
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

  const handleOverlayMarkerPress = useCallback(
    (item: VisibleOverlayPin, event: { stopPropagation?: () => void }) => {
      markerPressLockUntilRef.current = Date.now() + 600;
      event.stopPropagation?.();

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

  useEffect(() => {
    let active = true;
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      try {
        await ensureForegroundLocationPermission();

        const currentCoordinate = await getDeviceCoordinate();

        if (active) {
          setLiveUserCoordinate(currentCoordinate);
          setLiveUserAccuracy(42);
        }

        positionSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3,
            timeInterval: 1500,
          },
          (location) => {
            if (!active) {
              return;
            }

            setLiveUserCoordinate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setLiveUserAccuracy(location.coords.accuracy ?? null);

            const nextHeading = resolveHeading({
              coordsHeading: location.coords.heading,
            });

            if (nextHeading !== null) {
              setLiveUserHeading(nextHeading);
            }
          }
        );

        headingSubscription = await Location.watchHeadingAsync((heading) => {
          if (!active) {
            return;
          }

          const nextHeading = resolveHeading({
            trueHeading: heading.trueHeading,
            magHeading: heading.magHeading,
          });

          if (nextHeading !== null) {
            setLiveUserHeading(nextHeading);
          }
        });
      } catch {
        if (active) {
          setLiveUserCoordinate(null);
          setLiveUserHeading(null);
          setLiveUserAccuracy(null);
        }
      }
    }

    void startWatching();

    return () => {
      active = false;
      positionSubscription?.remove();
      headingSubscription?.remove();
    };
  }, []);

  return (
    <View style={[styles.wrapper, immersive ? styles.wrapperImmersive : null]}>
      <View style={[styles.mapViewport, immersive ? styles.mapViewportImmersive : null]}>
        <MapView
          ref={mapRef}
          initialRegion={initialRegion}
          style={styles.map}
          mapType="standard"
          showsCompass
          toolbarEnabled={false}
          onLayout={handleMapLayout}
          onMapReady={() => {
            setMapReady(true);
          }}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPress={(event: { nativeEvent: { coordinate: MapCoordinate } }) => {
            if (Date.now() < markerPressLockUntilRef.current) {
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
            <>
              {visibleRadiusKm !== null ? (
                <Circle
                  center={{ latitude: profile.lat, longitude: profile.lng }}
                  radius={visibleRadiusKm * 1000}
                  fillColor="rgba(241, 143, 92, 0.12)"
                  strokeColor="rgba(241, 143, 92, 0.55)"
                />
              ) : null}
              <Marker
                coordinate={{ latitude: profile.lat, longitude: profile.lng }}
                pinColor={palette.forest}
                tracksViewChanges={false}
              >
                <Callout>
                  <PinCallout
                    kindLabel="Perfil"
                    title="Sua área aproximada"
                    distanceLabel={null}
                    helperText={profile.neighborhood || "Localização de perfil"}
                  />
                </Callout>
              </Marker>
            </>
          ) : null}

          {liveUserCoordinate ? (
            <>
              <Circle
                center={liveUserCoordinate}
                radius={normalizeAccuracyRadius(liveUserAccuracy)}
                fillColor="rgba(69, 126, 245, 0.16)"
                strokeColor="rgba(69, 126, 245, 0.22)"
                strokeWidth={1}
              />
              {liveUserHeadingCone ? (
                <Polygon
                  coordinates={liveUserHeadingCone}
                  fillColor="rgba(74, 134, 247, 0.18)"
                  strokeColor="rgba(74, 134, 247, 0)"
                  strokeWidth={0}
                />
              ) : null}
            </>
          ) : null}

          <OverlayMarkers pins={renderedOverlayPins} onPressPin={handleOverlayMarkerPress} />

          {liveUserCoordinate ? (
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
          ) : null}

        </MapView>

        {selectedPinScreenPoint && selectedDisplayedOverlayPin?.calloutContent ? (
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
          accessibilityLabel="Centralizar na minha localização"
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
    setClusterRegion((current) =>
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

      setLiveUserCoordinate(coordinate);

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

function buildOverlayPinGroups({
  meetups,
  venues,
}: {
  meetups: InteractiveMapProps["meetups"];
  venues: InteractiveMapProps["venues"];
}) {
  const proximityThresholdMeters = 22;

  const sortedVenues = [...venues].sort((left, right) => {
    if (left.lat !== right.lat) {
      return left.lat - right.lat;
    }

    if (left.lng !== right.lng) {
      return left.lng - right.lng;
    }

    return left.id.localeCompare(right.id);
  });
  const sortedMeetups = [...meetups].sort((left, right) => {
    if (left.lat !== right.lat) {
      return left.lat - right.lat;
    }

    if (left.lng !== right.lng) {
      return left.lng - right.lng;
    }

    return left.id.localeCompare(right.id);
  });

  const venueGroups = sortedVenues.map((venue) => ({
    key: `g:v:${venue.id}`,
    coordinate: { latitude: venue.lat, longitude: venue.lng },
    meetups: [],
    venues: [venue],
    meetupIds: [],
    venueIds: [venue.id],
  }));
  const meetupGroups: OverlayPinGroup[] = [];

  sortedMeetups.forEach((meetup) => {
    const coordinate = { latitude: meetup.lat, longitude: meetup.lng };
    const existing = findNearestOverlayGroup(meetupGroups, coordinate, proximityThresholdMeters);

    if (existing) {
      existing.meetups.push(meetup);
      existing.meetupIds.push(meetup.id);
      return;
    }

    meetupGroups.push({
      key: `g:m:${meetup.id}`,
      coordinate,
      meetups: [meetup],
      venues: [],
      meetupIds: [meetup.id],
      venueIds: [],
    });
  });

  return [...venueGroups, ...meetupGroups].map((group) => {
    const meetupIds = [...group.meetupIds].sort();
    const venueIds = [...group.venueIds].sort();

    return {
      ...group,
      meetupIds,
      venueIds,
      key: buildOverlayGroupKey({
        coordinate: group.coordinate,
        meetupIds,
        venueIds,
      }),
    };
  });
}

function findNearestOverlayGroup(
  groups: OverlayPinGroup[],
  coordinate: MapCoordinate,
  thresholdMeters: number
): OverlayPinGroup | null {
  let bestMatch: OverlayPinGroup | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  groups.forEach((group) => {
    const distance = distanceBetweenCoordinatesMeters(group.coordinate, coordinate);

    if (distance > thresholdMeters || distance >= bestDistance) {
      return;
    }

    bestDistance = distance;
    bestMatch = group;
  });

  return bestMatch;
}

function buildVenueCollisionOffsets(groups: OverlayPinGroup[]) {
  const venueGroups = groups.filter((group) => group.venueIds.length > 0);
  const visited = new Set<number>();
  const offsets = new Map<string, PixelOffset>();

  for (let index = 0; index < venueGroups.length; index += 1) {
    if (visited.has(index)) {
      continue;
    }

    const queue = [index];
    const overlapIndexes: number[] = [];
    visited.add(index);

    while (queue.length) {
      const nextIndex = queue.shift();

      if (nextIndex === undefined) {
        break;
      }

      overlapIndexes.push(nextIndex);

      for (let candidateIndex = 0; candidateIndex < venueGroups.length; candidateIndex += 1) {
        if (visited.has(candidateIndex)) {
          continue;
        }

        const distance = distanceBetweenCoordinatesMeters(
          venueGroups[nextIndex].coordinate,
          venueGroups[candidateIndex].coordinate
        );

        if (distance <= 24) {
          visited.add(candidateIndex);
          queue.push(candidateIndex);
        }
      }
    }

    const overlapGroups = overlapIndexes
      .map((overlapIndex) => venueGroups[overlapIndex])
      .sort((left, right) => left.key.localeCompare(right.key));

    if (overlapGroups.length === 1) {
      offsets.set(overlapGroups[0].key, { x: 0, y: 0 });
      continue;
    }

    const radius = overlapGroups.length === 2 ? 14 : overlapGroups.length <= 4 ? 18 : 22;

    overlapGroups.forEach((group, overlapIndex) => {
      const angle = (-Math.PI / 2) + (overlapIndex / overlapGroups.length) * Math.PI * 2;

      offsets.set(group.key, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });
  }

  return offsets;
}

/**
 * Screen-space offset magnitude (passed through `offsetCoordinateByPixelOffset`) for meetup pins
 * near venues. At wide zoom, 0 so pins can overlap; when zoomed in, enough to separate from venue art.
 */
function resolveMeetupVenueAvoidancePixelMagnitude(zoomLevel: number): number {
  if (zoomLevel >= 0.11) {
    return 0;
  }
  if (zoomLevel >= 0.055) {
    return 10;
  }
  if (zoomLevel >= 0.032) {
    return 18;
  }
  if (zoomLevel >= 0.022) {
    return 26;
  }
  if (zoomLevel >= 0.016) {
    return 34;
  }
  return 40;
}

function buildMeetupVenueAvoidanceOffsets(groups: OverlayPinGroup[], region: Region) {
  const offsets = new Map<string, PixelOffset>();
  const venueGroups = groups.filter((group) => group.venueIds.length > 0);
  const meetupGroups = groups.filter((group) => group.meetupIds.length > 0);
  const zoomLevel = Math.max(region.latitudeDelta, region.longitudeDelta);

  meetupGroups.forEach((group) => {
    const nearbyVenueGroups = venueGroups
      .map((candidate) => ({
        group: candidate,
        distanceMeters: distanceBetweenCoordinatesMeters(group.coordinate, candidate.coordinate),
      }))
      .filter((candidate) => candidate.distanceMeters <= 42);

    if (!nearbyVenueGroups.length) {
      offsets.set(group.key, { x: 0, y: 0 });
      return;
    }

    const centroid = nearbyVenueGroups.reduce(
      (accumulator, candidate) => ({
        latitude: accumulator.latitude + candidate.group.coordinate.latitude / nearbyVenueGroups.length,
        longitude: accumulator.longitude + candidate.group.coordinate.longitude / nearbyVenueGroups.length,
      }),
      { latitude: 0, longitude: 0 }
    );

    const meetupLatitudeMeters = group.coordinate.latitude * 111320;
    const centroidLatitudeMeters = centroid.latitude * 111320;
    const metersPerDegreeLongitude =
      Math.max(Math.cos((group.coordinate.latitude * Math.PI) / 180), 0.00001) * 111320;
    const meetupLongitudeMeters = group.coordinate.longitude * metersPerDegreeLongitude;
    const centroidLongitudeMeters = centroid.longitude * metersPerDegreeLongitude;

    let eastMeters = meetupLongitudeMeters - centroidLongitudeMeters;
    let northMeters = meetupLatitudeMeters - centroidLatitudeMeters;

    if (Math.abs(eastMeters) < 0.5 && Math.abs(northMeters) < 0.5) {
      const seed = stableNumericHash(group.key);
      const angle = (seed / 360) * Math.PI * 2;
      eastMeters = Math.cos(angle);
      northMeters = Math.sin(angle);
    }

    const nearestDistanceMeters = Math.min(...nearbyVenueGroups.map((candidate) => candidate.distanceMeters));
    const baseMagnitude = resolveMeetupVenueAvoidancePixelMagnitude(zoomLevel);
    if (baseMagnitude <= 0) {
      offsets.set(group.key, { x: 0, y: 0 });
      return;
    }

    const distanceFactor =
      nearestDistanceMeters <= 8
        ? 1
        : nearestDistanceMeters <= 16
          ? 0.9
          : nearestDistanceMeters <= 28
            ? 0.78
            : 0.65;
    const magnitude = baseMagnitude * distanceFactor;
    const vectorLength = Math.max(Math.sqrt(eastMeters * eastMeters + northMeters * northMeters), 0.0001);
    const normalizedEastMeters = (eastMeters / vectorLength) * magnitude;
    const normalizedNorthMeters = (northMeters / vectorLength) * magnitude;

    offsets.set(group.key, {
      x: normalizedEastMeters,
      y: -normalizedNorthMeters,
    });
  });

  return offsets;
}

function buildExpandedGroupItems(group: OverlayPinGroup, zoomLevel: number) {
  const items = [
    ...group.venues
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((venue) => ({ kind: "venue" as const, venue })),
    ...group.meetups
      .slice()
      .sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      )
      .map((meetup) => ({ kind: "meetup" as const, meetup })),
  ];

  const radius = resolveCoincidentSpreadRadius(items.length, zoomLevel);

  if (items.length === 2) {
    return items.map((item, index) => ({
      ...item,
      offset: { x: index === 0 ? -radius : radius, y: 0 },
    }));
  }

  return items.map((item, index) => {
    const angle = (-Math.PI / 2) + (index / items.length) * Math.PI * 2;

    return {
      ...item,
      offset: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
    };
  });
}

function resolveCoincidentSpreadRadius(count: number, zoomLevel: number) {
  const base =
    count <= 2 ? 20 : count === 3 ? 24 : count <= 5 ? 28 : 34;
  if (zoomLevel >= 0.11) {
    return base * 0.4;
  }
  if (zoomLevel >= 0.055) {
    return base * 0.6;
  }
  if (zoomLevel >= 0.028) {
    return base * 0.78;
  }
  return base;
}

function buildOverlayGroupKey({
  coordinate,
  meetupIds,
  venueIds,
}: {
  coordinate: MapCoordinate;
  meetupIds: string[];
  venueIds: string[];
}) {
  const latitudeKey = coordinate.latitude.toFixed(5);
  const longitudeKey = coordinate.longitude.toFixed(5);
  const meetupKey = meetupIds.join(",");
  const venueKey = venueIds.join(",");

  return `g:${latitudeKey}:${longitudeKey}:m[${meetupKey}]:v[${venueKey}]`;
}

function resolveProjectedClusteringEnabled({
  pins,
  region,
  previousEnabled,
}: {
  pins: ProjectedOverlayPin[];
  region: Region;
  previousEnabled: boolean;
}) {
  const clusterablePins = pins.filter(shouldPinParticipateInProjectedClustering);

  if (clusterablePins.length < 2) {
    return false;
  }

  const zoomLevel = Math.max(region.latitudeDelta, region.longitudeDelta);

  if (previousEnabled) {
    return zoomLevel > PROJECTED_CLUSTER_DISABLE_AT_ZOOM;
  }

  return zoomLevel > PROJECTED_CLUSTER_ENABLE_AT_ZOOM;
}

function buildProjectedPinClusters({
  pins,
  region,
  onPressCluster,
}: {
  pins: ProjectedOverlayPin[];
  region: Region;
  onPressCluster: (pins: ProjectedOverlayPin[]) => void;
}) {
  const clusterRadius = resolveClusterRadius(region);
  const visited = new Set<number>();
  const fixedPins = pins.filter((pin) => !shouldPinParticipateInProjectedClustering(pin));
  const clusterablePins = pins.filter(shouldPinParticipateInProjectedClustering);
  const clusteredPins: VisibleOverlayPin[] = [];

  for (let index = 0; index < clusterablePins.length; index += 1) {
    if (visited.has(index)) {
      continue;
    }

    const currentPin = clusterablePins[index];

    const queue = [index];
    const clusterIndexes: number[] = [];
    visited.add(index);

    while (queue.length) {
      const nextIndex = queue.shift();

      if (nextIndex === undefined) {
        break;
      }

      clusterIndexes.push(nextIndex);

      for (let candidateIndex = 0; candidateIndex < clusterablePins.length; candidateIndex += 1) {
        if (visited.has(candidateIndex)) {
          continue;
        }

        const candidate = clusterablePins[candidateIndex];

        if (distanceBetweenPoints(clusterablePins[nextIndex].point, candidate.point) <= clusterRadius) {
          visited.add(candidateIndex);
          queue.push(candidateIndex);
        }
      }
    }

    if (clusterIndexes.length === 1) {
      clusteredPins.push(currentPin);
      continue;
    }

    const clusterPins = clusterIndexes.map((clusterIndex) => clusterablePins[clusterIndex]);
    const totalCount = clusterPins.reduce(
      (sum, item) => sum + countRepresentedPins(item),
      0
    );
    const averagePoint = clusterPins.reduce(
      (accumulator, item) => ({
        x: accumulator.x + item.point.x / clusterPins.length,
        y: accumulator.y + item.point.y / clusterPins.length,
      }),
      { x: 0, y: 0 }
    );
    const averageCoordinate = clusterPins.reduce(
      (accumulator, item) => ({
        latitude: accumulator.latitude + item.coordinate.latitude / clusterPins.length,
        longitude: accumulator.longitude + item.coordinate.longitude / clusterPins.length,
      }),
      { latitude: 0, longitude: 0 }
    );

    clusteredPins.push({
      id: `cluster:${clusterPins.map((item) => item.id).sort().join("|")}`,
      kind: "cluster",
      coordinate: averageCoordinate,
      point: averagePoint,
      badgeCount: totalCount,
      overdue:
        clusterPins.length > 0 && clusterPins.every((item) => item.kind === "meetup" && item.overdue),
      onPress: () => onPressCluster(clusterPins),
    });
  }

  return sortVisibleOverlayPins([...fixedPins, ...clusteredPins]);
}

function buildClusterFocusRegion(coordinates: MapCoordinate[], currentRegion: Region): Region {
  if (!coordinates.length) {
    return currentRegion;
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: clampNumber(currentRegion.latitudeDelta * 0.42, 0.006, 0.028),
      longitudeDelta: clampNumber(currentRegion.longitudeDelta * 0.42, 0.006, 0.028),
    };
  }

  const latitudes = coordinates.map((item) => item.latitude);
  const longitudes = coordinates.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latitudeDelta = clampNumber(
    Math.max((maxLat - minLat) * 1.7, currentRegion.latitudeDelta * 0.42),
    0.006,
    currentRegion.latitudeDelta * 0.58
  );
  const longitudeDelta = clampNumber(
    Math.max((maxLng - minLng) * 1.7, currentRegion.longitudeDelta * 0.42),
    0.006,
    currentRegion.longitudeDelta * 0.58
  );

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function resolveClusterRadius(region: Region) {
  const zoomLevel = Math.max(region.latitudeDelta, region.longitudeDelta);

  if (zoomLevel >= 0.16) {
    return 64;
  }

  if (zoomLevel >= 0.08) {
    return 56;
  }

  if (zoomLevel >= 0.04) {
    return 48;
  }

  return 42;
}

function shouldPinParticipateInProjectedClustering(pin: ProjectedOverlayPin) {
  if (pin.spreadFromCoincident) {
    return false;
  }

  return pin.kind === "meetup" && !pin.badgeCount;
}

function countRepresentedPins(pin: ProjectedOverlayPin) {
  return pin.badgeCount && pin.badgeCount > 1 ? pin.badgeCount : 1;
}

function sortVisibleOverlayPins<T extends VisibleOverlayPin>(pins: T[]) {
  return pins.slice().sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeMarkerBadgeKey(count: number | null) {
  if (!count || count <= 1) {
    return null;
  }

  if (count >= 10) {
    return "9plus" as const;
  }

  return String(count) as "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

type MeetupBadgeKey = NonNullable<ReturnType<typeof normalizeMarkerBadgeKey>>;

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

function resolveMeetupStyleMarkerAssetKey({
  style,
  overdue,
  badgeKey,
}: {
  style: MeetupMarkerStyle | undefined;
  overdue: boolean | undefined;
  badgeKey: MeetupBadgeKey | null;
}): keyof typeof MARKER_IMAGE_SOURCES {
  const base = meetupSpriteBase(style);

  if (overdue) {
    if (!badgeKey) {
      return `${base}Overdue` as keyof typeof MARKER_IMAGE_SOURCES;
    }

    if (badgeKey === "9plus") {
      return `${base}Overdue9plus` as keyof typeof MARKER_IMAGE_SOURCES;
    }

    return `${base}Overdue${badgeKey}` as keyof typeof MARKER_IMAGE_SOURCES;
  }

  if (!badgeKey) {
    return base as keyof typeof MARKER_IMAGE_SOURCES;
  }

  if (badgeKey === "9plus") {
    return `${base}9plus` as keyof typeof MARKER_IMAGE_SOURCES;
  }

  return `${base}${badgeKey}` as keyof typeof MARKER_IMAGE_SOURCES;
}

function resolveMeetupMarkerStyle(
  meetup: InteractiveMapProps["meetups"][number]
): MeetupMarkerStyle {
  return meetupMarkerVisualFromMeetup(meetup);
}

function resolveMarkerImageAssetKey(item: VisibleOverlayPin): keyof typeof MARKER_IMAGE_SOURCES {
  const badgeKey = normalizeMarkerBadgeKey(item.badgeCount);

  if (item.kind === "cluster") {
    if (!badgeKey) {
      return "cluster";
    }

    return `cluster${badgeKey}`;
  }

  if (item.kind === "venue") {
    if (!badgeKey) {
      return "venue";
    }

    return `venue${badgeKey}`;
  }

  if (item.kind === "draft") {
    return "draft";
  }

  return resolveMeetupStyleMarkerAssetKey({
    style: item.meetupMarkerStyle,
    overdue: item.overdue,
    badgeKey,
  });
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

function stableNumericHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }

  return hash;
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

function inferGameNamesFromLabels(labels: string[]) {
  return Array.from(new Set(labels.map((label) => inferGameNameFromLabels([label.trim()])))).filter(Boolean);
}

function buildVenueHelperText(venue: InteractiveMapProps["venues"][number]) {
  const gameNames = inferGameNamesFromLabels(venue.formats);
  const segments = [
    formatVenueKind(venue.kind),
    ...gameNames,
    formatShortAddress(venue.address),
  ].filter(Boolean);
  return segments.join(" · ");
}

function buildMeetupGroupHelperText(
  group: ReturnType<typeof buildOverlayPinGroups>[number]
) {
  const venueName = group.venues[0]?.name ?? null;
  const earliestMeetup = [...group.meetups].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  )[0];
  const timeHint = earliestMeetup ? `Próxima às ${formatMeetupSchedule(earliestMeetup.startsAt)}` : null;
  const shortAddress = formatShortAddress(
    earliestMeetup?.addressLabel || earliestMeetup?.locationHint || group.venues[0]?.address || null
  );

  return [venueName, timeHint, shortAddress].filter(Boolean).join(" · ");
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

const OverlayMarkers = memo(function OverlayMarkers({
  pins,
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
          tracksViewChanges={false}
          zIndex={item.kind === "venue" ? 7 : item.kind === "cluster" ? 6 : 5}
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

  if (left.pins.length !== right.pins.length) {
    return false;
  }

  for (let index = 0; index < left.pins.length; index += 1) {
    const leftPin = left.pins[index];
    const rightPin = right.pins[index];

    if (
      leftPin.id !== rightPin.id ||
      leftPin.kind !== rightPin.kind ||
      leftPin.badgeCount !== rightPin.badgeCount ||
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

const LIVE_USER_DOT_OUTER_SIZE = 14;
const MAP_VIEW_HEIGHT = 340;

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
