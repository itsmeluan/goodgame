import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as ExpoLinking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";

import { supabase } from "@/lib/supabase";

const PASSWORD_RECOVERY_PENDING_KEY = "goodgame:auth:password-recovery-pending";

function getSingleQueryParam(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

function normalizeAuthErrorDescription(value: string) {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

async function setPendingPasswordRecoveryState(isPending: boolean) {
  if (isPending) {
    await AsyncStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, "1");
    return;
  }

  await AsyncStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
}

export async function getPendingPasswordRecoveryState() {
  return (await AsyncStorage.getItem(PASSWORD_RECOVERY_PENDING_KEY)) === "1";
}

export async function clearPendingPasswordRecoveryState() {
  await setPendingPasswordRecoveryState(false);
}

export function getAuthScheme() {
  return Application.applicationId?.endsWith(".test") ? "goodgameteste" : "goodgame";
}

export function getAuthRedirectUri() {
  const scheme = getAuthScheme();

  return makeRedirectUri({
    native: `${scheme}://auth/callback`,
    scheme,
    path: "auth/callback",
  });
}

export function isAuthRedirectUrl(url: string) {
  return url.startsWith(`${getAuthScheme()}://auth/callback`);
}

export async function consumeAuthRedirectUrl(url: string) {
  if (!isAuthRedirectUrl(url)) {
    return false;
  }

  const normalizedUrl = url.replace("#", "?");
  const { queryParams } = ExpoLinking.parse(normalizedUrl);

  const errorCode = getSingleQueryParam(queryParams?.error_code);
  const errorDescription = getSingleQueryParam(queryParams?.error_description);

  if (errorCode || getSingleQueryParam(queryParams?.error)) {
    throw new Error(
      errorDescription
        ? normalizeAuthErrorDescription(errorDescription)
        : "Nao foi possivel concluir a autenticacao agora."
    );
  }

  const tokenHash = getSingleQueryParam(queryParams?.token_hash);
  const otpType = getSingleQueryParam(queryParams?.type);

  const syncPendingPasswordRecovery = async () => {
    if (otpType === "recovery") {
      await setPendingPasswordRecoveryState(true);
    }
  };

  const accessToken = getSingleQueryParam(queryParams?.access_token);
  const refreshToken = getSingleQueryParam(queryParams?.refresh_token);

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    await syncPendingPasswordRecovery();
    return true;
  }

  const code = getSingleQueryParam(queryParams?.code);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    await syncPendingPasswordRecovery();
    return true;
  }

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as "email" | "recovery" | "invite" | "email_change",
    });

    if (error) {
      throw error;
    }

    await syncPendingPasswordRecovery();
    return true;
  }

  return false;
}
