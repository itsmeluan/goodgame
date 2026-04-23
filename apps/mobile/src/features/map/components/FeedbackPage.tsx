import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TextField } from "@/components/TextField";
import { MapInlineNotice } from "@/features/map/components/MapFeedbackPrimitives";
import { appInfo } from "@/lib/appInfo";
import { submitAppFeedback } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { trackProductEvent } from "@/lib/productAnalytics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { AppFeedbackType } from "@/types/domain";

const FEEDBACK_TYPE_OPTIONS: { type: AppFeedbackType; label: string }[] = [
  { type: "bug", label: "Bug" },
  { type: "suggestion", label: "Sugestão" },
  { type: "praise", label: "Elogio" },
  { type: "question", label: "Dúvida" },
];

type FeedbackPageProps = {
  bottomInset: number;
  onClose: () => void;
};

export function FeedbackPage({ bottomInset, onClose }: FeedbackPageProps) {
  const [feedbackType, setFeedbackType] = useState<AppFeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [appArea, setAppArea] = useState("");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const typeLabel =
    feedbackType === null
      ? "Selecione o tipo"
      : FEEDBACK_TYPE_OPTIONS.find((o) => o.type === feedbackType)?.label ?? "";

  useEffect(() => {
    void trackProductEvent({
      eventName: "feedback_screen_viewed",
      eventCategory: "feedback",
      screenName: "feedback",
    });
  }, []);

  const handleCancel = useCallback(() => {
    triggerHaptic("selection");
    setValidationError(null);
    setSubmitError(null);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setValidationError(null);

    if (feedbackType === null) {
      setValidationError("Escolha o tipo de feedback.");
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setValidationError("Escreva sua mensagem.");
      return;
    }

    setSubmitting(true);
    try {
      await submitAppFeedback({
        feedbackType,
        message: trimmed,
        appArea: appArea.trim() || null,
        appVersion: appInfo.version,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : Platform.OS,
      });
      triggerHaptic("success");
      Alert.alert("Enviado", "Obrigado pelo seu feedback! Isso ajuda muito a melhorar o app.", [
        { text: "OK", onPress: onClose },
      ]);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Não foi possível enviar agora. Tente de novo em instantes.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [appArea, feedbackType, message, onClose]);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInset + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        <Text style={styles.intro}>
          Seu feedback é muito importante para evoluir o app. Se encontrou um problema, tem uma sugestão ou
          quer compartilhar uma ideia, envie por aqui.
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Tipo de feedback</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tipo de feedback"
            onPress={() => {
              triggerHaptic("selection");
              setTypeModalOpen(true);
            }}
            style={({ pressed }) => [styles.typeShell, pressed ? styles.typeShellPressed : null]}
          >
            <AppleGlassSurface pointerEvents="none" variant="dark" intensity="clear" style={styles.typeSurface} />
            <Text style={[styles.typeValue, feedbackType === null ? styles.typePlaceholder : null]}>
              {typeLabel}
            </Text>
            <AppIcon iosName="chevron.down" fallbackName="expand-more" size={18} color={palette.pine} />
          </Pressable>
        </View>

        <TextField
          label="Mensagem"
          labelTone="light"
          value={message}
          onChangeText={setMessage}
          placeholder="Escreva seu feedback aqui"
          multiline
          maxLength={8000}
        />

        <TextField
          label="Tela ou área do app (opcional)"
          labelTone="light"
          value={appArea}
          onChangeText={setAppArea}
          placeholder="Ex.: mapa, lista de jogos, perfil, criação de partida"
          autoCapitalize="sentences"
        />

        {validationError ? <MapInlineNotice tone="error" message={validationError} /> : null}
        {submitError ? <MapInlineNotice tone="error" message={submitError} /> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar feedback"
          disabled={submitting}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !submitting ? styles.primaryButtonPressed : null,
            submitting ? styles.primaryButtonDisabled : null,
          ]}
        >
          {submitting ? (
            <LoadingSpinner size={20} color={palette.parchment} />
          ) : (
            <Text style={styles.primaryButtonLabel}>Enviar</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          disabled={submitting}
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !submitting ? styles.secondaryButtonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <Modal
        visible={typeModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTypeModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTypeModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Tipo de feedback</Text>
            {FEEDBACK_TYPE_OPTIONS.map((opt, index) => (
              <Pressable
                key={opt.type}
                onPress={() => {
                  triggerHaptic("selection");
                  setFeedbackType(opt.type);
                  setTypeModalOpen(false);
                }}
                style={({ pressed }) => [
                  styles.modalRow,
                  index > 0 ? styles.modalRowBorder : null,
                  pressed ? styles.modalRowPressed : null,
                  feedbackType === opt.type ? styles.modalRowSelected : null,
                ]}
              >
                <Text style={styles.modalRowLabel}>{opt.label}</Text>
                {feedbackType === opt.type ? (
                  <AppIcon
                    iosName="checkmark.circle.fill"
                    fallbackName="check-circle"
                    size={20}
                    color={palette.ember}
                  />
                ) : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() => setTypeModalOpen(false)}
              style={({ pressed }) => [styles.modalDismiss, pressed ? styles.modalDismissPressed : null]}
            >
              <Text style={styles.modalDismissLabel}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  intro: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  fieldBlock: {
    gap: 7,
  },
  label: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  typeShell: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    backgroundColor: "rgba(255,255,255,0.015)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  typeShellPressed: {
    opacity: 0.92,
  },
  typeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  typeValue: {
    flex: 1,
    color: palette.sand,
    fontSize: 16,
    paddingVertical: 12,
  },
  typePlaceholder: {
    color: palette.pine,
  },
  primaryButton: {
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: palette.ember,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonLabel: {
    color: palette.parchment,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonLabel: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.pageChrome,
    paddingVertical: spacing.sm,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  modalTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  modalRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  modalRowPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  modalRowSelected: {
    backgroundColor: "rgba(241,143,92,0.08)",
  },
  modalRowLabel: {
    color: palette.sand,
    fontSize: 16,
    fontWeight: "600",
  },
  modalDismiss: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalDismissPressed: {
    opacity: 0.85,
  },
  modalDismissLabel: {
    color: palette.pine,
    fontSize: 15,
    fontWeight: "700",
  },
});
