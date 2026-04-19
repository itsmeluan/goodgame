import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { PublicPlayerProfileScreen } from "@/features/profile/PublicPlayerProfileScreen";
import { getPublicPlayerProfile } from "@/lib/api";
import type { PlayerProfile, PublicPlayerProfile } from "@/types/domain";

type AccountOwnPublicProfileSceneProps = {
  profile: PlayerProfile;
  onEditProfile: () => void;
};

/**
 * Mesma UI que `PublicPlayerProfileScreen` para terceiros, com dados de `player_public_profile`.
 * Sem bloco de segurança/amigos; só o CTA de edição no fim.
 */
export function AccountOwnPublicProfileScene({ profile, onEditProfile }: AccountOwnPublicProfileSceneProps) {
  const [publicProfile, setPublicProfile] = useState<PublicPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncKey = useMemo(
    () =>
      JSON.stringify({
        avatarPath: profile.avatarPath,
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        neighborhood: profile.neighborhood,
        canHost: profile.canHost,
        gameIds: profile.gameIds,
        formatIds: profile.formatIds,
        availability: profile.availability,
      }),
    [profile]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void getPublicPlayerProfile(profile.userId)
      .then((next) => {
        if (!cancelled) {
          setPublicProfile(next);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(
            fetchError && typeof fetchError === "object" && "message" in fetchError
              ? String((fetchError as { message?: string }).message)
              : "Não foi possível carregar o perfil público."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile.userId, syncKey]);

  return (
    <View style={styles.flex}>
      <PublicPlayerProfileScreen
        profile={publicProfile}
        loading={loading}
        error={error}
        actions={
          publicProfile ? (
            <View style={styles.actions}>
              <PrimaryButton label="Editar perfil e foto" onPress={onEditProfile} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  actions: {
    gap: 10,
  },
});
