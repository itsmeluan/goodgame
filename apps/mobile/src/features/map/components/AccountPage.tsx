import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppleListGroup, AppleListRow, AppleListSection } from "@/components/AppleListNavigation";
import { Avatar } from "@/components/Avatar";
import { GlassCard } from "@/components/GlassCard";
import { SlidingSheetStack } from "@/components/SlidingSheetStack";
import { AccountOwnPublicProfileScene } from "@/features/map/components/AccountOwnPublicProfileScene";
import { BlockedUsersPage } from "@/features/map/components/BlockedUsersPage";
import { MapPageCloseFooter } from "@/features/map/components/MapPageCloseFooter";
import { useTranslation, type LanguagePreference, type SupportedLocale } from "@/i18n";
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
  onRestartMapOnboarding: () => void;
  onClose: () => void;
};

type AccountRouteKey = "profile" | "reputation" | "blocked" | "language";

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
  onRestartMapOnboarding,
  onClose,
}: AccountPageProps) {
  const { locale, preference, setLanguagePreference, t } = useTranslation();
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
                accessibilityLabel={t("account.editProfilePhoto")}
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
                  {profile.neighborhood || t("account.noNeighborhood")} ·{" "}
                  {profile.canHost ? t("account.receivesPeople") : t("account.externalMeetup")}
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
                label={t("account.profile")}
                onPress={() => pushRoute("profile")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "star.fill", fallbackName: "grade" }}
                label={t("account.reputation")}
                subtitle={t("account.ratingsCount", { count: reputationSummary.ratingsCount })}
                trailingValue={formatAverageRating(reputationSummary.averageRating)}
                onPress={() => pushRoute("reputation")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "hand.raised.fill", fallbackName: "block" }}
                label={t("account.blockedUsers")}
                trailingValue={String(blockedUsersCount)}
                onPress={() => pushRoute("blocked")}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <AppleListSection title={t("account.languageSection")} size="compact">
            <AppleListGroup>
              <AppleListRow
                icon={{ iosName: "globe", fallbackName: "language" }}
                label={t("account.language")}
                subtitle={t("account.languageSubtitle")}
                trailingValue={formatLanguagePreference(preference, locale, t)}
                onPress={() => pushRoute("language")}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "sparkles", fallbackName: "auto-awesome" }}
                label={t("account.restartTutorial")}
                subtitle={t("account.restartTutorialSubtitle")}
                onPress={onRestartMapOnboarding}
                showChevron={false}
                size="compact"
              />
            </AppleListGroup>
          </AppleListSection>

          <AppleListSection title={t("account.session")} size="compact">
            <AppleListGroup>
              <AppleListRow
                icon={{
                  iosName: "arrow.right.to.line",
                  fallbackName: "exit-to-app",
                }}
                label={t("account.signOut")}
                onPress={onSignOut}
                showChevron={false}
                size="compact"
              />
              <AppleListRow
                separator
                icon={{ iosName: "trash", fallbackName: "delete-outline" }}
                label={t("account.deleteAccount")}
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
                <Text style={styles.sceneLeadTitle}>{t("account.reputation")}</Text>
                <Text style={styles.sceneLeadSubtitle}>
                  {t("account.ratingsCount", { count: reputationSummary.ratingsCount })}
                </Text>
              </View>
              <AppleListSection subtitle={formatSyncLabel(lastAccountSyncAt)} size="compact">
                <AppleListGroup>
                  <AppleListRow
                    icon={{ iosName: "star.fill", fallbackName: "stars" }}
                    label={t("account.averageRating")}
                    trailingValue={formatAverageRating(reputationSummary.averageRating)}
                    showChevron={false}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "checkmark.circle.fill", fallbackName: "task-alt" }}
                    label={t("account.attendances")}
                    trailingValue={String(reputationSummary.attendedCount)}
                    showChevron={false}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "xmark.circle.fill", fallbackName: "highlight-off" }}
                    label={t("account.noShow")}
                    trailingValue={String(reputationSummary.noShowCount)}
                    showChevron={false}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "dice.fill", fallbackName: "casino" }}
                    label={t("account.gamesCreated")}
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

      if (routeKey === "language") {
        return {
          key: routeKey,
          content: (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sceneContent}>
              <View style={styles.sceneLead}>
                <Text style={styles.sceneLeadTitle}>{t("account.language")}</Text>
                <Text style={styles.sceneLeadSubtitle}>
                  {t("account.languageSystemDescription")}
                </Text>
              </View>
              <AppleListSection size="compact">
                <AppleListGroup>
                  <AppleListRow
                    icon={{ iosName: "iphone", fallbackName: "smartphone" }}
                    label={t("account.languageSystem")}
                    trailingValue={preference === "system" ? "✓" : null}
                    showChevron={false}
                    onPress={() => setLanguagePreference("system")}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "textformat", fallbackName: "translate" }}
                    label={t("account.languagePortuguese")}
                    trailingValue={preference === "pt-BR" ? "✓" : null}
                    showChevron={false}
                    onPress={() => setLanguagePreference("pt-BR")}
                    size="compact"
                  />
                  <AppleListRow
                    separator
                    icon={{ iosName: "textformat", fallbackName: "translate" }}
                    label={t("account.languageEnglish")}
                    trailingValue={preference === "en-US" ? "✓" : null}
                    showChevron={false}
                    onPress={() => setLanguagePreference("en-US")}
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

function formatLanguagePreference(
  preference: LanguagePreference,
  locale: SupportedLocale,
  t: (key: "common.systemDefault" | "common.portuguese" | "common.english") => string
) {
  const languageName = locale === "pt-BR" ? t("common.portuguese") : t("common.english");

  if (preference === "system") {
    return `${t("common.systemDefault")} · ${languageName}`;
  }

  return languageName;
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
