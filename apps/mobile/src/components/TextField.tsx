import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { useState } from "react";

import { AppIcon } from "@/components/AppIcon";
import { AppleGlassSurface } from "@/components/AppleGlassSurface";
import { useKeyboardAwareInputFocus } from "@/components/KeyboardAwareScrollView";
import { useTranslation } from "@/i18n";
import { palette, radius, spacing } from "@/theme/tokens";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric";
  onFocus?: TextInputProps["onFocus"];
  /** Tighter label/input spacing (e.g. stacked forms like perfil / composer). */
  density?: "default" | "compact";
  /** Default gray label; `light` uses sand for dark sheet forms. */
  labelTone?: "default" | "light";
  maxLength?: number;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  onFocus,
  density = "default",
  labelTone = "default",
  maxLength,
}: TextFieldProps) {
  const { t } = useTranslation();
  const { inputRef, handleFocus } = useKeyboardAwareInputFocus(multiline ? 148 : 110);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canTogglePasswordVisibility = secureTextEntry && !multiline;
  const effectiveSecureTextEntry = secureTextEntry && !passwordVisible;

  return (
    <View style={[styles.wrapper, density === "compact" ? styles.wrapperCompact : null]}>
      <Text style={[styles.label, labelTone === "light" ? styles.labelLight : null]}>{label}</Text>
      <View style={styles.inputShell}>
        <AppleGlassSurface
          pointerEvents="none"
          variant="dark"
          intensity="clear"
          style={styles.inputSurface}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.pine}
          keyboardAppearance="dark"
          secureTextEntry={effectiveSecureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={(event) => {
            handleFocus();
            onFocus?.(event);
          }}
          style={[
            styles.input,
            canTogglePasswordVisibility ? styles.inputWithTrailingAction : null,
            multiline && styles.multiline,
          ]}
          allowFontScaling
          maxLength={maxLength}
          {...(Platform.OS === "android" ? { includeFontPadding: false } : null)}
        />
        {canTogglePasswordVisibility ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(passwordVisible ? "auth.hidePassword" : "auth.showPassword")}
            onPress={() => setPasswordVisible((current) => !current)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.passwordVisibilityButton,
              pressed ? styles.passwordVisibilityButtonPressed : null,
            ]}
          >
            <AppIcon
              iosName={passwordVisible ? "eye.slash.fill" : "eye.fill"}
              fallbackName={passwordVisible ? "visibility-off" : "visibility"}
              size={20}
              color={palette.pine}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
  },
  wrapperCompact: {
    gap: 5,
  },
  label: {
    color: palette.pine,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelLight: {
    color: palette.sand,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(231,216,188,0.06)",
    backgroundColor: "rgba(255,255,255,0.015)",
    overflow: "hidden",
  },
  passwordVisibilityButton: {
    position: "absolute",
    right: 5,
    top: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordVisibilityButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inputSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.select({ ios: 11, android: 9, default: 10 }),
    paddingBottom: Platform.select({ ios: 13, android: 11, default: 12 }),
    color: palette.sand,
    fontSize: 16,
    // Omit fixed lineHeight on single-line so vertical centering matches native metrics.
    backgroundColor: "transparent",
  },
  inputWithTrailingAction: {
    paddingRight: 54,
  },
  multiline: {
    minHeight: 118,
    paddingTop: 12,
    paddingBottom: spacing.md,
    textAlignVertical: "top",
    lineHeight: 22,
  },
});
