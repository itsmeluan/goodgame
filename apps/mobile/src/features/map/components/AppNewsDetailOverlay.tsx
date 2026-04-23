import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { useTranslation } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";
import type { AppNewsItem } from "@/types/domain";

/** Largura/altura do botão de fechar (vidro + X) — usado para afastar título do canto. */
const OVERLAY_CLOSE_BUTTON_SIZE = 40;

type AppNewsDetailOverlayProps = {
  visible: boolean;
  item: AppNewsItem | null;
  onClose: () => void;
};

export function AppNewsDetailOverlay({ visible, item, onClose }: AppNewsDetailOverlayProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  if (!item) {
    return null;
  }

  const gutter = spacing.lg;
  /** Altura máxima do card em px — necessário para o ScrollView ter viewport limitada e rolar. */
  const maxCardHeight = Math.max(
    240,
    Math.floor((windowHeight - insets.top - insets.bottom - gutter * 2) * 0.88)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/*
        Backdrop e card como irmãos: o Pressable não pode envolver o ScrollView (rouba scroll no iOS)
        nem deixar o toque “vazar” para fechar ao tocar na mensagem — o card fica numa camada acima.
      */}
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={styles.backdropFill}
          onPress={onClose}
        />
        <View
          style={[
            styles.cardLayer,
            {
              paddingLeft: insets.left + gutter,
              paddingRight: insets.right + gutter,
              paddingTop: insets.top + gutter,
              paddingBottom: insets.bottom + gutter,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.card, { height: maxCardHeight }]} pointerEvents="auto">
            <View style={styles.cardHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                hitSlop={10}
                onPress={() => {
                  triggerHaptic("selection");
                  onClose();
                }}
                style={({ pressed }) => [styles.closeGlass, pressed ? styles.closeGlassPressed : null]}
              >
                <AppleGlassSurface
                  pointerEvents="none"
                  variant="dark"
                  intensity="clear"
                  style={styles.closeGlassFill}
                />
                <AppIcon iosName="xmark" fallbackName="close" size={15} color={palette.sand} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled
              showsVerticalScrollIndicator
            >
              {item.imageUrl ? (
                <Image
                  accessibilityIgnoresInvertColors
                  source={{ uri: item.imageUrl }}
                  style={styles.hero}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.title}>{item.title}</Text>
              {item.body.trim() ? (
                <Text style={styles.body}>{item.body}</Text>
              ) : (
                <Text style={styles.bodyMuted}>{t("news.emptyDetail")}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,8,12,0.78)",
    zIndex: 0,
  },
  cardLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    zIndex: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.sheetBaseChrome,
    overflow: "hidden",
  },
  cardHeader: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
  },
  closeGlass: {
    width: OVERLAY_CLOSE_BUTTON_SIZE,
    height: OVERLAY_CLOSE_BUTTON_SIZE,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  closeGlassPressed: {
    opacity: 0.88,
  },
  closeGlassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    // Abaixo do X absoluto (top + altura do botão + respiro)
    paddingTop: spacing.sm + OVERLAY_CLOSE_BUTTON_SIZE + spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.md,
    gap: spacing.md,
  },
  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: palette.mapSurface,
  },
  title: {
    color: palette.sand,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    paddingRight: OVERLAY_CLOSE_BUTTON_SIZE + spacing.sm,
  },
  body: {
    color: palette.sand,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  bodyMuted: {
    color: palette.pine,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
