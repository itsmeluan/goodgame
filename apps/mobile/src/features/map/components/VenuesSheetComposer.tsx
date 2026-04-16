import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";



import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";
import type { AddressSuggestion } from "@/lib/placeSearch";
import { triggerHaptic } from "@/lib/haptics";
import { palette, screenEdgeGlassBleed, spacing } from "@/theme/tokens";
import type { VenueKind } from "@/types/domain";

export type VenueKindOption = readonly [VenueKind, string];
export type VenueGameOption = { id: string; label: string; formatIds?: string[] };

type VenuesSheetComposerProps = {
  bottomInset: number;
  keyboardPadding: number;
  name: string;
  neighborhood: string;
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
  onChangeNeighborhood: (value: string) => void;
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
  bottomInset,
  keyboardPadding,
  name,
  neighborhood,
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
  onChangeNeighborhood,
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
  const insets = useSafeAreaInsets();
  const submitDisabled =
    locatingDraftPoint || !name.trim() || !hasSelectedVenueAddress || !selectedVenueFormatCount;

  return (
    <View
      style={[
        styles.sheet,
        {
          paddingLeft: insets.left + spacing.lg,
          paddingRight: insets.right + spacing.lg,
          paddingBottom: Math.max(bottomInset, spacing.md),
        },
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.sheetGlassSurface}
      />

      <View style={styles.sheetDragZone}>
        <View style={styles.handle} />
      </View>

      <View style={styles.overlayHeader}>
        <Text style={styles.overlayTitle}>Novo local</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar sugestão de local"
          onPress={() => {
            triggerHaptic("selection");
            onClose();
          }}
          style={({ pressed }) => [
            styles.overlayCloseButton,
            pressed ? styles.overlayCloseButtonPressed : null,
          ]}
        >
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.overlayCloseButtonSurface}
          />
          <AppIcon iosName="xmark" fallbackName="close" size={18} color={palette.sand} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        keyboardOffset={keyboardPadding}
        contentContainerStyle={styles.sceneContent}
      >
        <SectionBlock title="Dados">
          <TextField
            label="Nome do local"
            value={name}
            onChangeText={onChangeName}
            placeholder="Ex.: Loja da Galera"
          />
          <TextField
            label="Bairro"
            value={neighborhood}
            onChangeText={onChangeNeighborhood}
            placeholder="Ex.: Pinheiros"
          />
          <AddressAutocompleteField
            label="Endereço"
            value={addressQuery}
            focused={addressFocused}
            onFocusChange={onChangeAddressFocused}
            onChangeText={onChangeAddressQuery}
            suggestions={addressSuggestions}
            loading={addressLoading}
            onUseCurrentLocation={onUseCurrentLocation}
            onUseTypedAddress={onUseTypedAddress}
            onSelectSuggestion={onSelectAddressSuggestion}
            placeholder="Digite rua, avenida ou nome do lugar"
          />
          <TextField
            label="Detalhes"
            value={details}
            onChangeText={onChangeDetails}
            placeholder="Partidas, horários, consumo mínimo"
            multiline
          />
        </SectionBlock>

        <SectionBlock title="Tipo de local">
          <HorizontalChipRail>
            {venueKindOptions.map(([kind, label]) => (
              <ChoiceChip
                key={kind}
                label={label}
                selected={selectedVenueKind === kind}
                onPress={() => onSelectVenueKind(kind)}
              />
            ))}
          </HorizontalChipRail>
        </SectionBlock>

        <SectionBlock title="Jogos">
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
        </SectionBlock>

        {successMessage ? <MapInlineNotice tone="success" message={successMessage} /> : null}

        <View style={styles.footerBar}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.footerBarSurface}
          />
          <View style={styles.footerButtonCell}>
            <PrimaryButton label="Cancelar" onPress={onClose} tone="ghost" />
          </View>
          <View style={styles.footerButtonCell}>
            <PrimaryButton
              label="Enviar sugestão"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitDisabled}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      {title ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(12,14,20,0.82)",
    overflow: "visible",
    paddingTop: spacing.sm,
    gap: spacing.md,
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
  sheetDragZone: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: "center",
  },
  handle: {
    width: 42,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(231,216,188,0.22)",
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  overlayTitle: {
    color: palette.sand,
    fontSize: 22,
    fontWeight: "800",
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
  overlayCloseButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  sceneContent: {
    gap: spacing.lg,
    paddingTop: 8,
    paddingBottom: spacing.md,
    overflow: "visible",
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 0,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "800",
  },
  footerBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 26,
    overflow: "hidden",
  },
  footerBarSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  footerButtonCell: {
    flex: 1,
    minWidth: 0,
  },
});
