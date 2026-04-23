import { StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { PublicPlayerProfileScreen } from "@/features/profile/PublicPlayerProfileScreen";
import { useTranslation } from "@/i18n";
import type { FriendActionCandidate } from "@/features/map/friendTypes";
import { palette, spacing } from "@/theme/tokens";
import type { PublicPlayerProfile } from "@/types/domain";

type PlayerProfilePageProps = {
  profile: PublicPlayerProfile | null;
  loading: boolean;
  error: string | null;
  friendActionId: string | null;
  safetyActionId: string | null;
  incomingRequestFriendshipId: string | null;
  onSendFriendRequest: (candidate: FriendActionCandidate) => void;
  onRespondToFriendRequest: (
    friendshipId: string,
    accept: boolean,
    candidate: FriendActionCandidate
  ) => void;
  onRemoveFriend: (userId: string) => void;
  onReportUser: (profile: PublicPlayerProfile) => void;
  onBlockUser: (profile: PublicPlayerProfile) => void;
  onOpenPrivateChat?: () => void;
};

export function PlayerProfilePage({
  profile,
  loading,
  error,
  friendActionId,
  safetyActionId,
  incomingRequestFriendshipId,
  onSendFriendRequest,
  onRespondToFriendRequest,
  onRemoveFriend,
  onReportUser,
  onBlockUser,
  onOpenPrivateChat,
}: PlayerProfilePageProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <PublicPlayerProfileScreen
        profile={profile}
        loading={loading}
        error={error}
        onOpenPrivateChat={onOpenPrivateChat}
        actions={
          profile ? (
            <View style={styles.actions}>
              <GlassCard style={styles.safetyCard}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.safetyCardSurface}
                />
                <Text style={styles.safetyTitle}>{t("safety.title")}</Text>
                <Text style={styles.safetyBody}>{t("safety.body")}</Text>
                <View style={styles.dualActions}>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label={t("safety.report")}
                      onPress={() => onReportUser(profile)}
                      tone="dangerGhost"
                      size="compact"
                      loading={safetyActionId === `report:${profile.userId}`}
                    />
                  </View>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label={t("safety.block")}
                      onPress={() => onBlockUser(profile)}
                      tone="ghost"
                      size="compact"
                      loading={safetyActionId === `block:${profile.userId}`}
                    />
                  </View>
                </View>
              </GlassCard>

              {profile.relationshipState === "none" ? (
                <PrimaryButton
                  label={t("safety.sendFriendRequest")}
                  onPress={() =>
                    onSendFriendRequest({
                      userId: profile.userId,
                      displayName: profile.displayName,
                      handle: profile.handle,
                      neighborhood: profile.neighborhood,
                      bio: profile.bio,
                      avatarPath: profile.avatarPath,
                      avatarUrl: profile.avatarUrl,
                      isOnline: profile.isOnline,
                      lastSeenAt: profile.lastSeenAt,
                    })
                  }
                  loading={friendActionId === profile.userId}
                />
              ) : profile.relationshipState === "incoming" && incomingRequestFriendshipId ? (
                <View style={styles.dualActions}>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label={t("safety.reject")}
                      onPress={() =>
                        onRespondToFriendRequest(incomingRequestFriendshipId, false, {
                          userId: profile.userId,
                          displayName: profile.displayName,
                          handle: profile.handle,
                          neighborhood: profile.neighborhood,
                          bio: profile.bio,
                          avatarPath: profile.avatarPath,
                          avatarUrl: profile.avatarUrl,
                          isOnline: profile.isOnline,
                          lastSeenAt: profile.lastSeenAt,
                        })
                      }
                      tone="ghost"
                      loading={friendActionId === incomingRequestFriendshipId}
                    />
                  </View>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label={t("common.accept")}
                      onPress={() =>
                        onRespondToFriendRequest(incomingRequestFriendshipId, true, {
                          userId: profile.userId,
                          displayName: profile.displayName,
                          handle: profile.handle,
                          neighborhood: profile.neighborhood,
                          bio: profile.bio,
                          avatarPath: profile.avatarPath,
                          avatarUrl: profile.avatarUrl,
                          isOnline: profile.isOnline,
                          lastSeenAt: profile.lastSeenAt,
                        })
                      }
                      loading={friendActionId === incomingRequestFriendshipId}
                    />
                  </View>
                </View>
              ) : profile.relationshipState === "friend" ? (
                <PrimaryButton
                  label={t("safety.removeFriend")}
                  onPress={() => onRemoveFriend(profile.userId)}
                  tone="ghost"
                  loading={friendActionId === profile.userId}
                />
              ) : (
                <PrimaryButton
                  label={t("safety.cancelInvite")}
                  onPress={() => onRemoveFriend(profile.userId)}
                  tone="ghost"
                  loading={friendActionId === profile.userId}
                />
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
  dualActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rowActionCell: {
    flex: 1,
  },
  safetyCard: {
    overflow: "hidden",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(233,226,215,0.1)",
  },
  safetyCardSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  safetyTitle: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  safetyBody: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
});
