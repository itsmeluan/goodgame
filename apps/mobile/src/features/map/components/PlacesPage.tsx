import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  APPLE_LIST_COMPACT_ICON_SIZE,
  APPLE_LIST_COMPACT_TEXT_INSET,
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { ListRowGameListIcon } from "@/components/icons/ListRowGameListIcon";
import { GlassCard } from "@/components/GlassCard";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { MapEmptyCard, MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { useTranslation } from "@/i18n";
import {
  formatCompactAddress,
  formatDistanceKm,
  formatRelativeTimestamp,
  formatSyncLabel,
  formatVenueKind,
  formatVenueSuggestionStatus,
} from "@/lib/formatting";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { VenueCard, VenueKind, VenueSuggestion } from "@/types/domain";

export type VenueKindOption = readonly [VenueKind, string];
export type VenueGameOption = { id: string; label: string };

type PlacesRouteKey =
  | "venues"
  | "suggest"
  | "submissions"
  | `venue:${string}`
  | `submission:${string}`;

type PlacesPageProps = {
  venues: VenueCard[];
  venueSuggestions: VenueSuggestion[];
  lastDashboardSyncAt: Date | null;
  lastAccountSyncAt: Date | null;
  bottomInset: number;
  profileLat: number | null;
  profileLng: number | null;
  venueSuggestionName: string;
  onChangeVenueSuggestionName: (value: string) => void;
  venueAddressQuery: string;
  venueAddressFocused: boolean;
  onChangeVenueAddressFocused: (focused: boolean) => void;
  onChangeVenueAddressQuery: (value: string) => void;
  venueAddressSuggestions: AddressSuggestion[];
  venueAddressLoading: boolean;
  onUseCurrentLocation: () => void;
  onUseTypedAddress: () => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  venueSuggestionDetails: string;
  onChangeVenueSuggestionDetails: (value: string) => void;
  venueKindOptions: readonly VenueKindOption[];
  selectedVenueKind: VenueKind;
  onSelectVenueKind: (kind: VenueKind) => void;
  venueGameOptions: VenueGameOption[];
  selectedVenueGameIds: string[];
  onToggleVenueGameId: (gameId: string) => void;
  venueSuggestionSuccess: string | null;
  locatingDraftPoint: boolean;
  hasSelectedVenueAddress: boolean;
  selectedVenueFormatCount: number;
  creatingMeetup: boolean;
  onCreateVenueSuggestion: () => void;
  onFocusVenueOnMap: (venueId: string) => void;
  onCreateMeetupAtVenue: (venueId: string) => void;
  onClose: () => void;
};

export function PlacesPage({
  venues,
  venueSuggestions,
  lastDashboardSyncAt,
  lastAccountSyncAt,
  bottomInset,
  profileLat,
  profileLng,
  venueSuggestionName,
  onChangeVenueSuggestionName,
  venueAddressQuery,
  venueAddressFocused,
  onChangeVenueAddressFocused,
  onChangeVenueAddressQuery,
  venueAddressSuggestions,
  venueAddressLoading,
  onUseCurrentLocation,
  onUseTypedAddress,
  onSelectAddressSuggestion,
  venueSuggestionDetails,
  onChangeVenueSuggestionDetails,
  venueKindOptions,
  selectedVenueKind,
  onSelectVenueKind,
  venueGameOptions,
  selectedVenueGameIds,
  onToggleVenueGameId,
  venueSuggestionSuccess,
  locatingDraftPoint,
  hasSelectedVenueAddress,
  selectedVenueFormatCount,
  creatingMeetup,
  onCreateVenueSuggestion,
  onFocusVenueOnMap,
  onCreateMeetupAtVenue,
  onClose,
}: PlacesPageProps) {
  const { t } = useTranslation();
  const [routeKeys, setRouteKeys] = useState<PlacesRouteKey[]>([]);

  const venuesById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue] as const)),
    [venues]
  );
  const suggestionsById = useMemo(
    () => new Map(venueSuggestions.map((suggestion) => [suggestion.id, suggestion] as const)),
    [venueSuggestions]
  );

  const pushRoute = (key: PlacesRouteKey) => {
    setRouteKeys((current) => (current[current.length - 1] === key ? current : [...current, key]));
  };

  const popRoute = () => {
    setRouteKeys((current) => current.slice(0, -1));
  };

  const routes = [
    {
      key: "root",
      content: (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomInset + spacing.xxl },
          ]}
        >
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryEyebrow}>{t("nav.places")}</Text>
              <Text style={styles.summaryMeta}>
                {t("places.visibleCount", { count: venues.length })} · {t("places.submissionCount", { count: venueSuggestions.length })} ·{" "}
                {formatSyncLabel(lastDashboardSyncAt)}
              </Text>
            </View>
          </GlassCard>

          <AppleListSection
            size="compact"
          >
            <AppleListGroup>
              <AppleListRow
                icon={{ iosName: "map.fill", fallbackName: "map" }}
                label={t("places.visible")}
                trailingValue={String(venues.length)}
                onPress={() => pushRoute("venues")}
                tone="accent"
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "plus.circle.fill", fallbackName: "add-circle" }}
                label={t("venue.suggest")}
                onPress={() => pushRoute("suggest")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "clock.badge.checkmark.fill", fallbackName: "schedule" }}
                label={t("places.submissions")}
                trailingValue={String(venueSuggestions.length)}
                onPress={() => pushRoute("submissions")}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <MapClosePageButton onPress={onClose} />
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      if (routeKey === "venues") {
        return {
          key: routeKey,
          content: (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sceneContent}
            >
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>{t("places.visible")}</Text>
                <Text style={styles.sceneLeadSubtitle}>{t("places.visibleCount", { count: venues.length })}</Text>
              </View>
              {venues.length ? (
                <AppleListGroup>
                  {venues.map((venue, index) => {
                    const distanceLabel = formatDistanceKm(
                      profileLat,
                      profileLng,
                      venue.lat,
                      venue.lng
                    );
                    const subtitle = [
                      `${formatVenueKind(venue.kind)} · ${venue.neighborhood}`,
                      formatCompactAddress(venue.address) || venue.neighborhood,
                      `${venue.ownerDisplayName}${distanceLabel ? ` · ${distanceLabel}` : ""}`,
                    ]
                      .filter(Boolean)
                      .join("\n");

                    return (
                      <AppleListRow
                        key={venue.id}
                        leading={
                          <ListRowGameListIcon
                            variant="venue"
                            size={APPLE_LIST_COMPACT_ICON_SIZE}
                            accessibilityLabel={t("places.venueA11y", { name: venue.name })}
                          />
                        }
                        label={venue.name}
                        subtitle={subtitle}
                        onPress={() => pushRoute(`venue:${venue.id}`)}
                        separator={index > 0}
                        size="compact"
                      />
                    );
                  })}
                </AppleListGroup>
              ) : (
                <MapEmptyCard
                  title={t("map.emptyVenuesTitle")}
                  body={t("places.emptyVisibleBody")}
                />
              )}
            </ScrollView>
          ),
        };
      }

      if (routeKey === "suggest") {
        return {
          key: routeKey,
          content: (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              keyboardOffset={118}
              contentContainerStyle={styles.sceneContent}
            >
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>{t("venue.suggest")}</Text>
                <Text style={styles.sceneLeadSubtitle}>{formatSyncLabel(lastAccountSyncAt)}</Text>
              </View>
              <GlassCard style={styles.formCard}>
                <AppleListSection title={t("venue.data")} size="compact">
                  <TextField
                    label={t("venue.name")}
                    value={venueSuggestionName}
                    onChangeText={onChangeVenueSuggestionName}
                    placeholder={t("venue.namePlaceholder")}
                  />
                  <AddressAutocompleteField
                    label={t("venue.address")}
                    value={venueAddressQuery}
                    focused={venueAddressFocused}
                    onFocusChange={onChangeVenueAddressFocused}
                    onChangeText={onChangeVenueAddressQuery}
                    suggestions={venueAddressSuggestions}
                    loading={venueAddressLoading}
                    onUseCurrentLocation={onUseCurrentLocation}
                    onUseTypedAddress={onUseTypedAddress}
                    onSelectSuggestion={onSelectAddressSuggestion}
                    placeholder={t("composer.addressPlaceholder")}
                  />
                  <TextField
                    label={t("common.details")}
                    value={venueSuggestionDetails}
                    onChangeText={onChangeVenueSuggestionDetails}
                    placeholder={t("venue.detailsPlaceholder")}
                    multiline
                  />
                </AppleListSection>

                <AppleListSection title={t("venue.type")} size="compact">
                  <View style={styles.chipWrap}>
                    {venueKindOptions.map(([kind]) => (
                      <ChoiceChip
                        key={`places-${kind}`}
                        label={formatVenueKind(kind)}
                        selected={selectedVenueKind === kind}
                        onPress={() => onSelectVenueKind(kind)}
                      />
                    ))}
                  </View>
                </AppleListSection>

                <AppleListSection title={t("common.games")} size="compact">
                  <View style={styles.chipWrap}>
                    {venueGameOptions.map((game) => (
                      <ChoiceChip
                        key={game.id}
                        label={game.label}
                        selected={selectedVenueGameIds.includes(game.id)}
                        onPress={() => onToggleVenueGameId(game.id)}
                      />
                    ))}
                  </View>
                </AppleListSection>

                <AppleListSection size="compact">
                  {venueSuggestionSuccess ? (
                    <MapInlineNotice tone="success" message={venueSuggestionSuccess} />
                  ) : null}
                  <View style={styles.rowActions}>
                    <View style={styles.rowActionCell}>
                      <PrimaryButton
                        label={t("venue.submitSuggestion")}
                        onPress={onCreateVenueSuggestion}
                        loading={creatingMeetup}
                        disabled={
                          locatingDraftPoint ||
                          !venueSuggestionName.trim() ||
                          !hasSelectedVenueAddress ||
                          !selectedVenueFormatCount
                        }
                      />
                    </View>
                  </View>
                </AppleListSection>
              </GlassCard>
            </KeyboardAwareScrollView>
          ),
        };
      }

      if (routeKey === "submissions") {
        return {
          key: routeKey,
          content: (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sceneContent}
            >
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>{t("places.submissions")}</Text>
                <Text style={styles.sceneLeadSubtitle}>{t("places.submissionCount", { count: venueSuggestions.length })}</Text>
              </View>
              {venueSuggestions.length ? (
                <AppleListSection
                  title={t("places.suggestions")}
                  subtitle={`${t("places.submissionCount", { count: venueSuggestions.length })} · ${formatSyncLabel(
                    lastAccountSyncAt
                  )}`}
                  size="compact"
                >
                  <AppleListGroup>
                    {venueSuggestions.map((suggestion, index) => (
                      <AppleListRow
                        key={suggestion.id}
                        leading={
                          <ListRowGameListIcon
                            variant="venue"
                            size={APPLE_LIST_COMPACT_ICON_SIZE}
                            accessibilityLabel={t("places.venueA11y", { name: suggestion.name })}
                          />
                        }
                        label={suggestion.name}
                        subtitle={[
                          `${formatVenueKind(suggestion.kind)} · ${suggestion.neighborhood || t("venue.noNeighborhood")}`,
                          formatVenueSuggestionStatus(suggestion.status),
                          formatRelativeTimestamp(suggestion.createdAt),
                        ].join("\n")}
                        onPress={() => pushRoute(`submission:${suggestion.id}`)}
                        separator={index > 0}
                        size="compact"
                      />
                    ))}
                  </AppleListGroup>
                </AppleListSection>
              ) : (
                <MapEmptyCard
                  title={t("places.suggestionsEmptyTitle")}
                  body={t("places.suggestionsEmptyBody")}
                />
              )}
            </ScrollView>
          ),
        };
      }

      if (routeKey.startsWith("venue:")) {
        const venueId = routeKey.replace("venue:", "");
        const venue = venuesById.get(venueId) ?? null;

        if (!venue) {
          return {
            key: routeKey,
            content: (
              <MapEmptyCard
                title={t("places.venueUnavailableTitle")}
                body={t("places.venueUnavailableBody")}
              />
            ),
          };
        }

        const distanceLabel = formatDistanceKm(profileLat, profileLng, venue.lat, venue.lng);

        return {
          key: routeKey,
          content: (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sceneContent}
            >
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>{venue.name}</Text>
                <Text style={styles.sceneLeadSubtitle}>
                  {formatVenueKind(venue.kind)} · {venue.neighborhood}
                </Text>
              </View>

              <View style={styles.rowActions}>
                <View style={styles.rowActionCell}>
                  <PrimaryButton
                    label={t("venue.viewOnMap")}
                    onPress={() => onFocusVenueOnMap(venue.id)}
                    tone="ghost"
                  />
                </View>
                <View style={styles.rowActionCell}>
                  <PrimaryButton
                    label={t("places.createHere")}
                    onPress={() => onCreateMeetupAtVenue(venue.id)}
                  />
                </View>
              </View>

              <AppleListSection title={t("common.details")} size="compact">
                <AppleListGroup>
                  <AppleListRow
                    icon={{ iosName: "mappin.and.ellipse", fallbackName: "location-on" }}
                    label={t("venue.address")}
                    subtitle={formatCompactAddress(venue.address) || venue.neighborhood}
                    showChevron={false}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
                    label={t("venue.type")}
                    subtitle={formatVenueKind(venue.kind)}
                    showChevron={false}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "person.fill", fallbackName: "person" }}
                    label={t("venue.indicatedBy")}
                    subtitle={venue.ownerDisplayName}
                    showChevron={false}
                    size="compact"
                  />
                  {distanceLabel ? (
                    <AppleListRow
                      separator
                      icon={{ iosName: "figure.walk", fallbackName: "directions-walk" }}
                      label={t("map.filterDistance")}
                      subtitle={distanceLabel}
                      showChevron={false}
                      size="compact"
                    />
                  ) : null}
                  {venue.details ? (
                    <AppleListRow
                      separator
                      icon={{ iosName: "text.alignleft", fallbackName: "notes" }}
                      label={t("common.details")}
                      subtitle={venue.details}
                      showChevron={false}
                      size="compact"
                    />
                  ) : null}
                </AppleListGroup>
              </AppleListSection>
            </ScrollView>
          ),
        };
      }

      const suggestionId = routeKey.replace("submission:", "");
      const suggestion = suggestionsById.get(suggestionId) ?? null;

      if (!suggestion) {
        return {
          key: routeKey,
          content: (
            <MapEmptyCard
              title={t("places.submissionUnavailableTitle")}
              body={t("places.submissionUnavailableBody")}
            />
          ),
        };
      }

      return {
        key: routeKey,
        content: (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sceneContent}
          >
            <View style={styles.sceneLead}>
              <Text style={styles.sceneLeadTitle}>{suggestion.name}</Text>
              <Text style={styles.sceneLeadSubtitle}>
                {formatVenueSuggestionStatus(suggestion.status)}
              </Text>
            </View>
            <AppleListSection
              title={t("places.submissionSummary")}
              size="compact"
            >
              <AppleListGroup>
                <AppleListRow
                  icon={{ iosName: "checkmark.seal.fill", fallbackName: "verified" }}
                  label={t("format.notification.status")}
                  subtitle={formatVenueSuggestionStatus(suggestion.status)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "clock.arrow.circlepath", fallbackName: "history" }}
                  label={t("places.sentAt")}
                  subtitle={formatRelativeTimestamp(suggestion.createdAt)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "storefront.fill", fallbackName: "storefront" }}
                  label={t("venue.type")}
                  subtitle={formatVenueKind(suggestion.kind)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "mappin.and.ellipse", fallbackName: "location-on" }}
                  label={t("profileSetup.neighborhood")}
                  subtitle={suggestion.neighborhood || t("profile.noNeighborhood")}
                  showChevron={false}
                  size="compact"
                />
              </AppleListGroup>
            </AppleListSection>
          </ScrollView>
        ),
      };
    }),
  ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={popRoute}
      headerVariant="compact"
      scenePaddingHorizontal={sheetContentGutter}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    gap: 12,
  },
  sceneContent: {
    paddingTop: 8,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
  },
  sceneLead: {
    gap: 4,
    paddingTop: 2,
    paddingLeft: APPLE_LIST_COMPACT_TEXT_INSET,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
  },
  summaryCopy: {
    gap: 2,
  },
  summaryEyebrow: {
    color: palette.ember,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  summaryMeta: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  sceneLeadTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  sceneLeadSubtitle: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowActionCell: {
    flex: 1,
  },
});
