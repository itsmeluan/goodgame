import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { NewMeetupComposerSectionBlock } from "@/features/map/components/NewMeetupComposerPrimitives";
import { useTranslation } from "@/i18n";
import { formatVenueKind } from "@/lib/formatting";
import type { AddressSuggestion } from "@/lib/placeSearch";
import { triggerHaptic } from "@/lib/haptics";
import { meetupSheetEdgePadding, palette, screenEdgeGlassBleed, spacing } from "@/theme/tokens";
import type { VenueKind } from "@/types/domain";

export type VenueKindOption = readonly [VenueKind, string];
export type VenueGameOption = { id: string; label: string; formatIds?: string[] };

type VenuesSheetComposerProps = {
  sheetHeight: number;
  translateY: Animated.Value;
  bottomInset: number;
  keyboardPadding: number;
  name: string;
  addressQuery: string;
  addressFocused: boolean;
  addressSuggestions: AddressSuggestion[];
  addressLoading: boolean;
  details: string;
  venueKindOptions: readonly VenueKindOption[];
  selectedVenueKind: VenueKind;
  venueGameOptions: VenueGameOption[];
  selectedVenueGameIds: string[];
  successMessage: string | null;
  locatingDraftPoint: boolean;
  hasSelectedVenueAddress: boolean;
  selectedVenueFormatCount: number;
  submitting: boolean;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeAddressFocused: (focused: boolean) => void;
  onChangeAddressQuery: (value: string) => void;
  onUseCurrentLocation: () => void;
  onUseTypedAddress: () => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  onChangeDetails: (value: string) => void;
  onSelectVenueKind: (kind: VenueKind) => void;
  onToggleVenueGameId: (gameId: string) => void;
  onSubmit: () => void;
};

export function VenuesSheetComposer({
  sheetHeight,
  translateY,
  bottomInset,
  keyboardPadding,
  name,
  addressQuery,
  addressFocused,
  addressSuggestions,
  addressLoading,
  details,
  venueKindOptions,
  selectedVenueKind,
  venueGameOptions,
  selectedVenueGameIds,
  successMessage,
  locatingDraftPoint,
  hasSelectedVenueAddress,
  selectedVenueFormatCount,
  submitting,
  onClose,
  onChangeName,
  onChangeAddressFocused,
  onChangeAddressQuery,
  onUseCurrentLocation,
  onUseTypedAddress,
  onSelectAddressSuggestion,
  onChangeDetails,
  onSelectVenueKind,
  onToggleVenueGameId,
  onSubmit,
}: VenuesSheetComposerProps) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const sheetWidth = windowWidth - spacing.sm * 2;
  const submitDisabled =
    locatingDraftPoint || !name.trim() || !hasSelectedVenueAddress || !selectedVenueFormatCount;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          width: sheetWidth,
          maxHeight: sheetHeight,
          transform: [{ translateY }],
        },
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.sheetGlassSurface}
      />

      <View style={styles.sheetBody}>
        <View style={styles.sheetHeaderSection}>
          <View style={styles.sheetDragZone}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayTitleWrap}>
                <Text style={styles.overlayTitle}>{t("venue.new")}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={() => {
                  triggerHaptic("selection");
                  onClose();
                }}
                style={({ pressed }) => [styles.overlayCloseButton, pressed ? styles.pressed : null]}
              >
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.overlayCloseButtonSurface}
                />
                <AppIcon iosName="xmark" fallbackName="close" size={20} color={palette.sand} />
              </Pressable>
            </View>
          </View>
          <SheetGlassHairline />
        </View>

        <KeyboardAwareScrollView
          style={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          keyboardOffset={keyboardPadding}
          contentContainerStyle={[
            styles.sceneContent,
            {
              paddingBottom: spacing.sm + keyboardPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <NewMeetupComposerSectionBlock title={t("venue.data")}>
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
          </NewMeetupComposerSectionBlock>

          <NewMeetupComposerSectionBlock title={t("venue.type")}>
            <HorizontalChipRail>
              {venueKindOptions.map(([kind]) => (
                <ChoiceChip
                  key={kind}
                  label={formatVenueKind(kind)}
                  selected={selectedVenueKind === kind}
                  onPress={() => onSelectVenueKind(kind)}
                />
              ))}
            </HorizontalChipRail>
          </NewMeetupComposerSectionBlock>

          <NewMeetupComposerSectionBlock title={t("common.games")}>
            <HorizontalChipRail>
              {venueGameOptions.map((game) => (
                <ChoiceChip
                  key={game.id}
                  label={game.label}
                  selected={selectedVenueGameIds.includes(game.id)}
                  onPress={() => onToggleVenueGameId(game.id)}
                />
              ))}
            </HorizontalChipRail>
          </NewMeetupComposerSectionBlock>

          {successMessage ? <MapInlineNotice tone="success" message={successMessage} /> : null}
        </KeyboardAwareScrollView>

        <View style={[styles.footerBar, { paddingBottom: spacing.lg + bottomInset }]}>
          <View style={styles.footerButtonCell}>
            <PrimaryButton label={t("common.cancel")} onPress={onClose} tone="ghost" />
          </View>
          <View style={styles.footerButtonCell}>
            <PrimaryButton
              label={t("venue.submitSuggestion")}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitDisabled}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function SheetGlassHairline() {
  return (
    <View style={styles.sheetHairline}>
      <View style={styles.sheetHairlineHighlight} />
      <View style={styles.sheetHairlineCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: spacing.sm,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(12,14,20,0.82)",
    overflow: "visible",
    paddingHorizontal: meetupSheetEdgePadding,
    paddingTop: spacing.sm,
    flexShrink: 0,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
  },
  sheetGlassSurface: {
    position: "absolute",
    left: -screenEdgeGlassBleed,
    right: -screenEdgeGlassBleed,
    top: 0,
    bottom: 0,
    borderWidth: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sheetHeaderSection: {
    flexShrink: 0,
    marginBottom: spacing.md,
  },
  sheetScroll: {
    flex: 1,
    flexGrow: 1,
    minHeight: 0,
  },
  sheetHairline: {
    marginHorizontal: -meetupSheetEdgePadding,
    overflow: "hidden",
  },
  sheetHairlineHighlight: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  sheetHairlineCore: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(231,216,188,0.09)",
  },
  sheetDragZone: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  overlayTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  overlayTitle: {
    color: palette.sand,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  overlayCloseButton: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  overlayCloseButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.92,
  },
  sceneContent: {
    gap: spacing.sm,
    paddingTop: 2,
    paddingBottom: spacing.sm,
    overflow: "visible",
  },
  footerBar: {
    flexShrink: 0,
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(231,216,188,0.1)",
  },
  footerButtonCell: {
    flex: 1,
    minWidth: 0,
  },
});
