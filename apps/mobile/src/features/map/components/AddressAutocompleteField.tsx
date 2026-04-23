import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { AppIcon } from "@/components/AppIcon";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "@/i18n";
import { meetupSheetEdgePadding, palette, spacing } from "@/theme/tokens";
import type { AddressSuggestion } from "@/lib/placeSearch";

type AddressAutocompleteFieldProps = {
  label: string;
  /** Default gray; `light` uses sand labels on dark sheets. */
  labelTone?: "default" | "light";
  value: string;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onChangeText: (value: string) => void;
  suggestions: AddressSuggestion[];
  loading: boolean;
  onUseCurrentLocation?: () => void;
  onUseTypedAddress?: () => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
};

export function AddressAutocompleteField({
  label,
  labelTone = "default",
  value,
  focused,
  onFocusChange,
  onChangeText,
  suggestions,
  loading,
  onUseCurrentLocation,
  onUseTypedAddress,
  onSelectSuggestion,
  placeholder,
}: AddressAutocompleteFieldProps) {
  const { t } = useTranslation();
  const modalInputRef = useRef<TextInput | null>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!focused) {
      setKeyboardHeight(0);
      return;
    }

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const nextKeyboardHeight = Math.max((event?.endCoordinates?.height ?? 0) - insets.bottom, 0);
      setKeyboardHeight(nextKeyboardHeight);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const frameEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const frameSubscription = Keyboard.addListener(frameEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      frameSubscription.remove();
      hideSubscription.remove();
    };
  }, [focused, insets.bottom]);

  useEffect(() => {
    if (!focused) {
      return;
    }

    const timeoutId = setTimeout(() => {
      modalInputRef.current?.focus();
    }, 120);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [focused]);

  const modalBottomOffset = spacing.md + keyboardHeight;
  const modalMaxHeight = Math.max(windowHeight - insets.top - keyboardHeight - 88, 320);
  const canUseTypedAddress = Boolean(onUseTypedAddress && value.trim().length >= 5);
  const handleUseTypedAddress = () => {
    if (!onUseTypedAddress) {
      return;
    }

    Keyboard.dismiss();
    onUseTypedAddress();
  };

  return (
    <View style={[styles.addressFieldWrap, focused ? styles.addressFieldWrapFocused : null]}>
      <Text style={[styles.fieldLabel, labelTone === "light" ? styles.fieldLabelLight : null]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("address.openSearch", { label })}
        onPress={() => {
          Keyboard.dismiss();
          setTimeout(() => {
            onFocusChange(true);
          }, Platform.OS === "ios" ? 70 : 0);
        }}
        style={({ pressed }) => [
          styles.addressFieldInput,
          styles.addressFieldTrigger,
          pressed ? styles.drawerButtonPressed : null,
        ]}
      >
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.addressFieldSurface}
        />
        <Text
          numberOfLines={1}
          style={value.trim() ? styles.addressFieldValue : styles.addressFieldPlaceholder}
        >
          {value.trim() || placeholder || t("address.placeholder")}
        </Text>
        <AppIcon iosName="magnifyingglass" fallbackName="search" size={17} color={palette.ember} />
      </Pressable>

      <Modal
        transparent
        animationType="fade"
        visible={focused}
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss();
          onFocusChange(false);
        }}
      >
        <View style={styles.addressSearchModalRoot}>
          <Pressable
            style={styles.addressSearchBackdrop}
            onPress={() => {
              Keyboard.dismiss();
              onFocusChange(false);
            }}
          />
          <View
            style={[styles.addressSearchSheetWrap, { paddingBottom: modalBottomOffset }]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.addressSearchSheet,
                { marginBottom: Platform.OS === "ios" ? 0 : insets.bottom },
                { maxHeight: modalMaxHeight },
              ]}
            >
              <AppleGlassSurface
                pointerEvents="none"
                variant="dark"
                intensity="regular"
                style={styles.addressSearchSheetSurface}
              />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                style={{ maxHeight: modalMaxHeight }}
                contentContainerStyle={styles.addressSearchScrollContent}
              >
                <View style={styles.overlayHeader}>
                  <View style={styles.overlayHeaderCopy}>
                    <Text style={styles.overlayTitle}>{t("address.searchTitle")}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("address.closeSearch")}
                    onPress={() => {
                      Keyboard.dismiss();
                      onFocusChange(false);
                    }}
                    style={({ pressed }) => [
                      styles.overlayCloseButton,
                      pressed ? styles.circleButtonPressed : null,
                    ]}
                  >
                    <AppIcon iosName="xmark" fallbackName="close" size={18} color={palette.sand} />
                  </Pressable>
                </View>

                <View style={styles.addressSearchInputWrap}>
                  <AppleGlassSurface
                    pointerEvents="none"
                    variant="dark"
                    intensity="clear"
                    style={styles.addressSearchInputSurface}
                  />
                  <TextInput
                    ref={modalInputRef}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={palette.pine}
                    keyboardAppearance="dark"
                    autoCapitalize="words"
                    style={styles.addressSearchInput}
                    returnKeyType="search"
                  />
                </View>

                <View style={styles.addressSuggestionList}>
                  {canUseTypedAddress ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("address.useTyped")}
                      onPress={handleUseTypedAddress}
                      style={({ pressed }) => [
                        styles.addressSuggestionRow,
                        styles.addressSuggestionRowSingleLine,
                        pressed ? styles.drawerButtonPressed : null,
                      ]}
                    >
                      <AppIcon
                        iosName="square.and.pencil"
                        fallbackName="edit-location-alt"
                        size={17}
                        color={palette.ember}
                      />
                      <Text style={[styles.addressSuggestionTitle, styles.addressSuggestionTitleInline]}>
                        {t("address.useTyped")}
                      </Text>
                    </Pressable>
                  ) : null}
                  {onUseCurrentLocation ? (
                    <Pressable
                      onPressIn={() => {
                        onFocusChange(false);
                        Keyboard.dismiss();
                        onUseCurrentLocation();
                      }}
                      style={({ pressed }) => [
                        styles.addressSuggestionRow,
                        styles.addressSuggestionRowSingleLine,
                        pressed ? styles.drawerButtonPressed : null,
                      ]}
                    >
                      <AppIcon
                        iosName="location.fill"
                        fallbackName="my-location"
                        size={17}
                        color={palette.ember}
                      />
                      <Text style={[styles.addressSuggestionTitle, styles.addressSuggestionTitleInline]}>
                        {t("address.useCurrentLocation")}
                      </Text>
                    </Pressable>
                  ) : null}
                  {loading ? (
                    <View style={styles.addressSuggestionLoading}>
                      <LoadingSpinner size={18} />
                      <Text style={styles.addressSuggestionLoadingText}>{t("address.loading")}</Text>
                    </View>
                  ) : suggestions.length ? (
                    suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion.id}
                        onPressIn={() => {
                          onFocusChange(false);
                          Keyboard.dismiss();
                          onSelectSuggestion(suggestion);
                        }}
                        style={({ pressed }) => [
                          styles.addressSuggestionRow,
                          pressed ? styles.drawerButtonPressed : null,
                        ]}
                      >
                        <AppIcon
                          iosName="mappin.and.ellipse"
                          fallbackName="location-on"
                          size={17}
                          color={palette.ember}
                        />
                        <View style={styles.addressSuggestionCopy}>
                          <Text style={styles.addressSuggestionTitle}>{suggestion.title}</Text>
                          <Text style={styles.addressSuggestionSubtitle}>
                            {suggestion.subtitle || suggestion.fullLabel}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  fieldLabelLight: {
    color: palette.sand,
  },
  addressFieldWrap: {
    gap: 7,
  },
  addressFieldWrapFocused: {
    zIndex: 100,
  },
  addressFieldInput: {
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.04)",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.012)",
    paddingHorizontal: meetupSheetEdgePadding,
    paddingVertical: 13,
    color: palette.sand,
    fontSize: 15,
    overflow: "hidden",
  },
  addressFieldSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  addressFieldTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  addressFieldValue: {
    color: palette.sand,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  addressFieldPlaceholder: {
    color: palette.pine,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  addressSearchModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  addressSearchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 6, 8, 0.56)",
  },
  addressSearchSheetWrap: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  addressSearchSheet: {
    borderRadius: 30,
    backgroundColor: "rgba(14, 13, 16, 0.92)",
    overflow: "hidden",
  },
  addressSearchScrollContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    flexGrow: 0,
  },
  addressSearchSheetSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
  },
  overlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  overlayHeaderCopy: {
    flex: 1,
    gap: 0,
  },
  overlayTitle: {
    color: palette.sand,
    fontSize: 19,
    fontWeight: "800",
  },
  overlayCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.04)",
    backgroundColor: "rgba(255,255,255,0.012)",
  },
  circleButtonPressed: {
    opacity: 0.78,
  },
  addressSearchInputWrap: {
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.04)",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.012)",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    overflow: "hidden",
  },
  addressSearchInputSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  addressSearchInput: {
    color: palette.sand,
    fontSize: 16,
  },
  addressSuggestionList: {
    gap: 0,
    width: "100%",
  },
  addressSuggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  addressSuggestionRowSingleLine: {
    alignItems: "center",
  },
  addressSuggestionCopy: {
    flex: 1,
    gap: 2,
  },
  addressSuggestionTitle: {
    color: palette.sand,
    fontSize: 15,
    fontWeight: "700",
  },
  addressSuggestionTitleInline: {
    flex: 1,
  },
  addressSuggestionSubtitle: {
    color: palette.pine,
    fontSize: 12,
    lineHeight: 16,
  },
  addressSuggestionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addressSuggestionLoadingText: {
    color: palette.pine,
    fontSize: 13,
  },
  drawerButtonPressed: {
    opacity: 0.78,
  },
});
