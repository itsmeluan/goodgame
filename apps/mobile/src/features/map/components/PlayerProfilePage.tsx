import { StyleSheet, Text, View } from "react-native";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { PublicPlayerProfileScreen } from "@/features/profile/PublicPlayerProfileScreen";
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
}: PlayerProfilePageProps) {
  return (
    <View style={styles.wrap}>
      <PublicPlayerProfileScreen
        profile={profile}
        loading={loading}
        error={error}
        actions={
          profile ? (
            <View style={styles.actions}>
              {profile.relationshipState === "none" ? (
                <PrimaryButton
                  label="Adicionar amigo"
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
                      label="Recusar"
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
                      label="Aceitar"
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
                  label="Remover amigo"
                  onPress={() => onRemoveFriend(profile.userId)}
                  tone="ghost"
                  loading={friendActionId === profile.userId}
                />
              ) : (
                <PrimaryButton
                  label="Cancelar convite"
                  onPress={() => onRemoveFriend(profile.userId)}
                  tone="ghost"
                  loading={friendActionId === profile.userId}
                />
              )}

              <GlassCard style={styles.safetyCard}>
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.safetyCardSurface}
                />
                <Text style={styles.safetyTitle}>Segurança</Text>
                <Text style={styles.safetyBody}>
                  Se algo te incomodou, você pode denunciar ou bloquear este jogador.
                </Text>
                <View style={styles.dualActions}>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label="Denunciar"
                      onPress={() => onReportUser(profile)}
                      tone="dangerGhost"
                      size="compact"
                      loading={safetyActionId === `report:${profile.userId}`}
                    />
                  </View>
                  <View style={styles.rowActionCell}>
                    <PrimaryButton
                      label="Bloquear"
                      onPress={() => onBlockUser(profile)}
                      tone="ghost"
                      size="compact"
                      loading={safetyActionId === `block:${profile.userId}`}
                    />
                  </View>
                </View>
              </GlassCard>
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
    gap: 10,
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
    gap: 10,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
  },
  safetyCardSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  safetyTitle: {
    color: palette.sand,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  safetyBody: {
    color: palette.mist,
    fontSize: 12,
    lineHeight: 17,
  },
});
