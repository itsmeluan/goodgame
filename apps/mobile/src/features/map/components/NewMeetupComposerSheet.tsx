import { type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { ChoiceChip } from "@/components/ChoiceChip";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { AddressAutocompleteField } from "@/features/map/components/AddressAutocompleteField";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";

import {
  NewMeetupComposerInlineNotice,
  NewMeetupComposerSectionBlock,
} from "@/features/map/components/NewMeetupComposerPrimitives";
import { FormatDetailTagBlock } from "@/features/map/components/FormatDetailTagBlock";
import { NewMeetupCalendarOverlay } from "@/features/map/components/NewMeetupCalendarOverlay";
import { NewMeetupTimeOverlay } from "@/features/map/components/NewMeetupTimeOverlay";
import type { FormatDetailKind } from "@/lib/formatDetailTags";
import type { HostModeOption } from "@/features/map/mapConfig";
import type { AddressSuggestion } from "@/lib/placeSearch";
import { triggerHaptic } from "@/lib/haptics";
import { meetupSheetEdgePadding, palette, screenEdgeGlassBleed, spacing } from "@/theme/tokens";
import type { CatalogFormat, VenueCard } from "@/types/domain";

import {
  AppleListGroup,
  AppleListRow,
  APPLE_LIST_COMPACT_ICON_SIZE,
} from "@/components/AppleListNavigation";
import { ListRowGameListIcon } from "@/components/icons/ListRowGameListIcon";

type GameOption = {
  id: string;
  label: string;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

export type NewMeetupComposerSheetProps = {
  sheetHeight: number;
  bottomInset: number;
  translateY: Animated.Value;
  keyboardPadding: number;
  gameOptions: GameOption[];
  selectedGameId: string | null;
  onSelectGame: (gameId: string) => void;
  meetupTitle: string;
  onChangeMeetupTitle: (value: string) => void;
  meetupDescription: string;
  onChangeMeetupDescription: (value: string) => void;
  composerDateLabel: string;
  composerHour: string;
  composerMinute: string;
  onOpenCalendar: () => void;
  onOpenTimePicker: () => void;
  showFormatSection: boolean;
  formatOptions: CatalogFormat[];
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string) => void;
  formatDetailKind: FormatDetailKind;
  formatDetailSelected: string[];
  onToggleFormatDetail: (value: string) => void;
  hostModeOptions: readonly HostModeOption[];
  hostMode: string;
  onSelectHostMode: (value: string) => void;
  selectedVenueId: string | null;
  availableVenues: VenueCard[];
  onSelectVenue: (venue: VenueCard) => void;
  addressQuery: string;
  addressFocused: boolean;
  onAddressFocusChange: (focused: boolean) => void;
  onAddressChange: (value: string) => void;
  addressSuggestions: AddressSuggestion[];
  addressLoading: boolean;
  onUseCurrentLocation: () => void;
  onUseTypedAddress: () => void;
  onSelectAddressSuggestion: (suggestion: AddressSuggestion) => void;
  errorMessage: string | null;
  onClose: () => void;
  creatingMeetup: boolean;
  publishDisabled: boolean;
  onPublish: () => void;
  calendarOpen: boolean;
  calendarMonthLabel: string;
  calendarCells: CalendarCell[];
  selectedDateKey: string;
  onShiftCalendarMonth: (amount: number) => void;
  onSelectCalendarDate: (dateKey: string, date: Date) => void;
  onCloseCalendar: () => void;
  timePickerOpen: boolean;
  onCloseTimePicker: () => void;
  onConfirmTimePicker: () => void;
  onChangeHour: (value: string) => void;
  onChangeMinute: (value: string) => void;
  timeHours: string[];
  timeMinutes: string[];
};

export function NewMeetupComposerSheet({
  sheetHeight,
  bottomInset,
  translateY,
  keyboardPadding,
  gameOptions,
  selectedGameId,
  onSelectGame,
  meetupTitle,
  onChangeMeetupTitle,
  meetupDescription,
  onChangeMeetupDescription,
  composerDateLabel,
  composerHour,
  composerMinute,
  onOpenCalendar,
  onOpenTimePicker,
  showFormatSection,
  formatOptions,
  selectedFormatId,
  onSelectFormat,
  formatDetailKind,
  formatDetailSelected,
  onToggleFormatDetail,
  hostModeOptions,
  hostMode,
  onSelectHostMode,
  selectedVenueId,
  availableVenues,
  onSelectVenue,
  addressQuery,
  addressFocused,
  onAddressFocusChange,
  onAddressChange,
  addressSuggestions,
  addressLoading,
  onUseCurrentLocation,
  onUseTypedAddress,
  onSelectAddressSuggestion,
  errorMessage,
  onClose,
  creatingMeetup,
  publishDisabled,
  onPublish,
  calendarOpen,
  calendarMonthLabel,
  calendarCells,
  selectedDateKey,
  onShiftCalendarMonth,
  onSelectCalendarDate,
  onCloseCalendar,
  timePickerOpen,
  onCloseTimePicker,
  onConfirmTimePicker,
  onChangeHour,
  onChangeMinute,
  timeHours,
  timeMinutes,
}: NewMeetupComposerSheetProps) {
  return (
    <>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
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
                  <Text style={styles.overlayTitle}>Novo jogo</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar criação de jogo"
                  onPress={onClose}
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
          <NewMeetupComposerSectionBlock title="Tipo de jogo">
            <HorizontalChipRail>
              {gameOptions.map((game) => (
                <ChoiceChip
                  key={`composer-game-${game.id}`}
                  label={game.label}
                  selected={selectedGameId === game.id}
                  onPress={() => onSelectGame(game.id)}
                />
              ))}
            </HorizontalChipRail>
          </NewMeetupComposerSectionBlock>

          {showFormatSection ? (
            <NewMeetupComposerSectionBlock title="Formato">
              <HorizontalChipRail>
                {formatOptions.map((format) => (
                  <ChoiceChip
                    key={format.id}
                    label={format.name}
                    selected={selectedFormatId === format.id}
                    onPress={() => onSelectFormat(format.id)}
                  />
                ))}
              </HorizontalChipRail>
            </NewMeetupComposerSectionBlock>
          ) : null}

          {showFormatSection && selectedFormatId && formatDetailKind ? (
            <NewMeetupComposerSectionBlock title="Preferências de formato" gap={spacing.xs}>
              <FormatDetailTagBlock
                kind={formatDetailKind}
                selected={formatDetailSelected}
                onToggle={onToggleFormatDetail}
              />
            </NewMeetupComposerSectionBlock>
          ) : null}

          <SectionBlock title="Detalhes">
            <TextField
              label="Título"
              value={meetupTitle}
              onChangeText={onChangeMeetupTitle}
              placeholder="Nome da partida (mín. 4 caracteres)"
              maxLength={80}
            />
            <TextField
              label="Descrição"
              value={meetupDescription}
              onChangeText={onChangeMeetupDescription}
              placeholder="Opcional"
              multiline
            />
          </SectionBlock>

          <NewMeetupComposerSectionBlock title="Quando">
            <View style={styles.scheduleStrip}>
              <AppleGlassSurface pointerEvents="none" variant="dark" intensity="clear" style={styles.scheduleStripSurface} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alterar data do jogo"
                onPress={() => {
                  triggerHaptic("selection");
                  onOpenCalendar();
                }}
                style={({ pressed }) => [
                  styles.scheduleStripDateAction,
                  calendarOpen ? styles.scheduleStripActionActive : null,
                  pressed ? styles.scheduleStripPressed : null,
                ]}
              >
                <Text style={styles.scheduleStripLabel}>Data</Text>
                <Text style={styles.scheduleStripValue} numberOfLines={1}>
                  {composerDateLabel}
                </Text>
              </Pressable>
              <View style={styles.scheduleStripDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alterar horário do jogo"
                onPress={() => {
                  triggerHaptic("selection");
                  onOpenTimePicker();
                }}
                style={({ pressed }) => [
                  styles.scheduleStripTimeAction,
                  timePickerOpen ? styles.scheduleStripActionActive : null,
                  pressed ? styles.scheduleStripPressed : null,
                ]}
              >
                <Text style={styles.scheduleStripLabel}>Horário</Text>
                <Text style={styles.scheduleStripValue} numberOfLines={1}>
                  {composerHour}:{composerMinute}
                </Text>
              </Pressable>
            </View>
          </NewMeetupComposerSectionBlock>

          <NewMeetupComposerSectionBlock title="Onde">
            <HorizontalChipRail>
              {hostModeOptions.map(([value, label]) => (
                <ChoiceChip
                  key={value}
                  label={label}
                  selected={hostMode === value}
                  onPress={() => onSelectHostMode(value)}
                />
              ))}
            </HorizontalChipRail>

            {hostMode === "public_place" || hostMode === "specialty_store" ? (
              <AppleListGroup>
                {availableVenues.map((venue) => (
                  <AppleListRow
                    key={venue.id}
                    separator
                    leading={
                      <ListRowGameListIcon
                        variant="venue"
                        size={APPLE_LIST_COMPACT_ICON_SIZE}
                        accessibilityLabel={`Local: ${venue.name}`}
                      />
                    }
                    label={venue.name}
                    subtitle={venue.neighborhood ?? undefined}
                    onPress={() => {
                      triggerHaptic("selection");
                      onSelectVenue(venue);
                    }}
                    tone={selectedVenueId === venue.id ? "accent" : "default"}
                    size="compact"
                  />
                ))}
              </AppleListGroup>
            ) : null}

            {hostMode === "search_address" || hostMode === "looking_for_host" ? (
              <AddressAutocompleteField
                label="Endereço"
                value={addressQuery}
                focused={addressFocused}
                onFocusChange={onAddressFocusChange}
                onChangeText={onAddressChange}
                suggestions={addressSuggestions}
                loading={addressLoading}
                onUseCurrentLocation={onUseCurrentLocation}
                onUseTypedAddress={onUseTypedAddress}
                onSelectSuggestion={onSelectAddressSuggestion}
                placeholder="Rua, número, bairro"
              />
            ) : null}

            {hostMode === "can_host" ? (
              <AddressAutocompleteField
                label="Bairro"
                value={addressQuery}
                focused={addressFocused}
                onFocusChange={onAddressFocusChange}
                onChangeText={onAddressChange}
                suggestions={addressSuggestions}
                loading={addressLoading}
                onUseCurrentLocation={onUseCurrentLocation}
                onUseTypedAddress={onUseTypedAddress}
                onSelectSuggestion={onSelectAddressSuggestion}
                placeholder={addressQuery ? undefined : "Bairro"}
              />
            ) : null}
          </NewMeetupComposerSectionBlock>

          {errorMessage ? <NewMeetupComposerInlineNotice message={errorMessage} /> : null}
        </KeyboardAwareScrollView>

          <View style={[styles.footerBar, { paddingBottom: spacing.lg + bottomInset }]}>
            <View style={styles.footerButtonCell}>
              <PrimaryButton label="Cancelar" onPress={onClose} tone="ghost" />
            </View>
            <View style={styles.footerButtonCell}>
              <PrimaryButton
                label="Publicar"
                onPress={onPublish}
                loading={creatingMeetup}
                disabled={publishDisabled}
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {calendarOpen ? (
        <NewMeetupCalendarOverlay
          monthLabel={calendarMonthLabel}
          cells={calendarCells}
          selectedDateKey={selectedDateKey}
          onShiftMonth={onShiftCalendarMonth}
          onSelectDate={onSelectCalendarDate}
          onClose={onCloseCalendar}
        />
      ) : null}

      {timePickerOpen ? (
        <NewMeetupTimeOverlay
          selectedHour={composerHour}
          selectedMinute={composerMinute}
          hours={timeHours}
          minutes={timeMinutes}
          onChangeHour={onChangeHour}
          onChangeMinute={onChangeMinute}
          onClose={onCloseTimePicker}
          onConfirm={onConfirmTimePicker}
        />
      ) : null}
    </>
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

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(12,14,20,0.82)",
    overflow: "visible",
    paddingHorizontal: meetupSheetEdgePadding,
    paddingTop: spacing.sm,
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
  sectionCard: {
    gap: spacing.md,
    paddingVertical: 2,
  },
  sectionHeader: {
    gap: 0,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "800",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  scheduleStrip: {
    position: "relative",
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.12)",
  },
  scheduleStripSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  scheduleStripDateAction: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: 3,
  },
  scheduleStripDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(231,216,188,0.12)",
  },
  scheduleStripTimeAction: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: 3,
  },
  scheduleStripLabel: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  scheduleStripValue: {
    color: palette.sand,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  scheduleStripActionActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scheduleStripPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
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
