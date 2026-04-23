import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoodGameLogo } from "@/components/GoodGameLogo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { LegalDocumentModal } from "@/features/legal/LegalDocumentModal";
import { translate, useTranslation } from "@/i18n";
import { acceptCurrentLegalDocuments } from "@/lib/api";
import { appInfo } from "@/lib/appInfo";
import { palette, spacing } from "@/theme/tokens";
import type { LegalDocument } from "@/types/domain";

import { getLegalContent } from "./legalContent";

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
  const { t, locale } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentKind, setSelectedDocumentKind] = useState<
    LegalDocument["kind"] | null
  >(null);

  const selectedDocument = selectedDocumentKind
    ? getLegalContent(selectedDocumentKind, locale)
    : null;
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

        <Text style={styles.title}>{t("legal.title")}</Text>
        <Text style={styles.subtitle}>{t("legal.subtitle")}</Text>

        {pendingDocuments.map((document) => (
          <LocalizedDocumentCard
            key={document.id}
            document={document}
            title={getLegalContent(document.kind, locale).title}
            summary={
              document.kind === "privacy_policy"
                ? t("legal.privacySummary")
                : t("legal.termsSummary")
            }
            ctaLabel={
              document.kind === "privacy_policy" ? t("legal.readPrivacy") : t("legal.readTerms")
            }
            onPress={() => setSelectedDocumentKind(document.kind)}
          />
        ))}

        <SectionCard>
          <Text style={styles.commitmentTitle}>{t("legal.commitmentTitle")}</Text>
          <Text style={styles.commitmentItem}>{t("legal.commitmentOne")}</Text>
          <Text style={styles.commitmentItem}>{t("legal.commitmentTwo")}</Text>
          <Text style={styles.commitmentItem}>{t("legal.commitmentThree")}</Text>
          <Text style={styles.commitmentItem}>{t("legal.commitmentFour")}</Text>
        </SectionCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footerActions}>
          <PrimaryButton
            label={t("legal.accept")}
            onPress={() => void handleAccept()}
            loading={submitting}
          />
          <PrimaryButton label={t("legal.signOut")} onPress={() => void onSignOut()} tone="ghost" />
        </View>
      </ScrollView>

      <LegalDocumentModal
        document={selectedDocument}
        onClose={() => setSelectedDocumentKind(null)}
      />
    </SafeAreaView>
  );
}

function LocalizedDocumentCard({
  document,
  title,
  summary,
  ctaLabel,
  onPress,
}: {
  document: LegalDocument;
  title: string;
  summary: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  return (
    <SectionCard>
      <View style={styles.documentHeader}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text style={styles.documentVersion}>v{document.version}</Text>
      </View>
      <Text style={styles.documentSummary}>{summary}</Text>
      <PrimaryButton label={ctaLabel} onPress={onPress} tone="ghost" />
    </SectionCard>
  );
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return translate("legal.acceptanceError");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sheetBaseChrome,
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
