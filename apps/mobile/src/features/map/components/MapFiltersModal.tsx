import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { ChoiceChip } from "@/components/ChoiceChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { GroupedSectionContent } from "@/features/map/components/GroupedSectionContent";
import { HorizontalChipRail } from "@/features/map/components/HorizontalChipRail";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
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
              <View style={styles.calendarPopover}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.calendarPopoverSurface}
                />
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={() => {
                      triggerHaptic("selection");
                      onShiftFilterMonth(-1);
                    }}
                    style={({ pressed }) => [
                      styles.calendarArrowButton,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppleGlassSurface
                      pointerEvents="none"
                      variant="dark"
                      intensity="clear"
                      style={styles.calendarArrowButtonSurface}
                    />
                    <AppIcon
                      iosName="chevron.left"
                      fallbackName="chevron-left"
                      size={18}
                      color={palette.sand}
                    />
                  </Pressable>
                  <Text style={styles.calendarTitle}>{filterCalendarMonthLabel}</Text>
                  <Pressable
                    onPress={() => {
                      triggerHaptic("selection");
                      onShiftFilterMonth(1);
                    }}
                    style={({ pressed }) => [
                      styles.calendarArrowButton,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppleGlassSurface
                      pointerEvents="none"
                      variant="dark"
                      intensity="clear"
                      style={styles.calendarArrowButtonSurface}
                    />
                    <AppIcon
                      iosName="chevron.right"
                      fallbackName="chevron-right"
                      size={18}
                      color={palette.sand}
                    />
                  </Pressable>
                </View>

                <Text style={styles.filterCalendarHint}>{filterDateSummary}</Text>

                <View style={styles.calendarWeekRow}>
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
                    <Text key={`${label}-${index}`} style={styles.calendarWeekday}>
                      {label}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {filterCalendarCells.map((cell) => {
                    const selected =
                      cell.dateKey === filterDateFrom || cell.dateKey === filterDateTo;
                    const inRange =
                      filterDateFrom &&
                      filterDateTo &&
                      cell.dateKey > filterDateFrom &&
                      cell.dateKey < filterDateTo;

                    return (
                      <Pressable
                        key={cell.dateKey}
                        onPress={() => onSelectFilterDate(cell.dateKey)}
                        style={({ pressed }) => [
                          styles.calendarDayButton,
                          !cell.isCurrentMonth ? styles.calendarDayButtonMuted : null,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <View style={[styles.calendarDayPill, selected ? styles.calendarDayPillSelected : null]}>
                          <Text
                            style={[
                              styles.calendarDayLabel,
                              !cell.isCurrentMonth ? styles.calendarDayLabelMuted : null,
                              inRange ? styles.calendarDayLabelInRange : null,
                              selected ? styles.calendarDayLabelSelected : null,
                            ]}
                          >
                            {cell.dayNumber}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.rowActions}>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton label="Limpar" onPress={onClearFilterDate} tone="ghost" />
                  </View>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton label="Aplicar" onPress={onUseFilterDate} />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const CALENDAR_GLASS_PILL = 36;
/** Optical offset: numerals sit slightly below the cell’s geometric center. */
const CALENDAR_GLASS_VERTICAL_NUDGE = 2;

function roundPx(n: number): number {
  return PixelRatio.roundToNearestPixel(n);
}

type CellLayout = { x: number; y: number; width: number; height: number };

function computeRangeGlassSegments(
  cells: CalendarCell[],
  from: string | null,
  to: string | null,
  layouts: Record<string, CellLayout>,
): Array<{ key: string; left: number; top: number; width: number; height: number }> {
  if (!from || !to || from >= to) {
    return [];
  }

  type Item = { index: number; row: number; col: number; dateKey: string };
  const betweenItems: Item[] = [];
  cells.forEach((c, index) => {
    if (c.dateKey > from && c.dateKey < to) {
      betweenItems.push({
        index,
        row: Math.floor(index / 7),
        col: index % 7,
        dateKey: c.dateKey,
      });
    }
  });

  if (betweenItems.length === 0) {
    return [];
  }

  const byRow = new Map<number, Item[]>();
  for (const it of betweenItems) {
    const list = byRow.get(it.row) ?? [];
    list.push(it);
    byRow.set(it.row, list);
  }

  const segments: Array<{ key: string; left: number; top: number; width: number; height: number }> = [];

  for (const [, rowItems] of byRow) {
    rowItems.sort((a, b) => a.col - b.col);
    let i = 0;
    while (i < rowItems.length) {
      const runStart = rowItems[i]!;
      let runEnd = rowItems[i]!;
      let j = i;
      while (j + 1 < rowItems.length && rowItems[j + 1]!.col === runEnd.col + 1) {
        j++;
        runEnd = rowItems[j]!;
      }
      const la = layouts[runStart.dateKey];
      const lb = layouts[runEnd.dateKey];
      if (la && lb) {
        const left = roundPx(la.x);
        const right = roundPx(lb.x + lb.width);
        const width = Math.max(0, right - left);
        const cellH = la.height;
        const centerY = la.y + cellH / 2 + CALENDAR_GLASS_VERTICAL_NUDGE;
        const stripH = roundPx(Math.min(30, Math.max(22, cellH * 0.48)));
        const top = roundPx(centerY - stripH / 2);
        segments.push({
          key: `range-${runStart.dateKey}-${runEnd.dateKey}`,
          left,
          top,
          width,
          height: stripH,
        });
      }
      i = j + 1;
    }
  }

  return segments;
}

function FilterDateCalendarOverlay({
  filterCalendarMonthLabel,
  filterCalendarCells,
  filterDateFrom,
  filterDateTo,
  onShiftFilterMonth,
  onSelectFilterDate,
  onClearFilterDate,
  onUseFilterDate,
}: {
  filterCalendarMonthLabel: string;
  filterCalendarCells: CalendarCell[];
  filterDateFrom: string | null;
  filterDateTo: string | null;
  onShiftFilterMonth: (amount: number) => void;
  onSelectFilterDate: (dateKey: string) => void;
  onClearFilterDate: () => void;
  onUseFilterDate: () => void;
}) {
  const [layoutTick, setLayoutTick] = useState(0);
  const cellLayoutsRef = useRef<Record<string, CellLayout>>({});
  const highlightA = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const highlightB = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const firstHighlightKey = filterDateFrom ?? filterDateTo;
  const secondHighlightKey =
    filterDateFrom && filterDateTo && filterDateFrom !== filterDateTo ? filterDateTo : null;

  useEffect(() => {
    const spring = (anim: Animated.ValueXY, dateKey: string | null) => {
      if (!dateKey) {
        return;
      }
      const layout = cellLayoutsRef.current[dateKey];
      if (!layout) {
        return;
      }
      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2 + CALENDAR_GLASS_VERTICAL_NUDGE;
      const targetX = roundPx(centerX - CALENDAR_GLASS_PILL / 2);
      const targetY = roundPx(centerY - CALENDAR_GLASS_PILL / 2);
      Animated.spring(anim, {
        toValue: { x: targetX, y: targetY },
        damping: 34,
        stiffness: 170,
        mass: 1.05,
        useNativeDriver: true,
      }).start();
    };

    spring(highlightA, firstHighlightKey);
    spring(highlightB, secondHighlightKey);
  }, [firstHighlightKey, secondHighlightKey, layoutTick]);

  const rangeGlassSegments = useMemo(
    () =>
      computeRangeGlassSegments(
        filterCalendarCells,
        filterDateFrom,
        filterDateTo,
        cellLayoutsRef.current,
      ),
    [filterCalendarCells, filterDateFrom, filterDateTo, layoutTick],
  );

  return (
    <View style={styles.filterCalendarOverlay} pointerEvents="box-none">
      <Pressable style={styles.pickerBackdrop} onPress={onUseFilterDate} />
      <View style={styles.calendarPopover}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.calendarPopoverSurface}
        />
        <View style={styles.calendarHeader}>
          <Pressable
            onPress={() => {
              triggerHaptic("selection");
              onShiftFilterMonth(-1);
            }}
            style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
          >
            <AppleGlassSurface
              pointerEvents="none"
              variant="dark"
              intensity="clear"
              style={styles.calendarArrowButtonSurface}
            />
            <AppIcon iosName="chevron.left" fallbackName="arrow-back" size={17} color={palette.sand} />
          </Pressable>
          <Text style={styles.calendarTitle}>{filterCalendarMonthLabel}</Text>
          <Pressable
            onPress={() => {
              triggerHaptic("selection");
              onShiftFilterMonth(1);
            }}
            style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
          >
            <AppleGlassSurface
              pointerEvents="none"
              variant="dark"
              intensity="clear"
              style={styles.calendarArrowButtonSurface}
            />
            <AppIcon iosName="chevron.right" fallbackName="chevron-right" size={17} color={palette.sand} />
          </Pressable>
        </View>

        <View style={styles.calendarWeekRow}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.calendarWeekday}>
              {label}
            </Text>
          ))}
        </View>

        <View
          style={styles.calendarGrid}
          onLayout={() => setLayoutTick((current) => current + 1)}
        >
          {rangeGlassSegments.map((seg) => (
            <View
              key={seg.key}
              pointerEvents="none"
              style={[
                styles.filterRangeGlassStrip,
                {
                  left: seg.left,
                  top: seg.top,
                  width: seg.width,
                  height: seg.height,
                },
              ]}
            />
          ))}
          {firstHighlightKey && cellLayoutsRef.current[firstHighlightKey] ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.calendarDayHighlight,
                { transform: highlightA.getTranslateTransform() },
              ]}
            />
          ) : null}
          {secondHighlightKey && cellLayoutsRef.current[secondHighlightKey] ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.calendarDayHighlight,
                { transform: highlightB.getTranslateTransform() },
              ]}
            />
          ) : null}
          {filterCalendarCells.map((cell) => {
            const selected =
              cell.dateKey === filterDateFrom || cell.dateKey === filterDateTo;
            return (
              <Pressable
                key={cell.dateKey}
                onPress={() => onSelectFilterDate(cell.dateKey)}
                onLayout={(event) => {
                  const { x, y, width, height } = event.nativeEvent.layout;
                  cellLayoutsRef.current[cell.dateKey] = { x, y, width, height };
                  const between =
                    Boolean(filterDateFrom) &&
                    Boolean(filterDateTo) &&
                    cell.dateKey > filterDateFrom! &&
                    cell.dateKey < filterDateTo!;
                  if (
                    cell.dateKey === firstHighlightKey ||
                    cell.dateKey === secondHighlightKey ||
                    between
                  ) {
                    setLayoutTick((current) => current + 1);
                  }
                }}
                style={({ pressed }) => [
                  styles.calendarDayButton,
                  !cell.isCurrentMonth ? styles.calendarDayButtonMuted : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={[styles.calendarDayPill, selected ? styles.calendarDayPillSelected : null]}>
                  <Text
                    style={[
                      styles.calendarDayLabel,
                      !cell.isCurrentMonth ? styles.calendarDayLabelMuted : null,
                      selected ? styles.calendarDayLabelSelected : null,
                      Platform.OS === "android" ? styles.calendarDayLabelAndroid : null,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.calendarFooterRow}>
          <View style={styles.rowActionCell}>
            <PrimaryButton label="Limpar" onPress={onClearFilterDate} tone="ghost" />
          </View>
          <View style={styles.rowActionCell}>
            <PrimaryButton label="Aplicar" onPress={onUseFilterDate} />
          </View>
        </View>
      </View>
    </View>
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
  filterCalendarHint: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  filterRangeDay: {
    backgroundColor: "rgba(241,143,92,0.08)",
    borderColor: "rgba(241,143,92,0.16)",
  },
  calendarPopover: {
    position: "relative",
    alignSelf: "center",
    width: "94%",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.12)",
    backgroundColor: "rgba(12,14,20,0.82)",
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  calendarPopoverSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarArrowButton: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  calendarArrowButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  calendarTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  calendarWeekday: {
    flex: 1,
    color: palette.pine,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.xs,
    position: "relative",
  },
  filterRangeGlassStrip: {
    position: "absolute",
    borderRadius: radius.sm,
    backgroundColor: "rgba(241,143,92,0.14)",
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.2)",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  calendarDayHighlight: {
    position: "absolute",
    width: CALENDAR_GLASS_PILL,
    height: CALENDAR_GLASS_PILL,
    borderRadius: CALENDAR_GLASS_PILL / 2,
    backgroundColor: "rgba(241,143,92,0.2)",
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.32)",
  },
  calendarDayButton: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  calendarDayButtonMuted: {
    opacity: 0.36,
  },
  calendarDayButtonSelected: {
    backgroundColor: palette.ember,
  },
  calendarDayPill: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  calendarDayPillSelected: {
    backgroundColor: palette.ember,
  },
  calendarDayLabel: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  calendarDayLabelMuted: {
    color: palette.pine,
  },
  calendarDayLabelAndroid: {
    includeFontPadding: false,
  },
  calendarDayLabelSelected: {
    color: palette.sand,
  },
  calendarDayLabelInRange: {
    color: palette.ember,
  },
  calendarFooterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
});
