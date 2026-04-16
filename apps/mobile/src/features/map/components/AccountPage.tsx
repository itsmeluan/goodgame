import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  APPLE_LIST_COMPACT_TEXT_INSET,
  AppleListGroup,
  AppleListRow,
  AppleListSection,
} from "@/components/AppleListNavigation";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { Avatar } from "@/components/Avatar";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { MapClosePageButton } from "@/features/map/components/MapClosePageButton";
import { ProfileSummaryCard } from "@/features/profile/ProfileSummaryCard";
import { formatAverageRating, formatSyncLabel } from "@/lib/formatting";
import { palette, sheetContentGutter, spacing } from "@/theme/tokens";
import type { PlayerProfile, ReputationSummary } from "@/types/domain";

type AccountPageProps = {
  profile: PlayerProfile;
  reputationSummary: ReputationSummary;
  lastAccountSyncAt: Date | null;
  blockedUsersCount: number;
  bottomInset: number;
  onProfileEdit: () => void;
  onOpenBlockedUsers: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
};

type AccountRouteKey = "profile" | "reputation";

export function AccountPage({
  profile,
  reputationSummary,
  lastAccountSyncAt,
  blockedUsersCount,
  bottomInset,
  onProfileEdit,
  onOpenBlockedUsers,
  onSignOut,
  onDeleteAccount,
  onClose,
}: AccountPageProps) {
  const [routeKeys, setRouteKeys] = useState<AccountRouteKey[]>([]);

  const pushRoute = (key: AccountRouteKey) => {
    setRouteKeys((current) => (current[current.length - 1] === key ? current : [...current, key]));
  };

  const popRoute = () => {
    setRouteKeys((current) => current.slice(0, -1));
  };

  const routes = [
    {
      key: "root",
      content: (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: bottomInset + spacing.xxl,
            },
          ]}
        >
          <GlassCard style={styles.accountHeroCard}>
            <View style={styles.accountHero}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar foto do perfil"
                onPress={onProfileEdit}
                style={({ pressed }) => [
                  styles.accountAvatarButton,
                  pressed ? styles.circleButtonPressed : null,
                ]}
              >
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.accountAvatarButtonSurface}
                />
                <Avatar name={profile.displayName} uri={profile.avatarUrl} size={54} />
              </Pressable>
              <View style={styles.accountHeroCopy}>
                <Text style={styles.accountName}>{profile.displayName}</Text>
                <Text style={styles.accountHandle}>@{profile.handle}</Text>
                <Text style={styles.accountMeta}>
                  {profile.neighborhood || "Sem bairro"} ·{" "}
                  {profile.canHost ? "Recebe pessoas" : "Encontro externo"}
                </Text>
              </View>
            </View>
          </GlassCard>

          <AppleListSection
            subtitle={formatSyncLabel(lastAccountSyncAt)}
            size="compact"
          >
            <AppleListGroup>
              <AppleListRow
                icon={{ iosName: "person.crop.circle.fill", fallbackName: "account-circle" }}
                label="Perfil"
                onPress={() => pushRoute("profile")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "star.bubble.fill", fallbackName: "stars" }}
                label="Reputação"
                subtitle={`${reputationSummary.ratingsCount} avaliação(ões)`}
                trailingValue={formatAverageRating(reputationSummary.averageRating)}
                onPress={() => pushRoute("reputation")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "hand.raised.fill", fallbackName: "block" }}
                label="Usuários bloqueados"
                trailingValue={String(blockedUsersCount)}
                onPress={onOpenBlockedUsers}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <AppleListSection title="Sessão" size="compact">
            <AppleListGroup>
              <AppleListRow
                icon={{ iosName: "rectangle.portrait.and.arrow.right", fallbackName: "logout" }}
                label="Desconectar"
                onPress={onSignOut}
                showChevron={false}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "trash.fill", fallbackName: "delete-forever" }}
                label="Excluir conta"
                onPress={onDeleteAccount}
                showChevron={false}
                tone="danger"
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <MapClosePageButton onPress={onClose} />
        </ScrollView>
      ),
    },
    ...routeKeys.map((routeKey) => {
      if (routeKey === "profile") {
        return {
          key: routeKey,
          content: (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>Perfil</Text>
                <Text style={styles.sceneLeadSubtitle}>Sua visão pública no GG</Text>
              </View>
              <ProfileSummaryCard profile={profile} />
              <View style={styles.rowActions}>
                <View style={styles.rowActionCell}>
                  <PrimaryButton label="Editar perfil e foto" onPress={onProfileEdit} />
                </View>
              </View>
            </ScrollView>
          ),
        };
      }

      return {
        key: routeKey,
        content: (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
            <View style={styles.sceneLead}>
              <Text style={styles.sceneLeadTitle}>Reputação</Text>
              <Text style={styles.sceneLeadSubtitle}>
                {reputationSummary.ratingsCount} avaliação(ões)
              </Text>
            </View>
            <AppleListSection subtitle={formatSyncLabel(lastAccountSyncAt)} size="compact">
              <AppleListGroup>
                <AppleListRow
                  icon={{ iosName: "star.fill", fallbackName: "stars" }}
                  label="Nota média"
                  trailingValue={formatAverageRating(reputationSummary.averageRating)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "checkmark.circle.fill", fallbackName: "task-alt" }}
                  label="Presenças"
                  trailingValue={String(reputationSummary.attendedCount)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "xmark.circle.fill", fallbackName: "highlight-off" }}
                  label="No-show"
                  trailingValue={String(reputationSummary.noShowCount)}
                  showChevron={false}
                  size="compact"
                />
                <AppleListRow
                  separator
                  icon={{ iosName: "dice.fill", fallbackName: "casino" }}
                  label="Jogos criados"
                  trailingValue={String(reputationSummary.hostedCount)}
                  showChevron={false}
                  size="compact"
                />
              </AppleListGroup>
            </AppleListSection>
          </ScrollView>
        ),
      };
    }),
  ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={popRoute}
      headerVariant="compact"
      scenePaddingHorizontal={sheetContentGutter}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
    gap: 12,
  },
  sceneContent: {
    paddingTop: 8,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  sceneLead: {
    gap: 4,
    paddingTop: 2,
    paddingLeft: APPLE_LIST_COMPACT_TEXT_INSET,
  },
  sceneLeadTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  sceneLeadSubtitle: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
  },
  accountHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  accountHeroCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.08)",
  },
  accountAvatarButton: {
    borderRadius: 999,
    overflow: "hidden",
  },
  accountAvatarButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  circleButtonPressed: {
    opacity: 0.78,
  },
  accountHeroCopy: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    color: palette.sand,
    fontSize: 24,
    fontWeight: "800",
  },
  accountHandle: {
    color: palette.parchment,
    fontSize: 13,
    fontWeight: "700",
  },
  accountMeta: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 17,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowActionCell: {
    flex: 1,
  },
});
