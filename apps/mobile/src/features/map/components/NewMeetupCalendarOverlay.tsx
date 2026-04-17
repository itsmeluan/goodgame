import { Pressable, StyleSheet, View } from "react-native";

import {
  MapFilterCalendarCard,
  type MapFilterCalendarCell,
} from "@/features/map/components/MapFilterCalendarCard";
import { formatComposerDateLabel, parseComposerDate } from "@/features/map/mapCalendar";
import { spacing } from "@/theme/tokens";

type NewMeetupCalendarOverlayProps = {
  monthLabel: string;
  cells: MapFilterCalendarCell[];
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
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <MapFilterCalendarCard
        mode="single"
        monthLabel={monthLabel}
        cells={cells}
        hintText={formatComposerDateLabel(selectedDateKey)}
        selectedDateKey={selectedDateKey}
        onShiftMonth={onShiftMonth}
        onSelectDate={(dateKey) => onSelectDate(dateKey, parseComposerDate(dateKey))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: "rgba(3,7,11,0.46)",
  },
});
