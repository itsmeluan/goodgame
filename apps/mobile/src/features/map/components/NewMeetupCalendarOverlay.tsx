import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { palette, radius, spacing } from "@/theme/tokens";

type CalendarCell = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

type NewMeetupCalendarOverlayProps = {
  monthLabel: string;
  cells: CalendarCell[];
  selectedDateKey: string;
  onShiftMonth: (amount: number) => void;
  onSelectDate: (dateKey: string, date: Date) => void;
  onClose: () => void;
};

export function NewMeetupCalendarOverlay({
  monthLabel,
  cells,
  selectedDateKey,
  onShiftMonth,
  onSelectDate,
  onClose,
}: NewMeetupCalendarOverlayProps) {
  return (
    <View style={styles.pickerOverlayWrap} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.calendarPopover}>
        <View style={styles.calendarHeader}>
          <Pressable
            onPress={() => onShiftMonth(-1)}
            style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
          >
            <MaterialIcons name="chevron-left" size={20} color={palette.sand} />
          </Pressable>
          <Text style={styles.calendarTitle}>{monthLabel}</Text>
          <Pressable
            onPress={() => onShiftMonth(1)}
            style={({ pressed }) => [styles.calendarArrowButton, pressed ? styles.pressed : null]}
          >
            <MaterialIcons name="chevron-right" size={20} color={palette.sand} />
          </Pressable>
        </View>

        <View style={styles.calendarWeekRow}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.calendarWeekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {cells.map((cell) => {
            const selected = selectedDateKey === cell.dateKey;

            return (
              <Pressable
                key={cell.dateKey}
                onPress={() => onSelectDate(cell.dateKey, cell.date)}
                style={({ pressed }) => [
                  styles.calendarDayButton,
                  !cell.isCurrentMonth ? styles.calendarDayButtonMuted : null,
                  selected ? styles.calendarDayButtonSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayLabel,
                    !cell.isCurrentMonth ? styles.calendarDayLabelMuted : null,
                    selected ? styles.calendarDayLabelSelected : null,
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
  pickerOverlayWrap: {
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
  calendarArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
  },
  calendarTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  calendarWeekRow: {
    flexDirection: "row",
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
  calendarDayLabel: {
    color: palette.sand,
    fontSize: 14,
    fontWeight: "700",
  },
  calendarDayLabelMuted: {
    color: palette.pine,
  },
  calendarDayLabelSelected: {
    color: palette.ink,
  },
  pressed: {
    opacity: 0.92,
  },
});
