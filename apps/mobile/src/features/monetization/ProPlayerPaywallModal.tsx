import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation, type TranslationKey } from "@/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { palette, radius, spacing } from "@/theme/tokens";

const BENEFITS = [
  "pro.benefitNearbyPlayers",
  "pro.benefitFindGames",
  "pro.benefitCommunityPriority",
] as const;

type ProPlayerPaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  startingTrial: boolean;
};

export function ProPlayerPaywallModal({
  visible,
  onClose,
  onStartTrial,
  startingTrial,
}: ProPlayerPaywallModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(cardY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      cardScale.setValue(0.94);
      cardY.setValue(12);
    }
  }, [visible, opacity, cardScale, cardY]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.cardWrap,
            {
              maxHeight: height - insets.top - insets.bottom - spacing.xl * 2,
              transform: [{ translateY: cardY }, { scale: cardScale }],
            },
          ]}
        >
          <View style={styles.cardSurface}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.cardInner,
                {
                  paddingTop: spacing.lg + 4,
                  paddingBottom: insets.bottom + spacing.lg,
                  paddingHorizontal: spacing.lg,
                },
              ]}
            >
              <Text style={styles.kicker}>{t("pro.kicker")}</Text>
              <Text style={styles.title}>{t("pro.title")}</Text>
              <Text style={styles.subtitle}>{t("pro.subtitle")}</Text>

              <View style={styles.benefits}>
                {BENEFITS.map((line) => (
                  <View key={line} style={styles.benefitRow}>
                    <View style={styles.benefitDot} />
                    <Text style={styles.benefitText}>{t(line as TranslationKey)}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={startingTrial}
                onPress={() => {
                  triggerHaptic("medium");
                  onStartTrial();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : null,
                  startingTrial ? styles.primaryButtonDisabled : null,
                ]}
              >
                {startingTrial ? (
                  <LoadingSpinner size={20} color={palette.ink} />
                ) : (
                  <Text style={styles.primaryLabel}>{t("pro.ctaTrial")}</Text>
                )}
              </Pressable>
              <Text style={styles.priceHint}>{t("pro.priceHint")}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic("selection");
                  onClose();
                }}
                style={styles.secondary}
              >
                <Text style={styles.secondaryLabel}>{t("pro.maybeLater")}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5,6,10,0.58)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  cardWrap: {
    width: "100%",
    alignSelf: "center",
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  cardSurface: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    backgroundColor: palette.sheetBaseChrome,
  },
  cardInner: {
    gap: spacing.md,
  },
  kicker: {
    color: palette.ember,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: palette.sand,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  subtitle: {
    color: palette.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  benefits: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: palette.ember,
  },
  benefitText: {
    flex: 1,
    color: palette.sand,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: palette.sand,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryLabel: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  priceHint: {
    color: palette.pine,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  secondary: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryLabel: {
    color: palette.mist,
    fontSize: 16,
    fontWeight: "600",
  },
});
