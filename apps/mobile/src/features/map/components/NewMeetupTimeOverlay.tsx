import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTranslation } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";

type NewMeetupTimeOverlayProps = {
  selectedHour: string;
  selectedMinute: string;
  hours: string[];
  minutes: string[];
  onChangeHour: (value: string) => void;
  onChangeMinute: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function NewMeetupTimeOverlay({
  selectedHour,
  selectedMinute,
  hours,
  minutes,
  onChangeHour,
  onChangeMinute,
  onClose,
  onConfirm,
}: NewMeetupTimeOverlayProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.pickerOverlayWrap} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("time.closeSelection")}
        style={styles.pickerScrim}
        onPress={onClose}
      />
      <View style={styles.timePopover}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.timePopoverSurface}
        />
        <Text style={styles.timePopoverTitle}>{t("time.choose")}</Text>
        <View style={styles.timeWheelRow}>
          <TimeWheelColumn
            label={t("common.hour")}
            values={hours}
            selectedValue={selectedHour}
            onChange={onChangeHour}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <TimeWheelColumn
            label={t("common.minuteShort")}
            values={minutes}
            selectedValue={selectedMinute}
            onChange={onChangeMinute}
          />
        </View>
        <View style={styles.rowActions}>
          <View style={styles.rowActionCell}>
            <PrimaryButton label={t("common.close")} onPress={onClose} tone="ghost" />
          </View>
          <View style={styles.rowActionCell}>
            <PrimaryButton label={t("time.useTime")} onPress={onConfirm} />
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
  const ITEM_HEIGHT = 44;
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const selectedIndex = Math.max(values.indexOf(selectedValue), 0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    });
  }, [selectedValue, values]);

  function selectFromOffset(offsetY: number) {
    const index = Math.max(Math.min(Math.round(offsetY / ITEM_HEIGHT), values.length - 1), 0);
    onChange(values[index]);
  }

  return (
    <View style={styles.timeWheelColumn}>
      <Text style={styles.timeWheelLabel}>{label}</Text>
      <View style={styles.timeWheelFrame}>
        <View style={styles.timeWheelSelectionBand} pointerEvents="none">
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.14)",
              "rgba(255,255,255,0.05)",
              "rgba(255,255,255,0.02)",
            ]}
            locations={[0, 0.42, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
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
  pickerOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    /** Darker than before (was transparent); aligned with calendar overlay + slightly stronger scrim */
    backgroundColor: "rgba(3,7,11,0.58)",
  },
  pickerScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  timePopover: {
    position: "relative",
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.12)",
    backgroundColor: "rgba(12,14,20,0.82)",
    padding: spacing.lg,
    gap: spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  timePopoverSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
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
    textTransform: "uppercase",
    textAlign: "center",
  },
  timeWheelFrame: {
    height: 176,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
    backgroundColor: "rgba(8,10,14,0.55)",
    overflow: "hidden",
  },
  timeWheelSelectionBand: {
    position: "absolute",
    top: 66,
    left: spacing.sm,
    right: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    /** Translucent base so scroll text stays visible; gradient adds glass-like sheen */
    backgroundColor: "rgba(255,255,255,0.04)",
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
    opacity: 1,
  },
  timeWheelValue: {
    color: palette.pine,
    fontSize: 20,
    fontWeight: "700",
  },
  timeWheelValueSelected: {
    color: palette.sand,
  },
  timeSeparator: {
    color: palette.sand,
    fontSize: 28,
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
  pressed: {
    opacity: 0.92,
  },
});
