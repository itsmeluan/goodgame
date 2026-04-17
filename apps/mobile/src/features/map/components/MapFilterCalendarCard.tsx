import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

export type MapFilterCalendarCell = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

export type MapFilterCalendarCardProps = {
  mode: "range" | "single";
  monthLabel: string;
  cells: MapFilterCalendarCell[];
  hintText: string;
  onShiftMonth: (amount: number) => void;
  onSelectDate: (dateKey: string) => void;
  /** Range mode: interval endpoints. Single mode: ignored. */
  filterDateFrom?: string | null;
  filterDateTo?: string | null;
  /** Single mode: selected day. Range mode: ignored. */
  selectedDateKey?: string;
  footer?: ReactNode;
};

export function MapFilterCalendarCard({
  mode,
  monthLabel,
  cells,
  hintText,
  onShiftMonth,
  onSelectDate,
  filterDateFrom = null,
  filterDateTo = null,
  selectedDateKey = "",
  footer,
}: MapFilterCalendarCardProps) {
  return (
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
            onShiftMonth(-1);
          }}
          style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
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
        <Text style={styles.calendarTitle}>{monthLabel}</Text>
        <Pressable
          onPress={() => {
            triggerHaptic("selection");
            onShiftMonth(1);
          }}
          style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
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

      <Text style={styles.filterCalendarHint}>{hintText}</Text>

      <View style={styles.calendarWeekRow}>
        {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.calendarWeekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((cell) => {
          const selected =
            mode === "single"
              ? cell.dateKey === selectedDateKey
              : cell.dateKey === filterDateFrom || cell.dateKey === filterDateTo;
          const inRange =
            mode === "range" &&
            filterDateFrom &&
            filterDateTo &&
            cell.dateKey > filterDateFrom &&
            cell.dateKey < filterDateTo;

          return (
            <Pressable
              key={cell.dateKey}
              onPress={() => onSelectDate(cell.dateKey)}
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

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
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
  filterCalendarHint: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
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
  calendarDayLabelSelected: {
    color: palette.sand,
  },
  calendarDayLabelInRange: {
    color: palette.ember,
  },
  pressed: {
    opacity: 0.92,
  },
});
