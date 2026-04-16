import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { palette, radius, spacing } from "@/theme/tokens";

type MapTimePickerPopoverProps = {
  title: string;
  selectedHour: string;
  selectedMinute: string;
  hours: string[];
  minutes: string[];
  onChangeHour: (value: string) => void;
  onChangeMinute: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function MapTimePickerPopover({
  title,
  selectedHour,
  selectedMinute,
  hours,
  minutes,
  onChangeHour,
  onChangeMinute,
  onClose,
  onConfirm,
}: MapTimePickerPopoverProps) {
  return (
    <View style={styles.overlayWrap} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.timePopover}>
        <Text style={styles.timePopoverTitle}>{title}</Text>
        <View style={styles.timeWheelRow}>
          <TimeWheelColumn
            label="Hora"
            values={hours}
            selectedValue={selectedHour}
            onChange={onChangeHour}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <TimeWheelColumn
            label="Min"
            values={minutes}
            selectedValue={selectedMinute}
            onChange={onChangeMinute}
          />
        </View>
        <View style={styles.actions}>
          <View style={styles.actionCell}>
            <PrimaryButton label="Fechar" onPress={onClose} tone="ghost" />
          </View>
          <View style={styles.actionCell}>
            <PrimaryButton label="Usar horário" onPress={onConfirm} />
          </View>
        </View>
      </View>
    </View>
  );
}

function TimeWheelColumn({
  label,
  values,
  selectedValue,
  onChange,
}: {
  label: string;
  values: string[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  const itemHeight = 44;
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const selectedIndex = Math.max(values.indexOf(selectedValue), 0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * itemHeight,
        animated: false,
      });
    });
  }, [selectedValue, values]);

  function selectFromOffset(offsetY: number) {
    const index = Math.min(Math.max(Math.round(offsetY / itemHeight), 0), values.length - 1);
    onChange(values[index]);
  }

  return (
    <View style={styles.timeWheelColumn}>
      <Text style={styles.timeWheelLabel}>{label}</Text>
      <View style={styles.timeWheelFrame}>
        <View style={styles.selectionBand} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          contentContainerStyle={styles.timeWheelContent}
          onMomentumScrollEnd={(event) => selectFromOffset(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => selectFromOffset(event.nativeEvent.contentOffset.y)}
        >
          {values.map((value) => (
            <Pressable
              key={`${label}-${value}`}
              onPress={() => onChange(value)}
              style={({ pressed }) => [
                styles.timeWheelItem,
                value === selectedValue ? styles.timeWheelItemSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.timeWheelValue,
                  value === selectedValue ? styles.timeWheelValueSelected : null,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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
  timePopover: {
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
  timePopoverTitle: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  timeWheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  timeWheelColumn: {
    flex: 1,
    maxWidth: 132,
    gap: spacing.sm,
  },
  timeWheelLabel: {
    color: palette.pine,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase",
  },
  timeWheelFrame: {
    height: 176,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.chatBubble,
    overflow: "hidden",
  },
  selectionBand: {
    position: "absolute",
    top: 66,
    left: 8,
    right: 8,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(241,143,92,0.12)",
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.22)",
  },
  timeWheelContent: {
    paddingVertical: 66,
  },
  timeWheelItem: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  timeWheelItemSelected: {
    backgroundColor: "transparent",
  },
  timeWheelValue: {
    color: palette.mist,
    fontSize: 20,
    fontWeight: "700",
  },
  timeWheelValueSelected: {
    color: palette.sand,
  },
  timeSeparator: {
    color: palette.parchment,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 14,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionCell: {
    flex: 1,
    minWidth: 132,
  },
  pressed: {
    opacity: 0.92,
  },
});
