import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { Provider } from "@supabase/supabase-js";

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
    throw new Error("Não foi possível iniciar o login social agora.");
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (authResult.type === "cancel" || authResult.type === "dismiss") {
    return { cancelled: true };
  }

  if (authResult.type !== "success" || !authResult.url) {
    throw new Error("O login social foi interrompido antes da conclusão.");
  }

  const handled = await consumeAuthRedirectUrl(authResult.url);

  if (!handled) {
    throw new Error("Não foi possível concluir o login social.");
  }

  return { cancelled: false };
}
