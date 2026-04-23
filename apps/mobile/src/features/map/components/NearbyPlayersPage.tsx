import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProFeatureGate } from "@/components/ProFeatureGate";
import { Avatar } from "@/components/Avatar";
import { AppIcon } from "@/components/AppIcon";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { MapEmptyCard } from "@/features/map/components/MapFeedbackPrimitives";
import { getCurrentLocale, useTranslation } from "@/i18n";
import { analyticsCapture } from "@/lib/analytics";
import { env } from "@/lib/env";
import { useLiveLocation } from "@/features/app/LiveLocationContext";
import { listNearbyPlayers } from "@/lib/api";
import { isUserPro } from "@/lib/proPlayer";
import { trackProductEvent } from "@/lib/productAnalytics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { NearbyPlayer, PlayerProfile } from "@/types/domain";

const FREE_PREVIEW_COUNT = 3;

function formatDistanceKm(km: number) {
  return `${new Intl.NumberFormat(getCurrentLocale(), { maximumFractionDigits: 1 }).format(km)} km`;
}

type NearbyPlayersPageProps = {
  profile: PlayerProfile;
  bottomInset: number;
  onClose: () => void;
  onOpenPlayerProfile: (userId: string) => void;
  onOpenProPaywall: (source: string) => void;
};

export function NearbyPlayersPage({
  profile,
  bottomInset,
  onClose,
  onOpenPlayerProfile,
  onOpenProPaywall,
}: NearbyPlayersPageProps) {
  const { t } = useTranslation();
  const { coordinate, permissionStatus, requestAccess } = useLiveLocation();
  const coordRef = useRef(coordinate);
  coordRef.current = coordinate;

  const [players, setPlayers] = useState<NearbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const pro = !env.proPlayerPaywallEnabled || isUserPro(profile);

  const initialFetchScheduledRef = useRef(false);

  useEffect(() => {
    void trackProductEvent({
      eventName: "pro_feature_used",
      eventCategory: "monetization",
      screenName: "nearby_players",
      context: {
        feature: "nearby_players",
        locked: !pro,
      },
    });
  }, [pro]);

  const fetchList = useCallback(
    async (mode: "initial" | "pull") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const perm = permissionStatus;
        const c = coordRef.current;

        if (perm !== "granted" || !c) {
          setPlayers([]);
          return;
        }

        const rows = await listNearbyPlayers({
          viewerLat: c.latitude,
          viewerLng: c.longitude,
        });
        setPlayers(rows);

        if (pro) {
          await trackProductEvent({
            eventName: "pro_feature_used",
            eventCategory: "monetization",
            screenName: "nearby_players",
            context: {
              feature: "nearby_players_results_loaded",
              result_count: rows.length,
            },
          });
        }
      } catch (fetchError) {
        setError(t("nearby.error"));
        if (__DEV__) {
          console.warn("[nearby-players]", fetchError);
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [permissionStatus, pro, t]
  );

  /** Uma busca automática ao abrir a tela (componente monta de novo ao voltar ao menu). */
  useEffect(() => {
    if (permissionStatus === null) {
      return;
    }

    if (permissionStatus !== "granted") {
      setPlayers([]);
      setLoading(false);
      return;
    }

    if (!coordinate) {
      return;
    }

    if (initialFetchScheduledRef.current) {
      return;
    }
    initialFetchScheduledRef.current = true;
    void fetchList("initial");
  }, [permissionStatus, coordinate, fetchList]);

  const onPullToRefresh = useCallback(async () => {
    if (permissionStatus !== "granted" || !coordRef.current) {
      return;
    }
    await fetchList("pull");
  }, [permissionStatus, fetchList]);

  async function handleRequestPermission() {
    setRequestingPermission(true);
    try {
      await requestAccess();
      initialFetchScheduledRef.current = false;
    } catch (permissionError) {
      if (__DEV__) {
        console.warn("[nearby-players] permission", permissionError);
      }
    } finally {
      setRequestingPermission(false);
    }
  }

  const requestUnlockFromGate = () => {
    analyticsCapture("click_locked_feature", { feature: "nearby_players" });
    onOpenProPaywall("nearby_players_locked");
  };

  const permissionDenied = permissionStatus !== null && permissionStatus !== "granted";
  const locating =
    permissionStatus === null || (permissionStatus === "granted" && coordinate === null);

  const canRefresh =
    permissionStatus === "granted" && coordinate !== null && !locating && !loading;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onPullToRefresh();
            }}
            enabled={canRefresh || refreshing}
            tintColor={palette.ember}
          />
        }
      >
      {!error && (loading || locating) ? (
        <View style={styles.loadingBox}>
          <LoadingSpinner size={24} />
          <Text style={styles.loadingHint}>
            {locating ? t("nearby.loadingLocation") : t("nearby.loadingPlayers")}
          </Text>
        </View>
      ) : error ? (
        <MapEmptyCard title="Algo deu errado" body={error} />
      ) : permissionDenied ? (
        <>
          <MapEmptyCard
            title={t("nearby.locationTitle")}
            body={t("nearby.locationBody")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nearby.allowLocation")}
            disabled={requestingPermission}
            onPress={() => {
              void handleRequestPermission();
            }}
            style={({ pressed }) => [
              styles.locationCta,
              requestingPermission ? styles.locationCtaDisabled : null,
              pressed && !requestingPermission ? styles.locationCtaPressed : null,
            ]}
          >
            {requestingPermission ? (
              <LoadingSpinner size={18} color={palette.parchment} />
            ) : (
              <AppIcon iosName="location.fill" fallbackName="my-location" size={18} color={palette.parchment} />
            )}
            <Text style={styles.locationCtaLabel}>
              {requestingPermission ? t("nearby.awaiting") : t("nearby.allowLocation")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("nearby.locationSettingsA11y")}
            onPress={() => {
              void Linking.openSettings();
            }}
            style={({ pressed }) => [styles.settingsCta, pressed ? styles.settingsCtaPressed : null]}
          >
            <Text style={styles.settingsCtaLabel}>{t("nearby.locationSettings")}</Text>
          </Pressable>
        </>
      ) : players.length === 0 ? (
        <MapEmptyCard
          title={t("nearby.emptyTitle")}
          body={t("nearby.emptyBody")}
        />
      ) : (
        <View style={styles.list}>
          {players.map((player, index) => {
            const locked = env.proPlayerPaywallEnabled && !pro && index >= FREE_PREVIEW_COUNT;

            const row = (
              <Pressable
                accessibilityRole="button"
                disabled={locked}
                onPress={() => {
                  if (!locked) {
                    onOpenPlayerProfile(player.userId);
                  }
                }}
                style={({ pressed }) => [styles.row, pressed && !locked ? styles.rowPressed : null]}
              >
                <View style={styles.avatarWrap}>
                  <Avatar
                    name={player.displayName}
                    uri={player.avatarUrl}
                    size={56}
                    isPro={Boolean(player.isPro)}
                  />
                  <View
                    style={[
                      styles.presenceDot,
                      player.isOnline ? styles.presenceOn : styles.presenceOff,
                    ]}
                  />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {player.displayName}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{player.handle}
                  </Text>
                  <Text style={styles.distance}>{formatDistanceKm(player.distanceKm)}</Text>
                </View>
              </Pressable>
            );

            if (!locked) {
              return (
                <View
                  key={player.userId}
                  style={[styles.rowOuter, index > 0 ? styles.rowOuterSep : null]}
                >
                  {row}
                </View>
              );
            }

            return (
              <View
                key={player.userId}
                style={[styles.rowOuter, index > 0 ? styles.rowOuterSep : null]}
              >
                <ProFeatureGate
                  locked
                  overlayTitle={t("nearby.paywallTitle")}
                  ctaLabel={t("nearby.paywallCta")}
                  onRequestUnlock={requestUnlockFromGate}
                >
                  {row}
                </ProFeatureGate>
              </View>
            );
          })}
        </View>
      )}
      </ScrollView>
      <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  locationCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.24)",
    backgroundColor: palette.ember,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  locationCtaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  locationCtaDisabled: {
    opacity: 0.72,
  },
  locationCtaLabel: {
    color: palette.parchment,
    fontSize: 14,
    fontWeight: "800",
  },
  settingsCta: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  settingsCtaPressed: {
    opacity: 0.9,
  },
  settingsCtaLabel: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingHint: {
    color: palette.mist,
    fontSize: 14,
  },
  list: {
    gap: 0,
  },
  rowOuter: {
    borderRadius: radius.md,
  },
  rowOuterSep: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 80,
  },
  rowPressed: {
    opacity: 0.9,
  },
  avatarWrap: {
    position: "relative",
  },
  presenceDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.pageChrome,
  },
  presenceOn: {
    backgroundColor: "#34C759",
  },
  presenceOff: {
    backgroundColor: palette.pine,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "700",
  },
  handle: {
    color: palette.mist,
    fontSize: 14,
  },
  distance: {
    color: palette.pine,
    fontSize: 12,
    marginTop: 2,
  },
});
