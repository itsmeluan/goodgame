import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { PasswordRecoveryScreen } from "@/features/auth/PasswordRecoveryScreen";
import { LegalAgreementScreen } from "@/features/legal/LegalAgreementScreen";
import { MapHomeScreen } from "@/features/map/MapHomeScreen";
import { ProfileSetupScreen } from "@/features/profile/ProfileSetupScreen";
import {
  clearPendingPasswordRecoveryState,
  consumeAuthRedirectUrl,
  getPendingPasswordRecoveryState,
} from "@/lib/authRedirect";
import {
  analyticsFlush,
  analyticsIdentify,
  analyticsReset,
  analyticsScreen,
  initializeAnalytics,
} from "@/lib/analytics";
import {
  ensureMyProfileExists,
  getCatalogGames,
  getCatalogFormats,
  getCurrentLegalDocuments,
  getMyProfile,
  heartbeatPresence,
  registerPushDevice,
  signOut,
} from "@/lib/api";
import { appInfo } from "@/lib/appInfo";
import { clearMonitoringUser, setMonitoringUser } from "@/lib/monitoring";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { palette, spacing } from "@/theme/tokens";
import type { CatalogFormat, CatalogGame, LegalDocument, PlayerProfile } from "@/types/domain";

export function AppShell() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [formats, setFormats] = useState<CatalogFormat[]>([]);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const lastHandledAuthUrlRef = useRef<string | null>(null);

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session ?? null);
      setBooting(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => {
        setSession(nextSession ?? null);
      });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const handleAuthRedirect = async (url: string | null) => {
      if (!active || !url || lastHandledAuthUrlRef.current === url) {
        return;
      }

      try {
        const handled = await consumeAuthRedirectUrl(url);

        if (handled) {
          lastHandledAuthUrlRef.current = url;
          setPasswordRecoveryPending(await getPendingPasswordRecoveryState());
        }
      } catch (authRedirectError) {
        if (__DEV__) {
          console.warn("[auth-redirect]", authRedirectError);
        }
      }
    };

    void Linking.getInitialURL()
      .then((url) => handleAuthRedirect(url))
      .catch(() => {});

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthRedirect(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (session && profile) {
      setMonitoringUser({
        id: profile.userId,
        handle: profile.handle,
        username: profile.displayName,
      });
      analyticsIdentify({
        userId: profile.userId,
        handle: profile.handle,
        displayName: profile.displayName,
        neighborhood: profile.neighborhood,
        canHost: profile.canHost,
      });
      return;
    }

    clearMonitoringUser();
    analyticsReset();
  }, [profile, session]);

  const loadProfileBundle = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingProfile(true);
    }

    try {
      if (session) {
        await ensureMyProfileExists();
      }

      const [nextProfile, nextGames, nextFormats, nextLegalDocuments] = await Promise.all([
        getMyProfile(),
        getCatalogGames(),
        getCatalogFormats(),
        getCurrentLegalDocuments(),
      ]);

      setProfile(nextProfile);
      setGames(nextGames);
      setFormats(nextFormats);
      setLegalDocuments(nextLegalDocuments);
    } finally {
      if (!options?.silent) {
        setLoadingProfile(false);
      }
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setPasswordRecoveryPending(false);
      setProfile(null);
      setGames([]);
      setFormats([]);
      setLegalDocuments([]);
      setEditingProfile(false);
      return;
    }

    void loadProfileBundle();
  }, [loadProfileBundle, session]);

  useEffect(() => {
    let active = true;

    if (!session) {
      setPasswordRecoveryPending(false);
      return () => {
        active = false;
      };
    }

    void getPendingPasswordRecoveryState().then((pending) => {
      if (active) {
        setPasswordRecoveryPending(pending);
      }
    });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    const nextScreen = booting || loadingProfile
      ? "app_loading"
      : !session
        ? "auth"
        : legalDocuments.some((document) => document.acceptedAt === null)
          ? "legal_agreements"
          : editingProfile || isProfileIncomplete(profile)
            ? "profile_setup"
            : "map_home";

    analyticsScreen(nextScreen);
  }, [booting, editingProfile, legalDocuments, loadingProfile, profile, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void heartbeatPresence().catch(() => {});

    const intervalId = setInterval(() => {
      void heartbeatPresence().catch(() => {});
    }, 45000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

  useEffect(() => {
    const hasAcceptedAllCurrentDocuments =
      legalDocuments.length > 0 && legalDocuments.every((document) => document.acceptedAt !== null);

    if (!session || !hasAcceptedAllCurrentDocuments) {
      return;
    }

    let cancelled = false;

    void registerForPushNotificationsAsync()
      .then(async (registration) => {
        if (
          cancelled ||
          !registration.token ||
          registration.permissionStatus !== "granted"
        ) {
          return;
        }

        await registerPushDevice({
          expoPushToken: registration.token,
          platform: "mobile",
          appVersion: appInfo.version,
          permissionStatus: registration.permissionStatus,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [legalDocuments, session]);

  useEffect(() => {
    return () => {
      void analyticsFlush();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppErrorBoundary>
        {booting || loadingProfile ? (
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={palette.ember} />
              <Text style={styles.loadingText}>Conectando sua sessão e preparando o app...</Text>
            </View>
          </SafeAreaView>
        ) : !session ? (
          <AuthScreen />
        ) : passwordRecoveryPending ? (
          <PasswordRecoveryScreen
            onCompleted={async () => {
              await clearPendingPasswordRecoveryState();
              setPasswordRecoveryPending(false);
              await loadProfileBundle({ silent: true });
            }}
            onCancel={async () => {
              await clearPendingPasswordRecoveryState();
              setPasswordRecoveryPending(false);
              await signOut();
            }}
          />
        ) : legalDocuments.some((document) => document.acceptedAt === null) ? (
          <LegalAgreementScreen
            documents={legalDocuments}
            onAccepted={loadProfileBundle}
            onSignOut={signOut}
          />
        ) : editingProfile || isProfileIncomplete(profile) ? (
          <ProfileSetupScreen
            profile={profile}
            games={games}
            formats={formats}
            canCancel={editingProfile}
            onCancel={
              editingProfile
                ? () => {
                    setEditingProfile(false);
                  }
                : undefined
            }
            onSaved={async () => {
              await loadProfileBundle({ silent: true });
              setEditingProfile(false);
            }}
          />
        ) : profile ? (
          <MapHomeScreen
            profile={profile}
            onProfileEdit={() => {
              setEditingProfile(true);
            }}
          />
        ) : null}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

function isProfileIncomplete(profile: PlayerProfile | null) {
  return !profile;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.loadingScreen,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingText: {
    color: palette.mist,
    fontSize: 15,
    textAlign: "center",
  },
});
