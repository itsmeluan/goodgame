import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { SFSymbol } from "expo-symbols";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

/** Solid fill for danger row icon (e.g. delete) — watermelon red. */
const APPLE_LIST_DANGER_ICON_SURFACE = "#E14D5C";

type AppleListIcon = {
  iosName: SFSymbol;
  fallbackName: keyof typeof MaterialIcons.glyphMap;
};

type AppleListSectionProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: "default" | "compact";
};

type AppleListGroupProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  appearance?: "plain" | "contained";
};

type AppleListRowProps = {
  icon?: AppleListIcon;
  /** When set, replaces the default SF Symbol / glass leading block (e.g. avatar). */
  leading?: ReactNode;
  /** Overrides default leading icon size (compact 16, default 19). */
  leadingIconSize?: number;
  /** Red badge on the leading icon (e.g. unread in a grouping). */
  showUnreadDot?: boolean;
  label: string;
  subtitle?: string;
  trailingValue?: string | null;
  trailingAccessory?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  separator?: boolean;
  tone?: "default" | "accent" | "danger";
  size?: "default" | "compact";
};

export const APPLE_LIST_COMPACT_ICON_SIZE = 36;
export const APPLE_LIST_COMPACT_GAP = 12;
export const APPLE_LIST_COMPACT_TEXT_INSET =
  APPLE_LIST_COMPACT_ICON_SIZE + APPLE_LIST_COMPACT_GAP;

const tonePalette = {
  default: {
    trailingValueColor: palette.ember,
    chevronColor: palette.pine,
  },
  accent: {
    trailingValueColor: palette.ember,
    chevronColor: palette.pine,
  },
  danger: {
    trailingValueColor: "#F3B0AE",
    chevronColor: palette.pine,
  },
} as const;

export function AppleListSection({
  title,
  subtitle,
  children,
  style,
  size = "default",
}: AppleListSectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        {title ? (
          <Text style={[styles.sectionTitle, size === "compact" ? styles.sectionTitleCompact : null]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={[styles.sectionSubtitle, size === "compact" ? styles.sectionSubtitleCompact : null]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function AppleListGroup({
  children,
  style,
  appearance = "plain",
}: AppleListGroupProps) {
  return (
    <View
      style={[
        styles.group,
        appearance === "contained" ? styles.groupContained : styles.groupPlain,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AppleListRow({
  icon,
  leading,
  leadingIconSize,
  showUnreadDot = false,
  label,
  subtitle,
  trailingValue = null,
  trailingAccessory,
  onPress,
  showChevron = true,
  separator = false,
  tone = "default",
  size = "default",
}: AppleListRowProps) {
  const rowTone = tonePalette[tone];
  const resolvedLeadingIconSize =
    leadingIconSize ?? (size === "compact" ? 16 : 19);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={() => {
        if (!onPress) {
          return;
        }

        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        size === "compact" ? styles.rowCompact : null,
        separator ? styles.rowWithSeparator : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      {leading ? (
        <View
          style={[
            styles.leadingWithBadge,
            size === "compact" ? styles.leadingWithBadgeCompact : null,
          ]}
        >
          <View style={[styles.leadingIconWrap, size === "compact" ? styles.leadingIconWrapCompact : null]}>
            {leading}
          </View>
          {showUnreadDot ? (
            <View pointerEvents="none" style={[styles.unreadDot, size === "compact" ? styles.unreadDotCompact : null]} />
          ) : null}
        </View>
      ) : icon ? (
        <View
          style={[
            styles.leadingWithBadge,
            size === "compact" ? styles.leadingWithBadgeCompact : null,
          ]}
        >
          <View style={[styles.leadingIconWrap, size === "compact" ? styles.leadingIconWrapCompact : null]}>
            {tone === "danger" ? (
              <View
                pointerEvents="none"
                style={[
                  styles.leadingIconSurface,
                  size === "compact" ? styles.leadingIconSurfaceCompact : null,
                  styles.leadingIconDangerSurface,
                ]}
              />
            ) : (
              <AppleGlassSurface
                pointerEvents="none"
                variant={tone === "accent" ? "accent" : "dark"}
                intensity="clear"
                style={[
                  styles.leadingIconSurface,
                  size === "compact" ? styles.leadingIconSurfaceCompact : null,
                ]}
              />
            )}
            <AppIcon
              iosName={icon.iosName}
              fallbackName={icon.fallbackName}
              size={resolvedLeadingIconSize}
              color={
                tone === "danger"
                  ? "#FFF8F5"
                  : tone === "accent"
                    ? palette.ink
                    : palette.ember
              }
            />
          </View>
          {showUnreadDot ? (
            <View pointerEvents="none" style={[styles.unreadDot, size === "compact" ? styles.unreadDotCompact : null]} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, size === "compact" ? styles.rowLabelCompact : null]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, size === "compact" ? styles.rowSubtitleCompact : null]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.trailingWrap}>
        {trailingAccessory}
        {trailingValue ? (
          <Text
            style={[
              styles.trailingValue,
              size === "compact" ? styles.trailingValueCompact : null,
              { color: rowTone.trailingValueColor },
            ]}
          >
            {trailingValue}
          </Text>
        ) : null}
        {showChevron ? (
          <AppIcon
            iosName="chevron.right"
            fallbackName="chevron-right"
            size={13}
            color={rowTone.chevronColor}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionTitleCompact: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionSubtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  group: {
    overflow: "hidden",
  },
  groupPlain: {
    marginHorizontal: 0,
  },
  groupContained: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 74,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
  },
  rowCompact: {
    minHeight: 64,
    gap: 12,
    paddingVertical: 9,
  },
  rowWithSeparator: {
    borderTopWidth: 1,
    borderTopColor: "rgba(231,216,188,0.08)",
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  leadingWithBadge: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  leadingWithBadgeCompact: {
    width: APPLE_LIST_COMPACT_ICON_SIZE,
    height: APPLE_LIST_COMPACT_ICON_SIZE,
  },
  unreadDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.watermelon,
    borderWidth: 1.5,
    borderColor: palette.pageChrome,
    zIndex: 2,
  },
  unreadDotCompact: {
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  leadingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  leadingIconWrapCompact: {
    width: APPLE_LIST_COMPACT_ICON_SIZE,
    height: APPLE_LIST_COMPACT_ICON_SIZE,
    borderRadius: 18,
  },
  leadingIconSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
  },
  leadingIconSurfaceCompact: {
    borderRadius: 18,
  },
  leadingIconDangerSurface: {
    backgroundColor: APPLE_LIST_DANGER_ICON_SURFACE,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowLabel: {
    color: palette.sand,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
  },
  rowLabelCompact: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: palette.pine,
    fontSize: 14,
    lineHeight: 20,
  },
  rowSubtitleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  trailingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  trailingValue: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
  },
  trailingValueCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
});
