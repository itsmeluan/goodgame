import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import type { MeetupSortMode } from "@/features/map/mapHelpers";
import { palette, radius, spacing } from "@/theme/tokens";

export type MeetupSortOption = {
  value: MeetupSortMode;
  label: string;
};

type MeetupSortMenuPanelProps = {
  visible: boolean;
  value: MeetupSortMode;
  options: MeetupSortOption[];
  onSelect: (value: MeetupSortMode) => void;
};

export function MeetupSortMenuPanel({
  visible,
  value,
  options,
  onSelect,
}: MeetupSortMenuPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.anchor} pointerEvents="box-none">
      <View style={styles.menuOuter}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.menuGlass}
        />
        <View style={styles.menuInner}>
          {options.map((option, index) => {
            const active = value === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Ordenar por ${option.label}`}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.menuItem,
                  index > 0 ? styles.menuItemSeparator : null,
                  active ? styles.menuItemActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.menuLabel, active ? styles.menuLabelActive : null]}>
                  {option.label}
                </Text>
                <View style={[styles.checkWrap, active ? styles.checkWrapActive : null]}>
                  {active ? (
                    <AppIcon
                      iosName="checkmark"
                      fallbackName="check"
                      size={12}
                      color={palette.sand}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    top: 38,
    right: 0,
    zIndex: 20,
  },
  menuOuter: {
    minWidth: 188,
    maxWidth: 220,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  menuGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
  },
  menuInner: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  menuItem: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  menuItemSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(231,216,188,0.1)",
  },
  menuItemActive: {
    backgroundColor: "rgba(241,143,92,0.16)",
  },
  menuLabel: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  menuLabelActive: {
    color: palette.sand,
    fontWeight: "700",
  },
  checkWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(231,216,188,0.1)",
  },
  checkWrapActive: {
    backgroundColor: palette.ember,
  },
  pressed: {
    opacity: 0.88,
  },
});
