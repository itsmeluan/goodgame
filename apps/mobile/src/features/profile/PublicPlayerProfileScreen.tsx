import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { useTranslation } from "@/i18n";
import { isUserPro } from "@/lib/proPlayer";
import { palette, radius, spacing } from "@/theme/tokens";
import { formatAverageRating, formatRelativeTimestamp, summarizeAvailabilityPeriods } from "@/lib/formatting";
import type { PublicPlayerProfile } from "@/types/domain";

type PublicPlayerProfileScreenProps = {
  profile: PublicPlayerProfile | null;
  loading: boolean;
  error: string | null;
  /** Primeiro item do resumo: abrir chat direto com o jogador. */
  onOpenPrivateChat?: () => void;
  actions?: React.ReactNode;
};

export function PublicPlayerProfileScreen({
  profile,
  loading,
  error,
  onOpenPrivateChat,
  actions,
}: PublicPlayerProfileScreenProps) {
  const { t } = useTranslation();
  const [detailScene, setDetailScene] = useState<
    { type: "formats"; gameName: string } | { type: "availability" } | null
  >(null);
  const showBlockingLoading = loading && !profile;
  const showBlockingError = Boolean(error) && !profile;
  const showRefreshingState = loading && !!profile;
  const showInlineError = Boolean(error) && !!profile;

  if (showBlockingLoading) {
    return (
      <View style={styles.stateWrap}>
        <LoadingSpinner size={42} />
        <Text style={styles.stateTitle}>{t("publicProfile.loadingTitle")}</Text>
        <Text style={styles.stateBody}>{t("publicProfile.loadingBody")}</Text>
      </View>
    );
  }

  if (showBlockingError) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateTitle}>{t("publicProfile.openErrorTitle")}</Text>
        <Text style={styles.stateBody}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateTitle}>{t("publicProfile.unavailableTitle")}</Text>
        <Text style={styles.stateBody}>{t("publicProfile.unavailableBody")}</Text>
      </View>
    );
  }

  const availabilityLabels = summarizeAvailabilityPeriods(profile.availability);
  const formatRows = profile.formatNames.length ? profile.formatNames : [t("publicProfile.formatsUnavailable")];

  const rootRoute = {
    key: "root",
    content: (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {showRefreshingState ? (
          <View style={styles.inlineStatusCard}>
            <LoadingSpinner size={18} />
            <Text style={styles.inlineStatusText}>{t("publicProfile.refreshing")}</Text>
          </View>
        ) : null}

        {showInlineError ? (
          <View style={styles.inlineErrorCard}>
            <Text style={styles.inlineErrorTitle}>{t("publicProfile.refreshingError")}</Text>
            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroIdentityRow}>
            <View
              style={[
                styles.heroAvatarWrap,
                isUserPro(profile) ? styles.heroAvatarWrapProFrame : null,
              ]}
            >
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="clear"
                style={styles.heroAvatarSurface}
              />
              <Avatar
                name={profile.displayName}
                uri={profile.avatarUrl}
                size={88}
                isPro={isUserPro(profile)}
              />
            </View>
            <View style={styles.heroCopy}>
              <View style={styles.heroNameBlock}>
                <View style={styles.heroEyebrowRow}>
                  <Text style={styles.heroEyebrow}>{t("publicProfile.player")}</Text>
                  <Text style={styles.heroSeenAtInline}>
                    {profile.isOnline
                      ? t("publicProfile.onlineNow")
                      : profile.lastSeenAt
                        ? t("publicProfile.seen", { time: formatRelativeTimestamp(profile.lastSeenAt) })
                        : ""}
                  </Text>
                </View>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Text style={styles.handle}>@{profile.handle}</Text>
              </View>
              <Text style={styles.heroNeighborhood}>
                {profile.neighborhood || t("profile.noNeighborhood")}
              </Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <StatusPill
              label={profile.canHost ? t("profile.receivesPeople") : t("publicProfile.availableExternal")}
              tone="neutral"
            />
            <StatusPill label={formatRelationship(profile.relationshipState, t)} tone="subtle" />
          </View>

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        <AppleListSection title={t("publicProfile.summary")} size="compact">
          <AppleListGroup>
            {onOpenPrivateChat ? (
              <AppleListRow
                icon={{ iosName: "bubble.left.and.bubble.right.fill", fallbackName: "chat" }}
                label={t("nav.chats")}
                subtitle={t("publicProfile.chatSubtitle")}
                onPress={onOpenPrivateChat}
                showChevron
                size="compact"
              />
            ) : null}
            <AppleListRow
              separator={Boolean(onOpenPrivateChat)}
              icon={{ iosName: "star.fill", fallbackName: "grade" }}
              label={t("publicProfile.averageRating")}
              trailingValue={formatAverageRating(profile.averageRating)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "checkmark.seal.fill", fallbackName: "verified" }}
              label={t("publicProfile.ratings")}
              trailingValue={String(profile.ratingsCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "person.crop.circle.badge.checkmark", fallbackName: "task-alt" }}
              label={t("account.attendances")}
              trailingValue={String(profile.attendedCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "dice.fill", fallbackName: "casino" }}
              label={t("account.gamesCreated")}
              trailingValue={String(profile.hostedCount)}
              showChevron={false}
              size="compact"
            />
            <AppleListRow
              separator
              icon={{ iosName: "calendar", fallbackName: "calendar-today" }}
              label={t("profile.availability")}
              onPress={() => setDetailScene({ type: "availability" })}
              size="compact"
            />
          </AppleListGroup>
        </AppleListSection>

        <ListRowsSection
          title={t("profile.interests")}
          icon={{ iosName: "gamecontroller.fill", fallbackName: "sports-esports" }}
          values={profile.gameNames}
          emptyValue={t("publicProfile.interestsUnavailable")}
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
                subtitle: t("profile.formats"),
                content: (
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                  >
                    <ListRowsSection
                      title={t("profile.formats")}
                      icon={{ iosName: "square.grid.2x2.fill", fallbackName: "grid-view" }}
                      values={formatRows}
                      emptyValue={t("publicProfile.formatsUnavailable")}
                    />
                  </ScrollView>
                ),
              }
            : {
                key: "availability",
                title: t("profile.availability"),
                subtitle: t("publicProfile.availabilitySubtitle"),
                content: (
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                  >
                    <ListRowsSection
                      title={t("profile.availability")}
                      icon={{ iosName: "calendar", fallbackName: "calendar-today" }}
                      values={availabilityLabels}
                      emptyValue={t("publicProfile.availabilityUnavailable")}
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

function formatRelationship(value: PublicPlayerProfile["relationshipState"], t: ReturnType<typeof useTranslation>["t"]) {
  if (value === "friend") {
    return t("publicProfile.friend");
  }

  if (value === "incoming") {
    return t("publicProfile.incomingInvite");
  }

  if (value === "outgoing") {
    return t("publicProfile.outgoingInvite");
  }

  return t("publicProfile.community");
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
  inlineStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(241,143,92,0.18)",
    backgroundColor: "rgba(241,143,92,0.08)",
  },
  inlineStatusText: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineErrorCard: {
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(214,93,93,0.2)",
    backgroundColor: "rgba(214,93,93,0.1)",
  },
  inlineErrorTitle: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "800",
  },
  inlineErrorText: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 18,
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
  /** Moldura Pro tem detalhe fora do círculo; `overflow: hidden` cortaria a arte. */
  heroAvatarWrapProFrame: {
    overflow: "visible",
    borderWidth: 0,
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
