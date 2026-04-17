import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { palette, radius, spacing } from "@/theme/tokens";
import { formatAverageRating, formatRelativeTimestamp, summarizeAvailabilityPeriods } from "@/lib/formatting";
import type { PublicPlayerProfile } from "@/types/domain";

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
  const [detailScene, setDetailScene] = useState<
    { type: "formats"; gameName: string } | { type: "availability" } | null
  >(null);

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
  const formatRows = profile.formatNames.length ? profile.formatNames : ["Formatos não informados."];

  const rootRoute = {
    key: "root",
    content: (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
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
                <View style={styles.heroEyebrowRow}>
                  <Text style={styles.heroEyebrow}>Jogador</Text>
                  <Text style={styles.heroSeenAtInline}>
                    {profile.isOnline
                      ? "online agora"
                      : profile.lastSeenAt
                        ? `visto ${formatRelativeTimestamp(profile.lastSeenAt)}`
                        : ""}
                  </Text>
                </View>
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
              label={profile.canHost ? "Recebe pessoas" : "Encontro externo"}
              tone="neutral"
            />
            <StatusPill label={formatRelationship(profile.relationshipState)} tone="subtle" />
          </View>

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        <AppleListSection title="Resumo" size="compact">
          <AppleListGroup>
            <AppleListRow
              icon={{ iosName: "star.fill", fallbackName: "grade" }}
              label="Nota média"
              trailingValue={formatAverageRating(profile.averageRating)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "checkmark.seal.fill", fallbackName: "verified" }}
              label="Avaliações"
              trailingValue={String(profile.ratingsCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "person.crop.circle.badge.checkmark", fallbackName: "task-alt" }}
              label="Presenças"
              trailingValue={String(profile.attendedCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "dice.fill", fallbackName: "casino" }}
              label="Jogos criados"
              trailingValue={String(profile.hostedCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "calendar", fallbackName: "calendar-today" }}
              label="Disponibilidade"
              onPress={() => setDetailScene({ type: "availability" })}
              size="compact"
            />
          </AppleListGroup>
        </AppleListSection>

        <ListRowsSection
          title="Interesses"
          icon={{ iosName: "gamecontroller.fill", fallbackName: "sports-esports" }}
          values={profile.gameNames}
          emptyValue="Interesses não informados."
          showChevron={profile.gameNames.length > 0}
          onPressValue={
            profile.gameNames.length > 0
              ? (gameName) => setDetailScene({ type: "formats", gameName })
              : undefined
          }
        />

        {actions ? <View style={styles.actionsWrap}>{actions}</View> : null}
      </ScrollView>
    ),
  };

  const routes =
    detailScene === null
      ? [rootRoute]
      : [
          rootRoute,
          detailScene.type === "formats"
            ? {
                key: `formats:${detailScene.gameName}`,
                title: detailScene.gameName,
                subtitle: "Formatos",
                content: (
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                  >
                    <ListRowsSection
                      title="Formatos"
                      icon={{ iosName: "square.grid.2x2.fill", fallbackName: "grid-view" }}
                      values={formatRows}
                      emptyValue="Formatos não informados."
                    />
                  </ScrollView>
                ),
              }
            : {
                key: "availability",
                title: "Disponibilidade",
                subtitle: "Horários do jogador",
                content: (
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                  >
                    <ListRowsSection
                      title="Disponibilidade"
                      icon={{ iosName: "calendar", fallbackName: "calendar-today" }}
                      values={availabilityLabels}
                      emptyValue="Disponibilidade não informada."
                    />
                  </ScrollView>
                ),
              },
        ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={() => setDetailScene(null)}
      headerVariant="compact"
      scenePaddingHorizontal={spacing.lg}
    />
  );
}

function ListRowsSection({
  title,
  icon,
  values,
  emptyValue,
  showChevron = false,
  onPressValue,
}: {
  title: string;
  icon: { iosName: "gamecontroller.fill" | "square.grid.2x2.fill" | "calendar"; fallbackName: "sports-esports" | "grid-view" | "calendar-today" };
  values: string[];
  emptyValue: string;
  showChevron?: boolean;
  onPressValue?: (value: string) => void;
}) {
  const rows = values.length ? values : [emptyValue];
  const interactive = showChevron && Boolean(onPressValue) && values.length > 0;

  return (
    <AppleListSection title={title} size="compact">
      <AppleListGroup>
        {rows.map((value, index) => (
          <AppleListRow
            key={`${title}:${value}:${index}`}
            icon={icon}
            label={value}
            showChevron={interactive}
            onPress={interactive ? () => onPressValue?.(value) : undefined}
            separator={index > 0}
            size="compact"
          />
        ))}
      </AppleListGroup>
    </AppleListSection>
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
      <Text
        style={[
          styles.statusPillLabel,
          tone === "accent" ? styles.statusPillAccentLabel : null,
        ]}
      >
        {label}
      </Text>
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
    paddingTop: spacing.sm,
    paddingHorizontal: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.loadingScreen,
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
    gap: 18,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroAvatarWrap: {
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(233,226,215,0.16)",
    overflow: "hidden",
  },
  heroAvatarSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  heroNameBlock: {
    gap: 3,
  },
  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroSeenAtInline: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    textTransform: "lowercase",
  },
  name: {
    color: palette.sand,
    fontSize: 22,
    lineHeight: 27,
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
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bio: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 22,
    borderTopWidth: 1,
    borderTopColor: "rgba(233,226,215,0.12)",
    paddingTop: spacing.md,
  },
  actionsWrap: {
    gap: 10,
  },
  statusPill: {
    minHeight: 34,
    maxWidth: "100%",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  statusPillAccent: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  statusPillNeutral: {
    backgroundColor: "rgba(7,10,18,0.7)",
    borderColor: "rgba(233,226,215,0.14)",
  },
  statusPillSubtle: {
    backgroundColor: "rgba(7,10,18,0.42)",
    borderColor: "rgba(233,226,215,0.1)",
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
  statusPillAccentLabel: {
    color: palette.ink,
  },
});
