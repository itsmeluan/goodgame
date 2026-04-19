import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

type MeetupShareOverlayProps = {
  visible: boolean;
  /** Nome do jogo ou do local (aparece entre aspas no título). */
  headline: string;
  onClose: () => void;
  onShareInChat: () => void;
  onShareExternal: () => void;
};

export function MeetupShareOverlay({
  visible,
  headline,
  onClose,
  onShareInChat,
  onShareExternal,
}: MeetupShareOverlayProps) {
  if (!headline.trim()) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onClose}>
        <Pressable
          accessibilityRole="none"
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={styles.title} numberOfLines={2}>
            Compartilhar “{headline}”
          </Text>
          <Text style={styles.subtitle}>Escolha como enviar o convite.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar em um chat"
            onPress={() => {
              triggerHaptic("selection");
              onShareInChat();
            }}
            style={({ pressed }) => [styles.optionRow, pressed ? styles.optionRowPressed : null]}
          >
            <View style={styles.optionIconWrap}>
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="clear"
                style={styles.optionIconGlass}
              />
              <AppIcon
                iosName="bubble.left.and.bubble.right.fill"
                fallbackName="forum"
                size={18}
                color={palette.ember}
              />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionLabel}>Compartilhar em um chat</Text>
              <Text style={styles.optionHint}>Grupos e conversas do Good Game</Text>
            </View>
            <AppIcon
              iosName="chevron.right"
              fallbackName="chevron-right"
              size={14}
              color={palette.pine}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhamento externo"
            onPress={() => {
              triggerHaptic("selection");
              onShareExternal();
            }}
            style={({ pressed }) => [styles.optionRow, pressed ? styles.optionRowPressed : null]}
          >
            <View style={styles.optionIconWrap}>
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="clear"
                style={styles.optionIconGlass}
              />
              <AppIcon iosName="square.and.arrow.up" fallbackName="share" size={18} color={palette.sand} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionLabel}>Compartilhamento externo</Text>
              <Text style={styles.optionHint}>Apps do sistema, Mensagens, copiar link…</Text>
            </View>
            <AppIcon
              iosName="chevron.right"
              fallbackName="chevron-right"
              size={14}
              color={palette.pine}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={() => {
              triggerHaptic("selection");
              onClose();
            }}
            style={({ pressed }) => [styles.cancelPill, pressed ? styles.cancelPillPressed : null]}
          >
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5,8,12,0.72)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.sheetBaseChrome,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: palette.sand,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  subtitle: {
    color: palette.pine,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.mapSurface,
  },
  optionRowPressed: {
    opacity: 0.92,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  optionIconGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  optionHint: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
  },
  cancelPill: {
    alignSelf: "center",
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelPillPressed: {
    opacity: 0.85,
  },
  cancelLabel: {
    color: palette.pine,
    fontSize: 15,
    fontWeight: "600",
  },
});
