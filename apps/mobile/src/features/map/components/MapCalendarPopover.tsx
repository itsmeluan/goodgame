import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { palette, radius, spacing } from "@/theme/tokens";

type CalendarCell = {
  dateKey: string;
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
};

type MapCalendarPopoverProps = {
  title: string;
  monthLabel: string;
  cells: CalendarCell[];
  selectedDateKey: string;
  onShiftMonth: (amount: number) => void;
  onSelectDate: (dateKey: string, date: Date) => void;
  onClose: () => void;
};

export function MapCalendarPopover({
  title,
  monthLabel,
  cells,
  selectedDateKey,
  onShiftMonth,
  onSelectDate,
  onClose,
}: MapCalendarPopoverProps) {
  return (
    <View style={styles.overlayWrap} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.calendarPopover}>
        <View style={styles.calendarHeader}>
          <Pressable
            onPress={() => onShiftMonth(-1)}
            style={({ pressed }) => [styles.arrowButton, pressed ? styles.pressed : null]}
          >
            <MaterialIcons name="chevron-left" size={20} color={palette.sand} />
          </Pressable>
          <Text style={styles.calendarTitle}>{monthLabel}</Text>
          <Pressable
            onPress={() => onShiftMonth(1)}
            style={({ pressed }) => [styles.arrowButton, pressed ? styles.pressed : null]}
          >
            <MaterialIcons name="chevron-right" size={20} color={palette.sand} />
          </Pressable>
        </View>

        <Text style={styles.calendarHelper}>{title}</Text>

        <View style={styles.weekRow}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
            <Text key={`calendar-${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell) => {
            const selected = selectedDateKey === cell.dateKey;

            return (
              <Pressable
                key={cell.dateKey}
                onPress={() => onSelectDate(cell.dateKey, cell.date)}
                style={({ pressed }) => [
                  styles.dayButton,
                  !cell.isCurrentMonth ? styles.dayButtonMuted : null,
                  selected ? styles.dayButtonSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    !cell.isCurrentMonth ? styles.dayLabelMuted : null,
                    selected ? styles.dayLabelSelected : null,
                  ]}
                >
                  {cell.dayNumber}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  calendarPopover: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "rgba(18,18,18,0.99)",
    padding: spacing.lg,
    gap: spacing.md,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
  },
  pressed: {
    opacity: 0.92,
  },
  calendarTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  calendarHelper: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    color: palette.pine,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.xs,
  },
  dayButton: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  dayButtonMuted: {
    opacity: 0.36,
  },
  dayButtonSelected: {
    backgroundColor: palette.ember,
  },
  dayLabel: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  dayLabelMuted: {
    color: palette.pine,
  },
  dayLabelSelected: {
    color: palette.ink,
  },
});
