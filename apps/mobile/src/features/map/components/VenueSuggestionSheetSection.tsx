import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppleListSection,
  AppleListGroup,
  AppleListRow,
} from "@/components/AppleListNavigation";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { useTranslation } from "@/i18n";
import { formatVenueKind } from "@/lib/formatting";
import type { AddressSuggestion } from "@/lib/placeSearch";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { VenueKind } from "@/types/domain";

type VenueKindOption = readonly [VenueKind, string];
type VenueGameOption = {
  id: string;
  label: string;
};

type VenueSuggestionSheetSectionProps = {
  open: boolean;
  onToggleOpen: () => void;
  name: string;
  onChangeName: (value: string) => void;
  addressQuery: string;
  addressFocused: boolean;
  onChangeAddressFocused: (focused: boolean) => void;
  onChangeAddressQuery: (value: string) => void;
  addressSuggestions: AddressSuggestion[];
  addressLoading: boolean;
  onUseCurrentLocation: () => void;
  onUseTypedAddress: () => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  details: string;
  onChangeDetails: (value: string) => void;
  venueKindOptions: readonly VenueKindOption[];
  selectedVenueKind: VenueKind;
  onSelectVenueKind: (kind: VenueKind) => void;
  venueGameOptions: VenueGameOption[];
  selectedVenueGameIds: string[];
  onToggleVenueGameId: (gameId: string) => void;
  successMessage: string | null;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitDisabled: boolean;
};

export function VenueSuggestionSheetSection({
  open,
  onToggleOpen,
  name,
  onChangeName,
  addressQuery,
  addressFocused,
  onChangeAddressFocused,
  onChangeAddressQuery,
  addressSuggestions,
  addressLoading,
  onUseCurrentLocation,
  onUseTypedAddress,
  onSelectAddressSuggestion,
  details,
  onChangeDetails,
  venueKindOptions,
  selectedVenueKind,
  onSelectVenueKind,
  venueGameOptions,
  selectedVenueGameIds,
  onToggleVenueGameId,
  successMessage,
  onCancel,
  onSubmit,
  submitting,
  submitDisabled,
}: VenueSuggestionSheetSectionProps) {
  const { t } = useTranslation();
  const [cardWidth, setCardWidth] = useState(0);

  const routes = useMemo(
    () => [
      {
        key: "root",
        content: (
          <AppleListGroup>
            <AppleListRow
              icon={{ iosName: "plus.circle.fill", fallbackName: "add-circle" }}
              label={t("venue.suggest")}
              subtitle={t("venue.addToMap")}
              trailingValue={selectedVenueGameIds.length ? String(selectedVenueGameIds.length) : null}
              onPress={onToggleOpen}
              size="compact"
              tone={open || successMessage ? "accent" : "default"}
            />
          </AppleListGroup>
        ),
      },
      ...(open
        ? [
            {
              key: "compose",
              content: (
                <View style={styles.formCard}>
                  <View style={styles.formLead}>
                    <Text style={styles.eyebrow}>{t("venue.new")}</Text>
                    <Text style={styles.formTitle}>{t("venue.suggestPoint")}</Text>
                  </View>

                  <AppleListSection title={t("venue.data")} size="compact">
                    <TextField
                      label={t("venue.name")}
                      value={name}
                      onChangeText={onChangeName}
                      placeholder={t("venue.namePlaceholder")}
                    />
                    <AddressAutocompleteField
                      label={t("venue.address")}
                      value={addressQuery}
                      focused={addressFocused}
                      onFocusChange={onChangeAddressFocused}
                      onChangeText={onChangeAddressQuery}
                      suggestions={addressSuggestions}
                      loading={addressLoading}
                      onUseCurrentLocation={onUseCurrentLocation}
                      onUseTypedAddress={onUseTypedAddress}
                      onSelectSuggestion={onSelectAddressSuggestion}
                      placeholder={t("venue.searchAddressPlaceholder")}
                    />
                    <TextField
                      label={t("common.details")}
                      value={details}
                      onChangeText={onChangeDetails}
                      placeholder={t("venue.detailsPlaceholder")}
                      multiline
                    />
                  </AppleListSection>

                  <AppleListSection title={t("venue.type")} size="compact">
                    <View style={styles.chipWrap}>
                      {venueKindOptions.map(([kind]) => (
                        <ChoiceChip
                          key={kind}
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
                    {successMessage ? (
                      <MapInlineNotice tone="success" message={successMessage} />
                    ) : null}
                    <View style={styles.rowActions}>
                      <View style={styles.rowActionCell}>
                        <PrimaryButton label={t("common.cancel")} onPress={onCancel} tone="ghost" />
                      </View>
                      <View style={styles.rowActionCell}>
                        <PrimaryButton
                          label={t("venue.suggest")}
                          onPress={onSubmit}
                          loading={submitting}
                          disabled={submitDisabled}
                        />
                      </View>
                    </View>
                  </AppleListSection>
                </View>
              ),
            },
          ]
        : []),
    ],
    [
      addressFocused,
      addressLoading,
      addressQuery,
      addressSuggestions,
      details,
      name,
      onCancel,
      onChangeAddressFocused,
      onChangeAddressQuery,
      onChangeDetails,
      onChangeName,
      onSelectAddressSuggestion,
      onSelectVenueKind,
      onSubmit,
      onToggleOpen,
      onToggleVenueGameId,
      onUseCurrentLocation,
      onUseTypedAddress,
      open,
      selectedVenueGameIds,
      selectedVenueKind,
      submitDisabled,
      submitting,
      successMessage,
      venueGameOptions,
      venueKindOptions,
      t,
    ]
  );

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - cardWidth) > 1) {
          setCardWidth(nextWidth);
        }
      }}
      style={styles.container}
    >
      <SlidingSheetStack
        routes={routes}
        onPop={onToggleOpen}
        sceneWidth={cardWidth || undefined}
        scenePaddingHorizontal={sheetContentGutter}
        fillHeight={false}
        headerVariant="compact"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginHorizontal: -sheetContentGutter,
  },
  formCard: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  formLead: {
    gap: 3,
  },
  eyebrow: {
    color: palette.ember,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  formTitle: {
    color: palette.sand,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
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
