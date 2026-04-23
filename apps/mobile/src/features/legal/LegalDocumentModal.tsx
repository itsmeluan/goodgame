import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { GlassCard } from "@/components/GlassCard";
import { useTranslation } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";

import type { LegalContentDocument } from "./legalContent";

type LegalDocumentModalProps = {
  document: LegalContentDocument | null;
  onClose: () => void;
};

export function LegalDocumentModal({
  document,
  onClose,
}: LegalDocumentModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={Boolean(document)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{document?.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("legal.closeDocument")}
            hitSlop={12}
            onPress={onClose}
            style={styles.closeButton}
          >
            <AppleGlassSurface
              pointerEvents="none"
              variant="dark"
              intensity="clear"
              style={styles.closeButtonSurface}
            />
            <Text style={styles.closeLabel}>{t("common.close")}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <GlassCard style={styles.introCard}>
            <Text style={styles.intro}>{document?.intro}</Text>
            <Text style={styles.version}>{t("legal.effective", { date: document?.effectiveDateLabel ?? "" })}</Text>
          </GlassCard>

          {document?.sections.map((section) => (
            <GlassCard key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
            </GlassCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.sheetBaseChrome,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: palette.sand,
    fontSize: 20,
    fontWeight: "800",
  },
  closeButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  closeButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
  },
  closeLabel: {
    color: palette.sand,
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  introCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  intro: {
    color: palette.sand,
    fontSize: 15,
    lineHeight: 22,
  },
  version: {
    color: palette.ember,
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: palette.sand,
    fontSize: 17,
    fontWeight: "800",
  },
  paragraph: {
    color: palette.mist,
    fontSize: 14,
    lineHeight: 22,
  },
});
