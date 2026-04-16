import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { palette, radius, spacing } from "@/theme/tokens";
import { formatAverageRating, formatRelativeTimestamp, summarizeAvailabilityPeriods } from "@/lib/formatting";
import type { PublicPlayerProfile } from "@/types/domain";
import { GlassCard } from "@/components/GlassCard";

type PublicPlayerProfileScreenProps = {
  profile: PublicPlayerProfile | null;
  loading: boolean;
  error: string | null;
  actions?: React.ReactNode;
};

export function PublicPlayerProfileScreen({
  profile,
  loading,
  error,
  actions,
}: PublicPlayerProfileScreenProps) {
  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={palette.ember} size="large" />
        <Text style={styles.stateTitle}>Carregando perfil</Text>
        <Text style={styles.stateBody}>Buscando os detalhes públicos do jogador.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateTitle}>Não foi possível abrir o perfil</Text>
        <Text style={styles.stateBody}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateTitle}>Perfil indisponível</Text>
        <Text style={styles.stateBody}>
          Esse jogador não está disponível para visualização agora.
        </Text>
      </View>
    );
  }

  const availabilityLabels = summarizeAvailabilityPeriods(profile.availability);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.heroCard}>
        <View style={styles.heroIdentityRow}>
          <View style={styles.heroAvatarWrap}>
            <AppleGlassSurface
              pointerEvents="none"
              variant="dark"
              intensity="clear"
              style={styles.heroAvatarSurface}
            />
            <Avatar name={profile.displayName} uri={profile.avatarUrl} size={88} />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.heroNameBlock}>
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.handle}>@{profile.handle}</Text>
            </View>
            <Text style={styles.heroNeighborhood}>
              {profile.neighborhood || "Bairro não informado"}
            </Text>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <StatusPill
            label={
              profile.isOnline
                ? "Online agora"
                : profile.lastSeenAt
                  ? `Visto ${formatRelativeTimestamp(profile.lastSeenAt)}`
                  : "Offline"
            }
            tone={profile.isOnline ? "accent" : "neutral"}
          />
          <StatusPill
            label={profile.canHost ? "Recebe pessoas" : "Encontro externo"}
            tone="neutral"
          />
          <StatusPill label={formatRelationship(profile.relationshipState)} tone="subtle" />
        </View>

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </GlassCard>

      {actions ? <View style={styles.actionsWrap}>{actions}</View> : null}

      <View style={styles.statsGrid}>
        <MetricCard label="Nota média" value={formatAverageRating(profile.averageRating)} />
        <MetricCard label="Avaliações" value={String(profile.ratingsCount)} />
        <MetricCard label="Presenças" value={String(profile.attendedCount)} />
        <MetricCard label="Jogos criados" value={String(profile.hostedCount)} />
      </View>

      <Section title="Interesses">
        <View style={styles.chipsWrap}>
          {profile.gameNames.length ? (
            profile.gameNames.map((gameName) => (
              <InfoChip key={gameName} label={gameName} />
            ))
          ) : (
            <Text style={styles.emptyText}>Interesses não informados.</Text>
          )}
        </View>
      </Section>

      <Section title="Formatos">
        <View style={styles.chipsWrap}>
          {profile.formatNames.length ? (
            profile.formatNames.map((formatName) => (
              <InfoChip key={formatName} label={formatName} />
            ))
          ) : (
            <Text style={styles.emptyText}>Formatos não informados.</Text>
          )}
        </View>
      </Section>

      <Section title="Disponibilidade">
        <View style={styles.chipsWrap}>
          {availabilityLabels.length ? (
            availabilityLabels.map((label) => <InfoChip key={label} label={label} />)
          ) : (
            <Text style={styles.emptyText}>Disponibilidade não informada.</Text>
          )}
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </GlassCard>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.metricCardSurface}
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <View style={styles.infoChip}>
      <AppleGlassSurface
        pointerEvents="none"
        variant="dark"
        intensity="clear"
        style={styles.infoChipSurface}
      />
      <Text style={styles.infoChipLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "accent" | "neutral" | "subtle";
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "accent"
          ? styles.statusPillAccent
          : tone === "neutral"
            ? styles.statusPillNeutral
            : styles.statusPillSubtle,
      ]}
    >
      <AppleGlassSurface
        pointerEvents="none"
        variant={tone === "accent" ? "accent" : "dark"}
        intensity="clear"
        style={styles.statusPillSurface}
      />
      <Text style={styles.statusPillLabel}>{label}</Text>
    </View>
  );
}

function formatRelationship(value: PublicPlayerProfile["relationshipState"]) {
  if (value === "friend") {
    return "Amigo";
  }

  if (value === "incoming") {
    return "Convite recebido";
  }

  if (value === "outgoing") {
    return "Convite enviado";
  }

  return "Comunidade";
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  stateTitle: {
    color: palette.sand,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  stateBody: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  heroCard: {
    gap: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    padding: 18,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroAvatarWrap: {
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    overflow: "hidden",
  },
  heroAvatarSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  heroNameBlock: {
    gap: 2,
  },
  name: {
    color: palette.sand,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    flexShrink: 1,
  },
  handle: {
    color: palette.parchment,
    fontSize: 14,
    fontWeight: "700",
  },
  heroNeighborhood: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bio: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 21,
    borderTopWidth: 1,
    borderTopColor: "rgba(231,216,188,0.07)",
    paddingTop: spacing.md,
  },
  actionsWrap: {
    gap: 10,
  },
  statusPill: {
    minHeight: 30,
    maxWidth: "100%",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  statusPillAccent: {
    borderColor: "rgba(241,143,92,0.32)",
  },
  statusPillNeutral: {
    borderColor: palette.line,
  },
  statusPillSubtle: {
    borderColor: "rgba(255,255,255,0.05)",
  },
  statusPillSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  statusPillLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48.5%",
    minHeight: 84,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    padding: 14,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  metricCardSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  metricLabel: {
    color: palette.pine,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    lineHeight: 14,
    minHeight: 28,
  },
  metricValue: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "800",
  },
  section: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  infoChip: {
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  infoChipSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  infoChipLabel: {
    color: palette.sand,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
});
