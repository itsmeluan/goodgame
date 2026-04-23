import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Linking, LogBox, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { LiveLocationProvider } from "@/features/app/LiveLocationContext";
import { appInfo } from "@/lib/appInfo";
import { clearMonitoringUser, setMonitoringUser } from "@/lib/monitoring";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/productAnalytics";
import { I18nProvider, useTranslation } from "@/i18n";
import {
  clearPendingAppNewsMapOverlayAfterSignIn,
  requestAppNewsMapOverlayAfterSignIn,
} from "@/lib/appNewsOverlayAfterSignIn";
import { supabase } from "@/lib/supabase";
import { palette, spacing } from "@/theme/tokens";
import type { CatalogFormat, CatalogGame, LegalDocument, PlayerProfile } from "@/types/domain";

// VirtualizedListBoundary uses a React Native internal API to reset VirtualizedList context.
// This is intentional — RN uses the same mechanism inside Modal. Suppress the deprecation noise.
LogBox.ignoreLogs(["Deep imports from the 'react-native' package are deprecated"]);

export function AppShell() {
  return (
    <I18nProvider>
      <AppShellContent />
    </I18nProvider>
  );
}

function AppShellContent() {
  const { t } = useTranslation();
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
  const trackedSessionUserRef = useRef<string | null>(null);

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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_IN") {
        requestAppNewsMapOverlayAfterSignIn();
      }
      if (event === "SIGNED_OUT") {
        clearPendingAppNewsMapOverlayAfterSignIn();
      }
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

  useEffect(() => {
    const hasAcceptedAllCurrentDocuments =
      legalDocuments.length > 0 && legalDocuments.every((document) => document.acceptedAt !== null);

    if (!session || !profile || !hasAcceptedAllCurrentDocuments) {
      return;
    }

    const sessionKey = `${session.user.id}:${session.access_token}`;
    if (trackedSessionUserRef.current === sessionKey) {
      return;
    }

    trackedSessionUserRef.current = sessionKey;

    void trackProductEvent({
      eventName: "app_opened",
      eventCategory: "lifecycle",
      screenName: "app_shell",
      region: profile.neighborhood || null,
      acquisitionSource: session.user.app_metadata?.provider
        ? String(session.user.app_metadata.provider)
        : null,
      context: {
        legal_documents_ready: true,
      },
    });

    void trackProductEvent({
      eventName: "first_app_open",
      eventCategory: "lifecycle",
      oncePerUser: true,
      screenName: "app_shell",
      region: profile.neighborhood || null,
      acquisitionSource: session.user.app_metadata?.provider
        ? String(session.user.app_metadata.provider)
        : null,
      context: {
        legal_documents_ready: true,
      },
    });
  }, [legalDocuments, profile, session]);

  const loadProfileBundle = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingProfile(true);
    }

    try {
      if (session) {
        await ensureMyProfileExists();
      }

      const [profileResult, gamesResult, formatsResult, legalResult] = await Promise.allSettled([
        getMyProfile(),
        getCatalogGames(),
        getCatalogFormats(),
        getCurrentLegalDocuments(),
      ]);

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      }

      if (gamesResult.status === "fulfilled") {
        setGames(gamesResult.value);
      } else if (__DEV__) {
        console.warn("[loadProfileBundle] getCatalogGames failed", gamesResult.reason);
      }

      if (formatsResult.status === "fulfilled") {
        setFormats(formatsResult.value);
      } else if (__DEV__) {
        console.warn("[loadProfileBundle] getCatalogFormats failed", formatsResult.reason);
      }

      if (legalResult.status === "fulfilled") {
        setLegalDocuments(legalResult.value);
      }
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

  const refreshProfileSilent = useCallback(() => loadProfileBundle({ silent: true }), [loadProfileBundle]);

  /** Só `getMyProfile` — evita re-baixar catálogo/legal a cada sync de GPS (Supabase free). */
  const refreshMyProfileOnly = useCallback(async () => {
    try {
      const next = await getMyProfile();
      if (next) {
        setProfile(next);
      }
    } catch {
      // silencioso: coordenada já foi gravada no servidor
    }
  }, []);

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
              <LoadingSpinner size={42} />
              <Text style={styles.loadingText}>{t("app.loading")}</Text>
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
            accountEmail={session?.user?.email ?? null}
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
            onSaved={async (profileAfterSave) => {
              if (profileAfterSave) {
                setProfile(profileAfterSave);
              }
              await loadProfileBundle({ silent: true });
              setEditingProfile(false);
            }}
          />
        ) : profile ? (
          <LiveLocationProvider enabled onApproximateLocationPersisted={refreshMyProfileOnly}>
            <MapHomeScreen
              profile={profile}
              onProfileEdit={() => {
                setEditingProfile(true);
              }}
              onProfileRefresh={refreshProfileSilent}
            />
          </LiveLocationProvider>
        ) : null}
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

/** Só força a configuração inicial quando ainda não existe linha de perfil. Contas antigas vão direto ao mapa. */
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
