import type { PlayerProfile } from "@/types/domain";

/** Verifica se o perfil tem Pro ativo (considerando expiração no cliente como redundância). */
export function isUserPro(
  user:
    | Pick<PlayerProfile, "isPro" | "proExpiresAt">
    | { isPro?: boolean; proExpiresAt?: string | null }
    | null
    | undefined
) {
  if (!user?.isPro) {
    return false;
  }

  if (!user.proExpiresAt) {
    return true;
  }

  const expires = Date.parse(user.proExpiresAt);

  if (Number.isNaN(expires)) {
    return false;
  }

  return expires > Date.now();
}
