import { StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { summarizeAvailabilityPeriods } from "@/lib/formatting";
import { palette, radius, spacing } from "@/theme/tokens";
import type { PlayerProfile } from "@/types/domain";

type ProfileSummaryCardProps = {
  profile: PlayerProfile;
};

export function ProfileSummaryCard({ profile }: ProfileSummaryCardProps) {
  const availabilityLabels = summarizeAvailabilityPeriods(profile.availability);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.handle}>@{profile.handle}</Text>
          <Text style={styles.subMeta}>{profile.neighborhood || "Bairro não informado"}</Text>
        </View>
        <View style={styles.badge}>
          <AppleGlassSurface
            pointerEvents="none"
            variant="accent"
            intensity="clear"
            style={styles.badgeSurface}
          />
          <Text style={styles.badgeText}>
            {profile.canHost ? "Recebe pessoas" : "Encontro externo"}
          </Text>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.block}>
        <Text style={styles.label}>Interesses</Text>
        <View style={styles.valueChips}>
          {profile.gameNames.length ? (
            profile.gameNames.map((gameName) => (
              <View key={gameName} style={styles.valueChip}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.valueChipSurface}
                />
                <Text style={styles.valueChipLabel}>{gameName}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.value}>Não informado</Text>
          )}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Formatos</Text>
        <View style={styles.valueChips}>
          {profile.formatNames.length ? (
            profile.formatNames.map((formatName) => (
              <View key={formatName} style={styles.valueChip}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.valueChipSurface}
                />
                <Text style={styles.valueChipLabel}>{formatName}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.value}>Não informado</Text>
          )}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Disponibilidade</Text>
        <View style={styles.valueChips}>
          {availabilityLabels.length ? (
            availabilityLabels.map((label) => (
              <View key={label} style={styles.valueChip}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.valueChipSurface}
                />
                <Text style={styles.valueChipLabel}>{label}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.value}>Não informada</Text>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    padding: spacing.lg,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: palette.sand,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
  },
  handle: {
    color: palette.pine,
    fontSize: 13,
    marginTop: 4,
  },
  subMeta: {
    color: palette.mist,
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    maxWidth: 148,
    minHeight: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.18)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: palette.parchment,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  bio: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(231,216,188,0.07)",
    paddingTop: spacing.md,
  },
  block: {
    gap: 6,
  },
  label: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  value: {
    color: palette.sand,
    fontSize: 14,
    lineHeight: 20,
  },
  valueChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  valueChip: {
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  valueChipSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  valueChipLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "700",
  },
});
