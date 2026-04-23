import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import { translate, useTranslation } from "@/i18n";
import { updateMyPassword } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type PasswordRecoveryScreenProps = {
  onCompleted: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
};

export function PasswordRecoveryScreen({
  onCompleted,
  onCancel,
}: PasswordRecoveryScreenProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password.length >= 6 && password === confirmPassword;

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);
      await updateMyPassword(password);
      await onCompleted();
    } catch (updateError) {
      setError(toMessage(updateError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.flex}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardOffset={120}
        >
          <View style={styles.backgroundGlowOne} />
          <View style={styles.backgroundGlowTwo} />
          <View style={styles.backgroundGrid} />

          <View style={styles.hero}>
            <GoodGameLogo size="md" monochrome />
            <Text style={styles.title}>{t("auth.passwordRecoveryTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.passwordRecoverySubtitle")}</Text>
          </View>

          <GlassCard style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderCopy}>
                <Text style={styles.sectionTitle}>{t("auth.passwordRecoverySectionTitle")}</Text>
                <Text style={styles.formSubtitle}>{t("auth.passwordRecoveryFormSubtitle")}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("auth.passwordRecoveryCancel")}
                onPress={() => {
                  triggerHaptic("selection");
                  void onCancel();
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
              label={t("auth.passwordRecoveryNewLabel")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              autoCapitalize="none"
              secureTextEntry
            />
            <TextField
              label={t("auth.passwordRecoveryConfirmLabel")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("auth.passwordRecoveryConfirmPlaceholder")}
              autoCapitalize="none"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.formActions}>
              <PrimaryButton
                label={t("auth.passwordRecoverySave")}
                onPress={() => void handleSubmit()}
                disabled={!passwordsMatch}
                loading={loading}
              />
              <PrimaryButton
                label={t("auth.backToLogin")}
                onPress={() => void onCancel()}
                tone="ghost"
              />
            </View>
          </GlassCard>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return translate("auth.passwordRecoveryError");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sheetBaseChrome,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    justifyContent: "center",
  },
  backgroundGlowOne: {
    position: "absolute",
    top: -20,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(241,143,92,0.12)",
  },
  backgroundGlowTwo: {
    position: "absolute",
    bottom: 30,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(54,54,54,0.18)",
  },
  backgroundGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.lg,
    transform: [{ rotate: "-3deg" }],
  },
  hero: {
    gap: spacing.md,
    alignItems: "center",
    paddingTop: spacing.xl,
  },
  title: {
    color: palette.sand,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 420,
  },
  formCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.md,
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
  formActions: {
    gap: spacing.sm,
  },
  error: {
    color: palette.ember,
    fontSize: 13,
    lineHeight: 19,
  },
});
