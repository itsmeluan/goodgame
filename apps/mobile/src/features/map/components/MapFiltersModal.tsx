import { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GroupedSectionContent } from "@/features/map/components/GroupedSectionContent";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { MapFilterCalendarCard } from "@/features/map/components/MapFilterCalendarCard";
import { triggerHaptic } from "@/lib/haptics";
import type {
  DistanceFilter,
  MapEntityFilter,
  PeriodFilter,
} from "@/features/map/mapFilters";
import { palette, radius, spacing } from "@/theme/tokens";

type FilterFormat = {
  id: string;
  name: string;
};

type FilterGameOption = {
  id: string;
  label: string;
};

type VisibleFormatGroup = {
  id: string;
  label: string;
  formats: FilterFormat[];
};

type CalendarCell = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

type MapFiltersModalProps = {
  visible: boolean;
  filteredMeetupCount: number;
  filteredVenueCount: number;
  filterCloseTop: number;
  filterPanelTop: number;
  filterPanelMaxHeight: number;
  entityFilterOptions: readonly (readonly [MapEntityFilter, string])[];
  entityFilters: MapEntityFilter[];
  onToggleEntityFilter: (value: MapEntityFilter) => void;
  venueGameOptions: FilterGameOption[];
  selectedGameFilterIds: string[];
  onToggleGameFilter: (gameId: string) => void;
  visibleFormatGroups: VisibleFormatGroup[];
  selectedFormatFilterIds: string[];
  onToggleFormatFilter: (formatId: string) => void;
  distanceOptions: readonly (readonly [DistanceFilter, string])[];
  distanceFilter: DistanceFilter;
  onSelectDistanceFilter: (value: DistanceFilter) => void;
  filterDateSummary: string;
  onOpenDatePicker: () => void;
  periodOptions: readonly (readonly [PeriodFilter, string])[];
  periodFilters: PeriodFilter[];
  onClearPeriods: () => void;
  onTogglePeriodFilter: (value: PeriodFilter) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  filterDateOpen: boolean;
  filterCalendarMonthLabel: string;
  filterCalendarCells: CalendarCell[];
  filterDateFrom: string | null;
  filterDateTo: string | null;
  onShiftFilterMonth: (amount: number) => void;
  onSelectFilterDate: (dateKey: string) => void;
  onClearFilterDate: () => void;
  onUseFilterDate: () => void;
  onClose: () => void;
};

export function MapFiltersModal({
  visible,
  filteredMeetupCount,
  filteredVenueCount,
  filterCloseTop,
  filterPanelTop,
  filterPanelMaxHeight,
  entityFilterOptions,
  entityFilters,
  onToggleEntityFilter,
  venueGameOptions,
  selectedGameFilterIds,
  onToggleGameFilter,
  visibleFormatGroups,
  selectedFormatFilterIds,
  onToggleFormatFilter,
  distanceOptions,
  distanceFilter,
  onSelectDistanceFilter,
  filterDateSummary,
  onOpenDatePicker,
  periodOptions,
  periodFilters,
  onClearPeriods,
  onTogglePeriodFilter,
  onResetFilters,
  onApplyFilters,
  filterDateOpen,
  filterCalendarMonthLabel,
  filterCalendarCells,
  filterDateFrom,
  filterDateTo,
  onShiftFilterMonth,
  onSelectFilterDate,
  onClearFilterDate,
  onUseFilterDate,
  onClose,
}: MapFiltersModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <SafeAreaView
          style={styles.modalSafeArea}
          edges={["top", "left", "right", "bottom"]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.filterCloseAnchor,
              { top: filterCloseTop },
              filterDateOpen ? styles.filterCloseBehindCalendar : null,
            ]}
            pointerEvents={filterDateOpen ? "none" : "box-none"}
          >
            <MapCircleActionButton
              icon="close"
              accessibilityLabel="Fechar filtros"
              onPress={onClose}
            />
          </View>
          <View
            style={[
              styles.filterPanelWrap,
              { top: filterPanelTop },
              filterDateOpen ? styles.filterPanelBehindCalendar : null,
            ]}
          >
            <View style={[styles.filterPanel, { maxHeight: filterPanelMaxHeight }]}>
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="clear"
                style={styles.filterPanelSurface}
              />
              <View style={styles.filterHeaderSection}>
                <View style={styles.overlayHeader}>
                  <View>
                    <Text style={styles.overlayTitle}>Filtros</Text>
                    <Text style={styles.overlaySubtitle}>
                      {filteredMeetupCount} partidas · {filteredVenueCount} locais
                    </Text>
                  </View>
                </View>
                <FilterSheetHairline />
              </View>

              <ScrollView
                contentContainerStyle={styles.filterScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
                alwaysBounceVertical={false}
                overScrollMode="never"
              >
                <SectionBlock title="Mostrar no mapa">
                  <HorizontalChipRail>
                    {entityFilterOptions.map(([value, label]) => (
                      <ChoiceChip
                        key={value}
                        label={label}
                        selected={entityFilters.includes(value)}
                        onPress={() => onToggleEntityFilter(value)}
                      />
                    ))}
                  </HorizontalChipRail>
                </SectionBlock>

                <SectionBlock title="Tipo de jogo">
                  <HorizontalChipRail>
                    {venueGameOptions.map((game) => (
                      <ChoiceChip
                        key={game.id}
                        label={game.label}
                        selected={selectedGameFilterIds.includes(game.id)}
                        onPress={() => onToggleGameFilter(game.id)}
                      />
                    ))}
                  </HorizontalChipRail>
                </SectionBlock>

                {visibleFormatGroups.length ? (
                  <SectionBlock title="Formato">
                    {visibleFormatGroups.map((group) => (
                      <GroupedSectionContent key={group.id} compact style={styles.filterFormatGroupWrap}>
                        <View style={styles.filterFormatGroup}>
                          <Text style={styles.filterFormatGroupTitle}>{group.label}</Text>
                          <HorizontalChipRail>
                            {group.formats.map((format) => (
                              <ChoiceChip
                                key={format.id}
                                label={format.name}
                                selected={selectedFormatFilterIds.includes(format.id)}
                                onPress={() => onToggleFormatFilter(format.id)}
                              />
                            ))}
                          </HorizontalChipRail>
                        </View>
                      </GroupedSectionContent>
                    ))}
                  </SectionBlock>
                ) : null}

                <SectionBlock title="Distância">
                  <HorizontalChipRail>
                    {distanceOptions.map(([value, label]) => (
                      <ChoiceChip
                        key={String(value)}
                        label={label}
                        selected={distanceFilter === value}
                        onPress={() => onSelectDistanceFilter(value)}
                      />
                    ))}
                  </HorizontalChipRail>
                </SectionBlock>

                <SectionBlock title="Quando">
                  <View style={styles.scheduleStrip}>
                    <AppleGlassSurface
                      pointerEvents="none"
                      variant="dark"
                      intensity="clear"
                      style={styles.scheduleStripSurface}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Alterar intervalo de datas do filtro"
                      onPress={() => {
                        triggerHaptic("selection");
                        onOpenDatePicker();
                      }}
                      style={({ pressed }) => [
                        styles.scheduleStripDateAction,
                        filterDateOpen ? styles.scheduleStripActionActive : null,
                        pressed ? styles.scheduleStripPressed : null,
                      ]}
                    >
                      <Text style={styles.scheduleStripLabel}>Data</Text>
                      <Text style={styles.scheduleStripValue} numberOfLines={1}>
                        {filterDateSummary}
                      </Text>
                    </Pressable>
                  </View>
                </SectionBlock>

                <SectionBlock title="Períodos">
                  <HorizontalChipRail>
                    <ChoiceChip label="Todos" selected={periodFilters.length === 0} onPress={onClearPeriods} />
                    {periodOptions.map(([value, label]) => (
                      <ChoiceChip
                        key={value}
                        label={label}
                        selected={periodFilters.includes(value)}
                        onPress={() => onTogglePeriodFilter(value)}
                      />
                    ))}
                  </HorizontalChipRail>
                </SectionBlock>
              </ScrollView>

              <View style={styles.filterFooterSection}>
                <FilterSheetHairline />
                <View style={styles.filterFooterActions}>
                  <View style={styles.rowActions}>
                    <View style={styles.rowActionCell}>
                      <PrimaryButton label="Limpar" onPress={onResetFilters} tone="ghost" />
                    </View>
                    <View style={styles.rowActionCell}>
                      <PrimaryButton label="Aplicar" onPress={onApplyFilters} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {filterDateOpen ? (
            <View style={styles.filterCalendarOverlay} pointerEvents="box-none">
              <Pressable style={StyleSheet.absoluteFill} onPress={onUseFilterDate} />
              <MapFilterCalendarCard
                mode="range"
                monthLabel={filterCalendarMonthLabel}
                cells={filterCalendarCells}
                hintText={filterDateSummary}
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                onShiftMonth={onShiftFilterMonth}
                onSelectDate={onSelectFilterDate}
                footer={
                  <View style={styles.rowActions}>
                    <View style={styles.rowActionCell}>
                      <PrimaryButton label="Limpar" onPress={onClearFilterDate} tone="ghost" />
                    </View>
                    <View style={styles.rowActionCell}>
                      <PrimaryButton label="Aplicar" onPress={onUseFilterDate} />
                    </View>
                  </View>
                }
              />
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function FilterSheetHairline() {
  return (
    <View style={styles.filterSheetHairline} pointerEvents="none">
      <View style={styles.filterSheetHairlineHighlight} />
      <View style={styles.filterSheetHairlineCore} />
    </View>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
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
  modalLayer: {
    flex: 1,
    backgroundColor: "rgba(6,10,9,0.4)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSafeArea: {
    flex: 1,
  },
  filterPanelWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "stretch",
    zIndex: 1,
  },
  filterPanelBehindCalendar: {
    zIndex: 0,
  },
  filterCloseAnchor: {
    position: "absolute",
    left: spacing.lg,
    zIndex: 2,
  },
  filterCloseBehindCalendar: {
    zIndex: 0,
  },
  filterPanel: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.12)",
    backgroundColor: "rgba(12,14,20,0.82)",
    padding: spacing.lg,
    gap: spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  filterPanelSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  filterHeaderSection: {
    flexShrink: 0,
    gap: spacing.sm,
  },
  filterFooterSection: {
    flexShrink: 0,
    gap: 0,
  },
  filterFooterActions: {
    paddingTop: spacing.sm,
  },
  filterSheetHairline: {
    marginHorizontal: -spacing.lg,
    overflow: "hidden",
  },
  filterSheetHairlineHighlight: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  filterSheetHairlineCore: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(231,216,188,0.09)",
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
  overlaySubtitle: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  filterScrollContent: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionCard: {
    gap: spacing.sm,
    paddingVertical: 0,
  },
  sectionHeader: {
    gap: 0,
  },
  sectionBlock: {
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
  sectionTitle: {
    color: palette.parchment,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterFormatGroup: {
    gap: spacing.sm,
  },
  filterFormatGroupWrap: {
    marginTop: 0,
  },
  filterFormatGroupTitle: {
    color: palette.parchment,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  filterDateField: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  filterDateFieldLabel: {
    flex: 1,
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowActionCell: {
    flex: 1,
    minWidth: 132,
  },
  filterCalendarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: 295,
    backgroundColor: "rgba(3,7,11,0.46)",
  },
});
