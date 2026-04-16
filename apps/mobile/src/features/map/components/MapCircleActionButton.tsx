import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius } from "@/theme/tokens";

/** Classic funnel filter: outline only, stroke weight scales like SF / Material semibold icons. */
function FilterFunnelIcon({ size, color }: { size: number; color: string }) {
  const stroke = Math.max(1.35, size * 0.075);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M5 5.5h14l-5.5 6v7h-3v-7L5 5.5z"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type MapCircleActionButtonProps = {
  icon: "menu" | "filter-list" | "groups-2" | "add" | "close";
  accessibilityLabel: string;
  onPress: () => void;
  pillLabel?: string;
  badge?: string | null;
  showDot?: boolean;
  active?: boolean;
  accent?: boolean;
};

export function MapCircleActionButton({
  icon,
  accessibilityLabel,
  onPress,
  pillLabel,
  badge,
  showDot = false,
  active = false,
  accent = false,
}: MapCircleActionButtonProps) {
  const iconConfig = resolveIconConfig(icon);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        triggerHaptic(accent ? "soft" : "selection");
        onPress();
      }}
      style={({ pressed }) => [
        pillLabel ? styles.pillButton : styles.circleButton,
        accent
          ? pillLabel
            ? styles.pillButtonAccent
            : styles.circleButtonAccent
          : active
            ? pillLabel
              ? styles.pillButtonActive
              : styles.circleButtonActive
            : pillLabel
              ? styles.pillButtonNeutral
              : styles.circleButtonNeutral,
        pressed ? (pillLabel ? styles.pillButtonPressed : styles.circleButtonPressed) : null,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant={pillLabel ? (accent ? "accent" : "dark") : accent ? "accent" : active ? "dark" : "light"}
        style={pillLabel ? styles.pillButtonSurface : styles.circleButtonSurface}
      />
      {pillLabel ? (
        <>
          {icon === "add" ? (
            <View style={styles.pillLeadingIconBubble}>
              <AppIcon iosName="plus" fallbackName="add" size={12} color={palette.ink} />
            </View>
          ) : null}
          <Text
            style={[
              styles.pillButtonLabel,
              accent ? styles.pillButtonLabelAccent : null,
              active ? styles.pillButtonLabelActive : null,
            ]}
          >
            {pillLabel}
          </Text>
        </>
      ) : (
        <>
          {icon === "filter-list" ? (
            <FilterFunnelIcon size={20} color={accent ? palette.ink : active ? palette.sand : palette.ink} />
          ) : (
            <AppIcon
              iosName={iconConfig.iosName}
              fallbackName={iconConfig.fallbackName}
              size={20}
              color={accent ? palette.ink : active ? palette.sand : palette.ink}
            />
          )}
        </>
      )}
      {badge ? (
        <View style={styles.circleButtonBadge}>
          <Text style={styles.circleButtonBadgeLabel}>{badge}</Text>
        </View>
      ) : showDot ? (
        <View style={styles.circleButtonDot} />
      ) : null}
    </Pressable>
  );
}

function resolveIconConfig(icon: MapCircleActionButtonProps["icon"]) {
  if (icon === "menu") {
    return {
      iosName: "line.3.horizontal" as const,
      fallbackName: "menu" as const,
    };
  }

  if (icon === "groups-2") {
    return {
      iosName: "person.2.fill" as const,
      fallbackName: "groups-2" as const,
    };
  }

  if (icon === "filter-list") {
    return {
      iosName: "line.3.horizontal.decrease.circle" as const,
      fallbackName: "filter-list" as const,
    };
  }

  if (icon === "close") {
    return {
      iosName: "xmark" as const,
      fallbackName: "close" as const,
    };
  }

  return {
    iosName: "plus" as const,
    fallbackName: "add" as const,
  };
}

const styles = StyleSheet.create({
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.015)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  circleButtonNeutral: {
    borderColor: "rgba(231,216,188,0.08)",
  },
  circleButtonActive: {
    borderColor: "rgba(231,216,188,0.1)",
  },
  circleButtonAccent: {
    borderColor: "rgba(241,143,92,0.24)",
  },
  circleButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  circleButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  circleButtonBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    backgroundColor: "#F44336",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  circleButtonDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#F44336",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  pillButton: {
    minHeight: 32,
    borderRadius: radius.pill,
    paddingLeft: 11,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  pillButtonNeutral: {
    borderColor: "rgba(231,216,188,0.08)",
    backgroundColor: "transparent",
  },
  pillButtonActive: {
    borderColor: "rgba(231,216,188,0.1)",
    backgroundColor: "transparent",
  },
  pillButtonAccent: {
    borderColor: "rgba(241,143,92,0.24)",
    backgroundColor: palette.ember,
  },
  pillButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  pillButtonLabel: {
    color: palette.sand,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  pillButtonLabelActive: {
    color: palette.sand,
  },
  pillButtonLabelAccent: {
    color: palette.ink,
  },
  pillButtonPressed: {
    opacity: 0.92,
  },
  pillLeadingIconBubble: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
  },
});
