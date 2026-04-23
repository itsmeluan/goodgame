import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { Provider } from "@supabase/supabase-js";

import { translate } from "@/i18n";
import { consumeAuthRedirectUrl, getAuthRedirectUri } from "@/lib/authRedirect";
import { supabase } from "@/lib/supabase";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

export async function signInWithOAuthProvider(provider: Extract<Provider, "apple" | "google">) {
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "consent",
            }
          : undefined,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error(translate("auth.socialStartError"));
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (authResult.type === "cancel" || authResult.type === "dismiss") {
    return { cancelled: true };
  }

  if (authResult.type !== "success" || !authResult.url) {
    throw new Error(translate("auth.socialInterrupted"));
  }

  const handled = await consumeAuthRedirectUrl(authResult.url);

  if (!handled) {
    throw new Error(translate("auth.socialCompleteError"));
  }

  return { cancelled: false };
}
