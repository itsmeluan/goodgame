import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { GoodGameLogo } from "@/components/GoodGameLogo";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { LegalDocumentModal } from "@/features/legal/LegalDocumentModal";
import { legalContent } from "@/features/legal/legalContent";
import { sendPasswordResetEmail, signInWithPassword, signUpWithPassword } from "@/lib/api";
import { env } from "@/lib/env";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { LegalDocumentKind } from "@/types/domain";

type AuthMode = "chooser" | "sign-in" | "sign-up" | "forgot-password";

export function AuthScreen() {
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<AuthMode>("chooser");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [selectedDocumentKind, setSelectedDocumentKind] = useState<LegalDocumentKind | null>(
    null
  );
  const [loadingAction, setLoadingAction] = useState<
    "sign-in" | "sign-up" | "forgot-password" | "google" | "apple" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => (selectedDocumentKind ? legalContent[selectedDocumentKind] : null),
    [selectedDocumentKind]
  );

  async function handleSignIn() {
    try {
      setLoadingAction("sign-in");
      setError(null);
      setMessage(null);
      await signInWithPassword(email.trim(), password);
    } catch (authError) {
      setError(toMessage(authError));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSignUp() {
    try {
      setLoadingAction("sign-up");
      setError(null);
      setMessage(null);
      const result = await signUpWithPassword(email.trim(), password);

      if (!result.session) {
        setMessage(
          "Conta criada. Se o projeto exigir confirmação de e-mail, confirme sua caixa de entrada e depois entre."
        );
      }
    } catch (authError) {
      setError(toMessage(authError));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSocialAuth(provider: "google" | "apple") {
    try {
      setLoadingAction(provider);
      setError(null);
      setMessage(null);
      const { signInWithOAuthProvider } = await import("@/lib/socialAuth");
      await signInWithOAuthProvider(provider);
    } catch (socialError) {
      setError(toMessage(socialError));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleForgotPassword() {
    try {
      setLoadingAction("forgot-password");
      setError(null);
      setMessage(null);
      await sendPasswordResetEmail(email.trim());
      setMessage(
        "Se existir uma conta com esse e-mail, enviamos um link para redefinir sua senha."
      );
    } catch (authError) {
      setError(toMessage(authError));
    } finally {
      setLoadingAction(null);
    }
  }

  const emailReady = email.includes("@");
  const emailAndPasswordReady = emailReady && password.length >= 6;
  const isChooserMode = mode === "chooser";
  const compactAuthLayout = !isChooserMode || height < 780;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundCanvas}>
        <View style={styles.backgroundGlowOne} />
        <View style={styles.backgroundGlowTwo} />
        <View style={styles.backgroundGlowThree} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.flex}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            compactAuthLayout ? styles.scrollContentCompact : null,
            isChooserMode ? styles.scrollContentChooser : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardOffset={120}
        >
          <View style={styles.backgroundGrid} />

          {isChooserMode ? (
            <View style={styles.heroChooserRegion}>
              <View
                style={[
                  styles.hero,
                  compactAuthLayout ? styles.heroCompact : null,
                  styles.heroChooser,
                ]}
              >
                <GoodGameLogo size={compactAuthLayout ? "md" : "lg"} monochrome />
                <Text
                  style={[styles.title, compactAuthLayout ? styles.titleCompact : null, styles.titleOneLine]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.55}
                >
                  Sua próxima jogada começa aqui
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.hero, compactAuthLayout ? styles.heroCompact : null]}>
              <GoodGameLogo size={compactAuthLayout ? "md" : "lg"} monochrome />
              <Text
                style={[styles.title, compactAuthLayout ? styles.titleCompact : null, styles.titleOneLine]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                Sua próxima jogada começa aqui
              </Text>
            </View>
          )}

          {isChooserMode ? (
            <View style={styles.chooserBottom}>
              <View style={styles.entryStack}>
                {env.socialAuthEnabled ? (
                  <>
                    <EntryButton
                      icon="language"
                      label="Continuar com Google"
                      onPress={() => void handleSocialAuth("google")}
                      loading={loadingAction === "google"}
                    />
                    <EntryButton
                      icon="apple"
                      label="Continuar com Apple"
                      onPress={() => void handleSocialAuth("apple")}
                      loading={loadingAction === "apple"}
                      dark
                    />
                  </>
                ) : null}
                <EntryButton
                  icon="mail-outline"
                  label="Entrar com e-mail"
                  accent
                  onPress={() => {
                    setError(null);
                    setMessage(null);
                    setMode("sign-in");
                  }}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    triggerHaptic("selection");
                    setError(null);
                    setMessage(null);
                    setMode("sign-up");
                  }}
                  style={({ pressed }) => [
                    styles.createAccountButton,
                    pressed ? styles.createAccountButtonPressed : null,
                  ]}
                >
                  <Text style={styles.createAccountLabel}>Criar conta</Text>
                </Pressable>
              </View>
              <Text style={styles.footerText}>
                Localização aproximada, grupos, avisos, amizades e reputação foram pensados
                para encontros presenciais ficarem mais seguros.
              </Text>
            </View>
          ) : (
            <GlassCard
              style={[
                styles.formCard,
                compactAuthLayout ? styles.formCardCompact : null,
                styles.formCardBelowHero,
              ]}
            >
              <View style={styles.formHeader}>
                <View style={styles.formHeaderCopy}>
                  <Text style={styles.sectionTitle}>
                    {mode === "sign-in"
                      ? "Entrar com e-mail"
                      : mode === "sign-up"
                        ? "Criar conta com e-mail"
                        : "Recuperar acesso"}
                  </Text>
                  {mode === "forgot-password" ? (
                    <Text style={styles.formSubtitle}>
                      Digite seu e-mail e enviaremos um link para redefinir sua senha no app.
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar formulário de e-mail"
                  onPress={() => {
                    triggerHaptic("selection");
                    setMode("chooser");
                  }}
                  style={styles.inlineCloseButton}
                >
                  <AppleGlassSurface
                    pointerEvents="none"
                    variant="dark"
                    intensity="clear"
                    style={styles.inlineCloseButtonSurface}
                  />
                  <AppIcon iosName="xmark" fallbackName="close" size={16} color={palette.sand} />
                </Pressable>
              </View>

              <TextField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {mode !== "forgot-password" ? (
                <TextField
                  label="Senha"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo de 6 caracteres"
                  autoCapitalize="none"
                  secureTextEntry
                />
              ) : null}

              {mode === "sign-in" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setError(null);
                    setMessage(null);
                    setPassword("");
                    setMode("forgot-password");
                  }}
                  style={({ pressed }) => [
                    styles.inlineAction,
                    pressed ? styles.inlineActionPressed : null,
                  ]}
                >
                  <Text style={styles.inlineActionLabel}>Esqueci minha senha</Text>
                </Pressable>
              ) : null}

              {mode === "sign-up" ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedLegal }}
                  onPress={() => setAcceptedLegal((current) => !current)}
                  style={({ pressed }) => [
                    styles.legalRow,
                    pressed ? styles.legalRowPressed : null,
                  ]}
                >
                  <View style={[styles.checkbox, acceptedLegal ? styles.checkboxChecked : null]}>
                    {!acceptedLegal ? (
                      <AppleGlassSurface
                        pointerEvents="none"
                        variant="dark"
                        intensity="clear"
                        style={styles.checkboxSurface}
                      />
                    ) : null}
                    {acceptedLegal ? <View style={styles.checkboxDot} /> : null}
                  </View>
                  <Text style={styles.legalText}>
                    Li e aceito os{" "}
                    <Text
                      style={styles.linkText}
                      onPress={() => setSelectedDocumentKind("terms_of_service")}
                    >
                      Termos de Uso
                    </Text>{" "}
                    e a{" "}
                    <Text
                      style={styles.linkText}
                      onPress={() => setSelectedDocumentKind("privacy_policy")}
                    >
                      Política de Privacidade
                    </Text>
                    .
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.footnote}>
                  Ao continuar, você concorda com os{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => setSelectedDocumentKind("terms_of_service")}
                  >
                    Termos de Uso
                  </Text>{" "}
                  e a{" "}
                  <Text
                    style={styles.linkText}
                    onPress={() => setSelectedDocumentKind("privacy_policy")}
                  >
                    Política de Privacidade
                  </Text>
                  .
                </Text>
              )}

              {message ? <Text style={styles.message}>{message}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.formActions}>
                <PrimaryButton
                  label={
                    mode === "sign-in"
                      ? "Entrar"
                      : mode === "sign-up"
                        ? "Criar conta"
                        : "Enviar link"
                  }
                  onPress={() =>
                    void (
                      mode === "sign-in"
                        ? handleSignIn()
                        : mode === "sign-up"
                          ? handleSignUp()
                          : handleForgotPassword()
                    )
                  }
                  disabled={
                    mode === "forgot-password"
                      ? !emailReady
                      : !emailAndPasswordReady || (mode === "sign-up" && !acceptedLegal)
                  }
                  loading={loadingAction === mode}
                />
                <PrimaryButton
                  label={
                    mode === "sign-in"
                      ? "Criar conta"
                      : mode === "sign-up"
                        ? "Já tenho conta"
                        : "Voltar ao login"
                  }
                  onPress={() =>
                    setMode(
                      mode === "sign-in"
                        ? "sign-up"
                        : mode === "sign-up"
                          ? "sign-in"
                          : "sign-in"
                    )
                  }
                  tone="ghost"
                />
              </View>
            </GlassCard>
          )}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      <LegalDocumentModal document={selectedDocument} onClose={() => setSelectedDocumentKind(null)} />
    </SafeAreaView>
  );
}

type EntryButtonProps = {
  icon: "language" | "apple" | "mail-outline";
  label: string;
  onPress: () => void;
  loading?: boolean;
  dark?: boolean;
  accent?: boolean;
};

function EntryButton({
  icon,
  label,
  onPress,
  loading = false,
  dark = false,
  accent = false,
}: EntryButtonProps) {
  const iconConfig =
    icon === "language"
      ? { iosName: "globe" as const, fallbackName: "language" as const }
      : icon === "apple"
        ? { iosName: "apple.logo" as const, fallbackName: "apple" as const }
        : { iosName: "envelope.fill" as const, fallbackName: "mail-outline" as const };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={() => {
        triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.entryButton,
        dark ? styles.entryButtonDark : null,
        accent ? styles.entryButtonAccent : null,
        loading ? styles.entryButtonLoading : null,
        pressed ? styles.entryButtonPressed : null,
      ]}
    >
      <AppIcon
        iosName={iconConfig.iosName}
        fallbackName={iconConfig.fallbackName}
        size={22}
        color={dark ? "#F8F8F8" : palette.ink}
      />
      <Text
        style={[
          styles.entryButtonLabel,
          dark ? styles.entryButtonLabelDark : null,
          accent ? styles.entryButtonLabelAccent : null,
        ]}
      >
        {loading ? "Abrindo..." : label}
      </Text>
    </Pressable>
  );
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível autenticar agora.";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sheetBaseChrome,
  },
  flex: {
    flex: 1,
  },
  backgroundCanvas: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    justifyContent: "center",
  },
  scrollContentCompact: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    justifyContent: "flex-start",
  },
  /** Chooser: hero vertically centered above bottom actions; buttons stay low. */
  scrollContentChooser: {
    justifyContent: "flex-start",
    paddingBottom: spacing.md,
    gap: 0,
  },
  heroChooserRegion: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    minHeight: 0,
    width: "100%",
  },
  heroChooser: {
    paddingTop: 0,
  },
  chooserBottom: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  backgroundGlowOne: {
    position: "absolute",
    top: -34,
    right: -76,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(241,143,92,0.2)",
  },
  backgroundGlowTwo: {
    position: "absolute",
    bottom: -24,
    left: -98,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(34,58,46,0.24)",
  },
  backgroundGlowThree: {
    position: "absolute",
    top: "36%",
    left: "58%",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(15,34,48,0.22)",
  },
  backgroundGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.11,
    borderWidth: 1,
    borderColor: "rgba(233,226,215,0.16)",
    borderRadius: radius.lg,
    transform: [{ rotate: "-3deg" }],
  },
  hero: {
    gap: spacing.md,
    alignItems: "center",
    paddingTop: spacing.xl,
  },
  heroCompact: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  title: {
    color: palette.sand,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  titleOneLine: {
    alignSelf: "stretch",
    width: "100%",
  },
  entryStack: {
    gap: spacing.sm,
  },
  entryButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "#F6F1E7",
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(17,26,23,0.08)",
  },
  entryButtonDark: {
    backgroundColor: "rgba(18,22,28,0.82)",
    borderColor: "rgba(231,216,188,0.12)",
  },
  entryButtonAccent: {
    backgroundColor: palette.ember,
    borderColor: "rgba(17,17,17,0.12)",
  },
  entryButtonLoading: {
    opacity: 0.85,
  },
  entryButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  entryButtonLabel: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  entryButtonLabelDark: {
    color: "#F8F8F8",
  },
  entryButtonLabelAccent: {
    color: palette.ink,
  },
  createAccountButton: {
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.38)",
  },
  createAccountButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  createAccountLabel: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "800",
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  /** Extra space under headline; keeps hero (logo + title) position, pushes form card down. */
  formCardBelowHero: {
    marginTop: spacing.xl,
  },
  formCardCompact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  formHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 20,
    fontWeight: "800",
  },
  formSubtitle: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
  },
  inlineCloseButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 17,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  legalRowPressed: {
    opacity: 0.85,
  },
  checkbox: {
    marginTop: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  checkboxChecked: {
    backgroundColor: palette.ember,
    borderColor: palette.ember,
  },
  checkboxSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.ink,
  },
  legalText: {
    flex: 1,
    color: palette.mist,
    fontSize: 13,
    lineHeight: 20,
  },
  footnote: {
    color: palette.mist,
    fontSize: 13,
    lineHeight: 20,
  },
  linkText: {
    color: palette.ember,
    fontWeight: "800",
  },
  inlineAction: {
    alignSelf: "flex-start",
    marginTop: -2,
    paddingVertical: 2,
  },
  inlineActionPressed: {
    opacity: 0.72,
  },
  inlineActionLabel: {
    color: palette.ember,
    fontSize: 13,
    fontWeight: "800",
  },
  formActions: {
    gap: spacing.sm,
  },
  message: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: palette.ember,
    fontSize: 13,
    lineHeight: 19,
  },
  footerText: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
