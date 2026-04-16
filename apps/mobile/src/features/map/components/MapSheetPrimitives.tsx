import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { formatMeetupStatus } from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { MeetupStatus } from "@/types/domain";

export function ComposerSelectField({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: "calendar-month" | "schedule";
  onPress: () => void;
}) {
  const iconConfig = resolveComposerIcon(icon);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.composerSelectField,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.composerSelectSurface}
      />
      <Text style={styles.composerSelectLabel}>{label}</Text>
      <View style={styles.composerSelectValueRow}>
        <AppIcon
          iosName={iconConfig.iosName}
          fallbackName={iconConfig.fallbackName}
          size={18}
          color={palette.ember}
        />
        <Text style={styles.composerSelectValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

export function UtilityActionButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: "settings" | "info-outline";
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const iconConfig = resolveUtilityIcon(icon);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        triggerHaptic(active ? "selection" : "soft");
        onPress();
      }}
      style={({ pressed }) => [
        styles.utilityActionButton,
        active ? styles.utilityActionButtonActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {!active ? (
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.utilityActionButtonSurface}
        />
      ) : null}
      <AppIcon
        iosName={iconConfig.iosName}
        fallbackName={iconConfig.fallbackName}
        size={18}
        color={active ? palette.parchment : palette.mist}
      />
    </Pressable>
  );
}

export function MetaTag({ label }: { label: string }) {
  return (
    <View style={styles.metaTag}>
      <Text style={styles.metaTagLabel}>{label}</Text>
    </View>
  );
}

export function MeetupInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meetupInfoLine}>
      <Text style={styles.meetupInfoLabel}>{label}</Text>
      <Text style={styles.meetupInfoValue}>{value}</Text>
    </View>
  );
}

export function StatusChip({
  status,
  compact = false,
  overdue = false,
}: {
  status: MeetupStatus;
  compact?: boolean;
  overdue?: boolean;
}) {
  return (
    <View
      style={[
        styles.statusChip,
        compact ? styles.statusChipCompact : null,
        overdue
          ? styles.statusChipOverdue
          : status === "closed"
            ? styles.statusChipClosed
            : status === "cancelled"
              ? styles.statusChipCancelled
              : status === "filled"
                ? styles.statusChipFilled
                : status === "confirmed"
                  ? styles.statusChipConfirmed
                  : styles.statusChipOpen,
      ]}
    >
      <Text style={styles.statusChipLabel}>
        {overdue ? "Passou" : formatMeetupStatus(status)}
      </Text>
    </View>
  );
}

function resolveComposerIcon(icon: "calendar-month" | "schedule") {
  if (icon === "calendar-month") {
    return {
      iosName: "calendar" as const,
      fallbackName: "calendar-month" as const,
    };
  }

  return {
    iosName: "clock.fill" as const,
    fallbackName: "schedule" as const,
  };
}

function resolveUtilityIcon(icon: "settings" | "info-outline") {
  if (icon === "settings") {
    return {
      iosName: "slider.horizontal.3" as const,
      fallbackName: "settings" as const,
    };
  }

  return {
    iosName: "info.circle" as const,
    fallbackName: "info-outline" as const,
  };
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
  composerSelectField: {
    flex: 1,
    minHeight: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    backgroundColor: "rgba(255,255,255,0.015)",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 6,
    overflow: "hidden",
  },
  composerSelectSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  composerSelectLabel: {
    color: palette.pine,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  composerSelectValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  composerSelectValue: {
    flex: 1,
    color: palette.sand,
    fontSize: 15,
    fontWeight: "600",
  },
  utilityActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
    backgroundColor: "rgba(255,255,255,0.015)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  utilityActionButtonActive: {
    borderColor: palette.ember,
    backgroundColor: "rgba(241,143,92,0.12)",
  },
  utilityActionButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  metaTag: {
    minHeight: 28,
    borderRadius: radius.pill,
    backgroundColor: "rgba(231,216,188,0.14)",
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  metaTagLabel: {
    color: palette.sand,
    fontSize: 11,
    fontWeight: "700",
  },
  meetupInfoLine: {
    gap: 3,
    paddingVertical: 4,
  },
  meetupInfoLabel: {
    color: palette.pine,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  meetupInfoValue: {
    color: palette.sand,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  statusChip: {
    minHeight: 28,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipCompact: {
    minHeight: 26,
  },
  statusChipOpen: {
    backgroundColor: "rgba(147, 184, 159, 0.2)",
  },
  statusChipFilled: {
    backgroundColor: "rgba(231, 216, 188, 0.18)",
  },
  statusChipConfirmed: {
    backgroundColor: "rgba(241, 143, 92, 0.22)",
  },
  statusChipClosed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusChipCancelled: {
    backgroundColor: "rgba(147, 47, 47, 0.22)",
  },
  statusChipOverdue: {
    backgroundColor: "rgba(216, 108, 114, 0.16)",
  },
  statusChipLabel: {
    color: palette.sand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
