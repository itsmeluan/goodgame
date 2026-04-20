import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { Avatar } from "@/components/Avatar";
import { GlassCard } from "@/components/GlassCard";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { AccountOwnPublicProfileScene } from "@/features/map/components/AccountOwnPublicProfileScene";
import { BlockedUsersPage } from "@/features/map/components/BlockedUsersPage";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { formatAverageRating, formatSyncLabel } from "@/lib/formatting";
import { isUserPro } from "@/lib/proPlayer";
import { palette, spacing } from "@/theme/tokens";
import type { BlockedUserProfile, PlayerProfile, ReputationSummary } from "@/types/domain";

type AccountPageProps = {
  profile: PlayerProfile;
  reputationSummary: ReputationSummary;
  lastAccountSyncAt: Date | null;
  blockedUsersCount: number;
  blockedUsers: BlockedUserProfile[];
  blockedUsersError: string | null;
  blockedUsersSuccess: string | null;
  loadingBlockedUsers: boolean;
  unblockingUserId: string | null;
  bottomInset: number;
  onProfileEdit: () => void;
  onEnterBlockedUsersScene?: () => void;
  onUnblockUser: (user: BlockedUserProfile) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
};

type AccountRouteKey = "profile" | "reputation" | "blocked";

export function AccountPage({
  profile,
  reputationSummary,
  lastAccountSyncAt,
  blockedUsersCount,
  blockedUsers,
  blockedUsersError,
  blockedUsersSuccess,
  loadingBlockedUsers,
  unblockingUserId,
  bottomInset,
  onProfileEdit,
  onEnterBlockedUsersScene,
  onUnblockUser,
  onSignOut,
  onDeleteAccount,
  onClose,
}: AccountPageProps) {
  const [routeKeys, setRouteKeys] = useState<AccountRouteKey[]>([]);

  const pushRoute = (key: AccountRouteKey) => {
    if (key === "blocked") {
      onEnterBlockedUsersScene?.();
    }
    setRouteKeys((current) => (current[current.length - 1] === key ? current : [...current, key]));
  };

  const popRoute = () => {
    setRouteKeys((current) => current.slice(0, -1));
  };

  const routes = [
    {
      key: "root",
      content: (
        <View style={styles.rootWithFooter}>
          <ScrollView
            style={styles.rootScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, styles.rootScrollContent]}
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
                <Avatar
                  name={profile.displayName}
                  uri={profile.avatarUrl}
                  size={54}
                  isPro={isUserPro(profile)}
                />
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
                icon={{ iosName: "person.fill", fallbackName: "person" }}
                label="Perfil"
                onPress={() => pushRoute("profile")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "star.fill", fallbackName: "grade" }}
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
                onPress={() => pushRoute("blocked")}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <AppleListSection title="Sessão" size="compact">
            <AppleListGroup>
              <AppleListRow
                icon={{
                  iosName: "arrow.right.to.line",
                  fallbackName: "exit-to-app",
                }}
                label="Desconectar"
                onPress={onSignOut}
                showChevron={false}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "trash", fallbackName: "delete-outline" }}
                label="Excluir conta"
                onPress={onDeleteAccount}
                showChevron={false}
                tone="danger"
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>
          </ScrollView>
          <MapPageCloseFooter bottomInset={bottomInset} onClose={onClose} />
        </View>
      ),
    },
    ...routeKeys.map((routeKey) => {
      if (routeKey === "profile") {
        return {
          key: routeKey,
          content: (
            <AccountOwnPublicProfileScene profile={profile} onEditProfile={onProfileEdit} />
          ),
        };
      }

      if (routeKey === "reputation") {
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
      }

      return {
        key: routeKey,
        content: (
          <BlockedUsersPage
            blockedUsers={blockedUsers}
            blockedUsersError={blockedUsersError}
            blockedUsersSuccess={blockedUsersSuccess}
            loadingBlockedUsers={loadingBlockedUsers}
            unblockingUserId={unblockingUserId}
            bottomInset={bottomInset}
            onUnblockUser={onUnblockUser}
            onClose={onClose}
            embeddedInAccount
          />
        ),
      };
    }),
  ];

  return (
    <SlidingSheetStack
      routes={routes}
      onPop={popRoute}
      headerVariant="compact"
      scenePaddingHorizontal={spacing.lg}
    />
  );
}

const styles = StyleSheet.create({
  rootWithFooter: {
    flex: 1,
  },
  rootScroll: {
    flex: 1,
  },
  rootScrollContent: {
    paddingBottom: spacing.lg,
  },
  content: {
    paddingTop: spacing.sm,
    gap: 12,
  },
  sceneContent: {
    alignItems: "stretch",
    paddingTop: 8,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  sceneLead: {
    alignSelf: "stretch",
    gap: 4,
    paddingTop: 2,
  },
  sceneLeadTitle: {
    color: palette.sand,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "left",
  },
  sceneLeadSubtitle: {
    color: palette.pine,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "left",
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
    overflow: "visible",
    paddingTop: 2,
    paddingBottom: 8,
    paddingHorizontal: 2,
    alignSelf: "flex-start",
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
});
