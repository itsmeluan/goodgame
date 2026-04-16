import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoodGameLogo } from "@/components/GoodGameLogo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { LegalDocumentModal } from "@/features/legal/LegalDocumentModal";
import { acceptCurrentLegalDocuments } from "@/lib/api";
import { appInfo } from "@/lib/appInfo";
import { palette, spacing } from "@/theme/tokens";
import type { LegalDocument } from "@/types/domain";

import { legalContent } from "./legalContent";

type LegalAgreementScreenProps = {
  documents: LegalDocument[];
  onAccepted: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function LegalAgreementScreen({
  documents,
  onAccepted,
  onSignOut,
}: LegalAgreementScreenProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentKind, setSelectedDocumentKind] = useState<
    LegalDocument["kind"] | null
  >(null);

  const selectedDocument = selectedDocumentKind ? legalContent[selectedDocumentKind] : null;
  const pendingDocuments = useMemo(
    () => documents.filter((document) => document.acceptedAt === null),
    [documents]
  );

  async function handleAccept() {
    try {
      setSubmitting(true);
      setError(null);
      await acceptCurrentLegalDocuments({
        platform: "mobile",
        appVersion: appInfo.version,
      });
      await onAccepted();
    } catch (acceptanceError) {
      setError(toMessage(acceptanceError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <GoodGameLogo size="md" monochrome />
          <Text style={styles.eyebrow}>Good Game</Text>
        </View>

        <Text style={styles.title}>Antes de continuar</Text>
        <Text style={styles.subtitle}>
          Para usar o app, você precisa aceitar os documentos legais vigentes e confirmar que
          compreende as regras de uso, privacidade e segurança da comunidade.
        </Text>

        {pendingDocuments.map((document) => (
          <SectionCard key={document.id}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.documentVersion}>v{document.version}</Text>
            </View>
            <Text style={styles.documentSummary}>{document.summary}</Text>
            <PrimaryButton
              label={`Ler ${document.kind === "privacy_policy" ? "política" : "termos"}`}
              onPress={() => setSelectedDocumentKind(document.kind)}
              tone="ghost"
            />
          </SectionCard>
        ))}

        <SectionCard>
          <Text style={styles.commitmentTitle}>Seu aceite confirma que:</Text>
          <Text style={styles.commitmentItem}>
            Você leu os Termos de Uso e a Política de Privacidade vigentes.
          </Text>
          <Text style={styles.commitmentItem}>
            Você entende que encontros presenciais exigem cautela e avaliação própria.
          </Text>
          <Text style={styles.commitmentItem}>
            Você aceita respeitar as regras da comunidade e usar localização aproximada de forma
            responsável.
          </Text>
          <Text style={styles.commitmentItem}>
            Você é maior de idade ou usa o app com autorização do responsável, quando a lei exigir.
          </Text>
        </SectionCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footerActions}>
          <PrimaryButton
            label="Aceitar e continuar"
            onPress={() => void handleAccept()}
            loading={submitting}
          />
          <PrimaryButton label="Sair da conta" onPress={() => void onSignOut()} tone="ghost" />
        </View>
      </ScrollView>

      <LegalDocumentModal
        document={selectedDocument}
        onClose={() => setSelectedDocumentKind(null)}
      />
    </SafeAreaView>
  );
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível registrar o aceite agora.";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  eyebrow: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: palette.sand,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "center",
  },
  documentTitle: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  documentVersion: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "700",
  },
  documentSummary: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  commitmentTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "700",
  },
  commitmentItem: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 20,
  },
  footerActions: {
    gap: spacing.sm,
  },
  error: {
    color: palette.ember,
    fontSize: 14,
    lineHeight: 20,
  },
});
