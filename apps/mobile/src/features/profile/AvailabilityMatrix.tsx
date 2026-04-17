import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { palette, radius, spacing } from "@/theme/tokens";
import type { AvailabilitySlot } from "@/types/domain";

const periods = [
  {
    id: "morning",
    label: "Manhã",
    start_time: "09:00",
    end_time: "12:00",
  },
  {
    id: "afternoon",
    label: "Tarde",
    start_time: "14:00",
    end_time: "18:00",
  },
  {
    id: "night",
    label: "Noite",
    start_time: "19:00",
    end_time: "23:00",
  },
] as const;

const weekdays = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
] as const;

/** Same width for every weekday pill; short height + pill radius = full capsule. */
const DAY_PILL_WIDTH = 40;
const DAY_PILL_HEIGHT = 30;

type AvailabilityMatrixProps = {
  value: AvailabilitySlot[];
  onChange: (value: AvailabilitySlot[]) => void;
};

export function AvailabilityMatrix({ value, onChange }: AvailabilityMatrixProps) {
  function hasSelection(weekday: number, periodId: string) {
    const period = periods.find((item) => item.id === periodId);

    if (!period) {
      return false;
    }

    return value.some(
      (slot) =>
        slot.weekday === weekday &&
        slot.start_time === period.start_time &&
        slot.end_time === period.end_time
    );
  }

  function toggleCell(weekday: number, periodId: string) {
    const period = periods.find((item) => item.id === periodId);

    if (!period) {
      return;
    }

    const selected = hasSelection(weekday, periodId);

    if (selected) {
      onChange(
        value.filter(
          (slot) =>
            !(
              slot.weekday === weekday &&
              slot.start_time === period.start_time &&
              slot.end_time === period.end_time
            )
        )
      );
      return;
    }

    onChange([
      ...value,
      {
        weekday,
        start_time: period.start_time,
        end_time: period.end_time,
        timezone: "America/Sao_Paulo",
      },
    ]);
  }

  function buildSlotsForWeekdays(dayIds: number[]) {
    return dayIds.flatMap((weekday) =>
      periods.map((period) => ({
        weekday,
        start_time: period.start_time,
        end_time: period.end_time,
        timezone: "America/Sao_Paulo",
      }))
    );
  }

  function mergeSlots(nextSlots: AvailabilitySlot[]) {
    const deduped = new Map<string, AvailabilitySlot>();

    [...value, ...nextSlots].forEach((slot) => {
      deduped.set(`${slot.weekday}:${slot.start_time}:${slot.end_time}`, slot);
    });

    onChange(Array.from(deduped.values()));
  }

  return (
    <View style={styles.container}>
      <View style={styles.shortcutsRow}>
        <ShortcutButton label="Dias úteis" onPress={() => mergeSlots(buildSlotsForWeekdays([1, 2, 3, 4, 5]))} />
        <ShortcutButton label="Fim de semana" onPress={() => mergeSlots(buildSlotsForWeekdays([6, 0]))} />
        <ShortcutButton label="Limpar tudo" onPress={() => onChange([])} />
      </View>

      {periods.map((period) => (
        <View key={period.id} style={styles.periodCard}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="dark"
            intensity="clear"
            style={styles.periodCardSurface}
          />
          <Text style={styles.periodTitle}>{period.label}</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.daysRowScrollContent}
          >
            {weekdays.map((weekday) => {
              const selected = hasSelection(weekday.id, period.id);

              return (
                <Pressable
                  key={`${weekday.id}:${period.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${weekday.label} ${period.label}`}
                  onPress={() => toggleCell(weekday.id, period.id)}
                  style={({ pressed }) => [
                    styles.dayChip,
                    selected ? styles.dayChipSelected : null,
                    pressed ? styles.dayChipPressed : null,
                  ]}
                >
                  {selected ? null : (
                    <AppleGlassSurface
                      pointerEvents="none"
                      variant="dark"
                      intensity="clear"
                      style={styles.dayChipSurface}
                    />
                  )}
                  <Text style={[styles.dayChipLabel, selected ? styles.dayChipLabelSelected : null]}>
                    {weekday.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

function ShortcutButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcutButton,
        pressed ? styles.shortcutButtonPressed : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.shortcutButtonSurface}
      />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  shortcutsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  shortcutButton: {
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
  },
  shortcutButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  shortcutButtonPressed: {
    opacity: 0.88,
  },
  shortcutLabel: {
    color: palette.parchment,
    fontSize: 12,
    fontWeight: "700",
  },
  periodCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.md,
    overflow: "hidden",
  },
  periodCardSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  periodTitle: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "800",
  },
  daysRowScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.xs,
  },
  dayChip: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_HEIGHT,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dayChipSelected: {
    backgroundColor: palette.ember,
    borderColor: palette.ember,
  },
  dayChipSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  dayChipPressed: {
    transform: [{ scale: 0.97 }],
  },
  dayChipLabel: {
    color: palette.parchment,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dayChipLabelSelected: {
    color: palette.ink,
  },
});
