import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { triggerHaptic } from "@/lib/haptics";
import { palette, spacing } from "@/theme/tokens";
import type { PublicPlayerProfile } from "@/types/domain";

export function formatRelationshipStateLabel(
  relationshipState: PublicPlayerProfile["relationshipState"]
) {
  if (relationshipState === "friend") {
    return "Amigo";
  }

  if (relationshipState === "incoming") {
    return "Convite recebido";
  }

  if (relationshipState === "outgoing") {
    return "Convite enviado";
  }

  return "Disponível";
}

export function FriendsPageSectionBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function MiniIconActionButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = "accent",
}: {
  icon: "close" | "check" | "person-add-alt-1";
  accessibilityLabel: string;
  onPress: () => void;
  tone?: "accent" | "ghost";
}) {
  const iconConfig = resolveActionIcon(icon);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        triggerHaptic(tone === "ghost" ? "selection" : "soft");
        onPress();
      }}
      style={({ pressed }) => [
        styles.friendMiniActionButton,
        tone === "ghost" ? styles.friendMiniActionButtonGhost : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {tone === "ghost" ? (
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.friendMiniActionButtonSurface}
        />
      ) : null}
      <AppIcon
        iosName={iconConfig.iosName}
        fallbackName={iconConfig.fallbackName}
        size={18}
        color={tone === "ghost" ? palette.parchment : palette.ink}
      />
    </Pressable>
  );
}

export function FriendStatusPill({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View
      style={[
        styles.friendStatusPill,
        accent ? styles.friendStatusPillAccent : styles.friendStatusPillNeutral,
      ]}
    >
      <Text style={styles.friendStatusPillLabel}>{label}</Text>
    </View>
  );
}

function resolveActionIcon(icon: "close" | "check" | "person-add-alt-1") {
  if (icon === "close") {
    return {
      iosName: "xmark" as const,
      fallbackName: "close" as const,
    };
  }

  if (icon === "check") {
    return {
      iosName: "checkmark" as const,
      fallbackName: "check" as const,
    };
  }

  return {
    iosName: "person.badge.plus" as const,
    fallbackName: "person-add-alt-1" as const,
  };
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  friendMiniActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ember,
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.24)",
    overflow: "hidden",
  },
  friendMiniActionButtonGhost: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(231,216,188,0.14)",
  },
  friendMiniActionButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
  },
  friendStatusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  friendStatusPillAccent: {
    backgroundColor: "rgba(241,143,92,0.12)",
    borderColor: "rgba(241,143,92,0.26)",
  },
  friendStatusPillNeutral: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: palette.line,
  },
  friendStatusPillLabel: {
    color: palette.parchment,
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.92,
  },
});
